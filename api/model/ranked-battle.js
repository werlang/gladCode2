import { randomBytes } from 'node:crypto';
import { calcReward, crashedGladiators, deathOrder, masterRewards } from '../helpers/battle-results.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';
import { Battle } from './battle.js';
import { Gladiator } from './gladiator.js';
import { Stats } from './stats.js';

/** Opponents are drawn from the gladiators closest in rank. */
const MATCH_POOL = 10;
const OPPONENTS = 4;
/** How long a match may wait for its battle. */
const MATCH_SECONDS = 600;

/**
 * Ranked battles: matchmaking against the closest gladiators in rank, the battle, and its renown,
 * silver and experience.
 */
export class RankedBattle {
    /**
     * Picks four opponents among the ten gladiators of other masters closest in rank to the master's
     * gladiator. The match is kept on the server (`ranked_matches`) and its id is what the battle
     * needs: each match is fought once, within {@link MATCH_SECONDS}.
     *
     * @param {{ id: number }} user
     * @param {number} gladiatorId
     * @returns {Promise<{ opponents: object[], match: string }>}
     * @throws {CustomError} 404 `GLADIATOR_NOT_FOUND`, 409 `GLADIATOR_OUTDATED` (save it on the current
     *   version first), 409 `NO_OPPONENTS` when no other master has a gladiator on the current version.
     */
    static async match(user, gladiatorId) {
        const glad = await Gladiator.findOwned(gladiatorId, user.id);
        if (glad.version !== VERSION) throw new CustomError(409, 'Save the gladiator on the current version first.', 'GLADIATOR_OUTDATED');

        const rows = await Mysql.select(
            `SELECT g.cod, g.name, g.skin, g.vstr, g.vagi, g.vint, g.mmr, u.apelido
            FROM gladiators g INNER JOIN usuarios u ON g.master = u.id
            INNER JOIN (
                SELECT g.cod FROM gladiators g WHERE g.master != ? AND g.version = ?
                ORDER BY ABS((SELECT COUNT(*) FROM gladiators g2 WHERE g2.mmr < g.mmr) - (SELECT COUNT(*) FROM gladiators WHERE mmr < ?))
                LIMIT ?
            ) nearby ON nearby.cod = g.cod
            ORDER BY RAND() LIMIT ?`,
            [user.id, VERSION, glad.mmr, MATCH_POOL, OPPONENTS],
        );
        if (!rows.length) throw new CustomError(409, 'No opponents on the current version yet.', 'NO_OPPONENTS');

        const match = randomBytes(16).toString('hex');
        await Mysql.delete('ranked_matches', { expires: { '<': Mysql.raw('NOW()') } });
        await Mysql.insert('ranked_matches', {
            id: match,
            user: user.id,
            gladiator: glad.cod,
            opponents: JSON.stringify(rows.map(row => row.cod)),
            expires: Mysql.raw(`NOW() + INTERVAL ${MATCH_SECONDS} SECOND`),
        });
        return {
            opponents: rows.map(row => ({ name: row.name, master: row.apelido, skin: row.skin, vstr: row.vstr, vagi: row.vagi, vint: row.vint, mmr: Math.trunc(row.mmr) })),
            match,
        };
    }

    /**
     * Runs a matched battle and applies its results.
     *
     * @param {{ id: number }} user
     * @param {string} match The id from {@link RankedBattle.match}.
     * @returns {Promise<{ hash: string|null, error: string, summary?: object }>} `summary`: the master's
     *   level, xp and silver and their gladiator after the battle.
     * @throws {CustomError} 400 `MATCH_INVALID` for a missing, expired, already fought or someone
     *   else's match; 404 `GLADIATOR_NOT_FOUND` and 409 `GLADIATOR_OUTDATED` when the master's gladiator
     *   changed since.
     */
    static async fight(user, match) {
        const claimed = await RankedBattle.#claim(user.id, match);
        const glad = await Gladiator.findOwned(claimed.gladiator, user.id);
        if (glad.version !== VERSION) throw new CustomError(409, 'Save the gladiator on the current version first.', 'GLADIATOR_OUTDATED');

        const ids = [...claimed.opponents, glad.cod];
        const battle = await new Battle({ origin: 'ranked' }).addGladiators(ids);
        const { log, simulation, error } = await battle.run();
        if (!log) return { hash: null, error };

        await RankedBattle.#applyResults(user.id, battle, simulation, log.id, ids);
        return { hash: log.hash, error: '', summary: await RankedBattle.#summary(user.id, glad.cod) };
    }

    /**
     * Takes a match off the table, so two requests with the same match never both fight it.
     *
     * @param {number} userId
     * @param {string} match
     * @returns {Promise<{ gladiator: number, opponents: number[] }>}
     * @throws {CustomError} 400 `MATCH_INVALID`.
     */
    static async #claim(userId, match) {
        return Mysql.withTransaction(async context => {
            const [row] = await Mysql.select(
                'SELECT gladiator, opponents FROM ranked_matches WHERE id = ? AND user = ? AND expires > NOW() FOR UPDATE',
                [match, userId],
                context,
            );
            if (!row) throw new CustomError(400, 'Find opponents again.', 'MATCH_INVALID');
            await Mysql.delete('ranked_matches', { id: match }, context);
            return { gladiator: row.gladiator, opponents: JSON.parse(row.opponents) };
        });
    }

    /**
     * Flags crashed gladiators, moves renown, pays the master, writes everyone's report and the
     * battle's stats, all or nothing.
     *
     * @param {number} userId The master who started the battle.
     * @param {Battle} battle
     * @param {Array<{ glads: Array<Record<string, any>> }>} simulation
     * @param {number} logId
     * @param {number[]} gladiatorIds Every gladiator in the battle.
     */
    static async #applyResults(userId, battle, simulation, logId, gladiatorIds) {
        const logGlads = simulation[0].glads;
        const placed = deathOrder(simulation)
            .map(entry => ({ ...entry, saved: battle.savedGladiator(entry.name, entry.user) }))
            .filter(entry => entry.saved);

        await Mysql.withTransaction(async context => {
            // a gladiator whose client crashed leaves matchmaking until its owner saves it again
            const crashed = crashedGladiators(simulation)
                .map(index => battle.savedGladiator(logGlads[index].name, logGlads[index].user)?.id)
                .filter(Boolean);
            if (crashed.length) await Mysql.update('gladiators', { version: 'broken' }, { cod: crashed }, context);

            const ids = placed.map(entry => entry.saved.id);
            const rows = await Mysql.select(
                `SELECT g.cod, g.mmr, g.master, u.lvl, u.xp FROM gladiators g INNER JOIN usuarios u ON u.id = g.master
                WHERE g.cod IN (${ids.map(() => '?').join(',')}) FOR UPDATE`,
                ids,
                context,
            );
            const byId = new Map(rows.map(row => [row.cod, row]));
            const glads = placed.map(entry => ({ ...byId.get(entry.saved.id), time: entry.time }));
            const rewards = calcReward(glads);
            for (const [index, glad] of glads.entries()) {
                await Mysql.update('gladiators', { mmr: { inc: rewards[index] } }, { cod: glad.cod }, context);
            }

            const mine = glads.findIndex(glad => glad.master === userId);
            if (mine >= 0) {
                const [{ battles }] = await Mysql.select(
                    `SELECT COUNT(*) AS battles FROM reports r INNER JOIN gladiators g ON r.gladiator = g.cod INNER JOIN logs l ON l.id = r.log
                    WHERE g.master = ? AND l.time > NOW() - INTERVAL 1 DAY AND r.started = 1`,
                    [userId],
                    context,
                );
                const pay = masterRewards({
                    mmr: glads[mine].mmr, level: glads[mine].lvl, xp: glads[mine].xp,
                    won: mine === 0, battlesToday: Number(battles), gladiators: glads.length,
                });
                await Mysql.update('usuarios', { lvl: pay.level, xp: pay.xp, silver: { inc: pay.silver } }, { id: userId }, context);
            }

            await Mysql.insert('reports', glads.map((glad, index) => ({
                log: logId, gladiator: glad.cod, reward: rewards[index], started: Number(glad.master === userId),
            })), context);
            await Stats.record(simulation, logId, gladiatorIds, context);
        });
    }

    /**
     * @param {number} userId
     * @param {number} gladiatorId
     * @returns {Promise<{ level: number, xp: number, silver: number, gladiator: object }>}
     */
    static async #summary(userId, gladiatorId) {
        const [row] = await Mysql.select(
            `SELECT u.lvl, u.xp, u.silver, g.cod, g.name, g.skin, g.vstr, g.vagi, g.vint, g.mmr
            FROM usuarios u INNER JOIN gladiators g ON g.master = u.id WHERE u.id = ? AND g.cod = ?`,
            [userId, gladiatorId],
        );
        return {
            level: row.lvl,
            xp: row.xp,
            silver: row.silver,
            gladiator: { id: row.cod, name: row.name, skin: row.skin, vstr: row.vstr, vagi: row.vagi, vint: row.vint, mmr: row.mmr },
        };
    }
}

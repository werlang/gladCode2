import { placingOrder, survival } from '../helpers/battle-results.js';
import { expandSteps } from '../helpers/battle-stats.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';
import { Battle } from './battle.js';
import { BattleLog } from './battle-log.js';
import { GROUP_SIZE, createGroups } from './tournament.js';

/** A group's battle holds its lock this long (the runner gives a battle 30 s). */
const LOCK_SECONDS = 60;
/** Tables of a tournament round, joined from a group to its tournament. */
const GROUP_JOIN = '`groups` gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament';

/**
 * The rounds of a started tournament (by its public hash): groups of up to five teams, each
 * choosing a gladiator per round, a battle per group, the dead leaving the tournament.
 */
export class TournamentRound {
    /**
     * @param {string} hash
     * @returns {Promise<number|null>} The latest round, or null for an unknown tournament.
     */
    static async maxRound(hash) {
        const [row] = await Mysql.select(`SELECT MAX(gr.round) AS round FROM ${GROUP_JOIN} WHERE t.hash = ?`, [hash]);
        return row?.round ?? null;
    }

    /**
     * @param {string} hash
     * @param {number} round
     * @returns {Promise<number>} Teams with a gladiator never killed, in a round.
     */
    static async #aliveTeams(hash, round) {
        const [row] = await Mysql.select(
            `SELECT COUNT(DISTINCT te.id) AS teams FROM ${GROUP_JOIN} INNER JOIN gladiator_teams glt ON glt.team = te.id
            WHERE t.hash = ? AND gr.round = ? AND glt.dead = 0 AND glt.gladiator IS NOT NULL`,
            [hash, round],
        );
        return Number(row.teams);
    }

    /**
     * A round as its page shows it, the final ranking (round 0 once one team is left) or where to go.
     *
     * @param {string} hash
     * @param {number} round
     * @param {number|null} userId The viewer (null for visitors).
     * @returns {Promise<{ status: 'redirect', round: number }|{ status: 'end', tournament: string, maxRound: number, ranking: string[] }|{ status: 'round', tournament: object, teams: object[], locked: boolean, nick: string|null }>}
     * @throws {CustomError} 404 `TOURNAMENT_NOT_FOUND`.
     */
    static async view(hash, round, userId) {
        const maxRound = await TournamentRound.maxRound(hash);
        if (!maxRound) throw new CustomError(404, 'Tournament not found.', 'TOURNAMENT_NOT_FOUND');

        if (round === 0) {
            if (await TournamentRound.#aliveTeams(hash, maxRound) > 1) return { status: 'redirect', round: maxRound };
            const rows = await Mysql.select(
                `SELECT te.name AS team, t.name AS tournament FROM ${GROUP_JOIN}
                WHERE t.hash = ? AND te.id NOT IN (SELECT grt2.team FROM \`groups\` gr2 INNER JOIN group_teams grt2 ON grt2.groupid = gr2.id WHERE gr2.round > gr.round)
                ORDER BY gr.round DESC, grt.lasttime DESC`,
                [hash],
            );
            return { status: 'end', tournament: rows[0]?.tournament ?? '', maxRound, ranking: rows.map(row => row.team) };
        }

        const [mine] = userId ? await Mysql.select(
            `SELECT te.id, u.apelido FROM usuarios u INNER JOIN gladiators g ON g.master = u.id INNER JOIN gladiator_teams gt ON gt.gladiator = g.cod
            INNER JOIN teams te ON te.id = gt.team INNER JOIN tournament t ON t.id = te.tournament WHERE g.master = ? AND t.hash = ? LIMIT 1`,
            [userId, hash],
        ) : [];
        const rows = await Mysql.select(
            `SELECT grt.gladiator AS ready, te.id, te.name, t.name AS tname, t.description, t.manager, grt.groupid, grt.lasttime, gr.locked, gr.deadline,
                NOW(3) AS now, (gr.locked > NOW(3) - INTERVAL ? SECOND) AS busy,
                (SELECT COUNT(*) FROM gladiator_teams glt WHERE glt.team = te.id AND glt.gladiator IS NOT NULL AND (glt.dead = 0 OR glt.dead >= ?)) AS alive
            FROM ${GROUP_JOIN} WHERE t.hash = ? AND gr.round = ? ORDER BY grt.groupid, grt.lasttime DESC`,
            [LOCK_SECONDS, round, hash, round],
        );
        if (!rows.length) throw new CustomError(404, 'Round not found.', 'ROUND_NOT_FOUND');

        const first = rows[0];
        const myRow = rows.find(row => row.id === mine?.id);
        return {
            status: 'round',
            tournament: { name: first.tname, description: first.description, round, deadline: first.deadline, now: first.now, manager: first.manager === userId },
            nick: mine?.apelido ?? null,
            locked: Boolean(Number(myRow?.busy)),
            teams: rows.map(row => ({
                id: row.id, name: row.name, alive: Number(row.alive), lasttime: row.lasttime, group: row.groupid,
                mine: row.id === mine?.id, ready: row.ready !== null,
            })),
        };
    }

    /**
     * The gladiators of the master's team in a round, to choose one.
     *
     * @param {string} hash
     * @param {number} round
     * @param {number} userId
     * @returns {Promise<object[]>} Gladiators with `dead`, `outdated` and, when shared, `code`/`blocks`.
     * @throws {CustomError} 409 `GROUP_LOCKED` while the group's battle runs, 404 `TEAM_NOT_FOUND`.
     */
    static async teamGladiators(hash, round, userId) {
        const myTeams = 'SELECT te2.id FROM teams te2 INNER JOIN gladiator_teams glt2 ON glt2.team = te2.id INNER JOIN gladiators g2 ON g2.cod = glt2.gladiator WHERE g2.master = ?';
        const [group] = await Mysql.select(
            `SELECT (gr.locked > NOW(3) - INTERVAL ? SECOND) AS busy FROM ${GROUP_JOIN} WHERE t.hash = ? AND gr.round = ? AND te.id IN (${myTeams}) LIMIT 1`,
            [LOCK_SECONDS, hash, round, userId],
        );
        if (Number(group?.busy)) throw new CustomError(409, 'Your group\'s battle is running.', 'GROUP_LOCKED');

        const rows = await Mysql.select(
            `SELECT g.cod, g.name, g.skin, g.code, g.blocks, u.apelido, g.vstr, g.vagi, g.vint, g.version, glt.dead, glt.visible
            FROM ${GROUP_JOIN} INNER JOIN gladiator_teams glt ON glt.team = te.id INNER JOIN gladiators g ON g.cod = glt.gladiator INNER JOIN usuarios u ON u.id = g.master
            WHERE t.hash = ? AND gr.round = ? AND te.id IN (${myTeams})`,
            [hash, round, userId],
        );
        if (!rows.length) throw new CustomError(404, 'Team not found.', 'TEAM_NOT_FOUND');
        return rows.map(row => {
            const glad = {
                id: row.cod, name: row.name, skin: row.skin, master: row.apelido, vstr: row.vstr, vagi: row.vagi, vint: row.vint,
                outdated: row.version !== VERSION, dead: row.dead !== 0 && row.dead < round,
            };
            if (Number(row.visible)) Object.assign(glad, { code: row.code, blocks: row.blocks });
            return glad;
        });
    }

    /**
     * The master's team picks its gladiator for the latest round.
     *
     * @param {string} hash
     * @param {number} userId
     * @param {number} gladiatorId
     * @throws {CustomError} 404 `GLADIATOR_NOT_FOUND`, 409 `GLADIATOR_DEAD`/`GLADIATOR_OUTDATED`/`GROUP_DONE`.
     */
    static async choose(hash, userId, gladiatorId) {
        const [glad] = await Mysql.select(
            `SELECT glt.dead, g.version, te.id AS team FROM tournament t INNER JOIN teams te ON te.tournament = t.id INNER JOIN gladiator_teams glt ON glt.team = te.id
            INNER JOIN gladiators g ON g.cod = glt.gladiator
            WHERE t.hash = ? AND g.cod = ? AND te.id IN (SELECT glt2.team FROM gladiator_teams glt2 INNER JOIN gladiators g2 ON g2.cod = glt2.gladiator WHERE g2.master = ?)`,
            [hash, gladiatorId, userId],
        );
        if (!glad) throw new CustomError(404, 'Gladiator not found in your team.', 'GLADIATOR_NOT_FOUND');
        const round = await TournamentRound.maxRound(hash);
        if (glad.dead !== 0 && glad.dead < round) throw new CustomError(409, 'This gladiator can no longer fight in the tournament.', 'GLADIATOR_DEAD');
        if (glad.version !== VERSION) throw new CustomError(409, 'Save the gladiator on the current version first.', 'GLADIATOR_OUTDATED');

        const [group] = await Mysql.select(
            'SELECT gr.id, gr.log FROM `groups` gr INNER JOIN group_teams grt ON grt.groupid = gr.id WHERE gr.round = ? AND grt.team = ?',
            [round, glad.team],
        );
        if (!group) throw new CustomError(404, 'Your team is not in this round.', 'TEAM_NOT_FOUND');
        if (group.log !== null) throw new CustomError(409, 'Your group already fought this round.', 'GROUP_DONE');
        await Mysql.update('group_teams', { gladiator: gladiatorId }, { groupid: group.id, team: glad.team });
    }

    /**
     * How a round stands: each team's state and each group's (waiting for choices, ready to fight,
     * fighting, done). When the deadline passed, a random living gladiator is picked for every team
     * that did not choose.
     *
     * @param {string} hash
     * @param {number} round
     * @returns {Promise<{ status: 'open'|'next'|'end', teams: Record<number, object>, groups: Record<number, object> }>}
     */
    static async status(hash, round) {
        const pending = await Mysql.select(
            `SELECT (NOW() >= gr.deadline) AS timeup FROM ${GROUP_JOIN} WHERE gr.log IS NULL AND t.hash = ? AND gr.round = ? LIMIT 1`,
            [hash, round],
        );
        const nextRound = pending.length === 0;
        const timeUp = Boolean(Number(pending[0]?.timeup));

        const groupRows = await Mysql.select(
            `SELECT gr.id, COUNT(*) AS total, SUM(grt.gladiator IS NULL) AS remaining FROM ${GROUP_JOIN}
            WHERE t.hash = ? AND gr.round = ? GROUP BY gr.id`,
            [hash, round],
        );
        const groups = {};
        for (const row of groupRows) {
            const remaining = Number(row.remaining);
            const state = { total: Number(row.total), remaining };
            if (remaining > 0 && !timeUp) state.status = 'wait';
            else {
                if (timeUp && remaining > 0) await TournamentRound.#pickForLateTeams(row.id);
                const [group] = await Mysql.select(
                    'SELECT l.hash, (gr.locked > NOW(3) - INTERVAL ? SECOND) AS busy FROM `groups` gr LEFT JOIN logs l ON l.id = gr.log WHERE gr.id = ?',
                    [LOCK_SECONDS, row.id],
                );
                if (group.hash) Object.assign(state, { status: 'done', hash: group.hash });
                else state.status = Number(group.busy) ? 'locked' : 'ready';
            }
            groups[row.id] = state;
        }

        const teamRows = await Mysql.select(
            `SELECT grt.gladiator AS ready, te.id, te.name, grt.lasttime,
                (SELECT COUNT(*) FROM gladiator_teams glt WHERE glt.team = te.id AND glt.gladiator IS NOT NULL AND (glt.dead = 0 OR glt.dead > ?)) AS alive
            FROM ${GROUP_JOIN} WHERE t.hash = ? AND gr.round = ?`,
            [round, hash, round],
        );
        const teams = Object.fromEntries(teamRows.map(row => [row.id, { id: row.id, name: row.name, ready: row.ready !== null, alive: Number(row.alive), lasttime: row.lasttime }]));

        let status = 'open';
        if (nextRound) {
            const alive = await TournamentRound.#aliveTeams(hash, round);
            const maxRound = await TournamentRound.maxRound(hash);
            if (alive > 1 && round === maxRound) status = 'open';
            else if (alive > 1 || round < maxRound) status = 'next';
            else status = 'end';
        }
        return { status, teams, groups };
    }

    /**
     * Picks a random living gladiator for each team of a group that did not choose in time.
     *
     * @param {number} groupId
     */
    static async #pickForLateTeams(groupId) {
        const late = await Mysql.select('SELECT id, team FROM group_teams WHERE groupid = ? AND gladiator IS NULL', [groupId]);
        for (const entry of late) {
            const [pick] = await Mysql.select('SELECT gladiator FROM gladiator_teams WHERE team = ? AND dead = 0 AND gladiator IS NOT NULL ORDER BY RAND() LIMIT 1', [entry.team]);
            if (pick) await Mysql.update('group_teams', { gladiator: pick.gladiator }, { id: entry.id, gladiator: null });
        }
    }

    /**
     * The tournament row of a manager, by hash.
     *
     * @param {string} hash
     * @param {number} userId
     * @returns {Promise<Record<string, any>>}
     * @throws {CustomError} 403 `MANAGER_ONLY`.
     */
    static async #managed(hash, userId) {
        const tournament = await Mysql.findOne('tournament', { filter: { hash } });
        if (!tournament || tournament.manager !== userId) throw new CustomError(403, 'Only the manager can do this.', 'MANAGER_ONLY');
        return tournament;
    }

    /**
     * Runs a group's battle (manager only). Every team must have its gladiator; `force` runs a fought
     * group again. The group is locked while it fights, so two requests cannot run it twice.
     *
     * @param {string} hash
     * @param {number} groupId
     * @param {number} userId
     * @param {boolean} [force]
     * @returns {Promise<{ hash: string|null, error: string }>}
     * @throws {CustomError} 403 `MANAGER_ONLY`, 404 `GROUP_NOT_FOUND`, 409 `GROUP_NOT_READY`/`GROUP_BUSY`.
     */
    static async fight(hash, groupId, userId, force = false) {
        await TournamentRound.#managed(hash, userId);
        const members = await Mysql.select(`SELECT grt.gladiator FROM ${GROUP_JOIN} WHERE t.hash = ? AND gr.id = ?`, [hash, groupId]);
        if (!members.length) throw new CustomError(404, 'Group not found.', 'GROUP_NOT_FOUND');
        if (members.some(member => member.gladiator === null)) throw new CustomError(409, 'Some teams have not chosen their gladiator.', 'GROUP_NOT_READY');

        await Mysql.withTransaction(async context => {
            const [group] = await Mysql.select(
                'SELECT log, (locked > NOW(3) - INTERVAL ? SECOND) AS busy FROM `groups` WHERE id = ? FOR UPDATE',
                [LOCK_SECONDS, groupId],
                context,
            );
            if (Number(group.busy) || (group.log !== null && !force)) {
                throw new CustomError(409, 'The group already fought or is fighting.', 'GROUP_BUSY');
            }
            await Mysql.update('groups', { locked: Mysql.raw('NOW(3)') }, { id: groupId }, context);
        });

        try {
            const battle = await new Battle({ origin: 'tourn', noitems: true }).addGladiators(members.map(member => member.gladiator));
            const { log, error } = await battle.run();
            if (log) await Mysql.update('groups', { log: log.id }, { id: groupId });
            return { hash: log?.hash ?? null, error };
        }
        finally {
            await Mysql.update('groups', { locked: null }, { id: groupId });
        }
    }

    /**
     * Records the latest round's results (survival times, deaths) and, once every group fought,
     * creates the next round from the teams still alive (manager only). Running it again is safe.
     *
     * @param {string} hash
     * @param {number} userId
     * @returns {Promise<{ status: 'waiting'|'next'|'end'|'rerun' }>} `rerun` when a battle log was unusable
     *   and its group must fight again.
     */
    static async advance(hash, userId) {
        const tournament = await TournamentRound.#managed(hash, userId);
        return Mysql.withTransaction(async context => {
            await Mysql.select('SELECT id FROM tournament WHERE id = ? FOR UPDATE', [tournament.id], context);
            const maxRound = await TournamentRound.maxRound(hash);
            const groups = await Mysql.select(`SELECT DISTINCT gr.id, gr.log FROM ${GROUP_JOIN} WHERE t.hash = ? AND gr.round = ?`, [hash, maxRound], context);

            const placed = [];
            for (const group of groups.filter(entry => entry.log !== null)) {
                let steps;
                try {
                    steps = expandSteps(await new BattleLog({ id: group.log }).simulation());
                }
                catch {
                    steps = null;
                }
                if (!steps?.length) {
                    await Mysql.update('groups', { log: null, locked: null }, { id: group.id }, context);
                    return { status: 'rerun' };
                }
                placed.push(...await TournamentRound.#recordGroup(hash, group.id, maxRound, steps, context));
            }

            if (groups.some(group => group.log === null)) return { status: 'waiting' };
            const alive = await Mysql.select(
                `SELECT DISTINCT te.id FROM ${GROUP_JOIN} INNER JOIN gladiator_teams glt ON glt.team = te.id
                WHERE t.hash = ? AND gr.round = ? AND glt.dead = 0 AND glt.gladiator IS NOT NULL`,
                [hash, maxRound],
                context,
            );
            if (alive.length <= 1) return { status: 'end' };

            // a second call sees the round created here as the latest one, still waiting for battles
            const aliveIds = new Set(alive.map(row => row.id));
            const order = placed.map(entry => ({ ...entry, dead: !aliveIds.has(entry.team) })).sort(placingOrder)
                .map(entry => entry.team).filter((team, index, list) => aliveIds.has(team) && list.indexOf(team) === index);
            const groupCount = Math.ceil(order.length / GROUP_SIZE);
            const created = await createGroups(maxRound + 1, groupCount, tournament.maxtime, context);
            let next = 0;
            for (const [index, groupId] of created.entries()) {
                const size = Math.ceil((order.length - next) / (groupCount - index));
                const members = order.slice(next, next + size).map(team => ({ team, groupid: groupId }));
                if (members.length) await Mysql.insert('group_teams', members, context);
                next += size;
            }
            return { status: 'next' };
        });
    }

    /**
     * Writes one group battle's survival times and deaths.
     *
     * @param {string} hash
     * @param {number} groupId
     * @param {number} round
     * @param {Array<Record<string, any>>} steps Expanded log.
     * @param {{ connection: unknown }} context
     * @returns {Promise<Array<{ team: number, time: number, hp: number, winner?: boolean }>>}
     */
    static async #recordGroup(hash, groupId, round, steps, context) {
        const members = await Mysql.select(
            `SELECT grt.id AS grt, glt.id AS glt, g.name, u.apelido, te.id AS team
            FROM group_teams grt INNER JOIN gladiators g ON g.cod = grt.gladiator INNER JOIN usuarios u ON u.id = g.master
            INNER JOIN gladiator_teams glt ON glt.gladiator = g.cod AND glt.team = grt.team INNER JOIN teams te ON te.id = grt.team
            INNER JOIN tournament t ON t.id = te.tournament WHERE grt.groupid = ? AND t.hash = ?`,
            [groupId, hash],
            context,
        );
        const byName = new Map(members.map(member => [`${member.name}@${member.apelido}`, member]));

        const results = [];
        for (const entry of survival(steps)) {
            const member = byName.get(`${entry.name}@${entry.user}`);
            if (!member) continue;
            await Mysql.update('group_teams', { lasttime: entry.time }, { id: member.grt }, context);
            if (!entry.winner) await Mysql.update('gladiator_teams', { dead: round }, { id: member.glt }, context);
            results.push({ team: member.team, time: entry.time, hp: entry.hp, winner: entry.winner });
        }
        return results;
    }

    /**
     * Ends the latest round's choosing time now (manager only).
     *
     * @param {string} hash
     * @param {number} userId
     */
    static async endTurn(hash, userId) {
        await TournamentRound.#managed(hash, userId);
        const round = await TournamentRound.maxRound(hash);
        const groups = await Mysql.select(`SELECT DISTINCT gr.id FROM ${GROUP_JOIN} WHERE t.hash = ? AND gr.round = ?`, [hash, round]);
        if (groups.length) await Mysql.update('groups', { deadline: Mysql.raw('NOW(3)') }, { id: groups.map(group => group.id) });
    }
}

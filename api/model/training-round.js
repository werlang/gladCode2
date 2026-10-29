import { WINNER_BONUS, placingOrder, survival, trainingScores } from '../helpers/battle-results.js';
import { expandSteps } from '../helpers/battle-stats.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { Battle } from './battle.js';
import { BattleLog } from './battle-log.js';

/**
 * A group's battle holds its lock this long (the runner gives a battle 30 s). A battle that failed
 * keeps it, so the viewers' pages retry it only after this pause.
 */
const LOCK_SECONDS = 60;
/** Tables of a training round, joined from a master's entry to its group. */
const ENTRY_JOIN = 'gladiator_training gt INNER JOIN training_groups tg ON tg.id = gt.groupid';

/**
 * @param {unknown} value A survival time from a FLOAT column (`122.29999...`).
 * @returns {number} Seconds, to the hundredth.
 */
function seconds(value) {
    return Math.round(Number(value ?? 0) * 100) / 100;
}

/**
 * The rounds of a started training (by its code): the masters fight in groups once the manager's
 * round time is up, score by how long they lasted, and meet the masters of similar scores in the
 * next round, until the training's time is over. Any signed-in viewer's page moves it on
 * ({@link TrainingRound.advance}), one battle at a time.
 */
export class TrainingRound {
    /**
     * @param {string} hash
     * @returns {Promise<Record<string, any>>} The training row with `now` and `ended`.
     * @throws {CustomError} 404 `TRAINING_NOT_FOUND`.
     */
    static async #training(hash) {
        const [training] = await Mysql.select(
            'SELECT id, name, description, manager, players, deadline, NOW(3) AS now, (deadline IS NOT NULL AND NOW(3) >= deadline) AS ended FROM training WHERE hash = ?',
            [hash],
        );
        if (!training) throw new CustomError(404, 'Training not found.', 'TRAINING_NOT_FOUND');
        return training;
    }

    /**
     * @param {number} trainingId
     * @param {Parameters<typeof Mysql.select>[2]} [context]
     * @returns {Promise<number|null>} The latest round, or null before the start.
     */
    static async #maxRound(trainingId, context = {}) {
        const [row] = await Mysql.select(`SELECT MAX(tg.round) AS round FROM ${ENTRY_JOIN} WHERE gt.training = ?`, [trainingId], context);
        return row?.round ?? null;
    }

    /**
     * A round as its page shows it, the final ranking (round 0 once the training's time is over)
     * or where to go.
     *
     * @param {string} hash
     * @param {number} round
     * @param {number} userId
     * @returns {Promise<{ status: 'redirect', round: number }|{ status: 'end', name: string, lastRound: number, ranking: object[] }|{ status: 'round', name: string, description: string, round: number, deadline: string|null, trainDeadline: string, now: string, end: boolean, manager: boolean, groups: object[] }>}
     * @throws {CustomError} 404 `TRAINING_NOT_FOUND`.
     */
    static async view(hash, round, userId) {
        const training = await TrainingRound.#training(hash);
        const maxRound = await TrainingRound.#maxRound(training.id);
        if (!maxRound) throw new CustomError(404, 'Training not found.', 'TRAINING_NOT_FOUND');
        const ended = Boolean(Number(training.ended));

        if (ended && round === 0) return TrainingRound.#ranking(training);
        if (round < 1 || round > maxRound) return { status: 'redirect', round: maxRound };
        // the round opened just before the time ran out never fought
        if (ended && round === maxRound && !await TrainingRound.#fought(training.id, round)) return { status: 'redirect', round: 0 };

        const rows = await Mysql.select(
            `SELECT gt.id, gt.gladiator, g.name, u.apelido, g.master, tg.id AS groupid, tg.deadline
            FROM ${ENTRY_JOIN} INNER JOIN gladiators g ON g.cod = gt.gladiator INNER JOIN usuarios u ON u.id = g.master
            WHERE gt.training = ? AND tg.round = ? ORDER BY tg.id, gt.id`,
            [training.id, round],
        );
        const earlier = await Mysql.select(
            `SELECT gt.gladiator, SUM(gt.score) AS score FROM ${ENTRY_JOIN} WHERE gt.training = ? AND tg.round < ? GROUP BY gt.gladiator`,
            [training.id, round],
        );
        const scores = new Map(earlier.map(row => [row.gladiator, Number(row.score)]));

        const groups = new Map();
        for (const row of rows) {
            if (!groups.has(row.groupid)) groups.set(row.groupid, { id: row.groupid, teams: [] });
            groups.get(row.groupid).teams.push({
                id: row.id, master: row.apelido, gladiator: row.name, mine: row.master === userId, score: scores.get(row.gladiator) ?? 0,
            });
        }
        return {
            status: 'round',
            name: training.name,
            description: training.description,
            round,
            deadline: rows[0]?.deadline ?? null,
            trainDeadline: training.deadline,
            now: training.now,
            end: ended,
            manager: training.manager === userId,
            groups: [...groups.values()],
        };
    }

    /**
     * @param {number} trainingId
     * @param {number} round
     * @returns {Promise<boolean>} Whether any group of the round fought.
     */
    static async #fought(trainingId, round) {
        const [row] = await Mysql.select(`SELECT COUNT(*) AS fought FROM ${ENTRY_JOIN} WHERE gt.training = ? AND tg.round = ? AND tg.log IS NOT NULL`, [trainingId, round]);
        return Number(row.fought) > 0;
    }

    /**
     * The final ranking: each gladiator's total score and average survival time (winners' bonus
     * taken out, unfought rounds left out).
     *
     * @param {Record<string, any>} training
     * @returns {Promise<{ status: 'end', name: string, lastRound: number, ranking: Array<{ gladiator: string, master: string, score: number, time: number }> }>}
     */
    static async #ranking(training) {
        const rows = await Mysql.select(
            `SELECT g.name, u.apelido, SUM(gt.score) AS score,
                (SELECT AVG(IF(gt2.lasttime > ?, gt2.lasttime - ?, gt2.lasttime)) FROM gladiator_training gt2
                WHERE gt2.training = gt.training AND gt2.gladiator = gt.gladiator AND gt2.lasttime > 0) AS time
            FROM gladiator_training gt INNER JOIN gladiators g ON g.cod = gt.gladiator INNER JOIN usuarios u ON u.id = g.master
            WHERE gt.training = ? GROUP BY gt.training, gt.gladiator, g.name, u.apelido ORDER BY score DESC, time DESC`,
            [WINNER_BONUS, WINNER_BONUS, training.id],
        );
        const [last] = await Mysql.select(`SELECT MAX(tg.round) AS round FROM ${ENTRY_JOIN} WHERE gt.training = ? AND tg.log IS NOT NULL`, [training.id]);
        return {
            status: 'end',
            name: training.name,
            lastRound: last?.round ?? 1,
            ranking: rows.map(row => ({ gladiator: row.name, master: row.apelido, score: Number(row.score), time: seconds(row.time) })),
        };
    }

    /**
     * How a round stands. `status`: `wait` for the manager's round time, `open` while it counts
     * down, `run` when a group is due to fight (call {@link TrainingRound.advance}), `busy` while
     * the due groups fight, `done` when every group fought, `end` when the training's time ran out
     * first. Fought groups carry their log and each master's score and survival time.
     *
     * @param {string} hash
     * @param {number} round
     * @returns {Promise<{ status: 'wait'|'open'|'run'|'busy'|'done'|'end', end: boolean, maxRound: number, now: string, deadline: string|null, trainDeadline: string|null, groups: object[] }>}
     */
    static async status(hash, round) {
        const training = await TrainingRound.#training(hash);
        const rows = await Mysql.select(
            `SELECT gt.id, gt.score, gt.lasttime, tg.id AS groupid, tg.deadline, (NOW(3) >= tg.deadline) AS due, l.hash AS log,
                (tg.locked > NOW(3) - INTERVAL ? SECOND) AS busy
            FROM ${ENTRY_JOIN} LEFT JOIN logs l ON l.id = tg.log WHERE gt.training = ? AND tg.round = ? ORDER BY tg.id, gt.id`,
            [LOCK_SECONDS, training.id, round],
        );
        if (!rows.length) throw new CustomError(404, 'Round not found.', 'ROUND_NOT_FOUND');

        const groups = new Map();
        for (const row of rows) {
            if (!groups.has(row.groupid)) {
                groups.set(row.groupid, { id: row.groupid, log: row.log, locked: Boolean(Number(row.busy)), due: Boolean(Number(row.due)), teams: [] });
            }
            if (row.log) {
                const time = Number(row.lasttime);
                const winner = time > WINNER_BONUS;
                groups.get(row.groupid).teams.push({ id: row.id, score: Number(row.score), time: seconds(winner ? time - WINNER_BONUS : time), winner });
            }
        }

        const ended = Boolean(Number(training.ended));
        const list = [...groups.values()];
        const deadline = rows[0]?.deadline ?? null;
        let status = 'run';
        if (list.every(group => group.log)) status = 'done';
        else if (ended) status = 'end';
        else if (deadline === null) status = 'wait';
        else if (!list.some(group => !group.log && group.due)) status = 'open';
        else if (list.every(group => group.log || group.locked || !group.due)) status = 'busy';

        return {
            status,
            end: ended,
            maxRound: await TrainingRound.#maxRound(training.id),
            now: training.now,
            deadline,
            trainDeadline: training.deadline,
            groups: list.map(({ due, ...group }) => group),
        };
    }

    /**
     * Moves the training on, as far as it can now: fights the latest round's next due group, or
     * opens the next round once every group fought. Safe to call from every viewer at once.
     *
     * @param {string} hash
     * @returns {Promise<{ status: 'fought', group: number, hash: string|null, error: string }|{ status: 'wait'|'busy'|'next'|'done'|'end' }>}
     */
    static async advance(hash) {
        const training = await TrainingRound.#training(hash);
        if (Number(training.ended)) return { status: 'end' };

        const step = await Mysql.withTransaction(async context => {
            await Mysql.select('SELECT id FROM training WHERE id = ? FOR UPDATE', [training.id], context);
            const round = await TrainingRound.#maxRound(training.id, context);
            if (!round) throw new CustomError(404, 'Training not found.', 'TRAINING_NOT_FOUND');
            const groups = await Mysql.select(
                `SELECT DISTINCT tg.id, tg.log, (NOW(3) >= tg.deadline) AS due, (tg.locked > NOW(3) - INTERVAL ? SECOND) AS busy
                FROM ${ENTRY_JOIN} WHERE gt.training = ? AND tg.round = ? ORDER BY tg.id`,
                [LOCK_SECONDS, training.id, round],
                context,
            );

            if (groups.every(group => group.log !== null)) {
                return TrainingRound.#openRound(training, round, context);
            }
            const next = groups.find(group => group.log === null && Number(group.due) && !Number(group.busy));
            if (!next) return { status: groups.some(group => group.log === null && Number(group.due)) ? 'busy' : 'wait' };
            await Mysql.update('training_groups', { locked: Mysql.raw('NOW(3)') }, { id: next.id }, context);
            return { status: 'fight', group: next.id };
        });
        if (step.status !== 'fight') return step;

        const result = await TrainingRound.#fight(training.id, step.group);
        return { status: 'fought', group: step.group, ...result };
    }

    /**
     * Runs a locked group's battle and scores it.
     *
     * @param {number} trainingId
     * @param {number} groupId
     * @returns {Promise<{ hash: string|null, error: string }>}
     */
    static async #fight(trainingId, groupId) {
        const members = await Mysql.select(
            `SELECT gt.id, g.cod, g.name, u.apelido FROM gladiator_training gt INNER JOIN gladiators g ON g.cod = gt.gladiator
            INNER JOIN usuarios u ON u.id = g.master WHERE gt.groupid = ? AND gt.training = ?`,
            [groupId, trainingId],
        );
        const battle = await new Battle({ origin: 'train' }).addGladiators(members.map(member => member.cod));
        const { log, error } = await battle.run();
        if (!log) return { hash: null, error };

        const steps = expandSteps(await new BattleLog({ id: log.id }).simulation());
        const placed = survival(steps).sort(placingOrder);
        const scores = trainingScores(placed);
        const byName = new Map(members.map(member => [`${member.name}@${member.apelido}`, member]));
        await Mysql.withTransaction(async context => {
            for (const [index, entry] of placed.entries()) {
                const member = byName.get(`${entry.name}@${entry.user}`);
                if (member) await Mysql.update('gladiator_training', { score: scores[index], lasttime: entry.time }, { id: member.id }, context);
            }
            await Mysql.update('training_groups', { log: log.id, locked: null }, { id: groupId }, context);
        });
        return { hash: log.hash, error };
    }

    /**
     * Opens the round after a fought one: the masters, ranked by their score in it, are split into
     * groups of about the training's battle size, the best together. Its battles wait for the
     * manager's round time.
     *
     * @param {Record<string, any>} training
     * @param {number} round The latest round, every group fought.
     * @param {{ connection: unknown }} context Inside the transaction holding the training row.
     * @returns {Promise<{ status: 'next'|'done' }>} `done` when no gladiator is left to fight.
     */
    static async #openRound(training, round, context) {
        const entries = await Mysql.select(
            `SELECT gt.gladiator FROM ${ENTRY_JOIN} WHERE gt.training = ? AND tg.round = ? AND gt.gladiator IS NOT NULL ORDER BY gt.score DESC, gt.lasttime DESC`,
            [training.id, round],
            context,
        );
        if (!entries.length) return { status: 'done' };
        const count = Math.ceil(entries.length / training.players);
        let next = 0;
        for (let index = 0; index < count; index++) {
            const size = Math.ceil((entries.length - next) / (count - index));
            const { insertId } = await Mysql.insert('training_groups', { round: round + 1 }, context);
            const members = entries.slice(next, next + size).map(entry => ({ gladiator: entry.gladiator, groupid: insertId, training: training.id }));
            await Mysql.insert('gladiator_training', members, context);
            next += size;
        }
        return { status: 'next' };
    }

    /**
     * The training row, for its manager.
     *
     * @param {string} hash
     * @param {number} userId
     * @returns {Promise<Record<string, any>>}
     * @throws {CustomError} 403 `MANAGER_ONLY`.
     */
    static async #managed(hash, userId) {
        const training = await TrainingRound.#training(hash);
        if (training.manager !== userId) throw new CustomError(403, 'Only the manager can do this.', 'MANAGER_ONLY');
        return training;
    }

    /**
     * Sets when a round's battles start (manager only).
     *
     * @param {string} hash
     * @param {number} round
     * @param {number} minutes From now; 0 starts them now.
     * @param {number} userId
     * @returns {Promise<string|null>} The round's deadline.
     */
    static async setDeadline(hash, round, minutes, userId) {
        const training = await TrainingRound.#managed(hash, userId);
        const groups = await Mysql.select(`SELECT DISTINCT tg.id FROM ${ENTRY_JOIN} WHERE gt.training = ? AND tg.round = ?`, [training.id, round]);
        if (!groups.length) throw new CustomError(404, 'Round not found.', 'ROUND_NOT_FOUND');
        await Mysql.update('training_groups', { deadline: Mysql.raw(`NOW(3) + INTERVAL ${Number(minutes)} MINUTE`) }, { id: groups.map(group => group.id) });
        const [{ deadline }] = await Mysql.select('SELECT deadline FROM training_groups WHERE id = ?', [groups[0].id]);
        return deadline;
    }

    /**
     * Ends the training now (manager only).
     *
     * @param {string} hash
     * @param {number} userId
     */
    static async end(hash, userId) {
        const training = await TrainingRound.#managed(hash, userId);
        // the column keeps whole seconds and NOW(3) would round up, leaving the training open a moment
        await Mysql.update('training', { deadline: Mysql.raw('NOW()') }, { id: training.id });
    }

    /**
     * Makes a group of the latest round fight again now, its scores cleared (manager only). Only
     * the latest round's groups fight, so an earlier one would stay unfought with no score.
     *
     * @param {string} hash
     * @param {number} groupId
     * @param {number} userId
     * @throws {CustomError} 404 `GROUP_NOT_FOUND`, 409 `ROUND_OVER`.
     */
    static async rerun(hash, groupId, userId) {
        const training = await TrainingRound.#managed(hash, userId);
        await Mysql.withTransaction(async context => {
            const [group] = await Mysql.select(`SELECT DISTINCT tg.round FROM ${ENTRY_JOIN} WHERE gt.training = ? AND tg.id = ?`, [training.id, groupId], context);
            if (!group) throw new CustomError(404, 'Group not found.', 'GROUP_NOT_FOUND');
            if (group.round !== await TrainingRound.#maxRound(training.id, context)) throw new CustomError(409, 'This round is over.', 'ROUND_OVER');

            await Mysql.update('training_groups', { deadline: Mysql.raw('NOW(3)'), locked: null, log: null }, { id: groupId }, context);
            await Mysql.update('gladiator_training', { score: 0, lasttime: 0 }, { groupid: groupId }, context);
        });
    }
}

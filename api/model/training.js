import { randomInt } from 'node:crypto';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { shuffle } from './tournament.js';

/** Trainings per list page. */
export const TRAININGS_PAGE_SIZE = 10;
/** Characters and length of an invitation code (`8SIJ`). */
const CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CODE_SIZE = 4;
/** Codes tried before giving up on finding a free one. */
const CODE_ATTEMPTS = 20;

/**
 * A random invitation code. Codes are short so a class can type them, and unique among trainings.
 *
 * @returns {string}
 */
export function invitationCode() {
    let code = '';
    for (let index = 0; index < CODE_SIZE; index++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
    return code;
}

/**
 * Trainings (`training`): a tutor gathers masters (`gladiator_training`) with an invitation code
 * that works for an hour, then starts it. The code then names the training's round pages, which
 * live in `model/training-round.js`.
 */
export class Training {
    /**
     * @returns {Promise<string>} An invitation code no training uses.
     * @throws {CustomError} 503 `CODE_UNAVAILABLE`.
     */
    static async #newCode() {
        for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
            const code = invitationCode();
            if (!await Mysql.count('training', { hash: code })) return code;
        }
        throw new CustomError(503, 'No invitation code is free, try again.', 'CODE_UNAVAILABLE');
    }

    /**
     * Creates a training (tutor accounts with credits).
     *
     * @param {{ id: number, premium: unknown, credits: number }} user
     * @param {{ name: string, description: string, maxMinutes: number, players: number, weight: number }} training
     * @returns {Promise<{ id: number, hash: string }>}
     * @throws {CustomError} 403 `TUTOR_ONLY`, 402 `NO_CREDITS`.
     */
    static async create(user, { name, description, maxMinutes, players, weight }) {
        if (!user.premium) throw new CustomError(403, 'Only tutor accounts can create trainings.', 'TUTOR_ONLY');
        if (Number(user.credits) <= 0) throw new CustomError(402, 'No credits left.', 'NO_CREDITS');

        const hash = await Training.#newCode();
        const { insertId } = await Mysql.insert('training', {
            manager: user.id, name, description, creation: Mysql.raw('NOW(3)'), maxtime: maxMinutes, players, weight,
            hash, hash_valid: Mysql.raw('NOW(3) + INTERVAL 1 HOUR'),
        });
        return { id: insertId, hash };
    }

    /**
     * Pages of the trainings the master manages and of those they take part in. An offset past the
     * end shows the last page.
     *
     * @param {number} userId
     * @param {{ manage: number, part: number }} offsets
     * @returns {Promise<{ manage: object[], part: object[], pages: Record<'manage'|'part', { offset: number, total: number }> }>}
     */
    static async list(userId, offsets) {
        const columns = 't.id, t.name, t.description, (SELECT COUNT(DISTINCT gladiator) FROM gladiator_training WHERE training = t.id) AS masters';
        const partWhere = 't.id IN (SELECT gt.training FROM gladiator_training gt INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE g.master = ?)';
        const [{ total: manageTotal }] = await Mysql.select('SELECT COUNT(*) AS total FROM training t WHERE t.manager = ?', [userId]);
        const [{ total: partTotal }] = await Mysql.select(`SELECT COUNT(*) AS total FROM training t WHERE ${partWhere}`, [userId]);
        const page = (offset, total) => (offset >= total ? Math.max(0, offset - TRAININGS_PAGE_SIZE) : Math.max(0, offset));
        const manageOffset = page(offsets.manage, Number(manageTotal));
        const partOffset = page(offsets.part, Number(partTotal));

        const manage = await Mysql.select(
            `SELECT ${columns} FROM training t WHERE t.manager = ? ORDER BY t.creation DESC LIMIT ? OFFSET ?`,
            [userId, TRAININGS_PAGE_SIZE, manageOffset],
        );
        const part = await Mysql.select(
            `SELECT ${columns} FROM training t WHERE ${partWhere} ORDER BY t.creation DESC LIMIT ? OFFSET ?`,
            [userId, TRAININGS_PAGE_SIZE, partOffset],
        );
        const json = row => ({ id: row.id, name: row.name, description: row.description, masters: Number(row.masters) });
        return {
            manage: manage.map(json),
            part: part.map(json),
            pages: { manage: { offset: manageOffset, total: Number(manageTotal) }, part: { offset: partOffset, total: Number(partTotal) } },
        };
    }

    /**
     * @param {number} id
     * @param {Parameters<typeof Mysql.select>[2]} [context]
     * @returns {Promise<boolean>} Whether the training started (its masters have groups).
     */
    static async started(id, context = {}) {
        const [row] = await Mysql.select('SELECT COUNT(*) AS started FROM gladiator_training WHERE training = ? AND groupid IS NOT NULL', [id], context);
        return Number(row.started) > 0;
    }

    /**
     * @param {number} trainingId
     * @param {number} userId
     * @param {Parameters<typeof Mysql.select>[2]} [context]
     * @returns {Promise<boolean>} Whether the master has a gladiator in the training.
     */
    static async #joined(trainingId, userId, context = {}) {
        const [row] = await Mysql.select(
            'SELECT COUNT(*) AS joined FROM gladiator_training gt INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE gt.training = ? AND g.master = ?',
            [trainingId, userId],
            context,
        );
        return Number(row.joined) > 0;
    }

    /**
     * The training an invitation code opens and what the master can do with it. Started and joined
     * trainings are reported even after the invitation expired.
     *
     * @param {number} userId
     * @param {string} hash Invitation code.
     * @param {Parameters<typeof Mysql.select>[2]} [context]
     * @returns {Promise<{ id: number, name: string, status: 'open'|'joined'|'started' }>}
     * @throws {CustomError} 404 `TRAINING_NOT_FOUND`, 410 `INVITATION_EXPIRED`.
     */
    static async invitation(userId, hash, context = {}) {
        const [row] = await Mysql.select(
            `SELECT id, name, (hash_valid < NOW()) AS expired FROM training WHERE hash = ?${context.connection ? ' FOR UPDATE' : ''}`,
            [hash],
            context,
        );
        if (!row) throw new CustomError(404, 'Training not found.', 'TRAINING_NOT_FOUND');

        const training = { id: row.id, name: row.name };
        if (await Training.started(row.id, context)) return { ...training, status: 'started' };
        if (await Training.#joined(row.id, userId, context)) return { ...training, status: 'joined' };
        if (Number(row.expired)) throw new CustomError(410, 'The invitation expired.', 'INVITATION_EXPIRED');
        return { ...training, status: 'open' };
    }

    /**
     * Enters one of the master's gladiators in the training an invitation code opens.
     *
     * @param {number} userId
     * @param {string} hash Invitation code.
     * @param {number} gladiator
     * @returns {Promise<{ id: number, name: string }>}
     * @throws {CustomError} 404 `TRAINING_NOT_FOUND`/`GLADIATOR_NOT_FOUND`, 409 `TRAINING_STARTED`/`ALREADY_JOINED`,
     *   410 `INVITATION_EXPIRED`.
     */
    static async join(userId, hash, gladiator) {
        await Training.#ownGladiator(userId, gladiator);
        return Mysql.withTransaction(async context => {
            const training = await Training.invitation(userId, hash, context);
            if (training.status === 'started') throw new CustomError(409, 'The training has started.', 'TRAINING_STARTED');
            if (training.status === 'joined') throw new CustomError(409, 'You already are in this training.', 'ALREADY_JOINED');
            await Mysql.insert('gladiator_training', { gladiator, training: training.id, score: 0 }, context);
            return { id: training.id, name: training.name };
        });
    }

    /**
     * @param {number} userId
     * @param {number} gladiatorId
     * @throws {CustomError} 404 `GLADIATOR_NOT_FOUND` when the gladiator is not the master's.
     */
    static async #ownGladiator(userId, gladiatorId) {
        if (!await Mysql.count('gladiators', { cod: gladiatorId, master: userId })) {
            throw new CustomError(404, 'Gladiator not found.', 'GLADIATOR_NOT_FOUND');
        }
    }

    /**
     * A training waiting to start, as its manager (`manage`, with the invitation and the
     * participants' gladiator ids) or a participant (`participate`) sees it.
     *
     * @param {number} userId
     * @param {number} id
     * @returns {Promise<{ status: 'started', hash: string }|{ status: 'manage'|'participate', name: string, description: string, maxMinutes: number, players: number, expired?: boolean, hash?: string, gladiators: object[] }>}
     * @throws {CustomError} 404 `TRAINING_NOT_FOUND`, 403 `NOT_A_MEMBER`.
     */
    static async room(userId, id) {
        const [training] = await Mysql.select('SELECT *, (hash_valid < NOW()) AS expired FROM training WHERE id = ?', [id]);
        if (!training) throw new CustomError(404, 'Training not found.', 'TRAINING_NOT_FOUND');
        if (await Training.started(id)) return { status: 'started', hash: training.hash };

        const manager = training.manager === userId;
        if (!manager && !await Training.#joined(id, userId)) throw new CustomError(403, 'You are not in this training.', 'NOT_A_MEMBER');

        const rows = await Mysql.select(
            `SELECT g.cod, g.name, g.master, u.apelido FROM gladiator_training gt INNER JOIN gladiators g ON g.cod = gt.gladiator
            INNER JOIN usuarios u ON u.id = g.master WHERE gt.training = ? ORDER BY gt.id`,
            [id],
        );
        const room = { name: training.name, description: training.description, maxMinutes: training.maxtime, players: training.players };
        if (manager) {
            return {
                status: 'manage', ...room, expired: Boolean(Number(training.expired)), hash: training.hash,
                gladiators: rows.map(row => ({ id: row.cod, gladiator: row.name, master: row.apelido })),
            };
        }
        return { status: 'participate', ...room, gladiators: rows.map(row => ({ gladiator: row.name, master: row.apelido, mine: row.master === userId })) };
    }

    /**
     * The training row, for its manager, before it starts.
     *
     * @param {number} userId
     * @param {number} id
     * @param {{ connection?: unknown }} [context]
     * @returns {Promise<Record<string, any>>}
     * @throws {CustomError} 404 `TRAINING_NOT_FOUND`, 403 `MANAGER_ONLY`, 409 `TRAINING_STARTED`.
     */
    static async #managedOpen(userId, id, context = {}) {
        const training = await Mysql.findOne('training', { filter: { id }, opt: { forUpdate: Boolean(context.connection) } }, context);
        if (!training) throw new CustomError(404, 'Training not found.', 'TRAINING_NOT_FOUND');
        if (training.manager !== userId) throw new CustomError(403, 'Only the manager can do this.', 'MANAGER_ONLY');
        if (await Training.started(id, context)) throw new CustomError(409, 'The training has started.', 'TRAINING_STARTED');
        return training;
    }

    /**
     * Renames a training or changes its description (manager only, before the start).
     *
     * @param {number} userId
     * @param {number} id
     * @param {{ name?: string, description?: string }} changes
     */
    static async update(userId, id, changes) {
        await Training.#managedOpen(userId, id);
        const fields = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
        if (Object.keys(fields).length) await Mysql.update('training', fields, { id });
    }

    /**
     * Issues a new invitation code, valid for an hour (manager only, before the start).
     *
     * @param {number} userId
     * @param {number} id
     * @returns {Promise<string>} The new code.
     */
    static async renew(userId, id) {
        await Training.#managedOpen(userId, id);
        const hash = await Training.#newCode();
        await Mysql.update('training', { hash, hash_valid: Mysql.raw('NOW(3) + INTERVAL 1 HOUR') }, { id });
        return hash;
    }

    /**
     * Removes a participant's gladiator (manager only, before the start).
     *
     * @param {number} userId
     * @param {number} id
     * @param {number} gladiator
     * @throws {CustomError} 404 `GLADIATOR_NOT_FOUND`.
     */
    static async kick(userId, id, gladiator) {
        await Training.#managedOpen(userId, id);
        if (!await Mysql.delete('gladiator_training', { training: id, gladiator })) throw new CustomError(404, 'Gladiator not found in the training.', 'GLADIATOR_NOT_FOUND');
    }

    /**
     * The master's entry in a training that has not started.
     *
     * @param {number} userId
     * @param {number} id
     * @returns {Promise<{ id: number }>} The `gladiator_training` row.
     * @throws {CustomError} 409 `TRAINING_STARTED`, 404 `NOT_A_MEMBER`.
     */
    static async #openEntry(userId, id) {
        if (await Training.started(id)) throw new CustomError(409, 'The training has started.', 'TRAINING_STARTED');
        const [entry] = await Mysql.select(
            'SELECT gt.id FROM gladiator_training gt INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE gt.training = ? AND g.master = ?',
            [id, userId],
        );
        if (!entry) throw new CustomError(404, 'You are not in this training.', 'NOT_A_MEMBER');
        return entry;
    }

    /**
     * Leaves a training before it starts.
     *
     * @param {number} userId
     * @param {number} id
     */
    static async leave(userId, id) {
        const entry = await Training.#openEntry(userId, id);
        await Mysql.delete('gladiator_training', { id: entry.id });
    }

    /**
     * Swaps the master's gladiator in a training before it starts.
     *
     * @param {number} userId
     * @param {number} id
     * @param {number} gladiator
     */
    static async changeGladiator(userId, id, gladiator) {
        await Training.#ownGladiator(userId, gladiator);
        const entry = await Training.#openEntry(userId, id);
        await Mysql.update('gladiator_training', { gladiator }, { id: entry.id });
    }

    /**
     * Deletes a training with its rounds and scores (manager only). Battle logs stay.
     *
     * @param {number} userId
     * @param {number} id
     * @throws {CustomError} 404 `TRAINING_NOT_FOUND`, 403 `MANAGER_ONLY`.
     */
    static async remove(userId, id) {
        await Mysql.withTransaction(async context => {
            const training = await Mysql.findOne('training', { filter: { id }, opt: { forUpdate: true } }, context);
            if (!training) throw new CustomError(404, 'Training not found.', 'TRAINING_NOT_FOUND');
            if (training.manager !== userId) throw new CustomError(403, 'Only the manager can do this.', 'MANAGER_ONLY');

            const groups = await Mysql.select('SELECT DISTINCT groupid FROM gladiator_training WHERE training = ? AND groupid IS NOT NULL', [id], context);
            await Mysql.delete('gladiator_training', { training: id }, context);
            if (groups.length) await Mysql.delete('training_groups', { id: groups.map(group => group.groupid) }, context);
            await Mysql.delete('training', { id }, context);
        });
    }

    /**
     * Starts a training (manager only): the participants are shuffled into groups of about the
     * training's battle size for round 1, and the training ends `maxtime` minutes from now.
     *
     * @param {number} userId
     * @param {number} id
     * @returns {Promise<string>} The training's code, which names its round pages.
     * @throws {CustomError} 409 `FEW_PLAYERS`.
     */
    static async start(userId, id) {
        return Mysql.withTransaction(async context => {
            const training = await Training.#managedOpen(userId, id, context);
            const entries = await Mysql.select('SELECT id FROM gladiator_training WHERE training = ? AND gladiator IS NOT NULL', [id], context);
            if (entries.length < training.players) throw new CustomError(409, 'The training needs more masters.', 'FEW_PLAYERS');

            const count = Math.ceil(entries.length / training.players);
            const groups = [];
            for (let index = 0; index < count; index++) {
                const { insertId } = await Mysql.insert('training_groups', { round: 1 }, context);
                groups.push(insertId);
            }
            for (const [index, entry] of shuffle(entries.map(row => row.id)).entries()) {
                await Mysql.update('gladiator_training', { groupid: groups[index % count] }, { id: entry }, context);
            }
            await Mysql.update('training', { deadline: Mysql.raw(`NOW(3) + INTERVAL ${Number(training.maxtime)} MINUTE`) }, { id }, context);
            return training.hash;
        });
    }
}

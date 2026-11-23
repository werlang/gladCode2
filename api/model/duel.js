import { sendMail } from '../helpers/email.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';
import { Battle } from './battle.js';
import { Friendship } from './friendship.js';
import { Gladiator } from './gladiator.js';

/**
 * One duel row seen from the master's side; `user` is the other master's nick.
 *
 * @param {Record<string, any>} row
 * @param {number} userId
 * @returns {{ id: number, time: string, log: string, read: boolean, glad: string, enemy: string, user: string }}
 */
function duelJson(row, userId) {
    const mine = row.user1 === userId;
    return {
        id: row.id,
        time: row.time,
        log: row.log,
        read: Boolean(Number(row.isread)),
        glad: mine ? row.glad1 : row.glad2,
        enemy: mine ? row.glad2 : row.glad1,
        user: mine ? row.nick2 : row.nick1,
    };
}

/** Duels per history page. */
export const DUELS_PAGE_SIZE = 10;

/**
 * Duels between friends (`duels`): `user1` challenges `user2` with `gladiator1`; the challenged
 * master answers with `gladiator2` and the battle's hash lands in `log`.
 */
export class Duel {
    /**
     * Challenges waiting for the master's answer.
     *
     * @param {number} userId
     * @returns {Promise<Array<{ id: number, time: string, nick: string, level: number, picture: string }>>}
     */
    static async challenges(userId) {
        const rows = await Mysql.select(
            `SELECT d.id, d.time, u.apelido, u.foto, u.lvl FROM duels d INNER JOIN usuarios u ON u.id = d.user1
            WHERE d.user2 = ? AND d.log IS NULL ORDER BY d.time DESC`,
            [userId],
        );
        return rows.map(row => ({ id: row.id, time: row.time, nick: row.apelido, level: row.lvl, picture: row.foto }));
    }

    /**
     * Challenges a friend with one of the master's gladiators and emails them (unless they opted out).
     *
     * @param {{ id: number, apelido: string }} user
     * @param {number} friendId
     * @param {number} gladiatorId
     * @throws {CustomError} 403 `NOT_FRIENDS`, 404 `GLADIATOR_NOT_FOUND`, 409 `DUEL_EXISTS`.
     */
    static async challenge(user, friendId, gladiatorId) {
        if (!await Friendship.areFriends(user.id, friendId)) throw new CustomError(403, 'You can only challenge friends.', 'NOT_FRIENDS');
        await Gladiator.findOwned(gladiatorId, user.id);
        if (await Mysql.count('duels', { user2: friendId, gladiator1: gladiatorId, log: null })) {
            throw new CustomError(409, 'This friend already has this challenge.', 'DUEL_EXISTS');
        }

        await Mysql.insert('duels', { user1: user.id, gladiator1: gladiatorId, user2: friendId, time: Mysql.raw('NOW()') });
        const friend = await Mysql.findOne('usuarios', { filter: { id: friendId }, view: ['apelido', 'email', 'pref_duel'] });
        if (Number(friend.pref_duel)) {
            await sendMail('duel', {
                subject: `Desafio para duelo contra ${user.apelido}`,
                recipients: [{ email: friend.email, name: friend.apelido }],
                vars: { friendnick: friend.apelido, usernick: user.apelido },
            });
        }
    }

    /**
     * Refuses a challenge or withdraws one the master made.
     *
     * @param {number} userId
     * @param {number} duelId
     * @throws {CustomError} 404 `DUEL_NOT_FOUND`.
     */
    static async remove(userId, duelId) {
        const [duel] = await Mysql.select('SELECT id FROM duels WHERE id = ? AND (user1 = ? OR user2 = ?)', [duelId, userId, userId]);
        if (!duel) throw new CustomError(404, 'Duel not found.', 'DUEL_NOT_FOUND');
        await Mysql.delete('duels', { id: duelId });
    }

    /**
     * A page of the master's duels (fought ones, and challenges they sent that wait for an answer),
     * newest first. Fought duels the master started are marked as read.
     *
     * @param {number} userId
     * @param {number} offset
     * @returns {Promise<{ total: number, duels: object[] }>} Each duel: `{ id, time, log, read, glad, enemy, user }`
     *   seen from the master's side (`user` is the other master's nick).
     */
    static async history(userId, offset) {
        const where = '((d.user1 = ? OR d.user2 = ?) AND d.log IS NOT NULL) OR (d.user1 = ? AND d.log IS NULL)';
        const [{ total }] = await Mysql.select(`SELECT COUNT(*) AS total FROM duels d WHERE ${where}`, [userId, userId, userId]);
        const rows = await Mysql.select(
            `SELECT d.id, d.time, d.log, d.isread, g1.name AS glad1, g2.name AS glad2, u1.apelido AS nick1, u2.apelido AS nick2, d.user1
            FROM duels d LEFT JOIN gladiators g1 ON g1.cod = d.gladiator1 LEFT JOIN gladiators g2 ON g2.cod = d.gladiator2
            INNER JOIN usuarios u1 ON u1.id = d.user1 INNER JOIN usuarios u2 ON u2.id = d.user2
            WHERE ${where} ORDER BY d.time DESC LIMIT ? OFFSET ?`,
            [userId, userId, userId, DUELS_PAGE_SIZE, Math.max(0, offset)],
        );
        await Mysql.update('duels', { isread: 1 }, { user1: userId, log: { not: null }, isread: 0 });

        return { total: Number(total), duels: rows.map(row => duelJson(row, userId)) };
    }

    /**
     * Finished duels the master has not read, without marking them read. This is the bell's passive
     * duel feed; opening a report history still marks rows read where the model already does.
     *
     * @param {number} userId
     * @returns {Promise<object[]>}
     */
    static async unreadReports(userId) {
        const rows = await Mysql.select(
            `SELECT d.id, d.time, d.log, d.isread, g1.name AS glad1, g2.name AS glad2, u1.apelido AS nick1, u2.apelido AS nick2, d.user1
            FROM duels d LEFT JOIN gladiators g1 ON g1.cod = d.gladiator1 LEFT JOIN gladiators g2 ON g2.cod = d.gladiator2
            INNER JOIN usuarios u1 ON u1.id = d.user1 INNER JOIN usuarios u2 ON u2.id = d.user2
            WHERE d.isread = 0 AND d.log IS NOT NULL AND (d.user1 = ? OR d.user2 = ?)
            ORDER BY d.time DESC`,
            [userId, userId],
        );
        return rows.map(row => duelJson(row, userId));
    }

    /**
     * Answers a challenge: the master's gladiator fights the challenger's.
     *
     * @param {{ id: number }} user The challenged master.
     * @param {number} duelId
     * @param {number} gladiatorId
     * @returns {Promise<{ hash: string|null, error: string }>}
     * @throws {CustomError} 404 `DUEL_NOT_FOUND`/`GLADIATOR_NOT_FOUND`, 409 `DUEL_GLADIATOR_GONE`/`GLADIATOR_OUTDATED`/`DUEL_ANSWERED`.
     */
    static async fight(user, duelId, gladiatorId) {
        const duel = await Mysql.findOne('duels', { filter: { id: duelId, user2: user.id, log: null } });
        if (!duel) throw new CustomError(404, 'Duel not found.', 'DUEL_NOT_FOUND');
        if (!duel.gladiator1) throw new CustomError(409, 'The challenger\'s gladiator no longer exists.', 'DUEL_GLADIATOR_GONE');

        await Gladiator.findOwned(gladiatorId, user.id);
        const outdated = await Mysql.count('gladiators', { cod: [gladiatorId, duel.gladiator1], version: { not: VERSION } });
        if (outdated) throw new CustomError(409, 'Both gladiators must be saved on the current version.', 'GLADIATOR_OUTDATED');

        const battle = await new Battle({ origin: 'duel' }).addGladiators([gladiatorId, duel.gladiator1]);
        const { log, error } = await battle.run();
        if (!log) return { hash: null, error };

        // two answers at once (a double click) both fight: only the first to finish is kept
        const answered = await Mysql.update('duels', { log: log.hash, gladiator2: gladiatorId, time: Mysql.raw('NOW()') }, { id: duelId, user2: user.id, log: null });
        if (!answered) {
            await log.delete();
            throw new CustomError(409, 'This duel was already answered.', 'DUEL_ANSWERED');
        }
        return { hash: log.hash, error: '' };
    }
}

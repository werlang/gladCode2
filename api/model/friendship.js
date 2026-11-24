import { sendMail } from '../helpers/email.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';

/** A master is online when active within this many minutes. */
export const ONLINE_MINUTES = 5;

/** Columns of a friend as the profile shows them. */
const FRIEND_COLUMNS = 'a.cod AS id, u.id AS user, u.apelido AS nick, u.lvl AS level, u.foto AS picture';

/**
 * @param {Record<string, any>} row
 * @param {Map<number, { bestGladiator: string, bestRenown: number }>} [best]
 * @returns {Record<string, unknown>}
 */
function friendJson(row, best = new Map()) {
    const friend = {
        id: row.id,
        user: Number(row.user),
        nick: row.nick,
        level: Number(row.level) || 0,
        picture: row.picture,
        online: row.idle !== null && row.idle !== undefined && Number(row.idle) <= ONLINE_MINUTES,
    };
    if (row.idle !== undefined) friend.idleMinutes = Number(row.idle);
    if (row.mutual !== undefined) friend.mutual = Number(row.mutual) || 0;
    const gladiator = best.get(Number(row.user));
    if (gladiator) {
        friend.bestGladiator = gladiator.bestGladiator;
        friend.bestRenown = gladiator.bestRenown;
    }
    return friend;
}

/**
 * The best gladiator of each master, by the ranking order.
 *
 * @param {number[]} userIds
 * @returns {Promise<Map<number, { bestGladiator: string, bestRenown: number }>>}
 */
async function bestGladiators(userIds) {
    if (!userIds.length) return new Map();
    const rows = await Mysql.select(
        `SELECT master, gladiator, renown FROM (
            SELECT g.master, g.name AS gladiator, g.mmr AS renown,
                ROW_NUMBER() OVER (PARTITION BY g.master ORDER BY g.mmr DESC, g.cod ASC) AS place
            FROM gladiators g WHERE g.master IN (${userIds.map(() => '?').join(',')})
        ) ranked WHERE place = 1`,
        userIds,
    );
    return new Map(rows.map(row => [Number(row.master), {
        bestGladiator: row.gladiator,
        bestRenown: Number(row.renown) || 0,
    }]));
}

/**
 * Friendships between masters (`amizade`): `usuario1` asked `usuario2`; `pendente` until accepted.
 */
export class Friendship {
    /**
     * @param {number} userId
     * @returns {Promise<{ pending: object[], confirmed: object[] }>} Requests to answer, and friends
     *   with how long ago they were active.
     */
    static async list(userId) {
        const pending = await Mysql.select(
            `SELECT a.cod AS id, u.id AS user, u.apelido AS nick, u.lvl AS level, u.foto AS picture,
                TIMESTAMPDIFF(MINUTE, u.ativo, NOW()) AS idle
            FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario1 WHERE a.usuario2 = ? AND a.pendente = 1`,
            [userId],
        );
        const confirmed = await Mysql.select(
            `SELECT ${FRIEND_COLUMNS}, TIMESTAMPDIFF(MINUTE, u.ativo, NOW()) AS idle FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario1 WHERE a.usuario2 = ? AND a.pendente = 0
            UNION SELECT ${FRIEND_COLUMNS}, TIMESTAMPDIFF(MINUTE, u.ativo, NOW()) AS idle FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario2 WHERE a.usuario1 = ? AND a.pendente = 0`,
            [userId, userId],
        );
        const friends = await Friendship.friendIds(userId);
        const best = await bestGladiators(confirmed.map(friend => Number(friend.user)));
        for (const request of pending) {
            request.mutual = await Friendship.#mutual(userId, Number(request.user), friends);
        }
        return {
            pending: pending.map(request => friendJson(request)),
            confirmed: confirmed.map(friend => friendJson(friend, best)),
        };
    }

    /**
     * The confirmed friend ids of one master.
     *
     * @param {number} userId
     * @returns {Promise<Set<number>>}
     */
    static async friendIds(userId) {
        const rows = await Mysql.select(
            `SELECT usuario2 AS friend FROM amizade WHERE usuario1 = ? AND pendente = 0
            UNION SELECT usuario1 AS friend FROM amizade WHERE usuario2 = ? AND pendente = 0`,
            [userId, userId],
        );
        return new Set(rows.map(row => Number(row.friend)));
    }

    /**
     * How many confirmed friends two masters share.
     *
     * @param {number} userId
     * @param {number} otherId
     * @param {Set<number>} [mine] The first master's friend ids, when already read.
     * @returns {Promise<number>}
     */
    static async #mutual(userId, otherId, mine = null) {
        const current = mine ?? await Friendship.friendIds(userId);
        const ids = [...current];
        if (!ids.length) return 0;
        const [{ mutual }] = await Mysql.select(
            `SELECT COUNT(*) AS mutual FROM (
                SELECT usuario2 AS friend FROM amizade WHERE usuario1 = ? AND pendente = 0
                UNION SELECT usuario1 AS friend FROM amizade WHERE usuario2 = ? AND pendente = 0
            ) theirs WHERE theirs.friend IN (${ids.map(() => '?').join(',')})`,
            [otherId, otherId, ...ids],
        );
        return Number(mutual) || 0;
    }

    /**
     * The master's friends whose nickname contains a text.
     *
     * @param {number} userId
     * @param {string} text
     * @returns {Promise<object[]>}
     */
    static async filter(userId, text) {
        const like = Mysql.contains(text);
        const rows = await Mysql.select(
            `SELECT ${FRIEND_COLUMNS}, TIMESTAMPDIFF(MINUTE, u.ativo, NOW()) AS idle FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario1 WHERE a.usuario2 = ? AND a.pendente = 0 AND u.apelido LIKE ?
            UNION SELECT ${FRIEND_COLUMNS}, TIMESTAMPDIFF(MINUTE, u.ativo, NOW()) AS idle FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario2 WHERE a.usuario1 = ? AND a.pendente = 0 AND u.apelido LIKE ?`,
            [userId, like, userId, like],
        );
        const best = await bestGladiators(rows.map(friend => Number(friend.user)));
        return rows.map(friend => friendJson(friend, best));
    }

    /**
     * Masters to befriend, by nickname (never their email).
     *
     * @param {number} userId The searching master, left out.
     * @param {string} text
     * @returns {Promise<Array<{ user: number, nick: string }>>}
     */
    static async search(userId, text) {
        const rows = await Mysql.select(
            `SELECT u.id AS user, u.apelido AS nick, u.lvl AS level, u.foto AS picture,
                CASE
                    WHEN a.cod IS NULL THEN 'none'
                    WHEN a.pendente = 0 THEN 'friends'
                    WHEN a.usuario1 = ? THEN 'sent'
                    ELSE 'incoming'
                END AS state
            FROM usuarios u
            LEFT JOIN amizade a
                ON (a.usuario1 = u.id AND a.usuario2 = ?) OR (a.usuario1 = ? AND a.usuario2 = u.id)
            WHERE u.apelido LIKE ? AND u.id != ?
            LIMIT 10`,
            [userId, userId, userId, Mysql.contains(text), userId],
        );
        return rows.map(row => ({
            user: Number(row.user),
            nick: row.nick,
            level: Number(row.level) || 0,
            picture: row.picture,
            state: row.state,
        }));
    }

    /**
     * Asks a master for friendship and emails them (unless they opted out).
     *
     * @param {{ id: number, apelido: string }} user
     * @param {number} friendId
     * @throws {CustomError} 404 `USER_NOT_FOUND`, 409 `FRIENDSHIP_EXISTS`.
     */
    static async request(user, friendId) {
        const friend = await Mysql.findOne('usuarios', { filter: { id: friendId }, view: ['id', 'apelido', 'email', 'pref_friend'] });
        if (!friend || friend.id === user.id) throw new CustomError(404, 'Master not found.', 'USER_NOT_FOUND');
        if (await Friendship.#between(user.id, friendId)) throw new CustomError(409, 'You are already friends or asked before.', 'FRIENDSHIP_EXISTS');

        await Mysql.insert('amizade', { usuario1: user.id, usuario2: friendId });
        if (Number(friend.pref_friend)) {
            await sendMail('friend', {
                subject: `Pedido de amizade de ${user.apelido}`,
                recipients: [{ email: friend.email, name: friend.apelido }],
                vars: { usernick: friend.apelido, sendernick: user.apelido },
            });
        }
    }

    /**
     * @param {number} a
     * @param {number} b
     * @returns {Promise<Record<string, any>|null>} The friendship row between two masters, in either direction.
     */
    static async #between(a, b) {
        const [row] = await Mysql.select('SELECT cod, pendente FROM amizade WHERE (usuario1 = ? AND usuario2 = ?) OR (usuario1 = ? AND usuario2 = ?) LIMIT 1', [a, b, b, a]);
        return row ?? null;
    }

    /**
     * @param {number} a
     * @param {number} b
     * @returns {Promise<boolean>} Whether two masters are confirmed friends.
     */
    static async areFriends(a, b) {
        const row = await Friendship.#between(a, b);
        return Boolean(row && !Number(row.pendente));
    }

    /**
     * Accepts or refuses a request made to the master.
     *
     * @param {number} userId
     * @param {number} requestId
     * @param {boolean} accept
     * @throws {CustomError} 404 `REQUEST_NOT_FOUND`.
     */
    static async answer(userId, requestId, accept) {
        const filter = { cod: requestId, usuario2: userId, pendente: 1 };
        const changed = accept ? await Mysql.update('amizade', { pendente: 0 }, filter) : await Mysql.delete('amizade', filter);
        if (!changed) throw new CustomError(404, 'Friend request not found.', 'REQUEST_NOT_FOUND');
    }

    /**
     * Ends a friendship of the master.
     *
     * @param {number} userId
     * @param {number} friendshipId
     * @throws {CustomError} 404 `FRIENDSHIP_NOT_FOUND`.
     */
    static async remove(userId, friendshipId) {
        const [row] = await Mysql.select('SELECT cod FROM amizade WHERE cod = ? AND (usuario1 = ? OR usuario2 = ?)', [friendshipId, userId, userId]);
        if (!row) throw new CustomError(404, 'Friendship not found.', 'FRIENDSHIP_NOT_FOUND');
        await Mysql.delete('amizade', { cod: friendshipId });
    }
}

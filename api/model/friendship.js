import { sendMail } from '../helpers/email.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';

/** Columns of a friend as the profile shows them. */
const FRIEND_COLUMNS = 'a.cod AS id, u.id AS user, u.apelido AS nick, u.lvl AS level, u.foto AS picture';

/**
 * @param {Record<string, any>} row
 * @returns {Record<string, unknown>}
 */
function friendJson(row) {
    const friend = { id: row.id, user: row.user, nick: row.nick, level: row.level, picture: row.picture };
    if (row.idle !== undefined) friend.idleMinutes = Number(row.idle);
    return friend;
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
            `SELECT a.cod AS id, u.id AS user, u.apelido AS nick, u.lvl AS level, u.foto AS picture
            FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario1 WHERE a.usuario2 = ? AND a.pendente = 1`,
            [userId],
        );
        const confirmed = await Mysql.select(
            `SELECT ${FRIEND_COLUMNS}, TIMESTAMPDIFF(MINUTE, u.ativo, NOW()) AS idle FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario1 WHERE a.usuario2 = ? AND a.pendente = 0
            UNION SELECT ${FRIEND_COLUMNS}, TIMESTAMPDIFF(MINUTE, u.ativo, NOW()) AS idle FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario2 WHERE a.usuario1 = ? AND a.pendente = 0`,
            [userId, userId],
        );
        return { pending: pending.map(friendJson), confirmed: confirmed.map(friendJson) };
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
            `SELECT ${FRIEND_COLUMNS} FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario1 WHERE a.usuario2 = ? AND a.pendente = 0 AND u.apelido LIKE ?
            UNION SELECT ${FRIEND_COLUMNS} FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario2 WHERE a.usuario1 = ? AND a.pendente = 0 AND u.apelido LIKE ?`,
            [userId, like, userId, like],
        );
        return rows.map(friendJson);
    }

    /**
     * Masters to befriend, by nickname (never their email).
     *
     * @param {number} userId The searching master, left out.
     * @param {string} text
     * @returns {Promise<Array<{ user: number, nick: string }>>}
     */
    static async search(userId, text) {
        const rows = await Mysql.select('SELECT id, apelido FROM usuarios WHERE apelido LIKE ? AND id != ? LIMIT 10', [Mysql.contains(text), userId]);
        return rows.map(row => ({ user: row.id, nick: row.apelido }));
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

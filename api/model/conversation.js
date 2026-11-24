import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { messageView } from './message.js';

/** Messages in one thread page. */
export const CONVERSATION_PAGE_SIZE = 30;
/** A master is online when last active within this many minutes. */
export const ONLINE_MINUTES = 5;

/**
 * A conversation row's other master, with the presence the UI shows.
 *
 * @param {Record<string, any>} row
 * @param {number} userId
 * @returns {{ id: number, nick: string, picture: string, level: number, online: boolean }}
 */
function otherUser(row, userId) {
    return {
        id: Number(row.otherId ?? row.userId ?? row.id),
        nick: row.nick ?? row.apelido,
        picture: row.picture ?? row.foto ?? '',
        level: Number(row.level ?? row.lvl) || 0,
        online: row.idle != null && Number(row.idle) <= ONLINE_MINUTES,
    };
}

/**
 * Private conversations built from the existing `messages` rows. A conversation is keyed by the
 * other master's id; no row is rewritten.
 */
export class Conversation {
    /**
     * The master's conversations, newest first.
     *
     * @param {number} userId
     * @returns {Promise<{ conversations: Array<{ user: object, last: object, unread: number }> }>}
     */
    static async list(userId) {
        const rows = await Mysql.select(
            `SELECT m.cod, m.sender, m.receiver, m.time, m.message, m.isread,
                other.id AS otherId, other.apelido AS nick, other.foto AS picture,
                other.lvl AS level, TIMESTAMPDIFF(MINUTE, other.ativo, NOW()) AS idle,
                COALESCE(un.unread, 0) AS unread
            FROM (
                SELECT MAX(cod) AS lastId
                FROM messages
                WHERE sender = ? OR receiver = ?
                GROUP BY LEAST(sender, receiver), GREATEST(sender, receiver)
            ) latest
            INNER JOIN messages m ON m.cod = latest.lastId
            INNER JOIN usuarios other ON other.id = IF(m.sender = ?, m.receiver, m.sender)
            LEFT JOIN (
                SELECT sender, COUNT(*) AS unread
                FROM messages WHERE receiver = ? AND isread = 0
                GROUP BY sender
            ) un ON un.sender = other.id
            ORDER BY m.time DESC, m.cod DESC`,
            [userId, userId, userId, userId],
        );
        return {
            conversations: rows.map(row => ({
                user: otherUser(row, userId),
                last: messageView(row, userId),
                unread: Number(row.unread) || 0,
            })),
        };
    }

    /**
     * A page of one conversation, newest first.
     *
     * @param {number} userId
     * @param {number} otherId
     * @param {number} offset
     * @returns {Promise<{ user: object, messages: object[], total: number, offset: number,
     *   pageSize: number }>}
     * @throws {CustomError} 400 `INVALID_CONVERSATION` for yourself, 404 `USER_NOT_FOUND`.
     */
    static async thread(userId, otherId, offset = 0) {
        if (Number(userId) === Number(otherId)) throw new CustomError(400, 'Choose another master.', 'INVALID_CONVERSATION');
        const [other] = await Mysql.select(
            `SELECT id, apelido, foto, lvl, TIMESTAMPDIFF(MINUTE, ativo, NOW()) AS idle
            FROM usuarios WHERE id = ?`,
            [otherId],
        );
        if (!other) throw new CustomError(404, 'Master not found.', 'USER_NOT_FOUND');

        const [{ total }] = await Mysql.select(
            `SELECT COUNT(*) AS total FROM messages
            WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)`,
            [userId, otherId, otherId, userId],
        );
        const count = Number(total);
        const start = Math.min(Math.max(0, Number(offset) || 0), Math.max(0, count - 1));
        const rows = count
            ? await Mysql.select(
                `SELECT cod, sender, receiver, time, message, isread FROM messages
                WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
                ORDER BY time DESC, cod DESC LIMIT ? OFFSET ?`,
                [userId, otherId, otherId, userId, CONVERSATION_PAGE_SIZE, start],
            )
            : [];
        return {
            user: otherUser({ ...other, otherId: other.id }, userId),
            messages: rows.map(row => messageView(row, userId)),
            total: count,
            offset: start,
            pageSize: CONVERSATION_PAGE_SIZE,
        };
    }

    /**
     * Marks every unread message from one master as read.
     *
     * @param {number} userId
     * @param {number} otherId
     * @returns {Promise<{ userId: number, read: number, unreadTotal: number }>}
     */
    static async markRead(userId, otherId) {
        const read = await Mysql.update(
            'messages',
            { isread: 1 },
            { sender: otherId, receiver: userId, isread: 0 },
        );
        const [{ unreadTotal }] = await Mysql.select(
            'SELECT COUNT(*) AS unreadTotal FROM messages WHERE receiver = ? AND isread = 0',
            [userId],
        );
        return { userId: Number(otherId), read: Number(read), unreadTotal: Number(unreadTotal) };
    }
}

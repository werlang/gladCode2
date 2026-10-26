import { escapeMailText, sendMail } from '../helpers/email.js';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';

/** Messages per page. */
export const MESSAGES_PAGE_SIZE = 10;

/**
 * Private messages between masters (`messages`, key `cod`). Texts are stored HTML-escaped (the
 * format of every existing message); a reply starts with the quoted message in `<quote>`.
 */
export class Message {
    /**
     * A page of the master's inbox, newest first. A page past the end shows the last one.
     *
     * @param {number} userId
     * @param {number} page From 1.
     * @returns {Promise<{ meta: { page: number, total: number, start: number, end: number }, messages: object[] }>}
     */
    static async inbox(userId, page) {
        const total = await Mysql.count('messages', { receiver: userId });
        let current = Math.max(1, page);
        let offset = MESSAGES_PAGE_SIZE * (current - 1);
        if (offset >= total) {
            offset = Math.max(0, total - 1);
            current = Math.max(1, current - 1);
        }

        const rows = await Mysql.select(
            `SELECT m.cod, m.sender, m.time, m.message, m.isread, u.apelido, u.foto
            FROM messages m INNER JOIN usuarios u ON u.id = m.sender
            WHERE m.receiver = ? ORDER BY m.time DESC LIMIT ? OFFSET ?`,
            [userId, MESSAGES_PAGE_SIZE, offset],
        );
        return {
            meta: { page: current, total, start: offset + 1, end: offset + rows.length },
            messages: rows.map(row => ({
                id: row.cod, sender: row.sender, nick: row.apelido, picture: row.foto, time: row.time,
                message: row.message, read: Boolean(Number(row.isread)),
            })),
        };
    }

    /**
     * Sends a message and emails the receiver (unless they opted out).
     *
     * @param {{ id: number, apelido: string }} sender
     * @param {number} receiverId
     * @param {string} text Plain text.
     * @param {string} [quoted] Stored HTML of the message being answered.
     * @throws {CustomError} 404 `USER_NOT_FOUND`.
     */
    static async send(sender, receiverId, text, quoted = null) {
        const receiver = await Mysql.findOne('usuarios', { filter: { id: receiverId }, view: ['id', 'apelido', 'email', 'pref_message'] });
        if (!receiver) throw new CustomError(404, 'Master not found.', 'USER_NOT_FOUND');

        const escaped = escapeMailText(text);
        const stored = quoted === null ? escaped : `<quote>${quoted}</quote>${escaped}`;
        await Mysql.insert('messages', { time: Mysql.raw('NOW()'), sender: sender.id, receiver: receiver.id, message: stored.slice(0, 2048) });

        if (Number(receiver.pref_message)) {
            await sendMail('message', {
                subject: `Mensagem de ${sender.apelido}`,
                recipients: [{ email: receiver.email, name: receiver.apelido }],
                vars: { usernick: receiver.apelido, sendernick: sender.apelido, message: text },
            });
        }
    }

    /**
     * Answers a message the master received, quoting it.
     *
     * @param {{ id: number, apelido: string }} user
     * @param {number} messageId
     * @param {string} text
     * @throws {CustomError} 404 `MESSAGE_NOT_FOUND`.
     */
    static async reply(user, messageId, text) {
        const original = await Mysql.findOne('messages', { filter: { cod: messageId, receiver: user.id } });
        if (!original) throw new CustomError(404, 'Message not found.', 'MESSAGE_NOT_FOUND');
        await Message.send(user, original.sender, text, original.message);
    }

    /**
     * @param {number} userId
     * @param {number} messageId
     * @param {boolean} read
     * @throws {CustomError} 404 `MESSAGE_NOT_FOUND`.
     */
    static async markRead(userId, messageId, read) {
        const found = await Mysql.count('messages', { cod: messageId, receiver: userId });
        if (!found) throw new CustomError(404, 'Message not found.', 'MESSAGE_NOT_FOUND');
        await Mysql.update('messages', { isread: Number(read) }, { cod: messageId, receiver: userId });
    }

    /**
     * @param {number} userId
     * @param {number} messageId
     * @throws {CustomError} 404 `MESSAGE_NOT_FOUND`.
     */
    static async remove(userId, messageId) {
        if (!await Mysql.delete('messages', { cod: messageId, receiver: userId })) {
            throw new CustomError(404, 'Message not found.', 'MESSAGE_NOT_FOUND');
        }
    }
}

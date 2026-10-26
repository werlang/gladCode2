import { api } from '../helpers/request.js';

const ENDPOINT = 'back_chat.php';

/**
 * Chat rooms and messages (`back_chat.php`).
 */
export class ChatModel {
    /**
     * The rooms the signed-in user is in, the most recently active first.
     *
     * @returns {Promise<{ status: string, room?: Array<{ id: number, name: string, visited: string }> }>}
     *   `visited` is when the user last read the room, as a Unix timestamp.
     */
    static rooms() {
        return api.post(ENDPOINT, { action: 'ROOMS' });
    }

    /**
     * Up to 30 messages of a room, newest first, and marks the room read.
     *
     * @param {number} room Room id.
     * @param {{ before?: number, sync?: boolean, visited?: string|number }} [options]
     *   `before` pages back from a message id; `sync` asks only for messages
     *   newer than `visited`.
     * @returns {Promise<{ status: string, visited?: string, messages?: object[] }>}
     */
    static messages(room, { before = 0, sync = false, visited } = {}) {
        return api.post(ENDPOINT, {
            action: 'MESSAGES',
            id: room,
            first: before,
            sync,
            ...(visited === undefined ? {} : { visited }),
        });
    }

    /**
     * Sends a message or a /command to a room.
     *
     * @param {{ message: string, room: number|string, recentEmoji: string[] }} message
     *   `recentEmoji` is saved as the user's recently used emoji.
     * @returns {Promise<Record<string, any>>} `status` says what happened (`SENT`, `JOINED`, `LIST`, ...).
     */
    static send({ message, room, recentEmoji }) {
        return api.post(ENDPOINT, { action: 'SEND', message, room, emoji: recentEmoji });
    }

    /**
     * Unread message counts per room.
     *
     * @param {Record<number, string|number>} visited When each room was last read (Unix time).
     * @returns {Promise<{ status: string, notifications?: Record<number, string> }>}
     */
    static notifications(visited) {
        return api.post(ENDPOINT, { action: 'NOTIFICATIONS', visited: JSON.stringify(visited) });
    }

    /**
     * The user's recently used emoji.
     *
     * @returns {Promise<string[]>}
     */
    static async recentEmoji() {
        const data = await api.post(ENDPOINT, { action: 'EMOJI' });
        if (data.status !== 'SUCCESS' || !data.emoji) return [];
        try {
            return JSON.parse(data.emoji);
        }
        catch {
            return [];
        }
    }
}

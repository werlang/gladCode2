import { BATTLE_TIMEOUT_MS, api } from '../helpers/request.js';

/**
 * Ranked battle reports (`/reports`). A report is `{ id, time, gladiator, read, reward, favorite,
 * comment, hash, expired }` (`hash` is null once the battle expired).
 */
export class ReportModel {
    /**
     * A page of the signed-in master's reports, marked as read.
     *
     * @param {{ offset: number, unreadOnly?: boolean }} query
     * @returns {Promise<{ total: number, reports: object[] }>}
     */
    static battles({ offset, unreadOnly = false }) {
        return api.get('reports', { offset, markRead: true, unreadOnly: unreadOnly || undefined });
    }

    /**
     * A page of the favorite reports.
     *
     * @param {{ offset: number }} query
     * @returns {Promise<{ total: number, reports: object[] }>}
     */
    static favorites({ offset }) {
        return api.get('reports', { offset, favorites: true });
    }

    /**
     * @param {number} id Report id.
     * @param {boolean} favorite Keep it.
     * @param {string} [comment] Why it is kept.
     * @returns {Promise<{ favorite: boolean }>}
     */
    static setFavorite(id, favorite, comment = '') {
        return api.put(`reports/${id}/favorite`, { favorite, comment });
    }
}

/**
 * Duels between friends (`/duels`).
 */
export class DuelModel {
    /** @returns {Promise<object[]>} Challenges waiting for the signed-in master's answer. */
    static async challenges() {
        const { duels } = await api.get('duels');
        return duels;
    }

    /**
     * Challenges a friend with a gladiator; the friend is emailed unless they opted out.
     *
     * @param {{ glad: number, friend: number }} challenge
     * @returns {Promise<unknown>}
     * @throws {import('../helpers/request.js').RequestError} `DUEL_EXISTS`, `NOT_FRIENDS`.
     */
    static challenge({ glad, friend }) {
        return api.post('duels', { friend, gladiator: glad });
    }

    /**
     * Refuses or withdraws a challenge.
     *
     * @param {number} id Duel id.
     * @returns {Promise<unknown>}
     */
    static remove(id) {
        return api.delete(`duels/${id}`);
    }

    /**
     * Answers a challenge with a gladiator; the battle runs on the server.
     *
     * @param {number} id Duel id.
     * @param {number} gladiator The master's gladiator.
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ hash: string|null, error: string }>}
     */
    static fight(id, gladiator, { signal } = {}) {
        return api.post(`duels/${id}/battle`, { gladiator }, { signal, timeout: BATTLE_TIMEOUT_MS });
    }

    /**
     * A page of the master's duels (`{ id, time, log, read, glad, enemy, user }` each).
     *
     * @param {{ offset: number }} query
     * @returns {Promise<{ total: number, duels: object[] }>}
     */
    static reports({ offset }) {
        return api.get('duels/history', { offset });
    }
}

/**
 * Friends and friend requests (`/friends`). A friend is `{ id, user, nick, level, picture,
 * idleMinutes? }` where `id` is the friendship and `user` the master.
 */
export class FriendModel {
    /** @returns {Promise<{ pending: object[], confirmed: object[] }>} Requests to answer and friends. */
    static list() {
        return api.get('friends');
    }

    /**
     * @param {string} text Part of a friend's nickname.
     * @returns {Promise<object[]>} Matching friends.
     */
    static async filter(text) {
        // an empty filter is left out of the query, which this route reads as every friend
        const { friends } = await api.get('friends/confirmed', { filter: text });
        return friends;
    }

    /**
     * @param {string} text Part of a nickname.
     * @returns {Promise<Array<{ user: number, nick: string }>>} Masters to befriend.
     */
    static async search(text) {
        const { users } = await api.get('friends/search', { nick: text });
        return users;
    }

    /**
     * @param {number} id Request id.
     * @param {boolean} accept Accept it.
     * @returns {Promise<unknown>}
     */
    static answer(id, accept) {
        return api.put(`friends/requests/${id}`, { accept });
    }

    /**
     * Asks a master for friendship; they are emailed unless they opted out.
     *
     * @param {number} user Master id.
     * @returns {Promise<unknown>}
     * @throws {import('../helpers/request.js').RequestError} `FRIENDSHIP_EXISTS`.
     */
    static add(user) {
        return api.post('friends', { user });
    }

    /**
     * @param {number} id Friendship id.
     * @returns {Promise<unknown>}
     */
    static remove(id) {
        return api.delete(`friends/${id}`);
    }
}

/**
 * Private messages (`/messages`). A message is `{ id, sender, nick, picture, time, message, read }`;
 * `message` is stored HTML (escaped text, a reply quoting its original in `<quote>`).
 */
export class MessageModel {
    /**
     * A page of the signed-in master's inbox.
     *
     * @param {number} page Page from 1.
     * @returns {Promise<{ meta: { total: number, start: number, end: number, page: number }, messages: object[] }>}
     */
    static list(page) {
        return api.get('messages', { page });
    }

    /**
     * Sends a message; the receiver is emailed unless they opted out.
     *
     * @param {number} receiver Master id.
     * @param {string} message Text.
     * @returns {Promise<unknown>}
     */
    static send(receiver, message) {
        return api.post('messages', { receiver, message });
    }

    /**
     * @param {number} id Message replied to.
     * @param {string} message Text.
     * @returns {Promise<unknown>}
     */
    static reply(id, message) {
        return api.post(`messages/${id}/reply`, { message });
    }

    /**
     * @param {number} id Message id.
     * @param {boolean} read Mark read or unread.
     * @returns {Promise<unknown>}
     */
    static markRead(id, read) {
        return api.put(`messages/${id}`, { read });
    }

    /**
     * @param {number} id Message id.
     * @returns {Promise<unknown>}
     */
    static remove(id) {
        return api.delete(`messages/${id}`);
    }
}

/**
 * The profile's counters (`/notifications`).
 */
export class NotificationModel {
    /**
     * @returns {Promise<{ user: { level: number, xp: number, silver: number }, messages: number, friends: number,
     *   gladiators: { remaining: number, outdated: number }, reports: { ranked: number, duel: number }, duels: number, news: number }>}
     */
    static counts() {
        return api.get('notifications');
    }
}

/**
 * Ranked battles (`/battles/ranked`): matchmaking, then the battle with its rewards.
 */
export class RankedModel {
    /**
     * Finds four opponents for one of the master's gladiators.
     *
     * @param {number} gladiator
     * @returns {Promise<{ opponents: Array<{ name: string, master: string, skin: string, vstr: number, vagi: number, vint: number, mmr: number }>, match: string }>}
     *   `match` is the short-lived token {@link RankedModel.fight} needs.
     * @throws {import('../helpers/request.js').RequestError} `GLADIATOR_OUTDATED`.
     */
    static match(gladiator) {
        return api.post('battles/ranked/match', { gladiator });
    }

    /**
     * Fights a match.
     *
     * @param {string} match
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ hash: string|null, error: string, summary?: { level: number, xp: number, silver: number, gladiator: object } }>}
     */
    static fight(match, { signal } = {}) {
        return api.post('battles/ranked', { match }, { signal, timeout: BATTLE_TIMEOUT_MS });
    }
}

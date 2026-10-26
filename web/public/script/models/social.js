import { api } from '../helpers/request.js';

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
 * Duels between friends (`back_duel.php`).
 */
export class DuelModel {
    /**
     * Duel challenges waiting for the user's answer.
     *
     * @returns {Promise<{ status: string, duels?: object[] }>}
     */
    static challenges() {
        return api.post('back_duel.php', { action: 'GET' });
    }

    /**
     * Challenges a friend with a gladiator.
     *
     * @param {{ glad: number, friend: number }} challenge
     * @returns {Promise<{ status: 'OK'|'EXISTS'|string }>}
     */
    static challenge({ glad, friend }) {
        return api.post('back_duel.php', { action: 'CHALLENGE', glad, friend });
    }

    /**
     * Refuses or cancels a challenge.
     *
     * @param {number} id Duel id.
     * @returns {Promise<{ status: string }>}
     */
    static remove(id) {
        return api.post('back_duel.php', { action: 'DELETE', id });
    }

    /**
     * A page of the user's duels.
     *
     * @param {{ offset: number }} query
     * @returns {Promise<{ status: string, total: number, duels: object[] }>}
     */
    static reports({ offset }) {
        return api.post('back_duel.php', { action: 'REPORT', offset });
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
        const { friends } = await api.get('friends', { filter: text });
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

    /**
     * @param {string} hash Battle log hash.
     * @returns {Promise<{ lvl: number, xp: number, silver: number, glad: object }>}
     */
    static summary(hash) {
        return api.post('back_notification.php', { action: 'SUMMARY', hash });
    }
}

/**
 * Email notices the browser still asks for (duels and tournaments, until their endpoints send them).
 */
export class MailModel {
    /** @param {number} friend Challenged user id. */
    static duel(friend) {
        return api.post('back_sendmail.php', { action: 'DUEL', friend });
    }

    /** @param {string} hash Tournament hash whose new round started. */
    static tournament(hash) {
        return api.post('back_sendmail.php', { action: 'TOURNAMENT', hash });
    }
}

/**
 * Ranked matchmaking (`back_match.php`).
 */
export class MatchModel {
    /**
     * Picks the opponents of a ranked battle.
     *
     * @param {number} id The user's gladiator.
     * @returns {Promise<object[]>} The opponents.
     */
    static find(id) {
        return api.post('back_match.php', { action: 'MATCH', id });
    }
}

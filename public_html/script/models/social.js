import { api } from '../helpers/request.js';

/**
 * Battle reports of ranked battles (`back_report.php`).
 */
export class ReportModel {
    /**
     * A page of battle reports, marked read.
     *
     * @param {{ offset: number, unreadOnly?: boolean }} query
     * @returns {Promise<{ status: string, total: number, reports: object[] }>}
     */
    static battles({ offset, unreadOnly = false }) {
        return api.post('back_report.php', { action: 'GET', offset, read: true, unread_only: unreadOnly });
    }

    /**
     * A page of favourite battles.
     *
     * @param {{ offset: number }} query
     * @returns {Promise<{ status: string, total: number, reports: object[] }>}
     */
    static favorites({ offset }) {
        return api.post('back_report.php', { action: 'GET', offset, favorites: true });
    }

    /**
     * Keeps a battle as a favourite with a comment, or stops keeping it.
     *
     * @param {number} id Report id.
     * @param {boolean} favorite Keep it.
     * @param {string} [comment] Why it is kept.
     * @returns {Promise<unknown>}
     */
    static setFavorite(id, favorite, comment = '') {
        return api.post('back_report.php', { action: 'FAVORITE', favorite, id, comment });
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
 * Friends and friend requests (`back_friends.php`).
 */
export class FriendModel {
    /** @returns {Promise<{ pending: object[], confirmed: object[] }>} Requests and friends. */
    static list() {
        return api.post('back_friends.php', { action: 'GET' });
    }

    /**
     * Friends whose nickname contains a text.
     *
     * @param {string} text Filter.
     * @returns {Promise<Array<{ user: number, nick: string, picture: string }>>}
     */
    static filter(text) {
        return api.post('back_friends.php', { action: 'FILTER', text });
    }

    /**
     * Users whose nickname contains a text.
     *
     * @param {string} text Search.
     * @returns {Promise<Array<{ user: number, nick: string, email: string }>>}
     */
    static search(text) {
        return api.post('back_friends.php', { action: 'SEARCH', text });
    }

    /**
     * Answers a friend request.
     *
     * @param {number} id Request id.
     * @param {boolean} accept Accept it.
     * @returns {Promise<unknown>}
     */
    static answer(id, accept) {
        return api.post('back_friends.php', { action: 'REQUEST', answer: accept ? 'YES' : 'NO', id });
    }

    /**
     * Sends a friend request.
     *
     * @param {number} user User id.
     * @returns {Promise<'EXISTS'|unknown>}
     */
    static add(user) {
        return api.post('back_friends.php', { action: 'ADD', user });
    }

    /**
     * Ends a friendship.
     *
     * @param {number} user Friendship id.
     * @returns {Promise<unknown>}
     */
    static remove(user) {
        return api.post('back_friends.php', { action: 'DELETE', user });
    }
}

/**
 * Private messages (`back_message.php`).
 */
export class MessageModel {
    /**
     * A page of received messages.
     *
     * @param {number} page Page from 1.
     * @returns {Promise<{ meta: { total: number, start: number, end: number, page: number }, info: object[] }>}
     */
    static list(page) {
        return api.post('back_message.php', { action: 'GET', page });
    }

    /**
     * @param {number} receiver User id.
     * @param {string} message Text.
     * @returns {Promise<unknown>}
     */
    static send(receiver, message) {
        return api.post('back_message.php', { action: 'SEND', id: receiver, message });
    }

    /**
     * @param {number} id Message replied to.
     * @param {string} message Text.
     * @returns {Promise<unknown>}
     */
    static reply(id, message) {
        return api.post('back_message.php', { action: 'REPLY', replyid: id, message });
    }

    /**
     * @param {number} id Message id.
     * @param {boolean} read Mark read or unread.
     * @returns {Promise<unknown>}
     */
    static markRead(id, read) {
        return api.post('back_message.php', { action: 'READ', id, value: read ? 1 : 0 });
    }

    /**
     * @param {number} id Message id.
     * @returns {Promise<unknown>}
     */
    static remove(id) {
        return api.post('back_message.php', { action: 'DELETE', id });
    }
}

/**
 * The profile's counters and the after-battle summary (`back_notification.php`).
 */
export class NotificationModel {
    /** @returns {Promise<Record<string, any>>} Level, xp, silver and unread counts. */
    static counts() {
        return api.post('back_notification.php', { action: 'GET' });
    }

    /**
     * What a ranked battle changed for the user and the gladiator.
     *
     * @param {string} hash Battle log hash.
     * @returns {Promise<{ lvl: number, xp: number, silver: number, glad: object }>}
     */
    static summary(hash) {
        return api.post('back_notification.php', { action: 'SUMMARY', hash });
    }
}

/**
 * Email notices to other users (`back_sendmail.php`).
 */
export class MailModel {
    /**
     * Emails a user about a new message (or a reply).
     *
     * @param {{ receiver?: number, replyid?: number, message: string }} message
     * @returns {Promise<unknown>}
     */
    static message({ receiver, replyid, message }) {
        return api.post('back_sendmail.php', {
            action: 'MESSAGE',
            message,
            ...(receiver === undefined ? {} : { receiver }),
            ...(replyid === undefined ? {} : { replyid }),
        });
    }

    /** @param {string} email Invited user's email. */
    static friendRequest(email) {
        return api.post('back_sendmail.php', { action: 'FRIEND', friend: email });
    }

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

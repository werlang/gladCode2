import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';
import { gladiatorLimit } from './gladiator.js';

/**
 * The profile's counters: what is new for a master.
 */
export class Notification {
    /**
     * @param {{ id: number, lvl: number, xp: number, silver: number }} user
     * @returns {Promise<{ version: string, user: { level: number, xp: number, silver: number }, messages: number, friends: number,
     *   gladiators: { used: number, limit: number, remaining: number, outdated: number }, reports: { ranked: number, duel: number }, duels: number, news: number }>}
     */
    static async counts(user) {
        const limit = gladiatorLimit(user.lvl);
        const [row] = await Mysql.select(
            `SELECT
                (SELECT COUNT(*) FROM messages WHERE receiver = ? AND isread = 0) AS messages,
                (SELECT COUNT(*) FROM amizade WHERE usuario2 = ? AND pendente = 1) AS friends,
                (SELECT COUNT(*) FROM gladiators WHERE master = ?) AS gladiators,
                (SELECT COUNT(*) FROM gladiators WHERE master = ? AND version != ?) AS outdated,
                (SELECT COUNT(*) FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE g.master = ? AND r.isread = 0) AS rankedReports,
                (SELECT COUNT(*) FROM duels WHERE isread = 0 AND log IS NOT NULL AND (user1 = ? OR user2 = ?)) AS duelReports,
                (SELECT COUNT(*) FROM duels WHERE log IS NULL AND user2 = ?) AS duels,
                (SELECT COUNT(*) FROM news WHERE time > (SELECT read_news FROM usuarios WHERE id = ?)) AS news`,
            [user.id, user.id, user.id, user.id, VERSION, user.id, user.id, user.id, user.id, user.id],
        );
        const count = name => Number(row[name]);
        return {
            version: VERSION,
            user: { level: user.lvl, xp: user.xp, silver: user.silver },
            messages: count('messages'),
            friends: count('friends'),
            gladiators: {
                used: count('gladiators'),
                limit,
                remaining: limit - count('gladiators'),
                outdated: count('outdated'),
            },
            reports: { ranked: count('rankedReports'), duel: count('duelReports') },
            duels: count('duels'),
            news: count('news'),
        };
    }

    /**
     * Marks the passive notification groups read for the bell: news, ranked/duel reports and
     * finished duels. Actionable duels and friend requests stay until answered.
     *
     * @param {number} userId
     * @returns {Promise<{ read: number, news: true }>}
     */
    static async markRead(userId) {
        await Mysql.update('usuarios', { read_news: Mysql.raw('NOW(3)') }, { id: userId });
        const reports = await Mysql.select(
            'SELECT r.id FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE g.master = ? AND r.isread = 0',
            [userId],
        );
        if (reports.length) await Mysql.update('reports', { isread: 1 }, { id: reports.map(row => row.id) });
        const duels = await Mysql.select(
            'SELECT id FROM duels WHERE isread = 0 AND log IS NOT NULL AND (user1 = ? OR user2 = ?)',
            [userId, userId],
        );
        if (duels.length) await Mysql.update('duels', { isread: 1 }, { id: duels.map(row => row.id) });
        return { read: reports.length + duels.length, news: true };
    }
}

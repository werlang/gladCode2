import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';
import { gladiatorLimit } from './gladiator.js';

/**
 * The profile's counters: what is new for a master.
 */
export class Notification {
    /**
     * @param {{ id: number, lvl: number, xp: number, silver: number }} user
     * @returns {Promise<{ user: { level: number, xp: number, silver: number }, messages: number, friends: number,
     *   gladiators: { remaining: number, outdated: number }, reports: { ranked: number, duel: number }, duels: number, news: number }>}
     */
    static async counts(user) {
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
            user: { level: user.lvl, xp: user.xp, silver: user.silver },
            messages: count('messages'),
            friends: count('friends'),
            gladiators: { remaining: gladiatorLimit(user.lvl) - count('gladiators'), outdated: count('outdated') },
            reports: { ranked: count('rankedReports'), duel: count('duelReports') },
            duels: count('duels'),
            news: count('news'),
        };
    }
}

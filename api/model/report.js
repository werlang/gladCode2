import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';

/** Reports per page. */
export const REPORTS_PAGE_SIZE = 10;

/**
 * Ranked battle reports (`reports`): one per gladiator per battle, with its renown change. The
 * master can mark them as favorites with a comment.
 */
export class Report {
    /**
     * A page of the master's reports, newest first.
     *
     * @param {number} userId
     * @param {{ offset: number, favorites?: boolean, unreadOnly?: boolean, markRead?: boolean }} query
     *   `markRead` marks the page's reports as read.
     * @returns {Promise<{ total: number, reports: object[] }>}
     */
    static async list(userId, { offset, favorites = false, unreadOnly = false, markRead = false }) {
        const conditions = ['g.master = ?'];
        if (favorites) conditions.push('r.favorite = 1');
        if (unreadOnly) conditions.push('r.isread = 0');
        const where = conditions.join(' AND ');

        const [{ total }] = await Mysql.select(`SELECT COUNT(*) AS total FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE ${where}`, [userId]);
        const rows = await Mysql.select(
            `SELECT r.id, l.time, g.name, r.isread, l.hash, r.reward, r.favorite, r.comment, l.expired
            FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator INNER JOIN logs l ON l.id = r.log
            WHERE ${where} ORDER BY l.time DESC LIMIT ? OFFSET ?`,
            [userId, REPORTS_PAGE_SIZE, Math.max(0, offset)],
        );
        if (markRead && rows.length) await Mysql.update('reports', { isread: 1 }, { id: rows.map(row => row.id) });

        return {
            total: Number(total),
            reports: rows.map(row => ({
                id: row.id,
                time: row.time,
                gladiator: row.name,
                read: Boolean(Number(row.isread)),
                reward: row.reward,
                favorite: Boolean(Number(row.favorite)),
                comment: row.comment,
                hash: Number(row.expired) ? null : row.hash,
                expired: Boolean(Number(row.expired)),
            })),
        };
    }

    /**
     * Marks one of the master's reports as a favorite (with a comment) or not.
     *
     * @param {number} userId
     * @param {number} reportId
     * @param {boolean} favorite
     * @param {string} comment
     * @throws {CustomError} 404 `REPORT_NOT_FOUND` for someone else's report.
     */
    static async setFavorite(userId, reportId, favorite, comment) {
        const [owned] = await Mysql.select('SELECT r.id FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE r.id = ? AND g.master = ?', [reportId, userId]);
        if (!owned) throw new CustomError(404, 'Report not found.', 'REPORT_NOT_FOUND');
        await Mysql.update('reports', { favorite: Number(favorite), comment }, { id: reportId });
    }
}

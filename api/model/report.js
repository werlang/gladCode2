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
     * @returns {Promise<{ total: number, reports: object[] }>} Each report also carries its placing,
     *   battle size, authoritative result and the other gladiators' names.
     */
    static async list(userId, { offset, favorites = false, unreadOnly = false, markRead = false }) {
        const conditions = ['g.master = ?'];
        if (favorites) conditions.push('r.favorite = 1');
        if (unreadOnly) conditions.push('r.isread = 0');
        const where = conditions.join(' AND ');

        const [{ total }] = await Mysql.select(`SELECT COUNT(*) AS total FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE ${where}`, [userId]);
        const rows = await Mysql.select(
            `SELECT r.id, l.time, g.name, r.isread, l.hash, r.reward, r.placement, r.result,
                r.favorite, r.comment, l.expired,
                (SELECT COUNT(*) FROM reports size WHERE size.log = r.log) AS battleSize,
                (SELECT GROUP_CONCAT(other.name ORDER BY otherReport.placement SEPARATOR ', ')
                    FROM reports otherReport INNER JOIN gladiators other ON other.cod = otherReport.gladiator
                    WHERE otherReport.log = r.log AND otherReport.gladiator <> r.gladiator) AS opponents
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
                place: row.placement == null ? null : Number(row.placement) + 1,
                total: Number(row.battleSize),
                result: row.result,
                opponents: row.opponents ? String(row.opponents).split(', ') : [],
                favorite: Boolean(Number(row.favorite)),
                comment: row.comment,
                hash: Number(row.expired) ? null : row.hash,
                expired: Boolean(Number(row.expired)),
            })),
        };
    }

    /**
     * The report header: the last ten known results, the renown earned in seven days and the unread
     * ranked count. The results stay in reverse chronological order.
     *
     * @param {number} userId
     * @returns {Promise<{ results: Array<'win'|'loss'|'draw'>, renown: number, unread: number }>}
     */
    static async summary(userId) {
        const [results, [renown], [unread]] = await Promise.all([
            Mysql.select(
                `SELECT r.result FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator
                    INNER JOIN logs l ON l.id = r.log
                    WHERE g.master = ? AND r.result IS NOT NULL
                    ORDER BY l.time DESC LIMIT 10`,
                [userId],
            ),
            Mysql.select(
                `SELECT COALESCE(SUM(r.reward), 0) AS renown FROM reports r
                    INNER JOIN gladiators g ON g.cod = r.gladiator INNER JOIN logs l ON l.id = r.log
                    WHERE g.master = ? AND l.time >= NOW() - INTERVAL 7 DAY`,
                [userId],
            ),
            Mysql.select(
                `SELECT COUNT(*) AS unread FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator
                    WHERE g.master = ? AND r.isread = 0`,
                [userId],
            ),
        ]);
        return { results: results.map(row => row.result), renown: Number(renown.renown), unread: Number(unread.unread) };
    }

    /**
     * Marks one of the master's reports as a favorite (with a comment) or not.
     *
     * @param {number} userId
     * @param {number} reportId
     * @param {boolean} favorite
     * @param {string} comment A non-empty comment replaces the stored one; an empty one keeps it, so
     *   toggling the star never erases a note.
     * @throws {CustomError} 404 `REPORT_NOT_FOUND` for someone else's report.
     */
    static async setFavorite(userId, reportId, favorite, comment) {
        const [owned] = await Mysql.select('SELECT r.id FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE r.id = ? AND g.master = ?', [reportId, userId]);
        if (!owned) throw new CustomError(404, 'Report not found.', 'REPORT_NOT_FOUND');
        const values = { favorite: Number(favorite) };
        if (comment) values.comment = comment;
        await Mysql.update('reports', values, { id: reportId });
    }
}

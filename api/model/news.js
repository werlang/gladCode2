import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';

/** The public id of a post: the first 4 hex digits of a salted md5 of its row id (kept from PHP). */
const HASH_SQL = "SUBSTR(MD5(CONCAT(id, 'news-post-86')), 1, 4)";
/** Posts per feed page. */
export const NEWS_PAGE_SIZE = 5;

/**
 * News posts (`news`). Posts are written by the maintainer (the release flow or SQL) and their
 * body is trusted HTML.
 */
export class News {
    /**
     * @param {{ hash: string, title: string, time: string, post: string, category?: string,
     *   excerpt?: string, image?: string|null, image_alt?: string, version?: string|null,
     *   isread?: number }} row
     */
    constructor(row) {
        this.hash = row.hash;
        this.title = row.title;
        this.time = row.time;
        this.body = row.post;
        this.category = row.category || 'Atualização';
        this.excerpt = row.excerpt || excerptFrom(row.post);
        this.image = row.image || null;
        this.imageAlt = row.image_alt || '';
        this.version = row.version || null;
        this.read = Boolean(Number(row.isread));
    }

    /**
     * Newest posts first, with the reader's read state.
     *
     * @param {number} offset Posts to skip.
     * @param {{ readBefore?: string|null }} [options] The reader's last read marker.
     * @returns {Promise<News[]>}
     */
    static async list(offset, { readBefore = null } = {}) {
        const rows = await Mysql.select(
            `SELECT ${HASH_SQL} AS hash, title, time, post, category, excerpt, image, image_alt, version,
                (time <= COALESCE(?, '1970-01-01 00:00:00')) AS isread
            FROM news ORDER BY time DESC LIMIT ? OFFSET ?`,
            [readBefore, NEWS_PAGE_SIZE, offset],
        );
        return rows.map(row => new News(row));
    }

    /**
     * Marks every post as read and answers how many were unread.
     *
     * @param {import('./user.js').User} user
     * @returns {Promise<{ read: number, unread: number }>}
     */
    static async markAllRead(user) {
        const [row] = await Mysql.select(
            `SELECT COUNT(*) AS unread FROM news
            WHERE time > COALESCE((SELECT read_news FROM usuarios WHERE id = ?), '1970-01-01 00:00:00')`,
            [user.id],
        );
        await user.markNewsRead();
        return { read: Number(row.unread), unread: 0 };
    }

    /**
     * A post with the hashes of the posts before and after it.
     *
     * @param {string} hash
     * @returns {Promise<{ post: News, previous: string|null, next: string|null }>}
     * @throws {CustomError} 404 `NEWS_NOT_FOUND`.
     */
    static async findWithNeighbours(hash) {
        const [row] = await Mysql.select(`SELECT ${HASH_SQL} AS hash, title, time, post, version FROM news WHERE ${HASH_SQL} = ? LIMIT 1`, [hash]);
        if (!row) throw new CustomError(404, 'Post not found.', 'NEWS_NOT_FOUND');

        const [[previous], [next]] = await Promise.all([
            Mysql.select(`SELECT ${HASH_SQL} AS hash FROM news WHERE time < ? ORDER BY time DESC LIMIT 1`, [row.time]),
            Mysql.select(`SELECT ${HASH_SQL} AS hash FROM news WHERE time > ? ORDER BY time LIMIT 1`, [row.time]),
        ]);
        return { post: new News(row), previous: previous?.hash ?? null, next: next?.hash ?? null };
    }


    toJSON() {
        return {
            hash: this.hash,
            title: this.title,
            time: this.time,
            body: this.body,
            category: this.category,
            excerpt: this.excerpt,
            image: this.image,
            imageAlt: this.imageAlt,
            version: this.version,
            read: this.read,
        };
    }
}

/**
 * A one-line excerpt from a post body when the row does not carry one.
 *
 * @param {string} body Trusted post HTML.
 * @returns {string}
 */
function excerptFrom(body) {
    return String(body ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

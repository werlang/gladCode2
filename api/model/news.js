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
     * @param {{ hash: string, title: string, time: string, post: string }} row
     */
    constructor(row) {
        this.hash = row.hash;
        this.title = row.title;
        this.time = row.time;
        this.body = row.post;
    }

    /**
     * Newest posts first.
     *
     * @param {number} offset Posts to skip.
     * @returns {Promise<News[]>}
     */
    static async list(offset) {
        const rows = await Mysql.select(`SELECT ${HASH_SQL} AS hash, title, time, post FROM news ORDER BY time DESC LIMIT ? OFFSET ?`, [NEWS_PAGE_SIZE, offset]);
        return rows.map(row => new News(row));
    }

    /**
     * A post with the hashes of the posts before and after it.
     *
     * @param {string} hash
     * @returns {Promise<{ post: News, previous: string|null, next: string|null }>}
     * @throws {CustomError} 404 `NEWS_NOT_FOUND`.
     */
    static async findWithNeighbours(hash) {
        const [row] = await Mysql.select(`SELECT ${HASH_SQL} AS hash, title, time, post FROM news WHERE ${HASH_SQL} = ? LIMIT 1`, [hash]);
        if (!row) throw new CustomError(404, 'Post not found.', 'NEWS_NOT_FOUND');

        const [[previous], [next]] = await Promise.all([
            Mysql.select(`SELECT ${HASH_SQL} AS hash FROM news WHERE time < ? ORDER BY time DESC LIMIT 1`, [row.time]),
            Mysql.select(`SELECT ${HASH_SQL} AS hash FROM news WHERE time > ? ORDER BY time LIMIT 1`, [row.time]),
        ]);
        return { post: new News(row), previous: previous?.hash ?? null, next: next?.hash ?? null };
    }


    toJSON() {
        return { hash: this.hash, title: this.title, time: this.time, body: this.body };
    }
}

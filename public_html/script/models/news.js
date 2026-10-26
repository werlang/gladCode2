import { api } from '../helpers/request.js';

const ENDPOINT = 'back_news.php';

/**
 * News posts (`back_news.php`).
 */
export class NewsModel {
    /**
     * A page of the news feed.
     *
     * @param {number} [page] Page index from 0.
     * @returns {Promise<Record<string, any>>}
     */
    static list(page = 0) {
        return api.post(ENDPOINT, { action: 'GET', page });
    }

    /**
     * One post with the hashes of its neighbours.
     *
     * @param {string} hash Post hash.
     * @returns {Promise<{ status: 'SUCCESS'|'EMPTY', post?: { title: string, time: string, body: string }, prev?: string, next?: string }>}
     */
    static get(hash) {
        return api.post(ENDPOINT, { action: 'POST', hash });
    }
}

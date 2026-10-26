import { api } from '../helpers/request.js';

/**
 * News posts (`/news`). A post is `{ hash, title, time, body }`; its body is HTML written by the
 * maintainer.
 */
export class NewsModel {
    /**
     * The latest posts, five at a time; reading them clears the signed-in user's news counter.
     *
     * @param {number} [offset] Posts to skip.
     * @returns {Promise<Record<string, any>[]>}
     */
    static async list(offset = 0) {
        const { posts } = await api.get('news', { offset });
        return posts;
    }

    /**
     * One post with the hashes of its neighbours.
     *
     * @param {string} hash Post hash.
     * @returns {Promise<{ post: Record<string, any>, previous: string|null, next: string|null }>}
     * @throws {import('../helpers/request.js').RequestError} `NEWS_NOT_FOUND` for an unknown post.
     */
    static get(hash) {
        return api.get(`news/${encodeURIComponent(hash)}`);
    }
}

import { api } from '../helpers/request.js';

/**
 * News posts (`/news`). A post is `{ hash, title, time, body, category, excerpt, image, imageAlt,
 * version, read }`; `version` is the engine version the post announces, or null when it has none.
 * Its body is HTML written by the maintainer.
 */
export class NewsModel {
    /**
     * The latest posts, five at a time; reading them does not advance the news marker unless
     * `markRead: true`.
     *
     * @param {number} [offset] Posts to skip.
     * @param {{ markRead?: boolean }} [options]
     * @returns {Promise<Record<string, any>[]>}
     */
    static async list(offset = 0, { markRead = false, signal } = {}) {
        const { posts } = await api.get('news', { offset, markRead: markRead ? undefined : false }, { signal });
        return posts;
    }

    /**
     * Marks every post as read for the signed-in master.
     *
     * @returns {Promise<{ read: number, unread: number }>}
     */
    static markAllRead() {
        return api.post('news/read');
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

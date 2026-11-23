/** Posts per Notícias page; the API serves five at a time. */
export const NEWS_PAGE_SIZE = 5;

/**
 * The Notícias feed's paging state. One page is in flight at a time, so a double click cannot fetch
 * the same offset twice, and the offset advances exactly once, when the page is applied.
 */
export class NewsPager {
    #offset = 0;
    #loading = false;
    #hasMore = false;

    /** @returns {number} Offset of the next page. */
    get offset() {
        return this.#offset;
    }

    /** @returns {boolean} Whether a page request is running. */
    get loading() {
        return this.#loading;
    }

    /** @returns {boolean} Whether the feed may have another page. */
    get hasMore() {
        return this.#hasMore;
    }

    /**
     * Starts a feed at the first page.
     *
     * @param {number} pageSize Posts the first page returned.
     * @returns {this}
     */
    reset(pageSize) {
        this.#offset = Number(pageSize) || 0;
        this.#hasMore = this.#offset === NEWS_PAGE_SIZE;
        this.#loading = false;
        return this;
    }

    /**
     * Loads the next page, if one is not already running. Returns null for a click while a page is
     * in flight, when the feed ended, or when the caller's read was aborted.
     *
     * @param {(offset: number) => Promise<unknown[]|undefined|null>} fetchPage
     * @returns {Promise<unknown[]|null>}
     */
    async next(fetchPage) {
        if (this.#loading || !this.#hasMore) return null;
        this.#loading = true;
        try {
            const posts = await fetchPage(this.#offset);
            if (!posts) return null;
            this.#offset += posts.length;
            this.#hasMore = posts.length === NEWS_PAGE_SIZE;
            return posts;
        }
        finally {
            this.#loading = false;
        }
    }
}

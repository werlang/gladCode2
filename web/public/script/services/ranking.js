import { RankModel } from '../models/rank.js';

/**
 * The Ranking section's data: the paged list, the centred window, the own strip and the custom
 * tabs (docs/frontend/conventions.md). It is DOM-free; the section owns the components.
 */
export class RankingService {
    #model;
    #top = null;

    /**
     * @param {{ model?: typeof RankModel }} [options] Test seam.
     */
    constructor({ model = RankModel } = {}) {
        this.#model = model;
    }

    /**
     * A page of the general or friends ranking. The first unfiltered page also caches the podium.
     *
     * @param {{ offset: number, search?: string, scope?: 'all'|'friends', signal?: AbortSignal }} query
     * @returns {Promise<{ total: number, ranking: object[] }>}
     */
    async page({ offset, search = '', scope = 'all', signal } = {}) {
        const data = await this.#model.general({ offset, search, scope, signal });
        if (offset === 0 && !search && scope === 'all') this.#top = data.ranking.slice(0, 3);
        return data;
    }

    /**
     * @param {{ gladiatorId?: number, position?: number, size?: number, signal?: AbortSignal }} query
     * @returns {Promise<object>}
     */
    window(query = {}) {
        return this.#model.window(query);
    }

    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<object>}
     */
    mine({ signal } = {}) {
        return this.#model.mine({ signal });
    }

    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<string[]>}
     */
    tabs({ signal } = {}) {
        return this.#model.tabs({ signal });
    }

    /**
     * @param {{ tab: string, search?: string, signal?: AbortSignal }} query
     * @returns {Promise<object[]>}
     */
    hashtag(query) {
        return this.#model.hashtag(query);
    }

    /**
     * Follows or closes a hashtag tab.
     *
     * @param {string} name
     * @param {boolean} watch
     * @returns {Promise<unknown>}
     */
    watch(name, watch = true) {
        return watch ? this.#model.watch(name) : this.#model.unwatch(name);
    }

    /** @returns {object[]|null} The cached general top three, once a first page has loaded. */
    get top() {
        return this.#top;
    }
}

/** The page's ranking state. */
export const ranking = new RankingService();

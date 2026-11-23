import { api } from '../helpers/request.js';

/**
 * Rankings (`/ranking`): gladiators by renown, and masters by the trainings tagged with a hashtag.
 */
export class RankModel {
    /**
     * A page of the gladiator ranking.
     *
     * @param {{ offset: number, search?: string, signal?: AbortSignal }} query
     * @returns {Promise<{ total: number, ranking: Array<{ gladiator: string, mmr: number, master: string, change24h: number, position: number }> }>}
     */
    static general({ offset, search = '', signal } = {}) {
        return api.get('ranking', { offset, search }, { signal });
    }

    /** @returns {Promise<number>} Gladiators ranked above the signed-in master's best one. */
    static async myBestOffset() {
        const { offset } = await api.get('ranking/me');
        return offset;
    }

    /** @returns {Promise<string[]>} The signed-in master's hashtag tabs. */
    static async tabs() {
        const { tags } = await api.get('ranking/tabs');
        return tags;
    }

    /**
     * Follows a hashtag (tutor accounts).
     *
     * @param {string} name Hashtag without `#`.
     * @returns {Promise<unknown>}
     * @throws {import('../helpers/request.js').RequestError} `TUTOR_ONLY`, `NO_CREDITS`.
     */
    static watch(name) {
        return api.put(`ranking/tabs/${encodeURIComponent(name)}`, { watch: true });
    }

    /**
     * Closes a hashtag tab.
     *
     * @param {string} name Hashtag without `#`.
     * @returns {Promise<unknown>}
     */
    static unwatch(name) {
        return api.put(`ranking/tabs/${encodeURIComponent(name)}`, { watch: false });
    }

    /**
     * The masters' ranking of a hashtag.
     *
     * @param {{ tab: string, search?: string, signal?: AbortSignal }} query
     * @returns {Promise<Array<{ id: number, nick: string, score: number, time: number, position: number }>>}
     */
    static async hashtag({ tab, search = '', signal } = {}) {
        const { ranking } = await api.get(`ranking/tabs/${encodeURIComponent(tab)}`, { search }, { signal });
        return ranking;
    }
}

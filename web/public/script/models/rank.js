import { api } from '../helpers/request.js';

/**
 * Rankings (`/ranking`): gladiators by renown, and masters by the trainings tagged with a hashtag.
 */
export class RankModel {
    /**
     * A page of the gladiator ranking.
     *
     * @param {{ offset: number, search?: string, scope?: 'all'|'friends', signal?: AbortSignal }} query
     * @returns {Promise<{ total: number, ranking: Array<{ id: number, gladiator: string, mmr: number,
     *   master: string, change24h: number, change7d: number, position: number }> }>}
     */
    static general({ offset, search = '', scope = 'all', signal } = {}) {
        return api.get('ranking', { offset, search, scope: scope === 'friends' ? 'friends' : undefined }, { signal });
    }

    /**
     * A window of the ranking centred on a gladiator or a position.
     *
     * @param {{ gladiatorId?: number, position?: number, size?: number, signal?: AbortSignal }} query
     * @returns {Promise<{ total: number, position: number, page: number, pageSize: number,
     *   around: string|null, rows: object[] }>}
     */
    static window({ gladiatorId, position, size = 9, signal } = {}) {
        return api.get('ranking/window', {
            gladiatorId: gladiatorId ?? undefined,
            position: position ?? undefined,
            size,
        }, { signal });
    }

    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ gladiators: Array<{ id: number, name: string, mmr: number,
     *   position: number|null, state: string, skin: string }> }>}
     */
    static mine({ signal } = {}) {
        return api.get('ranking/mine', {}, { signal });
    }

    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<number>} Gladiators ranked above the signed-in master's best one.
     */
    static async myBestOffset({ signal } = {}) {
        const { offset } = await api.get('ranking/me', {}, { signal });
        return offset;
    }

    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<string[]>} The signed-in master's hashtag tabs.
     */
    static async tabs({ signal } = {}) {
        const { tags } = await api.get('ranking/tabs', {}, { signal });
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

import { api } from '../helpers/request.js';

/**
 * The header's global search (`/search?q=`): gladiators and masters matching a term.
 */
export class SearchModel {
    /**
     * @param {string} query Trimmed term.
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ gladiators: Array<{ id: number, name: string, master: string, picture: string, mmr: number }>,
     *   masters: Array<{ id: number, nick: string, picture: string, level: number }> }>}
     */
    static query(query, { signal } = {}) {
        return api.get('search', { q: query }, { signal });
    }
}

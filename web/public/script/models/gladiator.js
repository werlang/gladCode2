import { api } from '../helpers/request.js';

const ENDPOINT = 'back_glad.php';

/**
 * The signed-in user's gladiators (`back_glad.php`).
 */
export class GladiatorModel {
    /**
     * Every gladiator of the signed-in user. `code` and `blocks` arrive
     * HTML-escaped; `oldversion` is set when the gladiator needs saving again.
     *
     * @returns {Promise<Array<{ id: number, name: string, vstr: number, vagi: number, vint: number,
     *   code: string, blocks: string, skin: string, mmr: number, user: string, oldversion?: string }>>}
     */
    static async list() {
        const glads = await api.post(ENDPOINT, { action: 'GET' });
        return Array.isArray(glads) ? glads : [];
    }

    /**
     * Deletes a gladiator.
     *
     * @param {number} id Gladiator id.
     * @returns {Promise<unknown>}
     */
    static remove(id) {
        return api.post(ENDPOINT, { action: 'DELETE', id });
    }

    /**
     * Creates a gladiator, or updates it when `id` is given, from the code
     * last compiled in this session.
     *
     * @param {{ id?: number, skin: string, name: string, vstr: number, vagi: number, vint: number, blocks?: string }} glad
     * @returns {Promise<{ ID: number }|{ LIMIT: number }|'EXISTS'|'INVALID'|string>}
     */
    static save({ id, skin, name, vstr, vagi, vint, blocks }) {
        return api.post(ENDPOINT, {
            action: id ? 'UPDATE' : 'INSERT',
            ...(id ? { id } : {}),
            skin,
            nome: name,
            vstr,
            vagi,
            vint,
            ...(blocks === undefined ? {} : { blocks }),
        });
    }

    /**
     * Reads a gladiator's name, attributes and skin from its source code.
     *
     * @param {{ code?: string, filename?: string }} source Code, or a sample file path.
     * @returns {Promise<{ name: string|false, vstr: string|false, vagi: string|false, vint: string|false, skin: string[]|null, code: string }>}
     */
    static parse(source) {
        return api.post(ENDPOINT, { action: 'FILE', ...source });
    }
}

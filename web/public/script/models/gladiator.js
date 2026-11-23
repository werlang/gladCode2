import { BATTLE_TIMEOUT_MS, api } from '../helpers/request.js';

/**
 * The signed-in master's gladiators (`/gladiators`). A gladiator is `{ id, name, vstr, vagi, vint,
 * skin, code, blocks, mmr, master, outdated }`: `skin` is the skin JSON text, `code` and `blocks`
 * are as written (escape them before putting them in HTML), `outdated` asks for a save on the
 * current engine version.
 */
export class GladiatorModel {
    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<Array<Record<string, any>>>} Every gladiator of the signed-in master.
     */
    static async list({ signal } = {}) {
        const { gladiators } = await api.get('gladiators', {}, { signal });
        return gladiators;
    }

    /**
     * @param {number} id
     * @returns {Promise<Record<string, any>>} One of the master's gladiators.
     */
    static async get(id) {
        const { gladiator } = await api.get(`gladiators/${id}`);
        return gladiator;
    }

    /**
     * @param {number} id Gladiator id.
     * @returns {Promise<{ deleted: true }>}
     */
    static remove(id) {
        return api.delete(`gladiators/${id}`);
    }

    /**
     * Creates a gladiator, or saves it when `id` is given. The server first fights it against the
     * strongest samples, so this takes a few seconds.
     *
     * @param {{ id?: number, name: string, vstr: number, vagi: number, vint: number, skin: string, code: string, blocks?: string }} glad
     *   `code` is the user code without setup().
     * @returns {Promise<Record<string, any>>} The saved gladiator.
     * @throws {import('../helpers/request.js').RequestError} `NAME_TAKEN`, `GLADIATOR_LIMIT` (data.limit),
     *   `BANNED_FUNCTIONS` (data.functions), `GLADIATOR_TEST_FAILED` (data.error), `INVALID_*`.
     */
    static async save({ id, ...glad }) {
        // saving runs a test battle first
        const options = { timeout: BATTLE_TIMEOUT_MS };
        const { gladiator } = id ? await api.put(`gladiators/${id}`, glad, options) : await api.post('gladiators', glad, options);
        return gladiator;
    }

    /**
     * A sample opponent.
     *
     * @param {string} name Sample name (`Archie`, `War Maker`, ...).
     * @returns {Promise<{ name: string, vstr: number, vagi: number, vint: number, skin: string|null, code: string }>}
     */
    static async sample(name) {
        const { sample } = await api.get(`gladiators/samples/${encodeURIComponent(name)}`);
        return sample;
    }
}

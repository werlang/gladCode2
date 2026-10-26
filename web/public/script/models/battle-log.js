import { api } from '../helpers/request.js';

/**
 * Stored battle logs (`/logs`).
 */
export class BattleLogModel {
    /**
     * Downloads a battle's simulation log.
     *
     * @param {string} hash Log hash.
     * @param {{ onProgress?: (ratio: number) => void }} [options] Download progress, 0 to 1.
     * @returns {Promise<Array<Record<string, any>>>} The simulation steps.
     * @throws {import('../helpers/request.js').RequestError} `LOG_NOT_FOUND`, or `LOG_EXPIRED` for an old battle.
     */
    static get(hash, { onProgress } = {}) {
        return api.get(`logs/${encodeURIComponent(hash)}`, {}, { onProgress });
    }

    /**
     * Discards an editor test battle the player did not watch.
     *
     * @param {string} hash Log hash.
     * @returns {Promise<{ deleted: true }>}
     */
    static remove(hash) {
        return api.delete(`logs/${encodeURIComponent(hash)}`);
    }
}

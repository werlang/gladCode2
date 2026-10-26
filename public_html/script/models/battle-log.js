import { api } from '../helpers/request.js';

const ENDPOINT = 'back_log.php';

/**
 * Stored battle logs (`back_log.php`).
 */
export class BattleLogModel {
    /**
     * Fetches a battle log.
     *
     * @param {string} hash Log hash.
     * @returns {Promise<{ status: 'SUCCESS'|'EXPIRED'|'NOTFOUND'|'ERROR', log?: string }>}
     *   `log` is the JSON text of the simulation steps.
     */
    static get(hash) {
        return api.post(ENDPOINT, { action: 'GET', loghash: hash });
    }

    /**
     * Deletes a battle log (editor test runs that are not kept).
     *
     * @param {string} hash Log hash.
     * @returns {Promise<{ status: 'SUCCESS' }>}
     */
    static remove(hash) {
        return api.post(ENDPOINT, { action: 'DELETE', hash });
    }
}

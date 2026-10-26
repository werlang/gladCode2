import { api } from '../helpers/request.js';

const ENDPOINT = 'back_rank.php';

/**
 * The gladiator ranking and the tutors' hashtag rankings (`back_rank.php`).
 */
export class RankModel {
    /**
     * A page of the general ranking.
     *
     * @param {{ offset: number, search?: string }} query First position and a gladiator or master filter.
     * @returns {Promise<{ total: number, ranking: Array<{ position: number, glad: string, master: string, mmr: number, change24: number }> }>}
     */
    static general({ offset, search = '' }) {
        return api.post(ENDPOINT, { action: 'GET', offset, search });
    }

    /**
     * The position of the user's best gladiator, to open the ranking on its page.
     *
     * @returns {Promise<{ offset: number }>}
     */
    static myBestOffset() {
        return api.post(ENDPOINT, { action: 'MAXMINE' });
    }

    /**
     * The hashtags the tutor follows.
     *
     * @returns {Promise<{ tags: string[] }>}
     */
    static tabs() {
        return api.post(ENDPOINT, { action: 'GET TABS' });
    }

    /**
     * Follows a hashtag.
     *
     * @param {string} name Hashtag without `#`.
     * @returns {Promise<{ status: 'SUCCESS'|'NOPREMIUM'|'NOCREDITS'|string }>}
     */
    static watch(name) {
        return api.post(ENDPOINT, { action: 'WATCH TAB', name, add: true });
    }

    /**
     * Stops following a hashtag.
     *
     * @param {string} name Hashtag without `#`.
     * @returns {Promise<{ status: string }>}
     */
    static unwatch(name) {
        return api.post(ENDPOINT, { action: 'WATCH TAB', name, remove: true });
    }

    /**
     * The ranking of the trainings tagged with a hashtag.
     *
     * @param {{ tab: string, search?: string }} query Hashtag and a master filter.
     * @returns {Promise<{ ranking: Array<{ position: number, id: number, nick: string, score: number, time: number }> }>}
     */
    static hashtag({ tab, search = '' }) {
        return api.post(ENDPOINT, { action: 'FETCH', tab, search });
    }
}

import { api } from '../helpers/request.js';

/**
 * Donation tracking (`back_thanks.php`).
 */
export class ThanksModel {
    /**
     * Records that the visitor left for a donation page from `page`.
     *
     * @param {string} page Path of the page the donation started on.
     * @returns {Promise<unknown>}
     */
    static trackDonation(page) {
        return api.post('back_thanks.php', { action: 'SET', url: page });
    }
}

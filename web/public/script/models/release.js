import { api } from '../helpers/request.js';

/**
 * Site releases (`back_update.php`, administrator only) and the e-mail that announces them.
 */
export class ReleaseModel {
    /** @returns {Promise<string[]>} The current version, split in its numbers. */
    static current() {
        return api.post('back_update.php', { action: 'GET' });
    }

    /**
     * Sets the site version.
     *
     * @param {{ version: string, keepup: boolean, pass: string }} release
     *   `keepup` moves the gladiators of the current version to the new one.
     * @returns {Promise<'OK'|'WRONGPASS'|unknown>}
     */
    static publish({ version, keepup, pass }) {
        return api.post('back_update.php', { action: 'SET', version, keepup, pass });
    }

    /**
     * E-mails the users who asked for update news.
     *
     * @param {{ version: string, summary: string, postlink: string }} announcement
     * @returns {Promise<unknown>}
     */
    static announce({ version, summary, postlink }) {
        return api.post('back_sendmail.php', { action: 'UPDATE', version, summary, postlink });
    }
}

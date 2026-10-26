import { api } from '../helpers/request.js';

/**
 * The running release (`/releases/current`, administrators only): the deployed version, carrying
 * gladiators forward and the e-mail that announces it.
 */
export class ReleaseModel {
    /**
     * @returns {Promise<{ version: string, announcing: boolean, gladiators: Array<{ version: string, count: number }> }>}
     * @throws {import('../helpers/request.js').RequestError} `ADMIN_ONLY`.
     */
    static current() {
        return api.get('releases/current');
    }

    /**
     * Moves the gladiators saved on an older version to the current one.
     *
     * @param {string} from
     * @returns {Promise<{ moved: number }>}
     */
    static carryForward(from) {
        return api.post('releases/current/gladiators', { from });
    }

    /**
     * E-mails the users who asked for update news (sent in the background).
     *
     * @param {{ changes: string, postLink: string }} announcement `changes` is HTML.
     * @returns {Promise<{ recipients: number }>}
     * @throws {import('../helpers/request.js').RequestError} `ANNOUNCEMENT_RUNNING`, `INVALID_POST_LINK`.
     */
    static announce(announcement) {
        return api.post('releases/current/announcement', announcement);
    }
}

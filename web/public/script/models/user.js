import { api } from '../helpers/request.js';
import { LocalData } from '../helpers/local-data.js';

const ENDPOINT = 'back_login.php';
const CACHE_KEY = 'user';

/** The signed-in user request, shared by every caller on the page. */
let current = null;

/**
 * The account behind the PHP session (`back_login.php`).
 */
export class UserModel {
    /**
     * Fetches the signed-in user once per page; later calls share the answer.
     *
     * @param {{ refresh?: boolean }} [options] `refresh` asks the server again.
     * @returns {Promise<Record<string, any>>} The user, whose `status` is
     *   `SUCCESS`, or `NOTLOGGED` / `NOTFOUND` without a session.
     */
    static current({ refresh = false } = {}) {
        if (!current || refresh) {
            current = api.post(ENDPOINT, { action: 'GET' }).then(user => {
                new LocalData({ id: CACHE_KEY }).set({ data: user });
                return user;
            });
        }
        return current;
    }

    /**
     * Whether a user answer belongs to a signed-in account.
     *
     * @param {Record<string, any>|null|undefined} user Answer of {@link UserModel.current}.
     * @returns {boolean}
     */
    static isLogged(user) {
        return user?.status === 'SUCCESS';
    }

    /**
     * Opens a session from a Google credential.
     *
     * @param {string} token Google ID token.
     * @returns {Promise<Record<string, any>>}
     */
    static signIn(token) {
        return api.post(ENDPOINT, { action: 'SET', token });
    }

    /**
     * Closes the session and forgets the cached user.
     *
     * @returns {Promise<unknown>}
     */
    static signOut() {
        current = null;
        new LocalData({ id: CACHE_KEY }).remove();
        return api.post(ENDPOINT, { action: 'UNSET' });
    }

    /**
     * Saves the profile settings.
     *
     * @param {{ nickname: string, language: string, picture: string, preferences: Record<string, unknown> }} fields
     * @returns {Promise<unknown>}
     */
    static update({ nickname, language, picture, preferences }) {
        return api.post(ENDPOINT, {
            action: 'UPDATE',
            nickname,
            language,
            picture,
            preferences: JSON.stringify(preferences),
        });
    }

    /** @returns {Promise<unknown>} Marks the tutorial as finished. */
    static endTutorial() {
        return api.post(ENDPOINT, { action: 'TUTORIAL_END' });
    }

    /**
     * @param {string} language Language the tutorial runs in.
     * @returns {Promise<unknown>}
     */
    static setTutorialLanguage(language) {
        return api.post(ENDPOINT, { action: 'TUTORIAL_LANGUAGE', language });
    }

    /**
     * Saves the editor appearance.
     *
     * @param {{ theme: string, font: string|number }} settings
     * @returns {Promise<unknown>}
     */
    static saveEditor({ theme, font }) {
        return api.post(ENDPOINT, { action: 'EDITOR', theme, font });
    }
}

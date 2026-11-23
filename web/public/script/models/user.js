import { api } from '../helpers/request.js';

/** The signed-in user request, shared by every caller on the page. */
let current = null;
/** Session generation: a reply from before sign-in/sign-out must not replace the cache. */
let session = 0;

/**
 * The signed-in account (`/users/me`) and its session (`/auth`).
 *
 * A user is `{ id, joinedAt, email, nickname, firstName, lastName, picture, language, level, xp, silver,
 * credits, premium, apothecary, showTutorial, editorTheme, editorFont, preferences, isAdmin,
 * stats: { battles, wins, renown } }`.
 */
export class UserModel {
    /**
     * Fetches the signed-in user once per page; later calls share the answer.
     *
     * @param {{ refresh?: boolean, signal?: AbortSignal }} [options] `refresh` asks the server again;
     *   `signal` cancels the request.
     * @returns {Promise<Record<string, any>|null>} The user, or null for a visitor.
     */
    static current({ refresh = false, signal } = {}) {
        if (!current || refresh) {
            current = api.get('users/me', {}, { signal }).then(
                answer => answer.user,
                error => {
                    current = null;
                    throw error;
                },
            );
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
        return Boolean(user?.id);
    }

    /**
     * Opens a session from a Google credential.
     *
     * @param {string} credential Google ID token.
     * @returns {Promise<Record<string, any>>} The user.
     */
    static async signIn(credential) {
        const { user } = await api.post('auth/google', { credential });
        session += 1;
        current = Promise.resolve(user);
        return user;
    }

    /**
     * Closes the session and forgets the user.
     *
     * @returns {Promise<unknown>}
     */
    static async signOut() {
        const epoch = ++session;
        const result = await api.post('auth/logout');
        if (epoch === session) current = null;
        return result;
    }

    /**
     * Whether a nickname is free.
     *
     * @param {string} nickname
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ nickname: string, available: boolean }>}
     */
    static nicknameAvailable(nickname, { signal } = {}) {
        return api.get('users/nickname', { nickname }, { signal });
    }

    /**
     * Saves profile changes; only the fields given change.
     *
     * @param {{ nickname?: string, language?: string, picture?: string, preferences?: Record<string, boolean>, theme?: string, gladView?: string, editorTheme?: string, editorFont?: number, showTutorial?: boolean }} fields
     *   `picture` is a new cropped image as a data URL.
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<Record<string, any>>} The updated user.
     * @throws {import('../helpers/request.js').RequestError} `NICKNAME_TAKEN` when the nickname is in use.
     */
    static async update(fields, { signal } = {}) {
        const epoch = session;
        const { user } = await api.put('users/me', fields, { signal });
        if (epoch === session) current = Promise.resolve(user);
        return user;
    }

    /** @returns {Promise<Record<string, any>>} Marks the tutorial as finished. */
    static endTutorial() {
        return UserModel.update({ showTutorial: false });
    }

    /**
     * @param {string} language Language the tutorial runs in, also the preferred one.
     * @returns {Promise<Record<string, any>>}
     */
    static setTutorialLanguage(language) {
        return UserModel.update({ language });
    }

    /**
     * Saves the editor appearance.
     *
     * @param {{ theme: string, font: string|number }} settings
     * @returns {Promise<Record<string, any>>}
     */
    static saveEditor({ theme, font }) {
        return UserModel.update({ editorTheme: theme, editorFont: Number(font) });
    }
}

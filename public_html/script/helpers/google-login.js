import { DynamicScript } from './dynamic-script.js';
import { LocalData } from './local-data.js';

const CLIENT_URL = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = '108043684563-ufdkp1teq749udehcfjjtuk277q5h0me.apps.googleusercontent.com';
const CREDENTIAL_KEY = 'google-credential';

/**
 * Google Identity Services sign-in.
 *
 * @example
 * await GoogleLogin.init();
 * GoogleLogin.onSignIn(credential => ...); // a credential was received
 * GoogleLogin.onFail(() => ...);           // the one-tap prompt was not shown
 * GoogleLogin.prompt();                    // one-tap, resolves once signed in
 * GoogleLogin.renderButton(element);       // the "Sign in with Google" button
 */
export class GoogleLogin {
    static logged = false;
    static loaded = false;
    static #ready = null;
    static #signedIn = null;
    static #resolveSignedIn = null;
    static onSignInCallback = null;
    static onFailCallback = null;

    /**
     * Loads the Google client once and initialises it.
     *
     * @returns {Promise<typeof GoogleLogin>}
     */
    static init() {
        GoogleLogin.#ready ??= new DynamicScript(CLIENT_URL).load().then(() => {
            google.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: response => GoogleLogin.saveCredential(response.credential),
                auto_select: true,
                ux_mode: 'popup',
            });
            GoogleLogin.loaded = true;
            return GoogleLogin;
        });
        return GoogleLogin.#ready;
    }

    /** @returns {boolean} Whether the client is initialised. */
    static isLoaded() {
        return GoogleLogin.loaded;
    }

    /**
     * Renders the sign-in button.
     *
     * @param {HTMLElement} element Container, preferably a div.
     * @throws {Error} When called before {@link GoogleLogin.init} resolved.
     */
    static renderButton(element) {
        GoogleLogin.#assertLoaded();
        google.accounts.id.renderButton(element, {
            theme: 'outline',
            size: 'large',
            locale: 'pt_BR',
            width: '200',
        });
    }

    /**
     * Shows the one-tap prompt.
     *
     * @returns {Promise<boolean>} `true` once signed in, `false` when the prompt was not shown.
     */
    static prompt() {
        GoogleLogin.#assertLoaded();
        return new Promise(resolve => {
            google.accounts.id.prompt(notification => {
                if (!notification.isNotDisplayed()) return;
                GoogleLogin.onFailCallback?.(notification);
                resolve(false);
            });
            GoogleLogin.waitLogged().then(() => resolve(true));
        });
    }

    /** @returns {Promise<void>} Resolves once a credential has been received. */
    static waitLogged() {
        if (GoogleLogin.logged) return Promise.resolve();
        GoogleLogin.#signedIn ??= new Promise(resolve => {
            GoogleLogin.#resolveSignedIn = resolve;
        });
        return GoogleLogin.#signedIn;
    }

    /**
     * @param {(notification: object) => void} callback Called when the prompt is not displayed.
     * @returns {typeof GoogleLogin}
     */
    static onFail(callback) {
        GoogleLogin.onFailCallback = callback;
        return GoogleLogin;
    }

    /**
     * @param {(credential: string) => void} callback Called when a credential arrives.
     * @returns {typeof GoogleLogin}
     */
    static onSignIn(callback) {
        GoogleLogin.onSignInCallback = callback;
        return GoogleLogin;
    }

    /**
     * Stores a credential and notifies the sign-in listener.
     *
     * @param {string} credential Google ID token.
     */
    static saveCredential(credential) {
        GoogleLogin.logged = true;
        new LocalData({ id: CREDENTIAL_KEY }).set({ data: credential });
        GoogleLogin.#resolveSignedIn?.();
        GoogleLogin.onSignInCallback?.(credential);
    }

    /** @returns {string|null} The stored credential, if any. */
    static getCredential() {
        return new LocalData({ id: CREDENTIAL_KEY }).get() ?? null;
    }

    /** Forgets the stored credential. */
    static removeCredential() {
        new LocalData({ id: CREDENTIAL_KEY }).remove();
    }

    static #assertLoaded() {
        if (!GoogleLogin.loaded) {
            throw new Error('GoogleLogin not loaded');
        }
    }
}

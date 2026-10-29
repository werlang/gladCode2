import { DynamicScript } from './dynamic-script.js';
import { LocalData } from './local-data.js';
import { TemplateVar } from './template-var.js';

const CLIENT_URL = 'https://accounts.google.com/gsi/client';
const CREDENTIAL_KEY = 'google-credential';

/**
 * Google Identity Services sign-in.
 *
 * @example
 * await GoogleLogin.init();
 * GoogleLogin.onSignIn(credential => ...); // a credential was received
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

    /**
     * Loads the Google client once and initialises it.
     *
     * @returns {Promise<typeof GoogleLogin>}
     */
    static init() {
        GoogleLogin.#ready ??= new DynamicScript(CLIENT_URL).load().then(() => {
            google.accounts.id.initialize({
                client_id: TemplateVar.get('googleClientId'),
                callback: response => GoogleLogin.receiveCredential(response.credential),
                auto_select: true,
                ux_mode: 'popup',
            });
            GoogleLogin.loaded = true;
            return GoogleLogin;
        });
        return GoogleLogin.#ready;
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
     * @param {(credential: string) => void} callback Called when a credential arrives.
     * @returns {typeof GoogleLogin}
     */
    static onSignIn(callback) {
        GoogleLogin.onSignInCallback = callback;
        return GoogleLogin;
    }

    /**
     * Hands a credential to the sign-in listener, which trades it for the API session. It is never
     * kept: the session is the API's HttpOnly cookie, and a stored token could be lifted to sign in
     * elsewhere.
     *
     * @param {string} credential Google ID token.
     */
    static receiveCredential(credential) {
        GoogleLogin.logged = true;
        GoogleLogin.#resolveSignedIn?.();
        GoogleLogin.onSignInCallback?.(credential);
    }

    /** Forgets the credential earlier versions of the site kept in this browser. */
    static removeCredential() {
        new LocalData({ id: CREDENTIAL_KEY }).remove();
    }

    static #assertLoaded() {
        if (!GoogleLogin.loaded) {
            throw new Error('GoogleLogin not loaded');
        }
    }
}

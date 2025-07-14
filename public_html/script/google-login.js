// Google Login helper
// USAGE:
// GoogleLogin.init({ redirectUri }); // initialize the google login. redirectUri is the uri to redirect after login
// GoogleLogin.onFail(() => {}); // callback when the login fails (no account selected)
// GoogleLogin.onSignIn(() => {}); // callback when the login is successful
// GoogleLogin.prompt(); // prompt the user to login. It will redirect to ask for the google account or automatically login if the account is already selected. This is asynchronous, so you can await it.
// GoogleLogin.getCredential(); // get the google credential if it is saved (logged)
// GoogleLogin.saveCredential(credential); // save the google credential (login)
// GoogleLogin.removeCredential(); // remove the google credential (logout)
// GoogleLogin.isLoaded(); // check if the google login is loaded
// GoogleLogin.renderButton(element); // render the google login button in the element


import DynamicScript from './dynamic-script.js';
import LocalData from './local-data.js';


export default class GoogleLogin {

    static logged = false;
    static loaded = false;

    static async init() {
        if (GoogleLogin.loaded) {
            return GoogleLogin;
        }

        return new Promise(resolve => new DynamicScript('https://accounts.google.com/gsi/client', async () => {
            async function handleCredentialResponse(response) {
                // console.log(response.credential);
                GoogleLogin.logged = true;
                GoogleLogin.saveCredential(response.credential);
            }
            while (typeof google === 'undefined') {
                await new Promise(r => setTimeout(r, 100));
            }
            google.accounts.id.initialize({
                client_id: '108043684563-ufdkp1teq749udehcfjjtuk277q5h0me.apps.googleusercontent.com',
                callback: handleCredentialResponse,
                auto_select: true,
                ux_mode: 'popup',
            });

            GoogleLogin.loaded = true;
            resolve(GoogleLogin);
        }));
    }

    static isLoaded() {
        return GoogleLogin.loaded;
    }

    static renderButton(element) {
        if (!GoogleLogin.loaded) {
            throw new Error('GoogleLogin not loaded');
        }
        // You can skip the next instruction if you don't want to show the "Sign-in" button
        google.accounts.id.renderButton(
            element, // Ensure the element exist and it is a div to display correcctly
            {
                theme: "outline",
                size: "large",
                locale: 'pt_BR',
                width: '200',
            }
        );
    }

    static async prompt() {
        if (!GoogleLogin.loaded) {
            throw new Error('GoogleLogin not loaded');
        }

        return new Promise(async resolve => {
            google.accounts.id.prompt(notification => {
                if (!notification.isNotDisplayed()) {
                    resolve(false);
                    return;
                }
                if (GoogleLogin.onFailCallback) {
                    GoogleLogin.onFailCallback(notification);
                    resolve(false);
                }
            });
    
            await GoogleLogin.waitLogged();
            resolve(true);
        })
    }

    static async waitLogged() {
        await new Promise(resolve => {
            let interval = setInterval(() => {
                if (GoogleLogin.logged) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);
        });
    }

    static onFail(callback) {
        GoogleLogin.onFailCallback = callback;
        return GoogleLogin;
    }

    static saveCredential(credential) {
        new LocalData({ id: 'google-credential' }).set({ data: credential });
        if (GoogleLogin.onSignInCallback) GoogleLogin.onSignInCallback(credential);
    }

    static getCredential() {
        return new LocalData({ id: 'google-credential' }).get();
    }

    static removeCredential() {
        new LocalData({ id: 'google-credential' }).remove();
    }

    static onSignIn(callback) {
        GoogleLogin.onSignInCallback = callback;
        return GoogleLogin;
    }
}
import { Header } from './components/header.js';
import { Tooltip } from './components/tooltip.js';
import { GoogleLogin } from './helpers/google-login.js';
import { UserModel } from './models/user.js';

/**
 * Shows the session in the header and signs in with Google: the one-tap prompt for visitors, then
 * an API session from the credential and the news page.
 */
async function start() {
    Tooltip.install();
    const user = await UserModel.current().catch(() => null);
    const logged = UserModel.isLogged(user);
    const headerElement = document.querySelector('#header');
    if (headerElement) new Header(headerElement).showSignedIn(logged);

    GoogleLogin.onFail(() => GoogleLogin.removeCredential());
    GoogleLogin.onSignIn(async credential => {
        if (!credential) return;
        await UserModel.signIn(credential);
        location.href = '/news';
    });

    await GoogleLogin.init();
    if (!logged) GoogleLogin.prompt();
}

start();

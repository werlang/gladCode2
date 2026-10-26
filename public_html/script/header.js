import { Header } from './components/header.js';
import { Tooltip } from './components/tooltip.js';
import { GoogleLogin } from './helpers/google-login.js';
import { api } from './helpers/request.js';
import { UserModel } from './models/user.js';

/**
 * Fills the `#footer` placeholder with footer.php.
 */
async function loadFooter() {
    const footer = document.querySelector('#footer');
    if (!footer) return;
    const markup = await api.get('footer.php');
    if (typeof markup === 'string') footer.innerHTML = markup;
}

/**
 * Signs in with Google: the one-tap prompt when no credential is stored,
 * then a server session from the credential and the news page.
 */
async function startGoogleLogin() {
    GoogleLogin.onFail(() => GoogleLogin.removeCredential());
    GoogleLogin.onSignIn(async credential => {
        if (!credential) return;
        await UserModel.signIn(credential);
        await UserModel.current({ refresh: true });
        location.href = '/news';
    });

    await GoogleLogin.init();
    if (!GoogleLogin.getCredential()) {
        GoogleLogin.prompt();
    }
}

UserModel.current();
Tooltip.install();

const headerElement = document.querySelector('#header');
if (headerElement) {
    new Header(headerElement).showSignedIn(Boolean(GoogleLogin.getCredential()));
}

loadFooter();
startGoogleLogin();

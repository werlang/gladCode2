import { GoogleLogin } from '../helpers/google-login.js';
import { Message } from './dialog.js';

/**
 * Opens the Google sign-in dialog.
 *
 * @param {string} [message] Why the visitor should sign in.
 */
export async function showLoginDialog(message = 'Faça login no sistema') {
    const box = new Message({
        message: `<div>${message}</div><div id='google-login' class='google-login'></div>`,
        buttons: { cancel: 'CANCELAR' },
    }).show();
    await GoogleLogin.init();
    GoogleLogin.renderButton(box.element.querySelector('#google-login'));
}

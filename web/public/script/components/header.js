import { BaseComponent } from './base-component.js';
import { createElement } from '../helpers/html.js';
import { hide, slideDown, slideHorizontal } from '../helpers/animate.js';
import { GoogleLogin } from '../helpers/google-login.js';
import { Message } from './dialog.js';

const SLIDE_MS = 300;

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

/**
 * Site header (`header.php`): drop-down menus, the mobile slide-out menu,
 * login and profile links and the footer.
 */
export class Header extends BaseComponent {
    /**
     * @param {HTMLElement} element The `#header` element.
     */
    constructor(element) {
        super(element);
        this.#bindDropMenus();
        this.#bindMobileMenu();
        this.element.querySelectorAll('#login').forEach(login => this.on(login, 'click', () => showLoginDialog()));
    }

    /**
     * Shows the profile link when signed in, the login link otherwise.
     *
     * @param {boolean} logged Whether the visitor has a session.
     */
    showSignedIn(logged) {
        this.element.querySelectorAll('#profile').forEach(link => link.classList.toggle('hidden', !logged));
        this.element.querySelectorAll('#login').forEach(link => link.classList.toggle('hidden', logged));
    }

    #bindDropMenus() {
        this.element.querySelectorAll('.drop-menu').forEach(menu => {
            this.on(menu, 'mouseenter', () => this.#openMenu(menu));
            this.on(menu, 'mouseleave', () => this.#closeMenus());
            this.on(menu, 'click', () => {
                this.#closeMenus();
                this.#openMenu(menu);
            });
        });
    }

    /**
     * Drops a menu's items below its title, kept inside the window.
     *
     * @param {HTMLElement} menu A `.drop-menu` item.
     */
    #openMenu(menu) {
        const containers = this.element.querySelectorAll('.item-container');
        containers.forEach(container => hide(container));
        if (this.element.querySelector('.item-container.open')) return;

        const container = menu.querySelector('.item-container');
        if (!container) return;
        container.classList.add('open');
        slideDown(container);

        const itemWidth = container.querySelector('.item')?.offsetWidth ?? 0;
        let left = menu.offsetLeft;
        if (left + itemWidth > window.innerWidth) {
            left = menu.offsetLeft + menu.offsetWidth - container.offsetWidth;
        }
        container.style.left = `${left}px`;
        container.style.top = `${menu.offsetTop + menu.offsetHeight}px`;
    }

    #closeMenus() {
        this.element.querySelectorAll('.item-container').forEach(container => {
            hide(container);
            container.classList.remove('open');
        });
    }

    #bindMobileMenu() {
        const button = this.element.querySelector('#menu-button');
        this.on(button, 'click', () => this.#openMobileMenu());
    }

    /**
     * Slides the header items in from the left over a fog that closes it.
     */
    async #openMobileMenu() {
        const fog = createElement("<div id='fog'><div id='menu'></div></div>");
        const menu = fog.querySelector('#menu');
        menu.innerHTML = `<a href='index'><img src='icon/logo.png' alt='gladCode'></a>${this.element.querySelector('#h-items').innerHTML}`;
        document.body.append(fog);

        fog.addEventListener('click', async () => {
            await slideHorizontal(menu, SLIDE_MS);
            fog.remove();
        });
        menu.addEventListener('click', event => event.stopPropagation());
        menu.querySelectorAll('#login').forEach(login => login.addEventListener('click', () => showLoginDialog()));

        await slideHorizontal(menu, SLIDE_MS);
    }
}

import { BaseComponent } from './base-component.js';
import { Avatar } from './avatar.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { accountMenuTemplate } from '../templates/account-menu.js';

/**
 * The avatar popover: identity, profile link, shortcuts, theme choice and sign-out.
 */
export class AccountMenu extends BaseComponent {
    #avatar;
    #opener = null;
    #theme = 'system';
    #level = 0;

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement("<div class='account-menu' hidden></div>"));
        this.element.innerHTML = renderTemplate(accountMenuTemplate, {
            profileIcon: icon('profile', { size: 18 }),
            shortcutsIcon: icon('shortcuts', { size: 18 }),
            logoutIcon: icon('logout', { size: 18 }),
        });
        this.#avatar = new Avatar({ size: 'md' });
        this.element.querySelector('.account-menu-avatar').append(this.#avatar.element);
        this.on(this.element.querySelector('[data-shortcuts]'), 'click', () => this.emit('shortcuts', {}));
        this.on(this.element.querySelector('[data-sign-out]'), 'click', () => this.emit('sign-out', {}));
        this.element.querySelectorAll('[data-theme]').forEach(button => {
            this.on(button, 'click', () => {
                this.setTheme(button.dataset.theme);
                this.emit('theme-select', { choice: button.dataset.theme });
            });
        });
        this.on(this.element, 'keydown', event => this.#onKey(event));
    }

    /**
     * @param {HTMLElement|null} trigger
     * @returns {this}
     */
    open(trigger = null) {
        this.#opener = trigger;
        this.element.hidden = false;
        this.element.querySelector('.account-menu-link')?.focus();
        return this;
    }

    /** @returns {this} */
    close() {
        const hadFocus = this.element.contains(document.activeElement);
        this.element.hidden = true;
        if (hadFocus && this.#opener?.isConnected) this.#opener.focus();
        this.emit('close', {});
        return this;
    }

    /** @returns {boolean} */
    get isOpen() {
        return !this.element.hidden;
    }

    /**
     * @param {Record<string, any>|null} user
     * @returns {this}
     */
    setAccount(user) {
        if (!user) return this;
        this.#avatar.set({ name: user.nickname, picture: user.picture, level: user.level });
        this.element.querySelector('.account-menu-name').textContent = user.nickname ?? '';
        this.#level = Number(user.level) || 0;
        this.setSilver(user.silver);
        this.setTheme(user.theme ?? 'system');
        return this;
    }

    /** @param {number|string} silver @returns {this} */
    setSilver(silver) {
        const line = this.element.querySelector('.account-menu-level');
        if (line) line.textContent = `Nível ${this.#level || '—'} · ${Number(silver || 0).toLocaleString('pt-BR')} de prata`;
        return this;
    }

    /** @param {string} choice @returns {this} */
    setTheme(choice) {
        this.#theme = choice === 'system' ? 'system' : choice;
        const root = document.documentElement;
        const shown = choice === 'system'
            ? (root.classList.contains('theme-classic') ? 'classic' : root.classList.contains('theme-arena-dark') ? 'arena-dark' : 'arena-light')
            : choice;
        this.element.querySelectorAll('[data-theme]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.theme === shown));
        });
        return this;
    }

    /** @returns {string} */
    get theme() {
        return this.#theme;
    }

    /**
     * @param {KeyboardEvent} event
     */
    #onKey(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const focusable = [...this.element.querySelectorAll('a, button')];
        const index = focusable.indexOf(document.activeElement);
        const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + focusable.length) % focusable.length;
        focusable[next]?.focus();
    }
}

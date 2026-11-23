import { BaseComponent } from './base-component.js';
import { AccountMenu } from './account-menu.js';
import { Avatar } from './avatar.js';
import { NotificationsPanel } from './notifications-panel.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { appHeaderTemplate } from '../templates/app-header.js';

/**
 * The site header (docs/frontend/components.md): identity, primary navigation, search entry,
 * Batalhar CTA, silver, bell and avatar, with the account and notification panels.
 */
export class AppHeader extends BaseComponent {
    #avatar;
    #accountMenu;
    #notifications;
    #bell;
    #avatarButton;

    /**
     * @param {object} options
     * @param {HTMLElement} [options.element]
     * @param {Record<string, any>|null} [options.account]
     * @param {object|null} [options.counts]
     * @param {string} [options.active]
     */
    constructor({ element, account = null, counts = null, active = 'none' } = {}) {
        super(element ?? createElement("<div class='app-header-shell'></div>"));
        this.element.innerHTML = renderTemplate(appHeaderTemplate, {
            chevron: icon('chevron', { size: 14 }),
            searchIcon: icon('search', { size: 18 }),
            battleIcon: icon('battle', { size: 18 }),
            coinsIcon: icon('coins', { size: 18 }),
            bellIcon: icon('bell', { size: 20 }),
        });
        this.#avatarButton = this.element.querySelector('.app-header-avatar');
        this.#bell = this.element.querySelector('.app-header-bell');
        this.#avatar = new Avatar({ size: 'md' });
        this.element.querySelector('.app-header-avatar-slot').append(this.#avatar.element);
        this.#accountMenu = new AccountMenu({ element: this.element.querySelector('#account-menu') });
        this.#notifications = new NotificationsPanel({ element: this.element.querySelector('#notifications-panel') });
        this.#bind();
        this.setAccount(account);
        this.setCounts(counts);
        this.setActive(active);
    }

    #bind() {
        this.on(this.element.querySelector('.app-header-battle'), 'click', () => this.emit('battle', {}));
        this.on(this.#avatarButton, 'click', () => {
            this.emit('account', {});
            this.#toggleAccount();
        });
        this.on(this.#bell, 'click', () => {
            this.#toggleNotifications();
            this.emit('notifications', {});
        });
        this.on(this.element.querySelector('.app-header-search-input'), 'click', event => {
            this.emit('search', { query: event.target.value });
        });
        this.on(this.element.querySelector('.app-header-search-input'), 'input', event => {
            this.emit('search', { query: event.target.value });
        });
        this.on(this.element.querySelector('.app-header-search-input'), 'keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.emit('search', { query: event.target.value });
            }
        });
        this.on(this.element.querySelector('.app-header-search-button'), 'click', () => this.emit('search', { query: '' }));
        this.on(this.element.querySelector('.app-header-login'), 'click', () => this.emit('sign-in', {}));
        this.#bindAbout();
        this.#accountMenu.listen('theme-select', detail => this.emit('theme-select', detail));
        this.#accountMenu.listen('shortcuts', detail => this.emit('shortcuts', detail));
        this.#accountMenu.listen('sign-out', detail => this.emit('sign-out', detail));
        this.#accountMenu.listen('close', () => this.#avatarButton.setAttribute('aria-expanded', 'false'));
        this.#notifications.listen('read-all', detail => this.emit('read-all', detail));
        this.#notifications.listen('open-item', detail => this.emit('open-item', detail));
        this.#notifications.listen('close', () => this.#bell.setAttribute('aria-expanded', 'false'));
        this.on(document, 'click', event => {
            if (this.element.contains(event.target)) return;
            if (this.#accountMenu.isOpen) this.#accountMenu.close();
            if (this.#notifications.isOpen) this.#notifications.close();
        });
        this.on(document, 'keydown', event => {
            if (event.key === 'Escape') this.closePanels();
        });
        this.on(this.element, 'keydown', event => {
            if (event.key === 'Escape') this.closePanels();
        });
    }

    #bindAbout() {
        const trigger = this.element.querySelector('.app-header-about-trigger');
        const menu = this.element.querySelector('#app-header-about-menu');
        const close = () => {
            menu.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        };
        this.on(trigger, 'click', event => {
            event.stopPropagation();
            menu.hidden = !menu.hidden;
            trigger.setAttribute('aria-expanded', String(!menu.hidden));
        });
        this.on(document, 'click', event => {
            if (!menu.hidden && !event.target.closest?.('.app-header-about')) close();
        });
        this.on(document, 'keydown', event => {
            if (event.key === 'Escape' && !menu.hidden) close();
        });
    }

    #toggleAccount() {
        if (this.#notifications.isOpen) this.#notifications.close();
        if (this.#accountMenu.isOpen) this.#accountMenu.close();
        else {
            this.#accountMenu.open(this.#avatarButton);
            this.#avatarButton.setAttribute('aria-expanded', 'true');
        }
    }

    #toggleNotifications() {
        if (this.#accountMenu.isOpen) this.#accountMenu.close();
        if (this.#notifications.isOpen) this.#notifications.close();
        else {
            this.#notifications.open(this.#bell);
            this.#bell.setAttribute('aria-expanded', 'true');
        }
    }

    /** @returns {this} */
    closePanels() {
        if (this.#accountMenu.isOpen) this.#accountMenu.close();
        if (this.#notifications.isOpen) this.#notifications.close();
        return this;
    }

    /** @param {Record<string, any>|null} user @returns {this} */
    setAccount(user) {
        const signed = Boolean(user?.id);
        this.element.querySelector('.app-header').classList.toggle('is-signed-out', !signed);
        this.element.querySelector('.app-header-session').hidden = !signed;
        this.element.querySelector('.app-header-login').hidden = signed;
        if (!signed) return this;
        this.#avatar.set({ name: user.nickname, picture: user.picture, level: user.level });
        this.#avatarButton.setAttribute('aria-label', `Conta de ${user.nickname}, nível ${user.level}`);
        this.#accountMenu.setAccount(user);
        this.setSilver(user.silver);
        return this;
    }

    /** @param {number|string} silver @returns {this} */
    setSilver(silver) {
        this.element.querySelector('.app-header-silver-value').textContent = Number(silver || 0).toLocaleString('pt-BR');
        this.#accountMenu.setSilver(silver);
        return this;
    }

    /** @param {import('../helpers/event-bus.js').NotificationCounts|null} counts @returns {this} */
    setCounts(counts) {
        if (!counts) return this;
        this.setSilver(counts.user?.silver ?? 0);
        const bell = Number(counts.bell || 0);
        const badge = this.element.querySelector('.app-header-count');
        badge.hidden = bell === 0;
        badge.textContent = bell > 99 ? '99+' : String(bell);
        this.#bell.setAttribute('aria-label', bell ? `Notificações, ${bell} nova${bell === 1 ? '' : 's'}` : 'Notificações');
        this.#notifications.setCount(bell);
        this.#accountMenu.setSilver(counts.user?.silver);
        return this;
    }

    /** @param {{ needs: object[], news: object[] }} items @returns {this} */
    setNotifications(items) {
        this.#notifications.setItems(items);
        if (this.#notifications.isOpen) this.#notifications.element.querySelector('.notifications-panel-item')?.focus();
        return this;
    }

    /** @param {string} choice @returns {this} */
    setTheme(choice) {
        this.#accountMenu.setTheme(choice);
        return this;
    }

    /** @param {string} active @returns {this} */
    setActive(active) {
        this.element.querySelectorAll('[data-nav]').forEach(link => {
            const current = link.dataset.nav === active;
            link.classList.toggle('is-active', current);
            if (current) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setSearching(on) {
        this.element.classList.toggle('is-searching', Boolean(on));
        return this;
    }

    /** @returns {this} Opens the bell panel without a click. */
    openNotifications() {
        this.#toggleNotifications();
        return this;
    }
}

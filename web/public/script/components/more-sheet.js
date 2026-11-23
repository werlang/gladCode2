import { BaseComponent } from './base-component.js';
import { Avatar } from './avatar.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { moreSheetTemplate } from '../templates/more-sheet.js';

/** The phone sheet's remaining destinations. */
const TILES = [
    { section: 'potions', label: 'Poções', href: '/potion', icon: 'potions', badge: 'potions' },
    { section: 'ranking', label: 'Ranking', href: '/ranking', icon: 'ranking' },
    { section: 'messages', label: 'Mensagens', href: '/messages', icon: 'messages', badge: 'messages' },
    { section: 'friends', label: 'Amigos', href: '/friends', icon: 'friends', badge: 'friends', gold: true },
    { section: 'news', label: 'Notícias', href: '/news', icon: 'news', badge: 'news' },
    { section: 'profile', label: 'Ajustes', href: '/profile', icon: 'profile' },
];

/**
 * The phone “Mais” modal sheet: identity, the six other tiles and the public destinations.
 */
export class MoreSheet extends BaseComponent {
    #opener = null;
    #avatar;
    #tiles = new Map();

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement("<div class='more-sheet' hidden></div>"));
        this.element.innerHTML = renderTemplate(moreSheetTemplate);
        this.#avatar = new Avatar({ size: 'md' });
        this.element.querySelector('.more-sheet-avatar-slot').append(this.#avatar.element);
        const grid = this.element.querySelector('.more-sheet-tiles');
        for (const tile of TILES) {
            const link = document.createElement('a');
            link.className = 'more-sheet-tile';
            link.href = tile.href;
            const iconWrap = document.createElement('span');
            iconWrap.className = `more-sheet-tile-icon more-sheet-tile-icon--${tile.section}`;
            iconWrap.innerHTML = icon(tile.icon, { size: 18 });
            const label = document.createElement('span');
            label.textContent = tile.label;
            const badge = document.createElement('span');
            badge.className = 'more-sheet-tile-badge';
            badge.hidden = true;
            link.append(iconWrap, label, badge);
            grid.append(link);
            this.#tiles.set(tile.section, { link, badge, tile });
        }
        this.on(this.element.querySelector('[data-close]'), 'click', () => this.close());
        this.on(this.element, 'keydown', event => this.#onKey(event));
    }

    /** @param {HTMLElement|null} trigger @returns {this} */
    open(trigger = null) {
        this.#opener = trigger;
        this.element.hidden = false;
        this.element.querySelector('.more-sheet-tile')?.focus();
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

    /** @param {Record<string, any>|null} user @returns {this} */
    setAccount(user) {
        if (!user) return this;
        this.#avatar.set({ name: user.nickname, picture: user.picture, level: user.level });
        this.element.querySelector('.more-sheet-name').textContent = user.nickname ?? '';
        this.element.querySelector('.more-sheet-level').textContent = `nível ${user.level ?? 0}`;
        const total = Math.round((parseInt(user.level, 10) * 1.9 + 1) * 130);
        const ratio = Math.min(100, Math.round(((Number(user.xp) || 0) / total) * 100));
        this.element.querySelector('.more-sheet-xp span').style.width = `${ratio}%`;
        return this;
    }

    /** @param {import('../helpers/event-bus.js').NotificationCounts|null} counts @returns {this} */
    setCounts(counts) {
        if (!counts) return this;
        const values = {
            potions: counts.potions?.count ?? 0,
            messages: counts.messages,
            friends: counts.friends,
            news: counts.news,
        };
        for (const { badge, tile } of this.#tiles.values()) {
            const value = Math.max(0, Number(values[tile.badge] ?? 0));
            badge.hidden = !value;
            badge.textContent = value > 99 ? '99+' : String(value);
            badge.classList.toggle('action', Boolean(tile.gold));
        }
        return this;
    }

    /** @param {KeyboardEvent} event */
    #onKey(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = [...this.element.querySelectorAll('a[href], button:not([disabled])')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
}

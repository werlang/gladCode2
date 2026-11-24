import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { notificationsPanelTemplate } from '../templates/notifications-panel.js';

/**
 * The bell popover: “Precisa de você” and “Novidades”, each row linking to its section.
 */
export class NotificationsPanel extends BaseComponent {
    #opener = null;
    #count = 0;

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement("<div class='notifications-panel' hidden></div>"));
        this.element.innerHTML = renderTemplate(notificationsPanelTemplate);
        this.on(this.element.querySelector('[data-read-all]'), 'click', () => {
            this.close();
            this.emit('read-all', {});
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
        this.element.querySelector('.notifications-panel-item')?.focus();
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
     * @param {{ needs?: Array<{ id: string, text: string, where: string, href: string }>,
     *   news?: Array<{ id: string, text: string, where: string, href: string }> }} items
     * @returns {this}
     */
    setItems({ needs = [], news = [] } = {}) {
        this.#fill('needs', needs);
        this.#fill('news', news);
        this.element.querySelector('.notifications-panel-empty').hidden = Boolean(needs.length || news.length);
        return this;
    }

    /** @returns {number} */
    get count() {
        return this.#count;
    }

    /** @param {number} count @returns {this} */
    setCount(count) {
        this.#count = Number(count) || 0;
        return this;
    }

    /**
     * @param {'needs'|'news'} group
     * @param {Array<{ id: string, text: string, where: string, href: string }>} items
     */
    #fill(group, items) {
        const list = this.element.querySelector(`[data-group='${group}'] .notifications-panel-list`);
        list.replaceChildren();
        for (const item of items) {
            const row = document.createElement('a');
            row.className = 'notifications-panel-item';
            row.href = item.href;
            row.dataset.kind = item.id.startsWith('duel-report-') || item.id.startsWith('report-')
                ? 'report'
                : item.id.startsWith('friend-')
                    ? 'friend'
                    : item.id.startsWith('duel-')
                        ? 'duel'
                        : 'news';
            row.addEventListener('click', () => this.emit('open-item', { id: item.id, href: item.href }));
            const dot = document.createElement('span');
            dot.className = 'notifications-panel-dot';
            dot.setAttribute('aria-hidden', 'true');
            const body = document.createElement('span');
            body.className = 'notifications-panel-text';
            const text = document.createElement('span');
            text.textContent = item.text;
            const where = document.createElement('span');
            where.className = 'notifications-panel-where';
            where.textContent = item.where;
            body.append(text, where);
            row.append(dot, body);
            list.append(row);
        }
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

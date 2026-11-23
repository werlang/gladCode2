import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { mobileTabBarTemplate } from '../templates/mobile-tab-bar.js';

/**
 * The phone bottom bar: Notícias, Gladiadores, the raised Batalhar, Relatórios and Mais.
 */
export class MobileTabBar extends BaseComponent {
    #items = new Map();

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement("<nav class='mobile-tab-bar' aria-label='Seções'></nav>"));
        this.element.innerHTML = renderTemplate(mobileTabBarTemplate, {
            newsIcon: icon('news', { size: 22 }),
            gladsIcon: icon('glads', { size: 22 }),
            battleIcon: icon('battle', { size: 24 }),
            reportsIcon: icon('reports', { size: 22 }),
            moreIcon: icon('more', { size: 22 }),
        });
        this.element.querySelectorAll('[data-tab], [data-more]').forEach(item => {
            this.#items.set(item.dataset.tab ?? 'more', item);
        });
        this.on(this.element.querySelector('[data-more]'), 'click', () => this.emit('more', {}));
    }

    /** @param {string} section @returns {this} */
    setActive(section) {
        for (const [id, item] of this.#items) {
            if (id === section) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
            item.classList.toggle('is-active', id === section);
        }
        return this;
    }

    /** @param {import('../helpers/event-bus.js').NotificationCounts|null} counts @returns {this} */
    setCounts(counts) {
        if (!counts) return this;
        this.#badge('news', counts.news, { dot: true });
        this.#badge('glads', Number(counts.gladiators?.outdated || 0), { dot: true });
        this.#badge('battle', counts.duels);
        this.#badge('report', Number(counts.reports?.ranked || 0) + Number(counts.reports?.duel || 0));
        this.#badge('more', Number(counts.friends || 0) + Number(counts.messages || 0), { dot: true });
        return this;
    }

    /**
     * @param {string} section
     * @param {number} count
     * @param {{ dot?: boolean }} [options]
     */
    #badge(section, count, { dot = false } = {}) {
        const badge = this.#items.get(section)?.querySelector('.mobile-tab-badge');
        if (!badge) return;
        const value = Math.max(0, Math.floor(Number(count) || 0));
        badge.hidden = value === 0;
        badge.textContent = dot ? '' : value > 99 ? '99+' : String(value);
        badge.classList.toggle('is-dot', dot);
    }
}

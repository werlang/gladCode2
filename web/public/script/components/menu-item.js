import { BaseComponent } from './base-component.js';
import { Badge } from './badge.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { menuItemTemplate } from '../templates/menu-item.js';

/**
 * One entry of the Painel rail: icon tile, label and an optional Badge.
 */
export class MenuItem extends BaseComponent {
    #section;
    #badge;

    /**
     * @param {object} options
     * @param {HTMLElement} [options.element]
     * @param {string} options.section Section id (also the icon colour class).
     * @param {string} options.label
     * @param {string} options.href
     * @param {string} [options.icon] Icon name from `templates/icons.js`.
     */
    constructor({ element, section, label, href, icon: iconName = 'grid' } = {}) {
        super(element ?? createElement(renderTemplate(menuItemTemplate, {
            section,
            href,
            label,
            icon: icon(iconName, { size: 17 }),
        })));
        this.#section = section;
        this.#badge = new Badge({ kind: 'info' });
        this.#badge.element.hidden = true;
        this.element.querySelector('.menu-item-badge-slot').append(this.#badge.element);
    }

    /** @returns {string} */
    get section() {
        return this.#section;
    }

    /**
     * @param {boolean} on
     * @returns {this}
     */
    setActive(on) {
        if (on) this.element.setAttribute('aria-current', 'page');
        else this.element.removeAttribute('aria-current');
        this.element.classList.toggle('is-active', Boolean(on));
        return this;
    }

    /**
     * @param {string} text Empty hides the badge.
     * @param {'action'|'unread'|'info'} [kind]
     * @param {string} [description]
     * @returns {this}
     */
    setBadge(text, kind = 'info', description = '') {
        this.#badge.setKind(kind);
        if (text) this.#badge.setLabel(text);
        else {
            this.#badge.set(0);
            this.#badge.element.hidden = true;
        }
        this.#badge.setDescription(description);
        return this;
    }

    /**
     * @param {boolean} on
     * @returns {this}
     */
    setDisabled(on) {
        this.element.classList.toggle('is-disabled', Boolean(on));
        if (on) this.element.setAttribute('aria-disabled', 'true');
        else this.element.removeAttribute('aria-disabled');
        return this;
    }
}

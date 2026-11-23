import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { tabsTemplate } from '../templates/tabs.js';

/**
 * The index a roving tab focus moves to.
 *
 * @param {number} current
 * @param {number} delta
 * @param {number} length
 * @returns {number}
 */
export function nextTabIndex(current, delta, length) {
    if (!length) return -1;
    return (current + delta + length) % length;
}

/** @typedef {'underline'|'pill'} TabsVariant */

/**
 * The section tabs (docs/frontend/components.md): a real `tablist` with roving focus, `aria-selected`
 * and an optional count per tab.
 */
export class Tabs extends BaseComponent {
    #buttons = new Map();
    #selected = null;
    #variant;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element]
     * @param {TabsVariant} [options.variant]
     * @param {string} [options.label] Accessible name of the tablist.
     */
    constructor({ element, variant = 'underline', label = '' } = {}) {
        super(element ?? createElement(renderTemplate(tabsTemplate, { variant })));
        this.#variant = variant;
        if (label) this.element.setAttribute('aria-label', label);
    }

    /** @returns {string|null} */
    get selected() {
        return this.#selected;
    }

    /**
     * @param {Array<{ id: string, label: string, count?: number, panelId?: string, selected?: boolean }>} items
     * @returns {this}
     */
    setItems(items = []) {
        this.#buttons.clear();
        this.element.replaceChildren();

        for (const item of items) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'tab';
            button.id = `tab-${item.id}`;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', 'false');
            button.tabIndex = -1;
            if (item.panelId) button.setAttribute('aria-controls', item.panelId);
            button.append(document.createTextNode(item.label));
            if (item.count !== undefined) {
                const count = document.createElement('span');
                count.className = 'tab-count';
                count.textContent = String(item.count);
                count.setAttribute('aria-hidden', 'true');
                button.append(count);
                button.setAttribute('aria-label', `${item.label}, ${item.count}`);
            }
            button.addEventListener('click', () => this.select(item.id));
            button.addEventListener('keydown', event => this.#onKey(event, item.id));
            this.#buttons.set(item.id, button);
            this.element.append(button);
        }

        const first = items.find(item => item.selected)?.id ?? items[0]?.id ?? null;
        if (first) this.select(first, { silent: true });
        return this;
    }

    /**
     * @param {string} id
     * @param {{ silent?: boolean }} [options]
     * @returns {this}
     */
    select(id, { silent = false } = {}) {
        const button = this.#buttons.get(id);
        if (!button) return this;
        for (const [key, other] of this.#buttons) {
            const on = key === id;
            other.setAttribute('aria-selected', String(on));
            other.tabIndex = on ? 0 : -1;
        }
        this.#selected = id;
        if (!silent) this.emit('select', { id });
        return this;
    }

    /**
     * @param {KeyboardEvent} event
     * @param {string} id
     */
    #onKey(event, id) {
        const ids = [...this.#buttons.keys()];
        const index = ids.indexOf(id);
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            const next = nextTabIndex(index, event.key === 'ArrowRight' ? 1 : -1, ids.length);
            this.#buttons.get(ids[next])?.focus();
            this.select(ids[next]);
        }
        else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : ids.length - 1;
            this.#buttons.get(ids[next])?.focus();
            this.select(ids[next]);
        }
        else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.select(id);
        }
    }
}

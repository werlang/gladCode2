import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { badgeTemplate } from '../templates/badge.js';

/** @typedef {'action'|'unread'|'info'} BadgeKind */

/**
 * The label of a numeric badge: counts above 99 read `99+` so the pill keeps its size.
 *
 * @param {number} count
 * @returns {string}
 */
export function badgeText(count) {
    const value = Number(count);
    if (!Number.isFinite(value) || value <= 0) return '';
    return value > 99 ? '99+' : String(value);
}

/**
 * A counter/pill (docs/frontend/components.md): `action` (gold, needs the master), `unread` (a
 * count) or `info` (a state such as “4/6”). A zero action/unread badge hides itself.
 *
 * @example
 * new Badge({ kind: 'action', count: 2 }).element
 */
export class Badge extends BaseComponent {
    #kind = 'info';
    #count = 0;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element] Existing `.badge`; a new one otherwise.
     * @param {BadgeKind} [options.kind]
     * @param {number} [options.count]
     * @param {string} [options.label] Text for an `info` badge (`4/6`, `#128`, `3 h`).
     */
    constructor({ element, kind = 'info', count = 0, label = '' } = {}) {
        super(element ?? createElement(renderTemplate(badgeTemplate, { kind })));
        this.setKind(kind);
        if (label) this.setLabel(label);
        else this.set(count);
    }

    /** @returns {number} */
    get count() {
        return this.#count;
    }

    /** @returns {BadgeKind} */
    get kind() {
        return this.#kind;
    }

    /**
     * @param {number} count Count shown; 0 hides an `unread`/`action` badge.
     * @returns {this}
     */
    set(count) {
        this.#count = Math.max(0, Math.floor(Number(count) || 0));
        this.element.textContent = badgeText(this.#count);
        this.element.hidden = this.#count === 0 && this.#kind !== 'info';
        this.element.setAttribute('aria-label', this.element.title || '');
        return this;
    }

    /**
     * @param {BadgeKind} kind
     * @returns {this}
     */
    setKind(kind) {
        const safe = ['action', 'unread', 'info'].includes(kind) ? kind : 'info';
        this.element.classList.remove('action', 'unread', 'info');
        this.element.classList.add(safe);
        this.#kind = safe;
        return this;
    }

    /**
     * Shows free text instead of a number (`4/6`, `#128`, `3 h`); an `info` badge is never hidden.
     *
     * @param {string} label
     * @returns {this}
     */
    setLabel(label) {
        this.#count = 0;
        this.element.textContent = label == null ? '' : String(label);
        this.element.hidden = false;
        return this;
    }

    /**
     * @param {string} text Accessible description (e.g. “1 desafio de duelo”).
     * @returns {this}
     */
    setDescription(text) {
        if (text) this.element.title = text;
        else this.element.removeAttribute('title');
        return this;
    }
}

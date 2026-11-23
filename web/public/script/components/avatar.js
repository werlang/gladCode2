import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { avatarTemplate } from '../templates/avatar.js';

/** @typedef {'sm'|'md'|'lg'} AvatarSize */

/**
 * The initials shown when a master has no picture: the first letters of the first two words.
 *
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
    const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    const letters = words.slice(0, 2).map(word => [...word][0]).join('');
    return letters.toUpperCase();
}

/**
 * A master's picture with its initials fallback, level ring and online dot
 * (docs/frontend/components.md).
 */
export class Avatar extends BaseComponent {
    #size;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element] Existing `.avatar`.
     * @param {AvatarSize} [options.size]
     * @param {string} [options.name]
     * @param {string} [options.picture]
     * @param {number} [options.level]
     * @param {boolean} [options.online]
     */
    constructor({ element, size = 'md', name = '', picture = '', level = 0, online = false } = {}) {
        super(element ?? createElement(renderTemplate(avatarTemplate, { size })));
        this.#size = size;
        this.set({ name, picture, level });
        this.setOnline(online);
    }

    /** @returns {AvatarSize} */
    get size() {
        return this.#size;
    }

    /**
     * @param {{ name?: string, picture?: string, level?: number }} person
     * @returns {this}
     */
    set({ name = '', picture = '', level = 0 } = {}) {
        const image = this.element.querySelector('.avatar-image');
        const initialsNode = this.element.querySelector('.avatar-initials');
        const levelNode = this.element.querySelector('.avatar-level');

        if (picture) {
            image.onerror = () => this.#showInitials(name);
            image.src = picture;
            image.alt = name;
            image.hidden = false;
            initialsNode.hidden = true;
        }
        else {
            this.#showInitials(name);
        }

        const numericLevel = Number(level) || 0;
        levelNode.textContent = numericLevel > 0 ? String(numericLevel) : '';
        levelNode.hidden = numericLevel <= 0;
        this.element.setAttribute('aria-label', name ? `Conta de ${name}` : 'Conta');
        return this;
    }

    /**
     * Hides a missing/failed picture and shows the master's initials instead.
     *
     * @param {string} name
     */
    #showInitials(name) {
        const image = this.element.querySelector('.avatar-image');
        const initialsNode = this.element.querySelector('.avatar-initials');
        image.onerror = null;
        image.removeAttribute('src');
        image.alt = '';
        image.hidden = true;
        initialsNode.textContent = initials(name);
        initialsNode.hidden = false;
    }

    /**
     * @param {number} ratio 0–1 of the level ring that is filled.
     * @returns {this}
     */
    setRing(ratio) {
        const value = Math.max(0, Math.min(1, Number(ratio) || 0));
        this.element.style.setProperty('--avatar-ring', String(Math.round(value * 100)));
        return this;
    }

    /**
     * @param {boolean} online
     * @returns {this}
     */
    setOnline(online) {
        const dot = this.element.querySelector('.avatar-dot');
        dot.hidden = !online;
        dot.setAttribute('aria-label', online ? 'Online agora' : 'Offline');
        return this;
    }
}

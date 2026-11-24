import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { composerTemplate } from '../templates/messages.js';

/**
 * The message composer (docs/frontend/components.md): Enter sends, Shift+Enter inserts a new line,
 * and a refused send keeps the draft.
 */
export class Composer extends BaseComponent {
    #input;
    #send;

    /** @param {{ element?: HTMLElement, placeholder?: string }} [options] */
    constructor({ element, placeholder = '' } = {}) {
        super(element ?? createElement(renderTemplate(composerTemplate, {
            send: icon('messages', { size: 16, className: 'icon' }),
        })));
        this.#input = this.element.querySelector('.composer-input');
        this.#send = this.element.querySelector('.composer-send');
        if (placeholder) this.#input.placeholder = placeholder;
        this.#input.addEventListener('input', () => this.#sync());
        this.#input.addEventListener('keydown', event => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            this.#submit();
        });
        this.element.addEventListener('submit', event => {
            event.preventDefault();
            this.#submit();
        });
        this.#sync();
    }

    /** @returns {string} */
    get value() {
        return this.#input.value;
    }

    /** @param {string} text @returns {this} */
    setValue(text) {
        this.#input.value = text == null ? '' : String(text);
        this.#sync();
        return this;
    }

    /** @param {string} text @returns {this} */
    setPlaceholder(text) {
        this.#input.placeholder = text ?? '';
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        const busy = Boolean(on);
        this.element.setAttribute('aria-busy', String(busy));
        this.#send.disabled = busy || !this.value.trim();
        this.#input.disabled = busy;
        return this;
    }

    /** @returns {this} */
    clear() {
        this.#input.value = '';
        this.#sync();
        return this;
    }

    /** @returns {this} */
    focus() {
        this.#input.focus();
        return this;
    }

    #sync() {
        this.#send.disabled = !this.value.trim();
    }

    #submit() {
        const text = this.value.trim();
        if (!text || this.#send.disabled) return;
        this.emit('send', { text });
    }
}

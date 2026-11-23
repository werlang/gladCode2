import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { searchFieldTemplate } from '../templates/search-field.js';

/**
 * The query a search control sends: trimmed, never the raw spaces.
 *
 * @param {string} value
 * @returns {string}
 */
export function searchQuery(value) {
    return String(value ?? '').trim();
}

/**
 * The one search input (docs/frontend/components.md): header, ranking, conversations and master
 * search. Typing emits a debounced `search { value }`; Enter emits `submit { value }`.
 */
export class SearchField extends BaseComponent {
    #input;
    #clear;
    #debounceMs;
    #setTimer;
    #clearTimer;
    #timer = null;
    #lastSearched = null;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element] Existing `.search-field` form.
     * @param {string} [options.variant] `dark` for the dark panel.
     * @param {string} [options.label] Accessible input name.
     * @param {string} [options.placeholder]
     * @param {number} [options.debounce]
     * @param {Function} [options.setTimer]
     * @param {Function} [options.clearTimer]
     */
    constructor({
        element,
        variant = '',
        label = 'Buscar',
        placeholder = '',
        debounce = 300,
        setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
        clearTimer = id => globalThis.clearTimeout(id),
    } = {}) {
        super(element ?? createElement(renderTemplate(searchFieldTemplate, {
            variant: variant ? `search-field--${variant}` : '',
        })));
        this.#input = this.element.querySelector('.search-field-input');
        this.#clear = this.element.querySelector('.search-field-clear');
        this.#debounceMs = debounce;
        this.#setTimer = setTimer;
        this.#clearTimer = clearTimer;
        this.#input.setAttribute('aria-label', label);
        if (placeholder) this.#input.placeholder = placeholder;

        this.on(this.element, 'submit', event => {
            // the component's own `submit` CustomEvent bubbles here too; only the form's native submit counts
            if (event instanceof CustomEvent) return;
            event.preventDefault();
            this.#cancel();
            const value = searchQuery(this.value);
            this.#lastSearched = value;
            this.emit('submit', { value });
        });
        this.on(this.#input, 'input', () => this.#typed());
        this.on(this.#clear, 'click', () => this.clear());
    }

    /** @returns {string} */
    get value() {
        return this.#input.value;
    }

    /**
     * @param {string} value
     * @returns {this}
     */
    set(value) {
        this.#input.value = value == null ? '' : String(value);
        this.#syncClear();
        return this;
    }

    /** @returns {this} Focuses the input. */
    focus() {
        this.#input.focus();
        return this;
    }

    /**
     * @param {boolean} on
     * @returns {this}
     */
    setBusy(on) {
        this.element.setAttribute('aria-busy', String(Boolean(on)));
        return this;
    }

    /**
     * Clears the query and emits an empty search.
     *
     * @returns {this}
     */
    clear() {
        this.#cancel();
        this.#input.value = '';
        this.#syncClear();
        this.#lastSearched = '';
        this.#input.focus();
        this.emit('search', { value: '' });
        return this;
    }

    /** Typing waits `debounce` ms, then emits only when the trimmed query changed. */
    #typed() {
        this.#syncClear();
        this.#cancel();
        this.#timer = this.#setTimer(() => {
            this.#timer = null;
            const value = searchQuery(this.value);
            if (value === this.#lastSearched) return;
            this.#lastSearched = value;
            this.emit('search', { value });
        }, this.#debounceMs);
    }

    #cancel() {
        if (this.#timer !== null) this.#clearTimer(this.#timer);
        this.#timer = null;
    }

    #syncClear() {
        this.#clear.hidden = this.value.length === 0;
    }
}

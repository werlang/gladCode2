import { BaseComponent } from './base-component.js';
import { createElement } from '../helpers/html.js';
import { segmentedControlTemplate } from '../templates/segmented-control.js';

/**
 * The selected option after a keyboard move.
 *
 * @param {number} current
 * @param {number} delta
 * @param {number} length
 * @returns {number}
 */
export function nextOptionIndex(current, delta, length) {
    if (!length) return -1;
    return (current + delta + length) % length;
}

/**
 * A compact mutually exclusive choice (docs/frontend/components.md): language, gladiator filter or
 * potion kind. A real `group` of `aria-pressed` buttons with arrow-key movement.
 */
export class SegmentedControl extends BaseComponent {
    #buttons = new Map();
    #value = null;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element]
     * @param {string} [options.label] Accessible group name.
     */
    constructor({ element, label = '' } = {}) {
        super(element ?? createElement(segmentedControlTemplate));
        if (label) this.element.setAttribute('aria-label', label);
    }

    /** @returns {string|null} */
    get value() {
        return this.#value;
    }

    /**
     * @param {Array<{ value: string, label: string, count?: number }>} options
     * @returns {this}
     */
    setOptions(options = []) {
        this.#buttons.clear();
        this.element.replaceChildren();

        for (const option of options) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'segmented-option';
            button.setAttribute('aria-pressed', 'false');
            button.append(document.createTextNode(option.label));
            if (option.count !== undefined) {
                const count = document.createElement('span');
                count.className = 'segmented-count';
                count.textContent = String(option.count);
                count.setAttribute('aria-hidden', 'true');
                button.append(count);
                button.setAttribute('aria-label', `${option.label}, ${option.count}`);
            }
            button.addEventListener('click', () => this.set(option.value));
            button.addEventListener('keydown', event => this.#onKey(event, option.value));
            this.#buttons.set(option.value, button);
            this.element.append(button);
        }
        return this;
    }

    /**
     * @param {string} value
     * @param {{ silent?: boolean }} [options]
     * @returns {this}
     */
    set(value, { silent = false } = {}) {
        if (!this.#buttons.has(value)) return this;
        for (const [key, button] of this.#buttons) {
            button.setAttribute('aria-pressed', String(key === value));
        }
        this.#value = value;
        if (!silent) this.emit('change', { value });
        return this;
    }

    /**
     * @param {KeyboardEvent} event
     * @param {string} value
     */
    #onKey(event, value) {
        const values = [...this.#buttons.keys()];
        const index = values.indexOf(value);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
            const next = values[nextOptionIndex(index, delta, values.length)];
            this.#buttons.get(next)?.focus();
            this.set(next);
        }
        else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const next = event.key === 'Home' ? values[0] : values.at(-1);
            this.#buttons.get(next)?.focus();
            this.set(next);
        }
    }
}

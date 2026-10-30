import { Field } from './field.js';

/**
 * A `<select>` with the same error contract as `Input` (components/input.js).
 *
 * @example
 * new Select(panel.querySelector('#site-theme select')).set(user.theme).change((event, value) => applyTheme(value));
 */
export class Select extends Field {
    /**
     * @param {HTMLSelectElement} element
     */
    constructor(element) {
        super(element);
        this.on(element, 'change', () => this.clearError());
    }

    /** @returns {string} The selected value. */
    get value() {
        return this.element.value;
    }

    /**
     * Selects a value without firing `change`.
     *
     * @param {string} value
     * @returns {this}
     */
    set(value) {
        this.element.value = value == null ? '' : String(value);
        return this;
    }

    /**
     * Replaces the options.
     *
     * @param {{ value: string, text: string }[]} options
     * @returns {this}
     */
    setOptions(options) {
        this.element.replaceChildren(...options.map(({ value, text }) => new Option(text, value)));
        return this;
    }

    /**
     * Runs `callback` when the user picks another option.
     *
     * @param {(event: Event, value: string, select: Select) => void} callback
     * @returns {this}
     */
    change(callback) {
        return this.on(this.element, 'change', event => callback(event, this.value, this));
    }
}

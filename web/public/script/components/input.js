import { Field } from './field.js';

/**
 * An `<input>` or `<textarea>` with the `.field` look (css/components/field.css): typing clears its
 * error, and `filled` marks a value for styles that need it.
 *
 * @example
 * const nickname = new Input(panel.querySelector('#nickname'));
 * if (!nickname.value.trim()) nickname.setError('Escolha um apelido');
 */
export class Input extends Field {
    /**
     * @param {HTMLInputElement|HTMLTextAreaElement} element
     */
    constructor(element) {
        super(element);
        this.#syncFilled();
        this.on(element, 'input', () => {
            this.#syncFilled();
            this.clearError();
        });
    }

    /** @returns {string|boolean} The value; a checkbox answers whether it is checked. */
    get value() {
        return this.element.type === 'checkbox' ? this.element.checked : this.element.value;
    }

    /** @param {unknown} value New value (a checkbox takes a boolean). */
    set value(value) {
        if (this.element.type === 'checkbox') this.element.checked = Boolean(value);
        else this.element.value = value == null ? '' : String(value);
        this.#syncFilled();
    }

    /**
     * Runs `callback` on every edit.
     *
     * @param {(event: Event, input: Input) => void} callback
     * @returns {this}
     */
    input(callback) {
        return this.on(this.element, 'input', event => callback(event, this));
    }

    /**
     * Runs `callback` on key presses (Enter to submit, for instance).
     *
     * @param {(event: KeyboardEvent, input: Input) => void} callback
     * @returns {this}
     */
    keyDown(callback) {
        return this.on(this.element, 'keydown', event => callback(event, this));
    }

    #syncFilled() {
        this.element.classList.toggle('filled', Boolean(this.value));
    }
}

import { BaseComponent } from './base-component.js';

/**
 * Shared error state of a form field: the `.error` class and `aria-invalid`
 * (css/components/field.css). Base of `Input` and `Select`.
 */
export class Field extends BaseComponent {
    #message = '';

    /** @returns {string} The last error message, '' when the field is valid. */
    get error() {
        return this.#message;
    }

    /**
     * Marks the field invalid and focuses it.
     *
     * @param {string} [message] What is wrong, kept for the caller to show.
     * @returns {this}
     */
    setError(message = '') {
        this.#message = message;
        this.element.classList.add('error');
        this.element.setAttribute('aria-invalid', 'true');
        this.element.focus();
        return this;
    }

    /**
     * Clears the invalid state.
     *
     * @returns {this}
     */
    clearError() {
        this.#message = '';
        this.element.classList.remove('error');
        this.element.removeAttribute('aria-invalid');
        return this;
    }
}


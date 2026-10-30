import { BaseComponent } from './base-component.js';

/** Markup the button shows while its action runs. */
const SPINNER = "<i class='fa-solid fa-spinner fa-spin-pulse' aria-hidden='true'></i>";

/**
 * A `.button` (css/components/button.css) whose click runs an action: the button is disabled and
 * shows a spinner until the action settles, so it cannot be sent twice.
 *
 * @example
 * new Button({ element: panel.querySelector('#save') }).click(async () => {
 *     await UserModel.saveProfile(changes);
 * });
 *
 * @example
 * const close = new Button({ text: 'Fechar', icon: 'xmark', variant: 'ghost' });
 * dialog.append(close.element);
 */
export class Button extends BaseComponent {
    #html = '';
    #busy = false;

    /**
     * @param {object} [options]
     * @param {HTMLButtonElement} [options.element] Existing button; a new `<button class='button'>` otherwise.
     * @param {string} [options.text] Label (text, escaped by the caller when it comes from users).
     * @param {string} [options.icon] Font Awesome icon name, without `fa-`, shown before the label.
     * @param {string} [options.title] Tooltip text.
     * @param {string|string[]} [options.variant] Variant classes (`secondary`, `neutral`, `ghost`, `outline`,
     *   `danger`, `success`, `small`, `large`, `block`).
     */
    constructor({ element, text, icon, title, variant } = {}) {
        if (!element) {
            element = document.createElement('button');
            element.type = 'button';
            element.className = 'button';
        }
        super(element);

        if (icon || text) this.setText(text, icon);
        if (title) element.title = title;
        if (variant) element.classList.add(...[variant].flat());
    }

    /**
     * Replaces the label.
     *
     * @param {string} [text] Label markup.
     * @param {string} [icon] Font Awesome icon name shown before it.
     * @returns {this}
     */
    setText(text = '', icon = '') {
        const glyph = icon ? `<i class='fa-solid fa-${icon}' aria-hidden='true'></i> ` : '';
        this.element.innerHTML = `${glyph}${text}`;
        return this;
    }

    /** @returns {boolean} Whether an action is running. */
    get busy() {
        return this.#busy;
    }

    /**
     * Disables the button; with `spin`, keeps its width and shows a spinner instead of the label.
     *
     * @param {boolean} [spin]
     * @returns {this}
     */
    disable(spin = true) {
        if (!this.#busy) this.#html = this.element.innerHTML;
        if (spin) {
            this.element.style.width = `${this.element.offsetWidth}px`;
            this.element.innerHTML = SPINNER;
            this.element.classList.add('is-loading');
        }
        this.element.disabled = true;
        this.#busy = true;
        return this;
    }

    /**
     * Restores the label and enables the button.
     *
     * @returns {this}
     */
    enable() {
        this.element.disabled = false;
        if (!this.#busy) return this;
        this.element.innerHTML = this.#html;
        this.element.style.removeProperty('width');
        this.element.classList.remove('is-loading');
        this.#busy = false;
        return this;
    }

    /**
     * Runs `action` on click, with the button disabled until it settles (errors still re-enable it
     * and propagate). Without an action, clicks the button.
     *
     * @param {(event: MouseEvent, button: Button) => unknown} [action]
     * @returns {this}
     */
    click(action) {
        if (!action) {
            this.element.click();
            return this;
        }
        return this.on(this.element, 'click', async event => {
            if (this.#busy) return;
            this.disable();
            try {
                await action(event, this);
            }
            finally {
                this.enable();
            }
        });
    }
}

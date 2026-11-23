import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { fadeIn } from '../helpers/animate.js';
import {
    dialogButtonTemplate,
    dialogInputTemplate,
    dialogTemplate,
    terminalTemplate,
} from '../templates/dialog.js';

/**
 * Modal message box with buttons and an optional text field.
 *
 * @example
 * const answer = await new Message({ message: 'Sair?', buttons: { no: 'NÃO', yes: 'SIM' } }).show().wait();
 * if (answer.button === 'yes') ...
 *
 * new Message({ message: 'Nome', input: { default: 'glad' } })
 *     .show()
 *     .click('ok', ({ input }) => save(input));
 */
export class Message extends BaseComponent {
    #resolve;
    #result;
    #handlers = new Map();
    #opener = null;

    /**
     * @param {object} options
     * @param {string} options.message Message markup.
     * @param {Record<string, string>} [options.buttons] Button labels by id; defaults to `{ ok: 'OK' }`.
     * @param {true|{ default?: string, placeholder?: string, enter?: string }} [options.input]
     *   Adds a text field; Enter clicks the `enter` button (`ok`, else `yes`).
     * @param {string} [options.class] Extra class for the dialog box.
     * @param {boolean} [options.preventKill] Keep the box open after a click; close it with {@link Message#kill}.
     */
    constructor({ message, buttons, input, class: boxClass, preventKill = false }) {
        super();
        this.message = message;
        this.buttons = buttons ?? { ok: 'OK' };
        this.boxClass = boxClass ?? '';
        this.preventKill = preventKill;
        this.input = input ? {
            default: input.default ?? '',
            placeholder: input.placeholder ?? '',
            enter: input.enter ?? (this.buttons.ok ? 'ok' : this.buttons.yes ? 'yes' : null),
        } : null;
        this.#result = new Promise(resolve => {
            this.#resolve = resolve;
        });
    }

    /**
     * Renders the box on the page.
     *
     * @returns {this}
     */
    show() {
        this.#opener = document.activeElement;
        const buttons = Object.entries(this.buttons)
            .map(([id, label]) => renderTemplate(dialogButtonTemplate, { id, label }))
            .join('');
        const field = this.input
            ? renderTemplate(dialogInputTemplate, { value: this.input.default, placeholder: this.input.placeholder })
            : '';

        this.element = createElement(renderTemplate(dialogTemplate, {
            boxClass: this.boxClass,
            message: this.message,
            field,
            buttons,
        }));
        document.body.append(this.element);
        fadeIn(this.element, undefined, 'flex');
        this.on(this.element, 'keydown', event => this.#onKey(event));

        Object.keys(this.buttons).forEach(id => {
            this.on(this.getButton(id), 'click', () => this.#press(id));
        });

        const textField = this.#field();
        if (textField) {
            textField.focus();
            this.on(textField, 'keyup', event => {
                if (event.key === 'Enter' && this.input.enter) {
                    this.getButton(this.input.enter)?.click();
                }
            });
        }
        else {
            this.getButton(Object.keys(this.buttons).at(-1))?.focus();
        }

        return this;
    }

    /**
     * Binds the handler of one button, replacing any previous one.
     *
     * @param {string} button Button id.
     * @param {(result: { input?: string }) => unknown} handler Receives the field value when there is a field.
     * @returns {this}
     */
    click(button, handler) {
        this.#handlers.set(button, handler);
        return this;
    }

    /**
     * Resolves with the first button pressed.
     *
     * @returns {Promise<{ button: string, input?: string }>}
     */
    wait() {
        return this.#result;
    }

    /**
     * @param {string} id Button id.
     * @returns {HTMLButtonElement|null}
     */
    getButton(id) {
        return this.element?.querySelector(`#dialog-button-${CSS.escape(id)}`) ?? null;
    }

    /** Closes the box. */
    kill() {
        const opener = this.#opener;
        this.destroy();
        this.#opener = null;
        if (opener?.isConnected) opener.focus();
    }

    /**
     * Esc closes the box (pressing `cancel` when it exists) and Tab stays inside the dialog.
     *
     * @param {KeyboardEvent} event
     */
    #onKey(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            const ids = Object.keys(this.buttons);
            const cancelId = ['cancel', 'no'].find(id => this.getButton(id))
                ?? ids.find(id => /^(cancelar|não|no)$/i.test(this.buttons[id]));
            const target = cancelId ? this.getButton(cancelId) : ids.length === 1 ? this.getButton(ids[0]) : null;
            if (target) target.click();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusable = [...this.element.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')]
            .filter(node => !node.disabled && node.getAttribute('aria-hidden') !== 'true');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    /** @returns {HTMLInputElement|null} The text field, if any. */
    #field() {
        return this.element?.querySelector('#dialog-box .input') ?? null;
    }

    /**
     * Runs a button's handler, resolves {@link Message#wait} and closes the box.
     *
     * @param {string} id Button id.
     */
    #press(id) {
        const result = this.input ? { button: id, input: this.#field()?.value ?? '' } : { button: id };
        const handler = this.#handlers.get(id);
        if (handler) {
            handler(this.input ? { input: result.input } : undefined);
        }
        this.#resolve(result);
        if (!this.preventKill) {
            this.kill();
        }
    }
}

/**
 * Shows a message with a row of buttons.
 *
 * @param {string} message Message markup.
 * @param {string[]} buttons Button labels.
 * @returns {Promise<string>} The label of the button pressed.
 */
export async function showDialog(message, buttons) {
    const ids = Object.fromEntries(buttons.map((label, index) => [String(index), label]));
    const { button } = await new Message({ message, buttons: ids }).show().wait();
    return buttons[Number(button)];
}

/**
 * Shows a message with an OK button.
 *
 * @param {string} message Message markup.
 * @returns {Promise<true>} Resolves when dismissed.
 */
export async function showMessage(message) {
    await new Message({ message }).show().wait();
    return true;
}

/**
 * Asks for a line of text.
 *
 * @param {string} message Message markup.
 * @param {string} [defaultValue] Pre-filled value.
 * @returns {Promise<string|false>} The text, or `false` when cancelled.
 */
export async function showInput(message, defaultValue = '') {
    const { button, input } = await new Message({
        message,
        buttons: { cancel: 'CANCELAR', ok: 'OK' },
        input: { default: defaultValue },
    }).show().wait();
    return button === 'ok' ? input : false;
}

/**
 * Asks for a text of at most `maxChars` characters, counting down as it is typed.
 *
 * @param {string} message Message markup.
 * @param {string} placeholder Placeholder.
 * @param {number} maxChars Character limit.
 * @returns {Promise<string|false>} The text, or `false` when cancelled.
 */
export function showTextArea(message, placeholder, maxChars) {
    const box = new Message({ message, buttons: { cancel: 'CANCELAR', ok: 'OK' }, preventKill: true }).show();
    const field = createElement(`<textarea class='input'></textarea>`);
    const counter = createElement(`<span id='charcount'></span>`);
    field.placeholder = placeholder;
    box.element.querySelector('#button-container').before(field, counter);
    field.focus();

    const update = () => {
        const left = maxChars - field.value.length;
        counter.textContent = `${left} caracteres`;
        counter.classList.toggle('alert', left < 0);
        if (left >= 0) field.classList.remove('alert');
    };
    update();
    box.on(field, 'input', update);

    return new Promise(resolve => {
        box.click('cancel', () => {
            box.kill();
            resolve(false);
        });
        box.click('ok', () => {
            if (field.value.length > maxChars) {
                field.classList.add('alert');
                field.focus();
                return;
            }
            box.kill();
            resolve(field.value);
        });
    });
}

/**
 * Shows preformatted output in a terminal-styled window.
 *
 * @param {string} title Window title.
 * @param {string} message Output markup.
 */
export function showTerminal(title, message) {
    const fog = createElement(renderTemplate(terminalTemplate, { title, message }));
    document.body.append(fog);
    const close = fog.querySelector('#close');
    close.addEventListener('click', () => fog.remove());
    close.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') fog.remove();
    });
}

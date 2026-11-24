import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { choiceCardTemplate, choiceCardsTemplate } from '../templates/choice-cards.js';

/** @param {number} current @param {number} delta @param {number} length */
function nextIndex(current, delta, length) {
    if (!length) return -1;
    return (current + delta + length) % length;
}

/**
 * A mutually exclusive set of large cards (docs/frontend/components.md): theme previews, gladiator
 * styles or battle modes. Cards are real radio buttons with arrow-key movement.
 */
export class ChoiceCards extends BaseComponent {
    #buttons = [];
    #value = null;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element]
     * @param {'preview'|'icon'|'mode'} [options.variant]
     * @param {string} [options.label] Accessible group label.
     */
    constructor({ element, variant = 'preview', label = '' } = {}) {
        super(element ?? createElement(renderTemplate(choiceCardsTemplate, { variant })));
        this.element.classList.add('choice-cards', `choice-cards--${variant}`);
        this.element.setAttribute('role', 'radiogroup');
        if (label) this.element.setAttribute('aria-label', label);
    }

    /** @returns {string|null} */
    get value() {
        return this.#value;
    }

    /**
     * @param {Array<{ value: string, title: string, description?: string, preview?: string,
     *   badge?: string, disabled?: boolean }>} options
     * @returns {this}
     */
    setOptions(options = []) {
        this.#buttons = [];
        this.element.replaceChildren();
        for (const option of options) {
            const button = createElement(renderTemplate(choiceCardTemplate, {
                preview: option.preview ?? '',
                title: option.title,
                description: option.description ?? '',
                badge: option.badge ?? '',
            }));
            button.dataset.value = option.value;
            button.disabled = Boolean(option.disabled);
            button.setAttribute('aria-checked', 'false');
            if (option.badge) button.querySelector('.choice-card-badge').hidden = false;
            button.addEventListener('click', () => this.set(option.value));
            button.addEventListener('keydown', event => this.#onKey(event, option.value));
            this.#buttons.push(button);
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
        const button = this.#buttons.find(item => item.dataset.value === value);
        if (!button || button.disabled) return this;
        for (const item of this.#buttons) {
            const selected = item === button;
            item.setAttribute('aria-checked', String(selected));
            item.classList.toggle('is-selected', selected);
        }
        this.#value = value;
        if (!silent) this.emit('change', { value });
        return this;
    }

    /** Clears the selection (for a “system” choice outside the cards). @returns {this} */
    clear() {
        for (const button of this.#buttons) {
            button.setAttribute('aria-checked', 'false');
            button.classList.remove('is-selected');
        }
        this.#value = null;
        return this;
    }

    /** @param {KeyboardEvent} event @param {string} value */
    #onKey(event, value) {
        const usable = this.#buttons.filter(button => !button.disabled);
        if (!usable.length) return;
        const index = usable.findIndex(button => button.dataset.value === value);
        let next = null;
        if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = nextIndex(index, 1, usable.length);
        else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = nextIndex(index, -1, usable.length);
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = usable.length - 1;
        if (next === null) return;
        event.preventDefault();
        const target = usable[next];
        target.focus();
        this.set(target.dataset.value);
    }
}

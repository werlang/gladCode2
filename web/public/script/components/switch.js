import { BaseComponent } from './base-component.js';
import { createElement } from '../helpers/html.js';
import { switchTemplate } from '../templates/switch.js';

/**
 * An on/off setting (docs/frontend/components.md): a real `role="switch"` button whose click toggles
 * `aria-checked` and emits `change { checked }`.
 */
export class Switch extends BaseComponent {
    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element]
     * @param {boolean} [options.checked]
     * @param {string} [options.label] Accessible label when no visible `<label>` names it.
     */
    constructor({ element, checked = false, label = '' } = {}) {
        super(element ?? createElement(switchTemplate));
        this.element.setAttribute('role', 'switch');
        if (label) this.element.setAttribute('aria-label', label);
        if (!this.element.hasAttribute('aria-checked')) this.element.setAttribute('aria-checked', 'false');
        this.set(checked, { silent: true });
        this.on(this.element, 'click', () => this.set(!this.checked));
    }

    /** @returns {boolean} */
    get checked() {
        return this.element.getAttribute('aria-checked') === 'true';
    }

    /**
     * @param {boolean} checked
     * @param {{ silent?: boolean }} [options]
     * @returns {this}
     */
    set(checked, { silent = false } = {}) {
        const on = Boolean(checked);
        this.element.setAttribute('aria-checked', String(on));
        if (!silent) this.emit('change', { checked: on });
        return this;
    }

    /**
     * @param {boolean} on
     * @returns {this}
     */
    setDisabled(on) {
        this.element.disabled = Boolean(on);
        this.element.setAttribute('aria-disabled', String(Boolean(on)));
        return this;
    }
}

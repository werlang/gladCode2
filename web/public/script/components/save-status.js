import { BaseComponent } from './base-component.js';
import { createElement } from '../helpers/html.js';
import { saveStatusTemplate } from '../templates/save-status.js';

const ICONS = { idle: '✓', saving: '…', saved: '✓', error: '!' };

/**
 * The inline autosave state (docs/frontend/components.md): idle, saving, saved or error. A refused
 * write is reported once, without a retry action; the next change starts a fresh state.
 */
export class SaveStatus extends BaseComponent {
    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement(saveStatusTemplate));
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-live', 'polite');
    }

    /**
     * @param {'idle'|'saving'|'saved'|'error'} state
     * @param {string} [message]
     * @returns {this}
     */
    set(state = 'idle', message = '') {
        const safe = ['idle', 'saving', 'saved', 'error'].includes(state) ? state : 'idle';
        this.element.dataset.state = safe;
        this.element.querySelector('.save-status-icon').textContent = ICONS[safe];
        this.element.querySelector('.save-status-text').textContent = message;
        this.element.hidden = safe === 'idle' && !message;
        if (safe === 'error') this.element.setAttribute('role', 'alert');
        else this.element.setAttribute('role', 'status');
        return this;
    }
}

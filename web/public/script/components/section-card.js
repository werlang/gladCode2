import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import { sectionCardErrorTemplate, sectionCardTemplate } from '../templates/section-card.js';

/**
 * A section panel (docs/frontend/components.md): optional title/actions, a body slot and the
 * loading, empty and error states shared by every Painel section.
 */
export class SectionCard extends BaseComponent {
    /**
     * @param {{ element?: HTMLElement }} [options]
     */
    constructor({ element } = {}) {
        super(element ?? createElement(sectionCardTemplate));
    }

    /** @returns {HTMLElement|null} The body slot. */
    get body() {
        return this.element?.querySelector('.section-card-body') ?? null;
    }

    /**
     * @param {string} title
     * @returns {this}
     */
    setTitle(title = '') {
        this.element.querySelector('.section-card-title').textContent = title;
        this.#syncHeader();
        return this;
    }

    /**
     * @param {Node[]} children
     * @returns {this}
     */
    setActions(children = []) {
        this.element.querySelector('.section-card-actions').replaceChildren(...children);
        this.#syncHeader();
        return this;
    }

    /**
     * @param {Node[]} children
     * @returns {this}
     */
    setBody(children = []) {
        this.body.replaceChildren(...children);
        return this;
    }

    /**
     * @param {boolean} on
     * @returns {this}
     */
    setBusy(on) {
        this.element.classList.toggle('is-busy', Boolean(on));
        this.element.setAttribute('aria-busy', String(Boolean(on)));
        return this;
    }

    /**
     * @param {{ icon?: string, title?: string, summary?: string, actionHtml?: string }} state
     * @returns {this}
     */
    setEmpty({ icon = 'inbox', title = '', summary = '', actionHtml = '' } = {}) {
        this.setBusy(false);
        this.body.innerHTML = renderTemplate(emptyStateTemplate, {
            variantClass: 'compact',
            icon,
            title,
            summary,
            actionHtml,
        });
        return this;
    }

    /**
     * @param {{ message: string }} state
     * @returns {this}
     */
    setError({ message }) {
        this.setBusy(false);
        this.body.innerHTML = renderTemplate(sectionCardErrorTemplate, { message });
        const retry = this.body.querySelector('[data-section-retry]');
        if (retry) this.on(retry, 'click', () => this.emit('retry', {}));
        return this;
    }

    /** @returns {this} */
    #syncHeader() {
        const header = this.element.querySelector('.section-card-header');
        const title = this.element.querySelector('.section-card-title').textContent.trim();
        const actions = this.element.querySelector('.section-card-actions').children.length > 0;
        header.hidden = !title && !actions;
        return this;
    }
}

import { BaseComponent } from './base-component.js';
import { createElement } from '../helpers/html.js';
import { pageHeaderTemplate } from '../templates/page-header.js';

/**
 * The section heading (docs/frontend/components.md): one `<h1>`, an optional subtitle and an
 * actions slot. Its `title` element is the focus target a section change moves to.
 */
export class PageHeader extends BaseComponent {
    /**
     * @param {{ element?: HTMLElement }} [options]
     */
    constructor({ element } = {}) {
        super(element ?? createElement(pageHeaderTemplate));
    }

    /** @returns {HTMLElement|null} The `<h1>`. */
    get title() {
        return this.element?.querySelector('.page-header-title') ?? null;
    }

    /** @returns {HTMLElement|null} The actions slot. */
    get actions() {
        return this.element?.querySelector('.page-header-actions') ?? null;
    }

    /**
     * @param {{ title?: string, subtitle?: string }} values
     * @returns {this}
     */
    set({ title = '', subtitle = '' } = {}) {
        const heading = this.title;
        const sub = this.element.querySelector('.page-header-subtitle');
        heading.textContent = title;
        sub.textContent = subtitle;
        sub.hidden = !subtitle;
        return this;
    }

    /**
     * @param {Node[]} children Actions, filters or a summary.
     * @returns {this}
     */
    setActions(children = []) {
        this.actions.replaceChildren(...children);
        this.actions.hidden = children.length === 0;
        return this;
    }
}

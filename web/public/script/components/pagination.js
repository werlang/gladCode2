import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { paginationTemplate } from '../templates/pagination.js';

/**
 * The page numbers to show: every page when there are few, otherwise the first, the last and a
 * window around the current page, with `'…'` for the gaps.
 *
 * @param {number} page 1-based current page.
 * @param {number} pages Total pages.
 * @param {number} [around] Pages to show on each side of the current one.
 * @returns {Array<number|'…'>}
 */
export function pageList(page, pages, around = 2) {
    const total = Math.max(1, Math.floor(Number(pages) || 1));
    const current = Math.max(1, Math.min(total, Math.floor(Number(page) || 1)));
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

    const start = Math.max(2, current - around);
    const end = Math.min(total - 1, current + around);
    const list = [1];
    if (start > 2) list.push('…');
    for (let value = start; value <= end; value += 1) list.push(value);
    if (end < total - 1) list.push('…');
    list.push(total);
    return list;
}

/**
 * Parses the go-to-position field: a positive integer no greater than `total`.
 *
 * @param {string|number} text
 * @param {number} total
 * @returns {number|null} Null for an empty/invalid value; a value beyond `total` clamps to it.
 */
export function parsePosition(text, total) {
    const value = Number.parseInt(String(text ?? '').trim(), 10);
    if (!Number.isFinite(value) || value < 1) return null;
    return Math.min(value, Math.max(1, Math.floor(Number(total) || 0)));
}

/** @typedef {'simple'|'numbered'} PaginationVariant */

/**
 * The page controls (docs/frontend/components.md): a simple previous/next row or numbered pages plus
 * the go-to-position form. It renders data; it never fetches.
 */
export class Pagination extends BaseComponent {
    #variant;
    #page = 1;
    #pages = 1;
    #total = 0;
    #pageSize = 10;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element]
     * @param {PaginationVariant} [options.variant]
     */
    constructor({ element, variant = 'numbered' } = {}) {
        super(element ?? createElement(renderTemplate(paginationTemplate, { variant })));
        this.#variant = variant;
    }

    /**
     * @param {{ page: number, pages: number, total: number, pageSize: number }} state
     * @returns {this}
     */
    set({ page, pages, total, pageSize }) {
        this.#page = Math.max(1, Math.floor(Number(page) || 1));
        this.#pages = Math.max(1, Math.floor(Number(pages) || 1));
        this.#total = Math.max(0, Math.floor(Number(total) || 0));
        this.#pageSize = Math.max(1, Math.floor(Number(pageSize) || 10));
        this.#render();
        return this;
    }

    /**
     * @param {number} page
     * @returns {this}
     */
    goTo(page) {
        const next = Math.max(1, Math.min(this.#pages, Math.floor(Number(page) || 1)));
        if (next === this.#page) return this;
        this.#page = next;
        this.#render();
        this.emit('change', { page: next });
        return this;
    }

    /** @param {number} position */
    #jump(position) {
        if (position !== null) this.emit('jump', { position });
    }

    #render() {
        const parts = [];

        if (this.#variant === 'numbered') {
            parts.push(this.#prevButton());
            const list = document.createElement('span');
            list.className = 'pagination-pages';
            for (const entry of pageList(this.#page, this.#pages)) {
                if (entry === '…') {
                    const gap = document.createElement('span');
                    gap.className = 'pagination-gap';
                    gap.textContent = '…';
                    gap.setAttribute('aria-hidden', 'true');
                    list.append(gap);
                }
                else {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'pagination-page';
                    button.textContent = String(entry);
                    if (entry === this.#page) button.setAttribute('aria-current', 'page');
                    button.addEventListener('click', () => this.goTo(entry));
                    list.append(button);
                }
            }
            parts.push(list);
            parts.push(this.#nextButton());
        }
        else {
            parts.push(this.#prevButton());
            parts.push(this.#nextButton());
        }

        const summary = document.createElement('span');
        summary.className = 'pagination-summary';
        const start = this.#total === 0 ? 0 : (this.#page - 1) * this.#pageSize + 1;
        const end = Math.min(this.#total, this.#page * this.#pageSize);
        summary.textContent = `${start}–${end} de ${this.#total}`;

        const row = document.createElement('span');
        row.className = 'pagination-pages';
        row.append(...parts);

        const fragment = document.createDocumentFragment();
        fragment.append(summary, row);

        if (this.#variant === 'numbered') fragment.append(this.#jumpForm());
        this.element.replaceChildren(fragment);
    }

    #prevButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pagination-button';
        button.setAttribute('aria-label', 'Página anterior');
        button.textContent = '‹';
        button.disabled = this.#page <= 1;
        button.addEventListener('click', () => this.goTo(this.#page - 1));
        return button;
    }

    #nextButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pagination-button';
        button.setAttribute('aria-label', 'Próxima página');
        button.textContent = '›';
        button.disabled = this.#page >= this.#pages;
        button.addEventListener('click', () => this.goTo(this.#page + 1));
        return button;
    }

    #jumpForm() {
        const form = document.createElement('form');
        form.className = 'pagination-jump';

        const label = document.createElement('label');
        label.textContent = 'Ir para a posição';
        label.htmlFor = 'pagination-jump';

        const input = document.createElement('input');
        input.className = 'pagination-jump-input';
        input.id = 'pagination-jump';
        input.inputMode = 'numeric';
        input.placeholder = '#';

        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'pagination-button';
        submit.textContent = 'Ir';

        form.addEventListener('submit', event => {
            event.preventDefault();
            this.#jump(parsePosition(input.value, this.#total));
        });
        form.append(label, input, submit);
        return form;
    }
}

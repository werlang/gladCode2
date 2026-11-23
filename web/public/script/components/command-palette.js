import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { commandPaletteTemplate } from '../templates/command-palette.js';

/**
 * Ctrl K / ⌘K navigation and search: grouped results, keyboard-first, focus trapped.
 */
export class CommandPalette extends BaseComponent {
    #commands;
    #search;
    #opener = null;
    #controller = null;
    #items = [];
    #active = -1;
    #onInput = () => this.#run(this.#input.value);

    /**
     * @param {object} options
     * @param {HTMLElement} [options.element]
     * @param {Array<{ id: string, label: string, href: string, section: string|null, group: string, keywords?: string }>} [options.commands]
     * @param {(query: string, signal: AbortSignal) => Promise<{ groups: Array<{ title: string, items: object[] }> }>} [options.search]
     */
    constructor({ element, commands = [], search = null } = {}) {
        super(element ?? createElement("<div class='command-palette' hidden></div>"));
        this.element.innerHTML = renderTemplate(commandPaletteTemplate, {
            searchIcon: icon('search', { size: 18 }),
        });
        this.#commands = commands;
        this.#search = search;
        this.#input = this.element.querySelector('.command-palette-input');
        this.on(this.#input, 'input', this.#onInput);
        this.on(this.element.querySelector('[data-close]'), 'click', () => this.close());
        this.on(this.element, 'keydown', event => this.#onKey(event));
    }

    #input;

    /**
     * @param {{ query?: string }} [options]
     * @returns {this}
     */
    open({ query = '' } = {}) {
        this.#opener = document.activeElement;
        this.element.hidden = false;
        this.#input.value = query;
        this.#active = -1;
        this.#run(query);
        this.#input.focus();
        return this;
    }

    /** @returns {this} */
    close() {
        this.#controller?.abort();
        this.#controller = null;
        this.element.hidden = true;
        if (this.#opener?.isConnected) this.#opener.focus();
        this.#opener = null;
        this.emit('close', {});
        return this;
    }

    /** @returns {boolean} */
    get isOpen() {
        return !this.element.hidden;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        this.element.classList.toggle('is-busy', Boolean(on));
        this.element.querySelector('.command-palette-panel').setAttribute('aria-busy', String(Boolean(on)));
        return this;
    }

    /**
     * @param {{ groups: Array<{ title: string, items: Array<{ id: string, label: string, sub?: string, href: string, section?: string|null, key?: string }> }> }} result
     * @returns {this}
     */
    setResults({ groups = [] } = {}) {
        const container = this.element.querySelector('.command-palette-results');
        container.replaceChildren();
        this.#items = [];
        this.#active = -1;
        let index = 0;
        for (const group of groups) {
            if (!group.items?.length) continue;
            const section = document.createElement('div');
            section.className = 'command-palette-group';
            const title = document.createElement('span');
            title.className = 'command-palette-group-title';
            title.textContent = group.title;
            section.append(title);
            for (const item of group.items) {
                const anchor = document.createElement('a');
                anchor.className = 'command-palette-item';
                anchor.id = `command-palette-item-${index}`;
                anchor.href = item.href;
                anchor.setAttribute('role', 'option');
                anchor.setAttribute('aria-selected', 'false');
                const label = document.createElement('span');
                label.className = 'command-palette-item-label';
                label.textContent = item.label;
                const sub = document.createElement('span');
                sub.className = 'command-palette-item-sub';
                sub.textContent = item.sub ?? '';
                const key = document.createElement('kbd');
                key.textContent = item.key ?? '';
                anchor.append(label, sub, key);
                anchor.addEventListener('click', () => {
                    this.close();
                    this.emit('navigate', { section: item.section ?? null, href: item.href });
                });
                section.append(anchor);
                this.#items.push(anchor);
                index += 1;
            }
            container.append(section);
        }
        this.element.querySelector('.command-palette-empty').hidden = this.#items.length > 0;
        this.#input.removeAttribute('aria-activedescendant');
        container.hidden = this.#items.length === 0;
        return this;
    }

    /**
     * @param {string} query
     */
    async #run(query) {
        this.#controller?.abort();
        const controller = new AbortController();
        this.#controller = controller;
        this.setBusy(true);
        try {
            const result = this.#search
                ? await this.#search(query, controller.signal)
                : { groups: this.#localGroups(query) };
            if (!controller.signal.aborted) this.setResults(result);
        }
        catch {
            if (!controller.signal.aborted) this.setResults({ groups: [] });
        }
        finally {
            if (!controller.signal.aborted) this.setBusy(false);
        }
    }

    /**
     * @param {string} query
     * @returns {Array<{ title: string, items: object[] }>}
     */
    #localGroups(query) {
        const needle = query.trim().toLowerCase();
        const items = this.#commands
            .filter(command => !needle || [command.label, ...(command.keywords ?? '').split(' ')].join(' ').toLowerCase().includes(needle))
            .map(command => ({ ...command, sub: '', key: '' }));
        return [{ title: 'Ir para', items }];
    }

    /** @param {KeyboardEvent} event */
    #onKey(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!this.#items.length) return;
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            this.#active = (this.#active + delta + this.#items.length) % this.#items.length;
            this.#items.forEach((item, index) => {
                item.classList.toggle('is-active', index === this.#active);
                item.setAttribute('aria-selected', String(index === this.#active));
            });
            this.#input.setAttribute('aria-activedescendant', this.#items[this.#active].id);
            this.#items[this.#active].scrollIntoView({ block: 'nearest' });
            return;
        }
        if (event.key === 'Enter' && this.#active >= 0) {
            event.preventDefault();
            this.#items[this.#active].click();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = [...this.element.querySelectorAll('input, a[href], button:not([disabled])')];
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
}

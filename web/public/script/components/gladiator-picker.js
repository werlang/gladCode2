import { BaseComponent } from './base-component.js';
import { setGladImageElement } from './glad-card.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { gladiatorPickTemplate, gladiatorPickerTemplate } from '../templates/gladiator-card.js';
import { gladiatorCrest, gladiatorState } from './gladiator-card.js';

const CROWN = "<svg class='icon' viewBox='0 0 24 24' aria-hidden='true'><path d='M11.6 3.3a.5.5 0 0 1 .8 0l3 5.6a1 1 0 0 0 1.5.3l4.3-3.7a.5.5 0 0 1 .8.5l-2.8 10.3a1 1 0 0 1-1 .7H5.8a1 1 0 0 1-1-.7L2 6a.5.5 0 0 1 .8-.5l4.3 3.7a1 1 0 0 0 1.5-.3z'/><path d='M5 21h14'/></svg>";
const LOCK = "<svg class='icon' viewBox='0 0 24 24' aria-hidden='true'><rect x='4' y='11' width='16' height='10' rx='2'/><path d='M8 11V7a4 4 0 0 1 8 0v4'/></svg>";

/**
 * The character select of Batalhas (docs/frontend/components.md): one picker card chosen at a time,
 * arrow-key movement, unavailable cards focusable with their reason.
 */
export class GladiatorPicker extends BaseComponent {
    #items = [];
    #selected = null;
    #gladiators = [];

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement(gladiatorPickerTemplate));
        this.on(this.element, 'keydown', event => this.#onKey(event));
    }

    /** @returns {Record<string, any>|null} */
    get selected() {
        return this.#selected;
    }

    /**
     * @param {Record<string, any>[]} gladiators
     * @returns {this}
     */
    setGladiators(gladiators = []) {
        this.#gladiators = gladiators;
        this.#selected = null;
        this.#items = [];
        this.element.replaceChildren();
        for (const glad of gladiators) {
            const state = gladiatorState(glad);
            const button = createElement(renderTemplate(gladiatorPickTemplate, {
                lock: LOCK,
                crown: CROWN,
            }));
            button.dataset.gladId = String(glad.id);
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-label', `${glad.name}, ${Number(glad.mmr || 0).toLocaleString('pt-BR')} de renome, ${state === 'ready' ? 'pronto' : state === 'broken' ? 'com erro' : 'desatualizado'}`);
            button.classList.toggle('is-disabled', state !== 'ready');
            button.setAttribute('aria-disabled', String(state !== 'ready'));
            button.querySelector('.gladiator-pick-name').textContent = glad.name ?? '';
            button.querySelector('.gladiator-pick-mmr span').textContent = Number(glad.mmr || 0).toLocaleString('pt-BR');
            button.querySelector('.gladiator-pick-note').textContent = state === 'ready' ? gladiatorCrest(glad) : state === 'broken' ? 'Com erro' : 'Desatualizado';
            button.querySelector('.gladiator-pick-lock').hidden = state === 'ready';
            button.addEventListener('click', () => {
                if (state === 'ready') this.select(glad.id);
                else this.emit('blocked', { gladiator: glad, reason: state });
            });
            button.addEventListener('dblclick', () => {
                if (state === 'ready' && this.#selected?.id === glad.id) this.emit('confirm', { gladiator: glad });
            });
            this.#items.push(button);
            this.element.append(button);
            setGladImageElement(button.querySelector('.gladiator-pick-image'), glad.skin ?? '');
        }
        return this;
    }

    /**
     * @param {number} id
     * @returns {this}
     */
    select(id) {
        const glad = this.#gladiators.find(item => item.id === Number(id));
        if (!glad || gladiatorState(glad) !== 'ready') return this;
        this.#selected = glad;
        for (const item of this.#items) {
            const selected = Number(item.dataset.gladId) === Number(id);
            item.classList.toggle('is-selected', selected);
            item.setAttribute('aria-pressed', String(selected));
        }
        this.emit('select', { gladiator: glad });
        return this;
    }

    /** @param {string} reason */
    setDisabled(reason = '') {
        this.element.classList.toggle('is-disabled', Boolean(reason));
        if (reason) this.element.setAttribute('aria-label', reason);
        else this.element.removeAttribute('aria-label');
        return this;
    }

    /** @param {KeyboardEvent} event */
    #onKey(event) {
        const usable = this.#items.filter(item => item.getAttribute('aria-disabled') !== 'true');
        if (!usable.length) return;
        const current = usable.indexOf(document.activeElement);
        let next = null;
        if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (current + 1 + usable.length) % usable.length;
        else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (current - 1 + usable.length) % usable.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = usable.length - 1;
        if (next === null) return;
        event.preventDefault();
        usable[next].focus();
        this.select(usable[next].dataset.gladId);
    }
}

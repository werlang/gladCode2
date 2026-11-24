import { BaseComponent } from './base-component.js';
import { setGladImageElement } from './glad-card.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { gladiatorPickTemplate, gladiatorPickerTemplate } from '../templates/gladiator-card.js';
import { gladiatorCrest, gladiatorState } from './gladiator-card.js';

/** The plain-text reason a picker card cannot be chosen (rendered with textContent). */
export function blockedGladiatorText(gladiator) {
    const name = gladName(gladiator);
    return gladiator?.broken
        ? `${name} travou na última batalha. Corrija-o no editor.`
        : `${name} precisa ser gravado novamente no editor.`;
}

/** @param {Record<string, any>} gladiator @returns {string} */
function gladName(gladiator) {
    return gladiator?.name ? String(gladiator.name) : 'Este gladiador';
}

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
    #disabled = false;
    #grid;
    #status;

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement(gladiatorPickerTemplate));
        this.#grid = this.element.querySelector('.gladiator-picker-grid');
        this.#status = this.element.querySelector('.gladiator-picker-status');
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
        this.#clearStatus();
        this.#grid.replaceChildren();
        for (const glad of gladiators) {
            const state = gladiatorState(glad);
            const button = createElement(renderTemplate(gladiatorPickTemplate, {
                lock: LOCK,
                crown: CROWN,
            }));
            button.dataset.gladId = String(glad.id);
            button.dataset.state = state;
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-label', `${glad.name}, ${Number(glad.mmr || 0).toLocaleString('pt-BR')} de renome, ${state === 'ready' ? 'pronto' : state === 'broken' ? 'com erro' : 'desatualizado'}`);
            button.classList.toggle('is-disabled', state !== 'ready');
            button.setAttribute('aria-disabled', String(state !== 'ready'));
            button.querySelector('.gladiator-pick-name').textContent = glad.name ?? '';
            button.querySelector('.gladiator-pick-mmr span').textContent = Number(glad.mmr || 0).toLocaleString('pt-BR');
            button.querySelector('.gladiator-pick-note').textContent = state === 'ready' ? gladiatorCrest(glad) : state === 'broken' ? 'Com erro' : 'Desatualizado';
            button.querySelector('.gladiator-pick-lock').hidden = state === 'ready';
            button.addEventListener('click', () => {
                if (this.#disabled) return;
                if (state === 'ready') this.select(glad.id);
                else {
                    this.#showStatus(blockedGladiatorText(glad), state);
                    this.emit('blocked', { gladiator: glad, reason: state });
                }
            });
            button.addEventListener('dblclick', () => {
                if (this.#disabled) return;
                if (state === 'ready' && this.#selected?.id === glad.id) this.emit('confirm', { gladiator: glad });
            });
            this.#items.push(button);
            this.#grid.append(button);
            setGladImageElement(button.querySelector('.gladiator-pick-image'), glad.skin ?? '');
        }
        return this;
    }

    /**
     * @param {number} id
     * @returns {this}
     */
    select(id) {
        if (this.#disabled) return this;
        const glad = this.#gladiators.find(item => item.id === Number(id));
        if (!glad || gladiatorState(glad) !== 'ready') return this;
        this.#selected = glad;
        this.#clearStatus();
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
        this.#disabled = Boolean(reason);
        this.element.classList.toggle('is-disabled', this.#disabled);
        this.element.setAttribute('aria-busy', String(this.#disabled));
        if (reason) this.element.setAttribute('aria-label', reason);
        else this.element.removeAttribute('aria-label');
        return this;
    }

    /**
     * @param {string} text
     * @param {'outdated'|'broken'} tone
     */
    #showStatus(text, tone = 'outdated') {
        this.#status.textContent = text;
        this.#status.dataset.tone = tone;
        this.#status.hidden = false;
    }

    /** Hides the inline unavailable reason. */
    #clearStatus() {
        this.#status.textContent = '';
        this.#status.hidden = true;
        delete this.#status.dataset.tone;
    }

    /** @param {KeyboardEvent} event */
    #onKey(event) {
        if (this.#disabled) return;
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

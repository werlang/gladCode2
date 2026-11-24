import { BaseComponent } from './base-component.js';
import { setGladImageElement } from './glad-card.js';
import { currentGladView } from '../helpers/glad-view.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import {
    gladiatorAttrTemplate,
    gladiatorCardTemplate,
    gladiatorEmptyTemplate,
} from '../templates/gladiator-card.js';

/** The three attribute rows of a card: order, short label, full name and token key. */
export const GLADIATOR_ATTRIBUTES = Object.freeze([
    { key: 'str', short: 'F', full: 'Força', field: 'vstr' },
    { key: 'agi', short: 'A', full: 'Agilidade', field: 'vagi' },
    { key: 'int', short: 'I', full: 'Inteligência', field: 'vint' },
]);

const CROWN = "<svg class='icon' viewBox='0 0 24 24' aria-hidden='true'><path d='M11.6 3.3a.5.5 0 0 1 .8 0l3 5.6a1 1 0 0 0 1.5.3l4.3-3.7a.5.5 0 0 1 .8.5l-2.8 10.3a1 1 0 0 1-1 .7H5.8a1 1 0 0 1-1-.7L2 6a.5.5 0 0 1 .8-.5l4.3 3.7a1 1 0 0 0 1.5-.3z'/><path d='M5 21h14'/></svg>";
const LOCK = "<svg class='icon' viewBox='0 0 24 24' aria-hidden='true'><rect x='4' y='11' width='16' height='10' rx='2'/><path d='M8 11V7a4 4 0 0 1 8 0v4'/></svg>";

/**
 * The game state of one gladiator.
 *
 * @param {{ outdated?: boolean, broken?: boolean }} glad
 * @returns {'ready'|'outdated'|'broken'}
 */
export function gladiatorState(glad) {
    if (glad?.broken) return 'broken';
    if (glad?.outdated) return 'outdated';
    return 'ready';
}

/**
 * The language of a gladiator, from its stored blocks/code.
 *
 * @param {{ blocks?: string, code?: string }} glad
 * @returns {'c'|'python'|'blocks'}
 */
export function gladiatorLanguage(glad) {
    if (glad?.blocks) return 'blocks';
    if (/def\s+loop\s*\(/.test(String(glad?.code ?? ''))) return 'python';
    return 'c';
}

/**
 * The language crest: C, PY or `{ }`.
 *
 * @param {{ blocks?: string, code?: string }} glad
 * @returns {string}
 */
export function gladiatorCrest(glad) {
    const language = gladiatorLanguage(glad);
    return language === 'python' ? 'PY' : language === 'blocks' ? '{ }' : 'C';
}

/**
 * The card's record line: real wins/losses, or a clear note when the stored battles have no known
 * result (older reports) or there are no battles yet. Never a false “0 VITÓRIAS · 0 DERROTAS”.
 *
 * @param {{ battles?: number, wins?: number, losses?: number }} glad
 * @returns {string}
 */
export function gladiatorRecord(glad) {
    const battles = Number(glad?.battles) || 0;
    const wins = Number(glad?.wins) || 0;
    const losses = Number(glad?.losses) || 0;
    if (wins + losses === 0) return battles > 0 ? 'SEM RESULTADOS CONHECIDOS' : 'SEM BATALHAS REGISTRADAS';
    return `${wins} VITÓRIAS · ${losses} DERROTAS`;
}

/**
 * How many of the ten attribute segments are lit.
 *
 * @param {unknown} value Attribute points (0–30).
 * @returns {number}
 */
export function attributeSegments(value) {
    return Math.max(0, Math.min(10, Math.round((Number(value) || 0) / 3)));
}

/** A gladiator's game card (docs/frontend/components.md). */
export class GladiatorCard extends BaseComponent {
    #gladiator = null;
    #view = null;
    #ready = true;
    #busy = false;

    /**
     * @param {object} [options]
     * @param {HTMLElement} [options.element]
     * @param {Record<string, any>} [options.gladiator]
     * @param {'sprite'|'3d'} [options.view]
     */
    constructor({ element, gladiator = null, view = null } = {}) {
        super(element ?? createElement(renderTemplate(gladiatorCardTemplate, {
            crest: 'C', status: 'PRONTO', stamp: '', mmr: '0', crown: CROWN,
            swords: icon('battle', { size: 16, className: 'icon' }), lock: LOCK,
            more: icon('dots', { size: 18, className: 'icon' }),
            codeIcon: icon('code', { size: 15, className: 'icon' }),
            editLabel: 'EDITAR', fightLabel: 'BATALHAR',
        })));
        this.#view = view;
        this.on(this.element.querySelector('.gladiator-edit'), 'click', () => this.emit('edit', { gladiator: this.#gladiator }));
        this.on(this.element.querySelector('.gladiator-fight'), 'click', () => {
            if (this.#ready && !this.#busy) this.emit('battle', { gladiator: this.#gladiator });
        });
        this.on(this.element.querySelector('.gladiator-more'), 'click', event => {
            event.stopPropagation();
            this.#toggleMenu();
            this.emit('more', { gladiator: this.#gladiator, anchor: event.currentTarget });
        });
        this.element.querySelectorAll('[data-card-action]').forEach(button => {
            this.on(button, 'click', event => {
                event.stopPropagation();
                this.#closeMenu();
                this.emit(button.dataset.cardAction, { gladiator: this.#gladiator });
            });
        });
        this.on(this.element, 'keydown', event => {
            if (event.key === 'Escape') this.#closeMenu();
        });
        this.on(globalThis.document, 'click', event => {
            if (!this.element.contains(event.target)) this.#closeMenu();
        });
        if (gladiator) this.setGladiator(gladiator);
    }

    /** @returns {Record<string, any>|null} */
    get gladiator() {
        return this.#gladiator;
    }

    /**
     * @param {Record<string, any>} glad
     * @returns {this}
     */
    setGladiator(glad) {
        this.#gladiator = glad;
        const state = gladiatorState(glad);
        this.#ready = state === 'ready';
        this.element.dataset.state = state;
        this.element.dataset.gladId = String(glad.id ?? '');
        this.element.querySelector('.gladiator-crest span').textContent = gladiatorCrest(glad);
        this.element.querySelector('.gladiator-status span').textContent = state === 'ready' ? 'PRONTO' : state === 'broken' ? 'COM ERRO' : 'DESATUALIZADO';
        this.element.querySelector('.gladiator-status i').setAttribute('aria-hidden', 'true');
        this.element.querySelector('.gladiator-stamp').textContent = state === 'broken' ? 'COM ERRO' : 'FORA DA ARENA';
        this.element.querySelector('.gladiator-stamp').hidden = state === 'ready';
        this.element.querySelector('.gladiator-name').textContent = glad.name ?? '';
        this.element.querySelector('.gladiator-record').textContent = gladiatorRecord(glad);
        this.element.querySelector('.gladiator-renown span').textContent = Number(glad.mmr || 0).toLocaleString('pt-BR');

        const attrs = this.element.querySelector('.gladiator-attrs');
        attrs.innerHTML = GLADIATOR_ATTRIBUTES.map(attribute => {
            const filled = attributeSegments(glad[attribute.field]);
            const segments = Array.from({ length: 10 }, (_, index) => `<span class='gladiator-seg${index < filled ? ' is-on' : ''}'></span>`).join('');
            return renderTemplate(gladiatorAttrTemplate, {
                key: attribute.key,
                short: attribute.short,
                full: attribute.full,
                value: Number(glad[attribute.field]) || 0,
                segments,
            });
        }).join('');

        const alert = this.element.querySelector('.gladiator-alert');
        alert.hidden = state === 'ready';
        alert.textContent = state === 'broken'
            ? 'Travou numa batalha ranqueada e saiu da fila. Veja o erro no último relatório.'
            : 'Gravado numa versão anterior do motor. Grave de novo no editor para voltar à arena.';

        const edit = this.element.querySelector('.gladiator-edit');
        edit.href = `/glad-${glad.id}`;
        edit.querySelector('.gladiator-action-label').textContent = state === 'ready' ? 'EDITAR' : 'CORRIGIR';
        const fight = this.element.querySelector('.gladiator-fight');
        fight.disabled = !this.#ready || this.#busy;
        fight.setAttribute('aria-disabled', String(fight.disabled));
        fight.querySelector('.gladiator-lock').hidden = this.#ready;
        const swords = fight.querySelector('svg.icon');
        if (swords) {
            if (this.#ready) swords.removeAttribute('hidden');
            else swords.setAttribute('hidden', '');
        }
        fight.querySelector('.gladiator-action-label').textContent = 'BATALHAR';
        this.element.classList.toggle('is-selected', false);
        this.element.querySelector('.gladiator-menu').hidden = true;
        if (this.#view) this.setView(this.#view);
        setGladImageElement(this.element.querySelector('.gladiator-image'), glad.skin ?? '', false);
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setSelected(on) {
        this.element.classList.toggle('is-selected', Boolean(on));
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setDisabled(on) {
        this.element.classList.toggle('is-disabled', Boolean(on));
        const fight = this.element.querySelector('.gladiator-fight');
        fight.disabled = Boolean(on) || !this.#ready || this.#busy;
        return this;
    }

    /** @param {'sprite'|'3d'} view @returns {this} */
    setView(view) {
        this.#view = view;
        this.element.dataset.view = view;
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        this.#busy = Boolean(on);
        const fight = this.element.querySelector('.gladiator-fight');
        fight.disabled = this.#busy || !this.#ready;
        fight.classList.toggle('is-busy', this.#busy);
        return this;
    }

    #toggleMenu() {
        const menu = this.element.querySelector('.gladiator-menu');
        menu.hidden = !menu.hidden;
        this.element.querySelector('.gladiator-more').setAttribute('aria-expanded', String(!menu.hidden));
    }

    #closeMenu() {
        this.element.querySelector('.gladiator-menu').hidden = true;
        this.element.querySelector('.gladiator-more').setAttribute('aria-expanded', 'false');
    }
}

/**
 * The empty slot card.
 *
 * @param {string} title e.g. “2 vagas livres”.
 * @returns {HTMLElement}
 */
export function emptyGladiatorCard(title) {
    return createElement(renderTemplate(gladiatorEmptyTemplate, { title, plus: icon('plus', { size: 30, className: 'icon' }) }));
}

/** A new card in the master's current view. */
export function createGladiatorCard(glad) {
    return new GladiatorCard({ gladiator: glad, view: currentGladView() });
}

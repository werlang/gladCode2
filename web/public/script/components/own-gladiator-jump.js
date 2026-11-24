import { BaseComponent } from './base-component.js';
import { setGladImageElement } from './glad-card.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { ownGladiatorChipTemplate, ownGladiatorTemplate } from '../templates/ranking.js';

const STATES = {
    ranked: { text: '', title: 'Ir para a posição de' },
    outdated: { text: 'desatualizado', title: 'está fora do ranking: desatualizado' },
    broken: { text: 'com erro', title: 'está fora do ranking: com erro' },
    unranked: { text: 'sem batalhas', title: 'ainda não tem posição no ranking' },
};

/**
 * The “SEUS GLADIADORES” strip (docs/frontend/components.md). Ranked chips are the only buttons;
 * the others show why they are outside the ranking.
 */
export class OwnGladiatorJump extends BaseComponent {
    #gladiators = [];
    #chips = new Map();
    #paint;
    #active = null;

    /**
     * @param {{ element?: HTMLElement, gladiators?: object[], paint?: (element: Element, skin: string) => unknown }} [options]
     */
    constructor({ element, gladiators = [], paint = (portrait, skin) => setGladImageElement(portrait, skin) } = {}) {
        super(element ?? createElement(ownGladiatorTemplate));
        this.#paint = paint;
        this.element.addEventListener('keydown', event => this.#onKey(event));
        this.setGladiators(gladiators);
    }

    /**
     * @param {Array<{ id: number, name: string, position: number|null, state: string, skin?: string }>} gladiators
     * @returns {this}
     */
    setGladiators(gladiators = []) {
        this.#gladiators = Array.isArray(gladiators) ? gladiators : [];
        this.#chips.clear();
        const list = this.element.querySelector('.own-gladiator-list');
        list.replaceChildren();
        this.element.hidden = this.#gladiators.length === 0;
        for (const gladiator of this.#gladiators) {
            const state = STATES[gladiator.state] ?? STATES.unranked;
            const ranked = gladiator.state === 'ranked';
            const chip = createElement(renderTemplate(ownGladiatorChipTemplate, {
                state: ranked ? 'ranked' : 'outside',
                label: ranked
                    ? `Ir para a posição de ${gladiator.name}: ${gladiator.position}º`
                    : `${gladiator.name} ${state.title}`,
                name: gladiator.name ?? '',
                stateText: ranked ? `#${gladiator.position}` : state.text,
                arrow: ranked ? icon('chevron', { size: 16, className: 'icon own-gladiator-arrow-icon' }) : '',
            }));
            chip.dataset.state = ranked ? 'ranked' : 'outside';
            chip.disabled = !ranked;
            if (!ranked) chip.setAttribute('aria-disabled', 'true');
            if (ranked) {
                chip.addEventListener('click', () => this.emit('jump', {
                    gladiator: { id: gladiator.id, name: gladiator.name },
                    position: gladiator.position,
                }));
            }
            const portrait = chip.querySelector('.own-gladiator-portrait');
            this.#paint(portrait, gladiator.skin ?? '');
            this.#chips.set(Number(gladiator.id), chip);
            list.append(chip);
        }
        this.setActive(this.#active);
        return this;
    }

    /**
     * @param {number|null} id
     * @returns {this}
     */
    setActive(id) {
        this.#active = id == null ? null : Number(id);
        const ranked = this.#gladiators.filter(gladiator => gladiator.state === 'ranked');
        const active = ranked.some(gladiator => Number(gladiator.id) === this.#active)
            ? this.#active
            : Number(ranked[0]?.id);
        for (const [chipId, chip] of this.#chips) {
            const on = chipId === active && chip.dataset.state === 'ranked';
            chip.classList.toggle('is-active', on);
            chip.setAttribute('aria-current', on ? 'page' : 'false');
            chip.tabIndex = on ? 0 : -1;
        }
        return this;
    }

    /**
     * Arrow keys move through ranked chips; Home/End go to the edges.
     *
     * @param {KeyboardEvent} event
     */
    #onKey(event) {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        const ranked = [...this.#chips.values()].filter(chip => chip.dataset.state === 'ranked' && !chip.disabled);
        if (!ranked.length) return;
        const current = ranked.indexOf(document.activeElement);
        event.preventDefault();
        let next;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = ranked.length - 1;
        else next = (Math.max(0, current) + (event.key === 'ArrowRight' ? 1 : -1) + ranked.length) % ranked.length;
        const target = ranked[next];
        for (const chip of ranked) chip.tabIndex = chip === target ? 0 : -1;
        target.focus();
        this.#active = Number([...this.#chips].find(([, chip]) => chip === target)?.[0]) || null;
        for (const chip of this.#chips.values()) {
            const on = chip === target;
            chip.classList.toggle('is-active', on);
            chip.setAttribute('aria-current', on ? 'page' : 'false');
        }
    }
}

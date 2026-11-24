import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { formStreakTemplate, formStreakTileTemplate } from '../templates/potions.js';

/** The streak tile letter and accessible title for each authoritative result. */
const TILES = {
    win: { letter: 'V', title: 'Venceu' },
    loss: { letter: 'D', title: 'Perdeu' },
    draw: { letter: 'E', title: 'Empate' },
};

/** The last ten battle results as V/D/E tiles (lightness and letter, never hue alone). */
export class FormStreak extends BaseComponent {
    /**
     * @param {{ element?: HTMLElement, results?: Array<string|{ result?: string, won?: boolean }> }} [options]
     */
    constructor({ element, results = [] } = {}) {
        super(element ?? createElement(formStreakTemplate));
        this.set(results);
    }

    /**
     * @param {Array<string|{ result?: string, won?: boolean }>} results
     * @returns {this}
     */
    set(results = []) {
        const label = this.element.querySelector('.form-streak-label');
        const list = this.element.querySelector('.form-streak-tiles');
        label.textContent = 'Últimas 10 batalhas';
        list.replaceChildren();
        const normalised = results.slice(0, 10).map(entry => {
            if (typeof entry === 'string') return entry;
            return entry?.result ?? (entry?.won ? 'win' : 'loss');
        });
        if (!normalised.length) {
            const empty = document.createElement('span');
            empty.className = 'form-streak-empty';
            empty.textContent = '—';
            empty.setAttribute('aria-label', 'Nenhuma batalha registrada');
            list.append(empty);
            return this;
        }
        for (const result of normalised) {
            const tile = TILES[result] ?? TILES.loss;
            list.insertAdjacentHTML('beforeend', renderTemplate(formStreakTileTemplate, {
                result: result in TILES ? result : 'loss',
                letter: tile.letter,
                title: tile.title,
            }));
        }
        this.element.setAttribute('aria-label', 'Últimas 10 batalhas');
        return this;
    }
}

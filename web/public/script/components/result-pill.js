import { BaseComponent } from './base-component.js';
import { createElement } from '../helpers/html.js';
import { resultPillTemplate } from '../templates/potions.js';

/**
 * The placing of a battle report: “1º de 5”, with the medal tone of the first three places.
 */
export class ResultPill extends BaseComponent {
    /**
     * @param {{ element?: HTMLElement, place?: number|null, total?: number }} [options]
     */
    constructor({ element, place = null, total = 0 } = {}) {
        super(element ?? createElement(resultPillTemplate));
        this.set(place, total);
    }

    /**
     * @param {number|null} place 1-based placing.
     * @param {number} total Gladiators in the battle.
     * @returns {this}
     */
    set(place, total = 0) {
        const value = Number(place);
        const size = Number(total) || 0;
        const valid = Number.isInteger(value) && value > 0;
        this.element.dataset.tone = !valid ? 'neutral' : value === 1 ? 'gold' : value === 2 ? 'silver' : value === 3 ? 'bronze' : 'neutral';
        this.element.textContent = valid ? `${value}º de ${size}` : '—';
        this.element.setAttribute('aria-label', valid ? `${value}º de ${size}` : 'Resultado não registrado');
        return this;
    }
}

import { BaseComponent } from './base-component.js';
import { setGladImageElement } from './glad-card.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { versusPanelTemplate } from '../templates/gladiator-card.js';

/** The ranked character-select's right column (docs/frontend/components.md). */
export class VersusPanel extends BaseComponent {
    #gladiator = null;
    #opponent = null;
    #ready = false;
    #busy = false;

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement(renderTemplate(versusPanelTemplate, { swords: icon('battle', { size: 20 }) })));
        this.on(this.element.querySelector('.versus-fight'), 'click', () => {
            if (this.#ready && !this.#busy) this.emit('fight', {});
        });
    }

    /** @param {Record<string, any>|null} glad @returns {this} */
    setGladiator(glad) {
        this.#gladiator = glad ?? null;
        const side = this.element.querySelector('.versus-side');
        const name = side.querySelector('.versus-name--mine');
        name.hidden = !this.#gladiator;
        name.textContent = this.#gladiator?.name ?? '';
        side.querySelector('.versus-portrait--mine').classList.toggle('is-empty', !this.#gladiator);
        if (this.#gladiator) setGladImageElement(side.querySelector('.versus-portrait--mine .versus-image'), this.#gladiator.skin ?? '');
        this.setReady(Boolean(this.#gladiator));
        return this;
    }

    /** @param {Record<string, any>|null} opponent @returns {this} */
    setOpponent(opponent) {
        this.#opponent = opponent ?? null;
        const side = this.element.querySelector('.versus-side:last-child');
        const name = side.querySelector('.versus-name--enemy');
        name.textContent = this.#opponent?.name ?? 'Sorteado';
        side.querySelector('.versus-portrait--enemy').classList.toggle('is-empty', !this.#opponent);
        if (this.#opponent) setGladImageElement(side.querySelector('.versus-portrait--enemy .versus-image'), this.#opponent.skin ?? '');
        return this;
    }

    /** @param {Array<{ name?: string }>} slots @returns {this} */
    setPotions(slots = []) {
        const names = slots.map(slot => slot?.name).filter(Boolean);
        this.element.querySelector('.versus-potions').textContent = names.length ? names.join(', ') : 'Nenhuma';
        return this;
    }

    /** @param {string} text @returns {this} */
    setReward(text) {
        this.element.querySelector('.versus-reward').textContent = text;
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        this.#busy = Boolean(on);
        const button = this.element.querySelector('.versus-fight');
        button.disabled = this.#busy || !this.#ready;
        button.classList.toggle('is-busy', this.#busy);
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setReady(on) {
        this.#ready = Boolean(on);
        const button = this.element.querySelector('.versus-fight');
        button.disabled = !this.#ready || this.#busy;
        return this;
    }
}

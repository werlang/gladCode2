import { BaseComponent } from './base-component.js';
import { createElement } from '../helpers/html.js';
import { potionKind } from '../helpers/potion-kind.js';
import { icon } from '../templates/icons.js';
import { potionCardTemplate } from '../templates/potions.js';

/** One potion on sale. */
export class PotionCard extends BaseComponent {
    #potion = null;
    #unlocked = true;
    #lockedLevel = 0;
    #unavailable = '';
    #busy = false;

    /**
     * @param {{ element?: HTMLElement, potion?: Record<string, any>, unlocked?: boolean }} [options]
     */
    constructor({ element, potion = null, unlocked = true } = {}) {
        super(element ?? createElement(potionCardTemplate
            .replace('{{{icon}}}', icon('potions', { size: 22, className: 'icon' }))
            .replace('{{{coin}}}', icon('coins', { size: 15, className: 'icon' }))));
        this.#unlocked = unlocked;
        this.element.querySelector('.potion-card-order').addEventListener('click', () => {
            if (!this.#busy && this.#unlocked && !this.#unavailable) this.emit('order', { potion: this.#potion });
        });
        if (potion) this.setPotion(potion);
        this.setUnlocked(unlocked);
    }

    /** @returns {Record<string, any>|null} */
    get potion() {
        return this.#potion;
    }

    /** @param {Record<string, any>} potion @returns {this} */
    setPotion(potion) {
        this.#potion = potion;
        this.element.dataset.kind = potion.kind ?? potionKind(potion.identifier);
        this.element.querySelector('.potion-card-name').textContent = potion.name ?? '';
        this.element.querySelector('.potion-card-code').textContent = `nível ${potion.level} · useItem("${potion.identifier}")`;
        this.element.querySelector('.potion-card-description').textContent = potion.description ?? '';
        this.element.querySelector('.potion-card-price span').textContent = Number(potion.price || 0).toLocaleString('pt-BR');
        return this;
    }

    /**
     * @param {boolean} on Whether the apothecary can brew it.
     * @param {number} [level] Required apothecary level when locked.
     * @returns {this}
     */
    setUnlocked(on, level = 0) {
        this.#unlocked = Boolean(on);
        this.#lockedLevel = Number(level) || 0;
        this.#renderButton(this.#unavailable || (!this.#unlocked && this.#lockedLevel ? `Apotecário nível ${this.#lockedLevel}` : ''));
        return this;
    }

    /** @param {string} reason Non-empty disables the order with this reason. @returns {this} */
    setUnavailable(reason = '') {
        this.#unavailable = String(reason);
        const locked = !this.#unlocked && this.#lockedLevel ? `Apotecário nível ${this.#lockedLevel}` : '';
        this.#renderButton(this.#unavailable || locked);
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        this.#busy = Boolean(on);
        this.element.setAttribute('aria-busy', String(this.#busy));
        this.#renderButton(this.#unavailable);
        return this;
    }

    /** @param {string} reason */
    #renderButton(reason) {
        const button = this.element.querySelector('.potion-card-order');
        const label = this.#busy ? 'Encomendando…' : reason || 'Encomendar';
        button.textContent = label;
        button.disabled = this.#busy || !this.#unlocked || Boolean(reason);
        button.setAttribute('aria-disabled', String(button.disabled));
        this.element.dataset.unavailable = reason ? 'true' : 'false';
    }
}

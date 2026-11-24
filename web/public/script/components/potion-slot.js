import { BaseComponent } from './base-component.js';
import { Countdown } from './countdown.js';
import { createElement } from '../helpers/html.js';
import { formatRemaining } from '../helpers/potion-time.js';
import { potionKind } from '../helpers/potion-kind.js';
import { icon } from '../templates/icons.js';
import { potionSlotTemplate } from '../templates/potions.js';

/** One of the master's four potion compartments. */
export class PotionSlot extends BaseComponent {
    #index;
    #slot = null;
    #countdown = null;

    /**
     * @param {{ element?: HTMLElement, index?: number }} [options]
     */
    constructor({ element, index = 0 } = {}) {
        super(element ?? createElement(potionSlotTemplate.replace('{{{icon}}}', icon('potions', { size: 20, className: 'icon' }))
            .replace('{{{close}}}', icon('close', { size: 14, className: 'icon' }))));
        this.#index = index;
        this.element.dataset.index = String(index);
        this.element.querySelector('.potion-slot-cancel').addEventListener('click', event => {
            event.stopPropagation();
            if (this.#slot) this.emit('cancel', { slot: this.#slot });
        });
        this.element.addEventListener('click', () => {
            if (this.element.dataset.state === 'empty') this.emit('empty', { index });
        });
        this.setEmpty();
    }

    /** @returns {number} */
    get index() {
        return this.#index;
    }

    /**
     * @param {Record<string, any>} slot PotionSlotView.
     * @param {string} serverNow Server clock.
     * @param {number} [totalSeconds] The brew duration, for the depleting bar; the slot's own
     *   `seconds` is only the time left when the API answered.
     * @returns {this}
     */
    setPotion(slot, serverNow, totalSeconds = slot.seconds) {
        this.#stop();
        this.#slot = slot;
        this.element.dataset.state = 'filled';
        this.element.dataset.kind = slot.kind ?? potionKind(slot.identifier);
        this.element.querySelector('.potion-slot-name').textContent = slot.name ?? '';
        this.element.querySelector('.potion-slot-sub').textContent = `Compartimento ${this.#index + 1}`;
        this.element.querySelector('.potion-slot-cancel').hidden = false;
        this.element.querySelector('.potion-slot-foot').hidden = false;
        const total = Math.max(Number(slot.seconds) || 1, Number(totalSeconds) || 0, 1) * 1000;
        this.#countdown = new Countdown(this.element.querySelector('.potion-slot-time'), {
            deadline: slot.expiresAt,
            now: serverNow,
            onTick: left => this.#paintTime(left, total),
            onEnd: () => this.emit('expire', { slot }),
        });
        this.#countdown.start();
        return this;
    }

    /**
     * @param {number} level Master level that opens this compartment.
     * @returns {this}
     */
    setLocked(level) {
        this.#stop();
        this.#slot = null;
        this.element.dataset.state = 'locked';
        delete this.element.dataset.kind;
        this.element.querySelector('.potion-slot-name').textContent = 'Bloqueado';
        this.element.querySelector('.potion-slot-sub').textContent = `Abre no nível de mestre ${level}`;
        this.element.querySelector('.potion-slot-cancel').hidden = true;
        this.element.querySelector('.potion-slot-foot').hidden = true;
        return this;
    }

    /** @returns {this} */
    setEmpty() {
        this.#stop();
        this.#slot = null;
        this.element.dataset.state = 'empty';
        delete this.element.dataset.kind;
        this.element.querySelector('.potion-slot-name').textContent = 'Vazio';
        this.element.querySelector('.potion-slot-sub').textContent = 'Escolha uma poção abaixo';
        this.element.querySelector('.potion-slot-cancel').hidden = true;
        this.element.querySelector('.potion-slot-foot').hidden = true;
        this.element.querySelector('.potion-slot-time').removeAttribute('aria-label');
        return this;
    }

    /** @param {number} left @param {number} total */
    #paintTime(left, total) {
        const seconds = Math.max(0, left / 1000);
        const time = this.element.querySelector('.potion-slot-time');
        time.textContent = formatRemaining(seconds);
        time.setAttribute('aria-label', `${formatRemaining(seconds)} restantes`);
        this.element.querySelector('.potion-slot-bar').style.width = `${Math.max(0, Math.min(100, (left / total) * 100))}%`;
    }

    #stop() {
        this.#countdown?.stop();
        this.#countdown = null;
    }

    /** Stops the timer when the section leaves. */
    destroy() {
        this.#stop();
        super.destroy();
    }
}

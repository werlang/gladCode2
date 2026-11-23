import { Message } from '../components/dialog.js';
import { createToast } from '../components/toast.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { fadeIn } from '../helpers/animate.js';
import { PotionModel } from '../models/potion.js';
import { profile, setSilver } from './session.js';
import {
    emptySlotTemplate,
    filledSlotTemplate,
    lockedSlotTemplate,
    potionInfoTemplate,
    shopItemTemplate,
    shopTemplate,
    upgradeTemplate,
} from '../templates/profile-potions.js';

const SLOTS = 4;
const MAX_APOTHECARY = 5;

/**
 * Remaining time as "1h 5m 30s" (hours and minutes only when non-zero).
 *
 * @param {number} seconds Seconds left.
 * @returns {string}
 */
export function formatRemaining(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total / 60) % 60;
    return [hours ? `${hours}h` : '', minutes || hours ? `${minutes}m` : '', `${total % 60}s`].filter(Boolean).join(' ');
}

/**
 * The POÇÕES tab: the apothecary's level and upgrade, the potion shop and
 * the user's slots with the time left on each potion.
 */
export class PotionsTab {
    #panel = document.querySelector('#apot-container');
    #potions = {};
    #prices = [];
    #brewHours = [];
    #level = 0;
    /** Expiry time (ms) of each filled slot, by slot index. */
    #expiries = new Map();
    #timer = null;
    #shop = null;
    /** The current navigation signal; reloads keep using it. */
    #signal = null;

    /** Loads the catalogue and the apothecary, then the slots. */
    async init() {
        const [potions, apothecary] = await Promise.all([PotionModel.catalog(), PotionModel.apothecary()]);
        this.#potions = potions;
        this.#prices = apothecary.prices;
        this.#brewHours = apothecary.hours;
        this.#level = profile.user.apothecary;
        this.#showApothecary();

        this.#panel.querySelector('#browse').addEventListener('click', event => {
            if (!event.currentTarget.disabled) this.#openShop();
        });
        this.#panel.querySelector('#upgrade')?.addEventListener('click', () => this.#askUpgrade());
        await this.refresh();
    }

    /** @param {number} [level] Apothecary level (the current one by default). */
    #price(level = this.#level) {
        return this.#prices[level - 1];
    }

    /** @param {number} [level] Apothecary level (the current one by default). */
    #hours(level = this.#level) {
        return this.#brewHours[level - 1];
    }

    #showApothecary() {
        const panel = document.querySelector('#apot-panel');
        panel.querySelectorAll('.lvl').forEach(element => {
            element.textContent = this.#level;
        });
        panel.querySelectorAll('.cost').forEach(element => {
            element.textContent = this.#price();
        });
        panel.querySelectorAll('.duration').forEach(element => {
            element.textContent = this.#hours();
        });
        if (this.#level >= MAX_APOTHECARY) {
            panel.querySelector('#apot-info .cost')?.closest('.row')?.remove();
            panel.querySelector('#apot-info #upgrade')?.remove();
        }
    }

    /**
     * Opens the tab.
     *
     * @param {object} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    show(route = {}, { signal } = {}) {
        this.#signal = signal;
        return this.refresh({ signal });
    }

    /**
     * Stops the countdown and closes the shop when the shell leaves the section.
     */
    unmount() {
        clearInterval(this.#timer);
        this.#timer = null;
        this.#shop?.remove();
        this.#shop = null;
    }

    /**
     * Redraws the slots from the server.
     *
     * @param {{ signal?: AbortSignal }} [options]
     */
    async refresh({ signal } = {}) {
        clearInterval(this.#timer);
        this.#timer = null;
        const data = await PotionModel.slots({ signal });
        if (signal?.aborted) return;
        const container = this.#panel.querySelector('#my-pots');
        container.replaceChildren();
        this.#expiries.clear();

        let free = 0;
        for (let index = 0; index < SLOTS; index++) {
            const item = data.slots[index];
            let slot;
            if (data.level < data.unlockLevels[index]) {
                slot = createElement(renderTemplate(lockedSlotTemplate, { level: data.unlockLevels[index] }));
            }
            else if (item) {
                slot = this.#filledSlot(item);
                this.#expiries.set(index, Date.now() + item.secondsLeft * 1000);
            }
            else {
                slot = createElement(emptySlotTemplate);
                free++;
            }
            container.append(slot);
        }

        this.#panel.querySelector('#browse').disabled = free === 0;
        setSilver(profile.user.silver);
        this.#markShop();
        this.#tick();
        clearInterval(this.#timer);
        this.#timer = setInterval(() => this.#tick(), 1000);
    }

    /**
     * @param {Record<string, any>} item Potion in a slot.
     * @returns {HTMLElement}
     */
    #filledSlot(item) {
        const slot = createElement(renderTemplate(filledSlotTemplate, { icon: item.icon, name: item.name }));
        slot.addEventListener('click', () => {
            new Message({
                message: `Para usar este item nas batalhas, use no seu código: <code><b>useItem("${item.potion}")</b></code>`,
                buttons: { yes: 'Ajuda', no: 'OK' },
            }).show().click('yes', () => window.open('manual#nav-item'));
        });
        slot.querySelector('.remove').addEventListener('click', event => {
            event.stopPropagation();
            new Message({
                message: 'Deseja cancelar esta encomenda?',
                buttons: { yes: 'SIM', no: 'NÃO' },
            }).show().click('yes', async () => {
                await PotionModel.cancel(item.id);
                this.refresh({ signal: this.#signal });
            });
        });
        return slot;
    }

    /** Updates the time left on each potion; an expired one refreshes the slots. */
    #tick() {
        const slots = this.#panel.querySelectorAll('#my-pots .slot');
        let expired = false;
        this.#expiries.forEach((expiry, index) => {
            const left = (expiry - Date.now()) / 1000;
            if (left < 0) expired = true;
            const time = slots[index]?.querySelector('.time');
            if (time) time.textContent = formatRemaining(left);
        });
        if (expired) {
            clearInterval(this.#timer);
            this.refresh({ signal: this.#signal });
        }
    }

    #openShop() {
        const ids = Object.keys(this.#potions);
        const items = ids.map(id => {
            const potion = this.#potions[id];
            return renderTemplate(shopItemTemplate, {
                icon: potion.icon,
                level: potion.level,
                price: potion.price,
                name: potion.name,
            });
        }).join('');
        const fog = createElement(renderTemplate(shopTemplate, { items }));
        document.body.append(fog);
        fadeIn(fog, undefined, 'flex');
        this.#shop = fog;

        const close = () => {
            fog.remove();
            this.#shop = null;
        };
        fog.querySelector('#close').addEventListener('click', close);
        fog.querySelectorAll('#shop-container .slot').forEach((slot, index) => {
            const id = ids[index];
            slot.querySelector('.info').addEventListener('click', () => this.#showInfo(id));
            slot.querySelector('.buy').addEventListener('click', () => this.#askBuy(id, close));
        });
        this.#markShop();
    }

    /** Greys out the shop items the user cannot afford or the apothecary cannot brew. */
    #markShop() {
        if (!this.#shop) return;
        const ids = Object.keys(this.#potions);
        this.#shop.querySelectorAll('#shop-container .slot').forEach((slot, index) => {
            const potion = this.#potions[ids[index]];
            if (profile.user.silver < potion.price) slot.classList.add('dis-price', 'disabled');
            if (this.#level < potion.level) slot.classList.add('dis-lvl', 'disabled');
        });
    }

    /** @param {string} id Potion identifier. */
    #showInfo(id) {
        const potion = this.#potions[id];
        new Message({
            message: renderTemplate(potionInfoTemplate, {
                name: potion.name,
                description: potion.description,
                level: potion.level,
                price: potion.price,
            }),
            class: 'description',
        }).show();
    }

    /**
     * Confirms and buys a potion into the first free slot.
     *
     * @param {string} id Potion identifier.
     * @param {() => void} closeShop Closes the shop window.
     */
    #askBuy(id, closeShop) {
        const potion = this.#potions[id];
        if (!this.#panel.querySelector('#my-pots .slot.empty')) {
            this.#panel.querySelector('#browse').disabled = true;
            closeShop();
            new Message({ message: 'Você não possui espaços disponíveis para adquirir este item' }).show();
            return;
        }
        if (this.#level < potion.level) {
            new Message({ message: `Aprimore o apotecário para o nível <b>${potion.level}</b> para poder encomendar este item` }).show();
            return;
        }
        if (profile.user.silver < potion.price) {
            new Message({ message: "Você não possui prata <i class='fas fa-coins silver'></i> suficiente para adquirir este item" }).show();
            return;
        }

        new Message({
            message: `Emcomendar <b>${potion.name}</b>?`,
            buttons: { yes: 'Sim', no: 'Não' },
        }).show().click('yes', async () => {
            closeShop();
            try {
                const { silver } = await PotionModel.buy(id);
                setSilver(silver);
                createToast(`Item ${escapeHtml(potion.name)} encomendado`, 'success');
            }
            catch {
                createToast('O item não pôde ser adquirido', 'error');
            }
            this.refresh({ signal: this.#signal });
        });
    }

    #askUpgrade() {
        const price = this.#price();
        const affordable = price <= profile.user.silver;
        const box = new Message({
            message: renderTemplate(upgradeTemplate, {
                level: this.#level,
                nextLevel: this.#level + 1,
                hours: this.#hours(),
                nextHours: this.#hours(this.#level + 1),
                price,
                costClass: affordable ? '' : 'nomoney',
            }),
            buttons: { yes: 'Aprimorar', no: 'Cancelar' },
            class: 'upgrade',
        }).show();
        if (!affordable) box.getButton('yes').remove();

        box.click('yes', async () => {
            let data;
            try {
                data = await PotionModel.upgradeApothecary();
            }
            catch (error) {
                const problem = { NOT_ENOUGH_SILVER: 'Você não possui prata suficiente', APOTHECARY_MAX_LEVEL: 'O apotecário já está no nível máximo' }[error.code];
                if (!problem) throw error;
                new Message({ message: problem }).show();
                return;
            }
            setSilver(data.silver);
            profile.user.apothecary = data.apothecary;
            this.#level = data.apothecary;
            this.#showApothecary();
        });
    }
}

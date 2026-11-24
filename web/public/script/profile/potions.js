import { showDialog } from '../components/dialog.js';
import { PageHeader } from '../components/page-header.js';
import { PotionCard } from '../components/potion-card.js';
import { PotionSlot } from '../components/potion-slot.js';
import { SegmentedControl } from '../components/segmented-control.js';
import { createToast } from '../components/toast.js';
import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { potionFilters } from '../helpers/potion-kind.js';
import { formatRemaining } from '../helpers/potion-time.js';
import { settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { PotionModel } from '../models/potion.js';
import { potions } from '../services/potions.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import { potionsShellTemplate } from '../templates/profile-potions.js';
import { icon } from '../templates/icons.js';
import { profile, setSilver } from './session.js';

export { formatRemaining };

/** The number of compartments and the highest apothecary level. */
const SLOTS = 4;
const MAX_APOTHECARY = 5;
/**
 * The POÇÕES section: the apothecary band, the four compartments and the potion catalogue.
 */
export class PotionsTab {
    #root = document.querySelector('#apot-container');
    #built = false;
    #header = null;
    #slots = [];
    #slotComponents = [];
    #cards = new Map();
    #filter = null;
    #kind = 'all';
    #state = { slots: [], serverNow: '', level: 0, unlockLevels: [] };
    #level = 1;
    #prices = [];
    #hours = [];
    #catalogue = {};
    #ready = false;
    #ordering = false;
    #upgrading = false;
    #signal = null;
    #unsubs = [];

    /** Builds the section and loads the catalogue metadata and the compartments. */
    async init() {
        this.#build();
        const [catalogue, apothecary, state] = await Promise.allSettled([
            PotionModel.catalog(),
            PotionModel.apothecary(),
            potions.load(),
        ]);
        if (catalogue.status === 'fulfilled') this.#catalogue = catalogue.value;
        if (apothecary.status === 'fulfilled') {
            this.#prices = apothecary.value.prices;
            this.#hours = apothecary.value.hours;
        }
        this.#ready = catalogue.status === 'fulfilled' && apothecary.status === 'fulfilled';
        this.#level = Number(profile.user?.apothecary) || 1;
        this.#renderApothecary();
        this.#renderFilters();
        this.#renderCards();
        if (state.status === 'fulfilled') this.#applyState(state.value);
        else await this.refresh().catch(() => {});
    }

    /** Builds the static shell once. */
    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(potionsShellTemplate, {
            coin: icon('coins', { size: 15, className: 'icon' }),
        });
        const header = createElement(pageHeaderTemplate);
        this.#root.querySelector('#potions-header').append(header);
        this.#header = new PageHeader({ element: header });
        this.#header.set({
            title: 'Poções',
            subtitle: 'Uma encomenda serve a todos os seus gladiadores enquanto durar, uma vez por batalha ranqueada. Cada compartimento leva uma poção.',
        });
        this.#slots = this.#root.querySelector('#potion-slots');
        this.#filter = new SegmentedControl({ label: 'Tipo de poção' });
        this.#filter.listen('change', ({ value }) => {
            this.#kind = value;
            this.#filterCards();
        });
        this.#root.querySelector('#potion-filters').append(this.#filter.element);
        this.#root.querySelector('#upgrade').addEventListener('click', () => this.#upgrade());
        this.#unsubs = [
            events.on(APP_EVENTS.potionsOrdered, state => this.#applyState(state)),
            events.on(APP_EVENTS.potionsReconciled, state => this.#applyState(state)),
            events.on(APP_EVENTS.potionsCancelled, () => this.refresh({ signal: this.#signal }).catch(() => {})),
        ];
        this.#built = true;
    }

    /**
     * @param {object} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        this.#signal = signal;
        this.#build();
        if (this.#ready) {
            this.#renderApothecary();
            this.#renderFilters();
            this.#renderCards();
        }
        return this.refresh({ signal });
    }

    /** Stops every slot timer and releases the event subscriptions. */
    unmount() {
        for (const slot of this.#slotComponents) slot.destroy();
        this.#slotComponents = [];
        for (const unsubscribe of this.#unsubs) unsubscribe();
        this.#unsubs = [];
        this.#built = false;
        this.#header = null;
        this.#slots = null;
        this.#cards.clear();
        this.#filter = null;
    }

    /**
     * Redraws the compartments from the server.
     *
     * @param {{ signal?: AbortSignal }} [options]
     */
    async refresh({ signal = this.#signal } = {}) {
        const state = await settleRequest(() => potions.load({ signal }), signal);
        if (!state || signal?.aborted) return;
        this.#applyState(state);
    }

    /** @param {Record<string, any>} state */
    #applyState(state) {
        if (!this.#slots) return;
        this.#state = state;
        this.#renderSlots();
        this.#syncCards();
    }

    #renderSlots() {
        for (const slot of this.#slotComponents) slot.destroy();
        this.#slotComponents = [];
        this.#slots.replaceChildren();
        const itemAt = index => this.#state.slots[index] ?? null;
        for (let index = 0; index < SLOTS; index += 1) {
            const component = new PotionSlot({ index });
            const unlockLevel = Number(this.#state.unlockLevels[index] ?? 0);
            if (Number(this.#state.level) < unlockLevel) component.setLocked(unlockLevel);
            else if (itemAt(index)) {
                const hours = Number(this.#hours[this.#level - 1]) || 0;
                component.setPotion(itemAt(index), this.#state.serverNow, hours * 3600);
            }
            else component.setEmpty();
            component.listen('cancel', ({ slot }) => this.#cancel(slot));
            component.listen('empty', () => this.#focusShop());
            component.listen('expire', () => this.refresh({ signal: this.#signal }).catch(() => {}));
            this.#slotComponents.push(component);
            this.#slots.append(component.element);
        }
    }

    #freeSlots() {
        return this.#slotComponents.filter(slot => slot.element.dataset.state === 'empty').length;
    }

    #renderApothecary() {
        if (!this.#built) return;
        const hours = this.#hours[this.#level - 1] ?? 0;
        this.#root.querySelector('.apothecary-title').textContent = `Nível ${this.#level} · encomendas de ${hours} horas`;
        const next = this.#root.querySelector('.apothecary-next');
        const price = this.#prices[this.#level - 1];
        const nextHours = this.#hours[this.#level];
        if (this.#level >= MAX_APOTHECARY || price == null) {
            next.hidden = true;
        }
        else {
            next.hidden = false;
            next.querySelector('.apothecary-next-duration').textContent = `Nível ${this.#level + 1}: encomendas de ${nextHours} h`;
            next.querySelector('.apothecary-next-price span').textContent = `${Number(price).toLocaleString('pt-BR')} prata`;
        }
        this.#root.querySelector('#upgrade').hidden = this.#level >= MAX_APOTHECARY;
    }

    #renderFilters() {
        if (!this.#filter) return;
        const filters = potionFilters(Object.values(this.#catalogue));
        this.#filter.setOptions(filters);
        if (!filters.some(filter => filter.value === this.#kind)) this.#kind = 'all';
        this.#filter.set(this.#kind, { silent: true });
    }

    #renderCards() {
        const container = this.#root.querySelector('#potion-cards');
        container.replaceChildren();
        this.#cards.clear();
        for (const [identifier, potion] of Object.entries(this.#catalogue)) {
            const card = new PotionCard({ potion });
            card.listen('order', () => this.#order(card, potion));
            this.#cards.set(identifier, card);
            container.append(card.element);
        }
        this.#filterCards();
        this.#syncCards();
    }

    #filterCards() {
        for (const [identifier, card] of this.#cards) {
            const kind = this.#catalogue[identifier]?.kind ?? 'hp';
            card.element.hidden = this.#kind !== 'all' && kind !== this.#kind;
        }
        const empty = this.#root.querySelector('#potion-empty');
        empty.hidden = [...this.#cards.values()].some(card => !card.element.hidden);
    }

    #syncCards() {
        const ready = this.#ready;
        const free = this.#freeSlots();
        for (const [identifier, card] of this.#cards) {
            const potion = this.#catalogue[identifier];
            const unlocked = ready && this.#level >= Number(potion?.level ?? 0);
            card.setUnlocked(unlocked, Number(potion?.level ?? 0));
            if (!unlocked) card.setUnavailable('');
            else if (free === 0) card.setUnavailable('Sem compartimento');
            else card.setUnavailable('');
        }
    }

    /** @param {PotionCard} card @param {Record<string, any>} potion */
    async #order(card, potion) {
        if (this.#ordering || !this.#ready) return;
        this.#ordering = true;
        card.setBusy(true);
        try {
            const state = await potions.order(potion.identifier);
            if (state.reconciled && !state.confirmed) {
                createToast('Encomenda não confirmada. Os compartimentos foram sincronizados.', 'info');
            }
            else {
                createToast(`${potion.name} encomendada`, 'success');
            }
        }
        catch (error) {
            writeErrorToast(error);
        }
        finally {
            this.#ordering = false;
            card.setBusy(false);
            this.#syncCards();
        }
    }

    /** @param {Record<string, any>} slot */
    async #cancel(slot) {
        const answer = await showDialog(`Cancelar a encomenda de <span class='highlight'>${escapeText(slot.name)}</span>?`, ['Sim', 'Não']);
        if (answer !== 'Sim') return;
        try {
            await potions.cancel(slot.id);
            createToast('Encomenda cancelada', 'success');
            await this.refresh({ signal: this.#signal });
        }
        catch (error) {
            writeErrorToast(error);
        }
    }

    async #upgrade() {
        if (this.#upgrading || !this.#ready || this.#level >= MAX_APOTHECARY) return;
        this.#upgrading = true;
        const button = this.#root.querySelector('#upgrade');
        button.disabled = true;
        try {
            const price = this.#prices[this.#level - 1];
            const nextHours = this.#hours[this.#level];
            const answer = await showDialog(
                `Melhorar o apotecário para o nível ${this.#level + 1} por <span class='highlight'>${Number(price).toLocaleString('pt-BR')} prata</span>? As encomendas passarão a durar ${nextHours} horas.`,
                ['Aprimorar', 'Cancelar'],
            );
            if (answer !== 'Aprimorar') return;
            const data = await PotionModel.upgradeApothecary();
            setSilver(data.silver);
            profile.user.apothecary = data.apothecary;
            this.#level = data.apothecary;
            this.#renderApothecary();
            this.#syncCards();
            createToast('Apotecário aprimorado', 'success');
        }
        catch (error) {
            writeErrorToast(error);
        }
        finally {
            this.#upgrading = false;
            button.disabled = false;
        }
    }

    #focusShop() {
        this.#root.querySelector('#potion-filters')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/** @param {unknown} value @returns {string} */
function escapeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

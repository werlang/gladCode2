import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { RequestError } from '../helpers/request.js';
import { PotionModel } from '../models/potion.js';
import { NotificationModel } from '../models/social.js';

/**
 * The potion state shared by the Poções section and the shell badge (docs/frontend/events.md,
 * flow 7). DOM-free: it calls the models and publishes facts; the section applies them to components.
 */

/**
 * @param {Date} date
 * @returns {string} `YYYY-MM-DD HH:MM:SS` in the browser's time zone (the server sends its own clock
 *   once WP3 adds `serverNow`).
 */
export function formatServerDate(date) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * @param {string} serverNow `YYYY-MM-DD HH:MM:SS` server time.
 * @param {number} seconds
 * @returns {string} The same format, `seconds` later.
 */
export function addSeconds(serverNow, seconds) {
    const date = new Date(String(serverNow).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return serverNow;
    date.setSeconds(date.getSeconds() + Number(seconds || 0));
    return formatServerDate(date);
}

/**
 * Normalizes `GET /potions/slots` (and the WP6 order response) into the PotionSlotView shape.
 *
 * @param {{ slots?: Array<object>, serverNow?: string, level?: number, unlockLevels?: number[] }} answer
 * @param {Date} [now] Used for `serverNow` when the API does not send it (before WP3).
 * @returns {{ slots: import('../helpers/event-bus.js').PotionSlotView[], serverNow: string, level: number, unlockLevels: number[] }}
 */
export function normalizeSlots(answer = {}, now = new Date()) {
    const serverNow = answer.serverNow || formatServerDate(now);
    const slots = (Array.isArray(answer.slots) ? answer.slots : []).map(slot => {
        const seconds = Number(slot.seconds ?? slot.secondsLeft ?? 0);
        return {
            id: Number(slot.id),
            identifier: slot.identifier ?? slot.potion ?? '',
            name: slot.name ?? '',
            icon: slot.icon ?? '',
            expiresAt: slot.expiresAt ?? addSeconds(serverNow, seconds),
            seconds,
        };
    });
    return {
        slots,
        serverNow,
        level: Number(answer.level ?? 0),
        unlockLevels: Array.isArray(answer.unlockLevels) ? answer.unlockLevels : [],
    };
}

/**
 * @param {import('../helpers/event-bus.js').PotionSlotView[]} slots
 * @returns {string|null} The soonest `expiresAt`, or null when there is no active slot.
 */
export function nextExpiry(slots) {
    const times = slots
        .map(slot => new Date(String(slot.expiresAt).replace(' ', 'T')).getTime())
        .filter(time => Number.isFinite(time));
    if (!times.length) return null;
    const soonest = Math.min(...times);
    return formatServerDate(new Date(soonest));
}

/**
 * Whether a failed request might have committed on the server: a network failure or timeout, not a
 * user abort and not an HTTP answer (4xx/5xx).
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isLostWrite(error) {
    return error instanceof RequestError && !error.aborted && (error.status === 0 || error.status === 408);
}

/**
 * The potion orders and compartment list.
 */
export class PotionsService {
    #model;
    #counts;
    #bus;
    #slots = [];
    #serverNow = '';

    /**
     * @param {object} [options] Test seams.
     * @param {typeof PotionModel} [options.model]
     * @param {() => Promise<object>} [options.counts] Reads `GET /notifications` (the silver balance).
     * @param {typeof events} [options.bus]
     */
    constructor({ model = PotionModel, counts = () => NotificationModel.counts(), bus = events } = {}) {
        this.#model = model;
        this.#counts = counts;
        this.#bus = bus;
    }

    /** @returns {import('../helpers/event-bus.js').PotionSlotView[]} The last known compartments. */
    get slots() {
        return this.#slots;
    }

    /** @returns {string} The server time of the last slots answer (`''` before the first read). */
    get serverNow() {
        return this.#serverNow;
    }

    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ slots: import('../helpers/event-bus.js').PotionSlotView[], serverNow: string, level: number, unlockLevels: number[] }>}
     */
    async load({ signal } = {}) {
        const answer = await this.#model.slots({ signal });
        return this.#remember(normalizeSlots(answer));
    }

    /**
     * Orders a potion. A received 201 is authoritative (silver and slots); a lost 201 is reconciled
     * with a read, never with a second purchase. The read result carries `reconciled` and `confirmed`
     * so the caller only announces success when the new compartment is actually there: a lost write
     * that did not commit leaves `confirmed: false`.
     *
     * @param {string} identifier Potion identifier (`useItem` name).
     * @returns {Promise<{ slots: import('../helpers/event-bus.js').PotionSlotView[], serverNow: string,
     *   silver: number, level: number, unlockLevels: number[], reconciled: boolean, confirmed: boolean }>}
     * @throws {import('../helpers/request.js').RequestError} The API's refusal, or the read error when a
     *   lost 201 could not be reconciled.
     */
    async order(identifier) {
        const before = new Set(this.#slots.map(slot => Number(slot.id)));
        const snapshot = this.#serverNow !== '';
        let answer;
        try {
            answer = await this.#model.buy(identifier);
        }
        catch (error) {
            if (isLostWrite(error)) return this.reconcile({ expected: identifier, before, snapshot });
            throw error;
        }

        if (Array.isArray(answer.slots)) {
            const state = this.#remember(normalizeSlots(answer));
            const silver = Number(answer.silver);
            const detail = {
                slots: state.slots,
                serverNow: state.serverNow,
                silver,
                level: state.level,
                unlockLevels: state.unlockLevels,
                reconciled: false,
                confirmed: true,
            };
            this.#bus.emit(APP_EVENTS.accountSilver, { silver });
            this.#bus.emit(APP_EVENTS.potionsOrdered, detail);
            return detail;
        }

        // The API before WP6 answers only the slot id and the balance; the list comes from a read.
        return this.reconcile({ ordered: true, expected: identifier, before, snapshot });
    }

    /**
     * Reads the full compartment list and the balance after a lost 201, or after a 201 without slots.
     * Emits `potions:reconciled` (lost write) or `potions:ordered` (confirmed purchase) and never calls
     * `POST /potions/slots` again. For a lost write, `confirmed` is true only when a slot that was not
     * present in the last snapshot now carries the ordered identifier; without a prior snapshot the
     * purchase cannot be proven, so it stays false.
     *
     * @param {{ ordered?: boolean, expected?: string, before?: Set<number>, snapshot?: boolean }} [options]
     * @returns {Promise<{ slots: import('../helpers/event-bus.js').PotionSlotView[], serverNow: string,
     *   silver: number, level: number, unlockLevels: number[], reconciled: boolean, confirmed: boolean }>}
     */
    async reconcile({ ordered = false, expected = '', before = new Set(), snapshot = false } = {}) {
        const [slotsAnswer, counts] = await Promise.all([this.#model.slots(), this.#counts()]);
        const state = this.#remember(normalizeSlots(slotsAnswer));
        const silver = Number(counts?.user?.silver ?? 0);
        const confirmed = Boolean(ordered) || Boolean(
            snapshot
            && expected
            && state.slots.some(slot => !before.has(Number(slot.id)) && slot.identifier === expected),
        );
        const detail = {
            slots: state.slots,
            serverNow: state.serverNow,
            silver,
            level: state.level,
            unlockLevels: state.unlockLevels,
            reconciled: true,
            confirmed,
        };

        this.#bus.emit(APP_EVENTS.accountSilver, { silver });
        this.#bus.emit(ordered ? APP_EVENTS.potionsOrdered : APP_EVENTS.potionsReconciled, detail);
        return detail;
    }

    /**
     * @param {number} slotId
     * @returns {Promise<true>}
     */
    async cancel(slotId) {
        await this.#model.cancel(slotId);
        this.#slots = this.#slots.filter(slot => slot.id !== Number(slotId));
        this.#bus.emit(APP_EVENTS.potionsCancelled, { slotId: Number(slotId) });
        return true;
    }

    /**
     * @param {{ slots: import('../helpers/event-bus.js').PotionSlotView[], serverNow: string, level: number, unlockLevels: number[] }} state
     * @returns {typeof state}
     */
    #remember(state) {
        this.#slots = state.slots;
        this.#serverNow = state.serverNow;
        return state;
    }
}

/** The page's potion state. */
export const potions = new PotionsService();

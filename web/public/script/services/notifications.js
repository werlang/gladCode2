import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { NotificationModel } from '../models/social.js';
import { PotionModel } from '../models/potion.js';
import { formatServerDate, nextExpiry, normalizeSlots } from './potions.js';

/**
 * The notification counts the shell, rail and tab bar read (docs/frontend/events.md, flow 1).
 * DOM-free; the shell starts and stops the poll.
 */

/**
 * @param {object} counts `GET /notifications`.
 * @param {{ slots?: object[], serverNow?: string }|null} slotAnswer `GET /potions/slots`, when it answered.
 * @param {{ count: number, nextExpiry: string|null, serverNow: string }|null} [previous] Last potion state,
 *   used when the slots read fails.
 * @param {Date} [now]
 * @returns {import('../helpers/event-bus.js').NotificationCounts}
 */
export function normalizeCounts(counts, slotAnswer, previous = null, now = new Date()) {
    const reports = counts.reports ?? { ranked: 0, duel: 0 };
    const potions = slotAnswer
        ? (() => {
            const state = normalizeSlots(slotAnswer, now);
            return {
                count: state.slots.length,
                nextExpiry: nextExpiry(state.slots),
                serverNow: state.serverNow,
            };
        })()
        : previous ?? { count: 0, nextExpiry: null, serverNow: formatServerDate(now) };

    const duels = Number(counts.duels ?? 0);
    const friends = Number(counts.friends ?? 0);
    const news = Number(counts.news ?? 0);
    const ranked = Number(reports.ranked ?? 0);
    const duel = Number(reports.duel ?? 0);

    return {
        user: counts.user,
        messages: Number(counts.messages ?? 0),
        news,
        friends,
        gladiators: counts.gladiators ?? { remaining: 0, outdated: 0 },
        duels,
        reports: { ranked, duel },
        potions,
        bell: duels + friends + ranked + duel + news,
    };
}

/**
 * Owns the joined counts and their 30 s poll. It is DOM-free; the shell decides when to start it.
 */
export class NotificationService {
    #counts;
    #slots;
    #bus;
    #intervalMs;
    #setInterval;
    #clearInterval;
    #document;
    #timer = null;
    #running = false;
    #last = null;
    #onVisibility = () => {
        if (!this.#document?.hidden) this.refresh().catch(() => {});
    };

    /**
     * @param {object} [options] Test seams.
     * @param {() => Promise<object>} [options.counts] `GET /notifications`.
     * @param {() => Promise<object>} [options.slots] `GET /potions/slots`.
     * @param {typeof events} [options.bus]
     * @param {number} [options.intervalMs]
     * @param {Function} [options.setInterval]
     * @param {Function} [options.clearInterval]
     */
    constructor({
        counts = () => NotificationModel.counts(),
        slots = () => PotionModel.slots(),
        bus = events,
        intervalMs = 30000,
        setInterval: setTimer = globalThis.setInterval,
        clearInterval: clearTimer = globalThis.clearInterval,
    } = {}) {
        this.#counts = counts;
        this.#slots = slots;
        this.#bus = bus;
        this.#intervalMs = intervalMs;
        this.#setInterval = setTimer;
        this.#clearInterval = clearTimer;
    }

    /** @returns {import('../helpers/event-bus.js').NotificationCounts|null} The last emitted counts. */
    get counts() {
        return this.#last;
    }

    /**
     * Starts the poll for the shell's lifetime. It refreshes once now, every `intervalMs`, and again
     * when the page becomes visible; a hidden page does not poll.
     *
     * @param {{ document?: Document }} [options]
     * @returns {this}
     */
    start({ document: documentRef = globalThis.document } = {}) {
        if (this.#running) return this;
        this.#running = true;
        this.#document = documentRef;
        this.#document?.addEventListener?.('visibilitychange', this.#onVisibility);
        this.refresh().catch(() => {});
        this.#timer = this.#setInterval(() => {
            if (!this.#document?.hidden) this.refresh().catch(() => {});
        }, this.#intervalMs);
        return this;
    }

    /** Stops the poll and its visibility listener. */
    stop() {
        this.#running = false;
        if (this.#timer !== null) this.#clearInterval(this.#timer);
        this.#timer = null;
        this.#document?.removeEventListener?.('visibilitychange', this.#onVisibility);
        this.#document = null;
        return this;
    }

    /**
     * Reads the counters and the potions, joins them and emits `notifications:counts`. A failed slots
     * read keeps the last potion state; a failed counts read rejects.
     *
     * @returns {Promise<import('../helpers/event-bus.js').NotificationCounts>}
     */
    async refresh() {
        const counts = await this.#counts();
        let slotAnswer = null;
        try {
            slotAnswer = await this.#slots();
        }
        catch {
            // the shell can still show the counters; the previous potion state stays
        }

        const payload = normalizeCounts(counts, slotAnswer, this.#last?.potions ?? null);
        this.#last = payload;
        this.#bus.emit(APP_EVENTS.notificationsCounts, payload);
        return payload;
    }
}

/** The page's notification counts. */
export const notifications = new NotificationService();

import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { DuelModel, FriendModel, NotificationModel, ReportModel } from '../models/social.js';
import { NewsModel } from '../models/news.js';
import { PotionModel } from '../models/potion.js';
import { formatMessageTime } from '../helpers/date-format.js';
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
        setInterval: setTimer = (callback, delay) => globalThis.setInterval(callback, delay),
        clearInterval: clearTimer = id => globalThis.clearInterval(id),
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
     * The rows of the notifications panel, loaded when it opens. Each group is best-effort: a failed
     * request leaves that group empty instead of hiding the counters.
     *
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ needs: Array<{ id: string, text: string, where: string, href: string }>,
     *   news: Array<{ id: string, text: string, where: string, href: string }> }>}
     */
    async feed({ signal } = {}) {
        if (!this.#last) await this.refresh().catch(() => {});
        const [duels, friends, reports, posts] = await Promise.allSettled([
            DuelModel.challenges({ signal }),
            FriendModel.list({ signal }),
            ReportModel.unreadFeed({ signal }),
            NewsModel.list(0, { markRead: false, signal }),
        ]);
        const list = result => (result.status === 'fulfilled' ? result.value : null);
        const when = time => {
            const label = formatMessageTime(time, { short: true });
            return Number.isNaN(new Date(time).getTime()) ? '' : ` · há ${label}`;
        };

        const needs = [];
        for (const duel of list(duels) ?? []) {
            needs.push({
                id: `duel-${duel.id}`,
                text: `${duel.nick} desafiou você para um duelo`,
                where: `Batalhas${when(duel.time)}`,
                href: '/battle.duel',
            });
        }
        for (const friend of list(friends)?.pending ?? []) {
            needs.push({
                id: `friend-${friend.id}`,
                text: `${friend.nick} quer ser seu amigo`,
                where: 'Amigos',
                href: '/friends',
            });
        }

        const news = [];
        for (const report of list(reports)?.reports ?? []) {
            news.push({
                id: `report-${report.id}`,
                text: `Relatório de ${report.gladiator} pronto`,
                where: `Relatórios${when(report.time)}`,
                href: '/reports',
            });
        }
        const unreadNews = Math.max(0, Number(this.#last?.news ?? 0));
        for (const post of (list(posts) ?? []).slice(0, unreadNews)) {
            news.push({
                id: `news-${post.hash}`,
                text: post.title,
                where: `Notícias${when(post.time)}`,
                href: '/news',
            });
        }
        return { needs, news };
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

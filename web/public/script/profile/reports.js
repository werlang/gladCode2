import { PageHeader } from '../components/page-header.js';
import { Pagination } from '../components/pagination.js';
import { FormStreak } from '../components/form-streak.js';
import { ResultPill } from '../components/result-pill.js';
import { Switch } from '../components/switch.js';
import { Tabs } from '../components/tabs.js';
import { createToast } from '../components/toast.js';
import { FavoriteQueue } from '../helpers/favorite-queue.js';
import { formatMessageTime } from '../helpers/date-format.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { isAborted, secondaryRequest, settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { DuelModel, ReportModel } from '../models/social.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import { icon } from '../templates/icons.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import { reportEmptyTemplate, reportRowTemplate, reportsShellTemplate, reportsSummaryTemplate } from '../templates/profile-reports.js';

const PAGE_SIZE = 10;

/** The report tabs, in card order. */
const TABS = ['battles', 'duels', 'favorites'];

const VIEWS = {
    battles: {
        load: ({ offset, unread, signal }) => ReportModel.battles({ offset, unreadOnly: unread, signal }),
        rows: data => data.reports,
        empty: { icon: 'scroll', title: 'Nenhuma batalha para mostrar', summary: 'Jogue uma batalha ranqueada para começar seu histórico.' },
    },
    duels: {
        load: ({ offset, signal }) => DuelModel.reports({ offset, signal }),
        rows: data => data.duels,
        empty: { icon: 'shield-halved', title: 'Você ainda não possui duelos', summary: 'Desafie um amigo na seção Batalhas.' },
    },
    favorites: {
        load: ({ offset, signal }) => ReportModel.favorites({ offset, signal }),
        rows: data => data.reports,
        empty: { icon: 'star', title: 'Nenhuma batalha favorita', summary: 'Marque uma batalha com a estrela para guardá-la aqui.' },
    },
};

/** The relative time cells shared by the rows. */
function timeCell(row) {
    return { date: formatMessageTime(row.time), elapsed: formatMessageTime(row.time, { short: true }) };
}

/** @param {number} value @returns {string} */
function signed(value) {
    const number = Number(value) || 0;
    if (number === 0) return '0';
    return `${number > 0 ? '+' : '−'}${Math.abs(number).toFixed(1).replace('.0', '')}`;
}

/**
 * The RELATÓRIOS section: tabs, unread filter, form/renown summary, rows and favourites.
 */
export class ReportsTab {
    #root = document.querySelector('#report-container');
    #built = false;
    #header = null;
    #tabs = null;
    #unread = null;
    #pager = null;
    #streak = null;
    #renown = null;
    #summaryRoot = null;
    #body = null;
    #offsets = { battles: 0, duels: 0, favorites: 0 };
    #selected = 'battles';
    #request = 0;
    #unreadCount = 0;
    #signal = null;
    #rowElements = new Map();
    #favorites = null;

    /** Builds the section, tabs, switch and pager. */
    init() {
        this.#build();
    }

    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(reportsShellTemplate);
        this.#rowElements.clear();
        const header = createElement(pageHeaderTemplate);
        this.#root.querySelector('#reports-header').append(header);
        this.#header = new PageHeader({ element: header });
        this.#header.set({ title: 'Relatórios', subtitle: 'Cada batalha que contou, com o replay e o que ela rendeu.' });

        this.#summaryRoot = createElement(reportsSummaryTemplate);
        const streakRoot = this.#summaryRoot.querySelector('#reports-streak');
        this.#streak = new FormStreak();
        streakRoot.append(this.#streak.element);
        this.#renown = this.#summaryRoot.querySelector('#reports-renown-value');
        this.#header.setActions([this.#summaryRoot]);

        this.#tabs = new Tabs({ variant: 'underline', label: 'Tipo de relatório' });
        this.#root.querySelector('#reports-tabs').append(this.#tabs.element);
        this.#tabs.listen('select', ({ id }) => this.#select(id));

        this.#unread = new Switch({ label: 'Só não vistas' });
        this.#root.querySelector('#reports-unread-switch').append(this.#unread.element);
        this.#unread.listen('change', () => {
            if (this.#selected !== 'battles') return;
            const tab = this.#selected;
            const token = ++this.#request;
            this.#run(() => this.#fetch({ offset: 0, signal: this.#signal, token }), { tab, token });
        });

        this.#pager = new Pagination({ variant: 'simple', controlled: true, unit: 'batalhas' });
        this.#root.querySelector('#reports-pager').append(this.#pager.element);
        this.#pager.listen('change', ({ page }) => this.#go(page));

        this.#body = this.#root.querySelector('#reports-body');
        this.#favorites = new FavoriteQueue({
            write: (id, favorite) => ReportModel.setFavorite(id, favorite),
            paint: (id, favorite) => this.#paintFavorite(id, favorite),
            report: error => writeErrorToast(error),
            confirmed: (id, favorite) => {
                if (this.#selected === 'favorites' && !favorite) {
                    this.#run(() => this.#fetch({ offset: this.#offsets.favorites, signal: this.#signal }));
                }
            },
        });
        this.#updateTabs();
        this.#built = true;
    }

    /**
     * @param {{ query?: { tab?: string } }} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        this.#build();
        this.#signal = signal;
        const requested = route.query?.tab;
        this.#selected = TABS.includes(requested) ? requested : this.#selected;
        this.#tabs.select(this.#selected, { silent: true });
        const summary = await secondaryRequest(() => ReportModel.summary({ signal }), signal);
        if (signal?.aborted) return;
        if (summary) this.#applySummary(summary);
        await this.#fetch({ offset: this.#offsets[this.#selected], signal });
    }

    /** @param {{ results?: string[], renown?: number, unread?: number }} summary */
    #applySummary(summary) {
        this.#streak.set((summary.results ?? []).slice().reverse());
        const renown = Number(summary.renown) || 0;
        this.#renown.textContent = signed(renown);
        this.#renown.dataset.sign = renown < 0 ? 'negative' : 'positive';
        this.#unreadCount = Number(summary.unread) || 0;
        this.#updateTabs();
    }

    #updateTabs() {
        this.#tabs.setItems([
            { id: 'battles', label: 'Ranqueadas', count: this.#unreadCount },
            { id: 'duels', label: 'Duelos' },
            { id: 'favorites', label: 'Favoritas' },
        ]);
        this.#tabs.select(this.#selected, { silent: true });
    }

    /** @param {string} id */
    #select(id) {
        this.#selected = id;
        this.#tabs.select(id, { silent: true });
        this.#root.querySelector('.reports-unread').hidden = id !== 'battles';
        const token = ++this.#request;
        return this.#run(() => this.#fetch({ offset: this.#offsets[id], signal: this.#signal, token }), { tab: id, token });
    }

    /**
     * Runs a section read and reports a refusal without leaving the previous rows. A read that was
     * superseded by another tab or read is discarded silently.
     *
     * @param {() => Promise<unknown>} task
     * @param {{ tab?: string, token?: number }} [origin]
     */
    async #run(task, { tab = this.#selected, token = this.#request } = {}) {
        try {
            await task();
        }
        catch (error) {
            if (token !== this.#request || this.#selected !== tab) return;
            this.#pager.cancel();
            if (!isAborted(error) && !this.#signal?.aborted) writeErrorToast(error);
        }
    }

    /** @param {number} page */
    async #go(page) {
        const tab = this.#selected;
        const previous = this.#offsets[tab];
        const token = ++this.#request;
        this.#offsets[tab] = Math.max(0, (Number(page) - 1) * PAGE_SIZE);
        try {
            await this.#fetch({ offset: this.#offsets[tab], signal: this.#signal, token });
            if (token !== this.#request || this.#selected !== tab) return;
            if (this.#signal?.aborted) this.#pager.cancel();
        }
        catch (error) {
            if (token !== this.#request || this.#selected !== tab) return;
            this.#pager.cancel();
            if (isAborted(error) || this.#signal?.aborted) return;
            this.#offsets[tab] = previous;
            writeErrorToast(error);
        }
    }

    /**
     * @param {{ offset?: number, signal?: AbortSignal }} options
     */
    async #fetch({ offset = 0, signal = this.#signal, token = ++this.#request } = {}) {
        this.#request = token;
        const id = this.#selected;
        const view = VIEWS[id];
        this.#root.querySelector('.reports-unread').hidden = id !== 'battles';
        const data = await settleRequest(() => view.load({ offset, unread: this.#unread.checked, signal }), signal);
        if (!data || signal?.aborted || token !== this.#request || id !== this.#selected) return;
        const total = Number(data.total) || 0;
        if (total <= offset && total > 0) {
            this.#offsets[id] = 0;
            return this.#fetch({ offset: 0, signal, token });
        }
        this.#offsets[id] = offset;
        const rows = view.rows(data) ?? [];
        this.#renderRows(id, rows, total);
        this.#pager.element.hidden = total === 0;
        this.#pager.set({
            page: Math.floor(offset / PAGE_SIZE) + 1,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            total,
            pageSize: PAGE_SIZE,
        });
    }

    /**
     * @param {string} id Tab id.
     * @param {object[]} rows Rows from the API.
     * @param {number} total Total rows.
     */
    #renderRows(id, rows, total) {
        this.#body.replaceChildren();
        this.#rowElements.clear();
        if (total === 0) {
            this.#body.innerHTML = renderTemplate(reportEmptyTemplate, {
                empty: renderTemplate(emptyStateTemplate, {
                    variantClass: 'compact', actionHtml: '', ...VIEWS[id].empty,
                }),
            });
            return;
        }
        rows.forEach(row => {
            const element = createElement(renderTemplate(reportRowTemplate, { unread: row.read ? '' : 'unread' }));
            element.dataset.unread = String(!row.read);
            const place = element.querySelector('.report-place');
            if (id === 'duels') {
                const pill = document.createElement('span');
                pill.className = 'result-pill';
                pill.dataset.tone = 'neutral';
                pill.textContent = 'Duelo';
                place.querySelector('.report-pill').replaceWith(pill);
            }
            else {
                const result = new ResultPill({ place: row.place, total: row.total });
                place.querySelector('.report-pill').replaceWith(result.element);
            }
            place.querySelector('.report-dot').dataset.on = String(!row.read);
            const gladiator = element.querySelector('.report-gladiator');
            gladiator.textContent = id === 'duels' ? (row.glad ?? 'Gladiador Esquecido') : (row.gladiator ?? '—');
            if (id === 'favorites' && row.comment) {
                const comment = document.createElement('span');
                comment.className = 'report-comment';
                comment.textContent = row.comment;
                gladiator.append(comment);
            }
            element.querySelector('.report-opponents').textContent = id === 'duels'
                ? [row.enemy ?? '???', row.user].filter(Boolean).join(' · ')
                : (row.opponents?.join(', ') || '—');
            const renown = element.querySelector('.report-renown');
            if (id === 'duels') renown.textContent = '—';
            else {
                const value = Number(row.reward) || 0;
                renown.textContent = signed(value);
                renown.dataset.sign = value < 0 ? 'negative' : value > 0 ? 'positive' : '';
            }
            const when = element.querySelector('.report-when');
            const times = timeCell(row);
            when.textContent = times.elapsed;
            when.title = times.date;
            this.#buildActions(id, row, element.querySelector('.report-actions'));
            this.#body.append(element);
            if (id !== 'duels') {
                this.#rowElements.set(row.id, element);
                this.#favorites.seed(row.id, row.favorite);
                this.#paintFavorite(row.id, this.#favorites.intent(row.id));
            }
        });
    }

    /**
     * @param {string} id Tab id.
     * @param {Record<string, any>} row
     * @param {HTMLElement} cell
     */
    #buildActions(id, row, cell) {
        const actions = document.createElement('span');
        actions.className = 'report-actions-inner';
        if (id === 'duels' && !row.log) {
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'button neutral small';
            cancel.textContent = 'Cancelar';
            cancel.addEventListener('click', () => this.#cancelDuel(row.id));
            actions.append(cancel);
        }
        else if (id === 'duels' ? row.log : row.hash) {
            const hash = id === 'duels' ? row.log : row.hash;
            const watch = document.createElement('a');
            watch.className = 'button ghost small report-watch';
            if (!row.read) watch.classList.add('is-unread');
            watch.href = `play/${hash}`;
            watch.target = '_blank';
            watch.rel = 'noopener';
            watch.innerHTML = `${icon('play', { size: 13, className: 'icon' })}<span>Assistir</span>`;
            actions.append(watch);
        }
        else {
            const expired = document.createElement('span');
            expired.className = 'button ghost small report-watch is-expired';
            expired.textContent = 'Expirada';
            expired.setAttribute('aria-disabled', 'true');
            actions.append(expired);
        }
        if (id !== 'duels') {
            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'report-star';
            star.innerHTML = icon('star', { size: 15, className: 'icon' });
            star.addEventListener('click', () => {
                this.#favorites.toggle(row.id, !this.#favorites.intent(row.id));
            });
            actions.append(star);
        }
        cell.append(actions);
    }

    /** @param {number} id @param {boolean} favorite */
    #paintFavorite(id, favorite) {
        const row = this.#rowElements.get(id);
        const star = row?.querySelector('.report-star');
        if (!star) return;
        const label = favorite ? 'Tirar dos favoritos' : 'Guardar nos favoritos';
        star.dataset.on = String(favorite);
        star.setAttribute('aria-pressed', String(favorite));
        star.setAttribute('aria-label', label);
        star.title = label;
    }

    /** @param {number} id */
    async #cancelDuel(id) {
        try {
            await DuelModel.remove(id);
            createToast('Desafio cancelado', 'success');
            await this.#fetch({ offset: this.#offsets.duels, signal: this.#signal });
        }
        catch (error) {
            writeErrorToast(error);
        }
    }
}

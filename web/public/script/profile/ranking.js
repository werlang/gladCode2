import { PageHeader } from '../components/page-header.js';
import { Pagination } from '../components/pagination.js';
import { RankingTable } from '../components/ranking-table.js';
import { SearchField } from '../components/search-field.js';
import { Tabs } from '../components/tabs.js';
import { OwnGladiatorJump } from '../components/own-gladiator-jump.js';
import { showDialog, showInput } from '../components/dialog.js';
import { createToast } from '../components/toast.js';
import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { secondaryRequest, settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { ranking } from '../services/ranking.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import { icon } from '../templates/icons.js';
import {
    customRankingRowTemplate,
    customRankingTemplate,
    podiumItemTemplate,
    rankingShellTemplate,
} from '../templates/ranking.js';
import { profile } from './session.js';
import { showNoCredit, showTutorPitch } from './tutor.js';

const PAGE_SIZE = 10;
const GENERAL = 'general';
const FRIENDS = 'friends';
const WINDOW_SIZE = 9;
const TAG = /^[a-z0-9_]{1,50}$/;

/**
 * @param {number} value
 * @returns {string}
 */
function number(value) {
    return (Number(value) || 0).toLocaleString('pt-BR');
}

/**
 * @param {number} total
 * @returns {string}
 */
function subtitle(total) {
    return `${number(total)} ${total === 1 ? 'gladiador' : 'gladiadores'} por renome, na versão atual do motor.`;
}

/**
 * The RANKING section: the current-version table, the own-gladiator strip, the centred window,
 * the general/friends tabs, custom hashtag lists and the position jump.
 */
export class RankingTab {
    #root = document.querySelector('#ranking-container');
    #built = false;
    #header = null;
    #search = null;
    #own = null;
    #tabs = null;
    #pager = null;
    #table = null;
    #podium = null;
    #remove = null;
    #add = null;
    #customHost = null;
    #status = null;
    #selected = GENERAL;
    #mode = 'page';
    #customTag = null;
    #searchTerm = '';
    #hashtags = [];
    #mine = [];
    #ownIds = new Set();
    #top = [];
    #total = 0;
    #customOffset = 0;
    #request = 0;
    #signal = null;

    /** Builds the section shell once. */
    init() {
        this.#build();
    }

    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(rankingShellTemplate, {
            plus: icon('plus', { size: 16, className: 'icon' }),
        });
        const header = createElement(pageHeaderTemplate);
        this.#root.querySelector('#ranking-header').append(header);
        this.#header = new PageHeader({ element: header });
        this.#header.set({ title: 'Ranking', subtitle: subtitle(0) });

        this.#search = new SearchField({
            label: 'Buscar no ranking',
            placeholder: 'Gladiador ou mestre',
        });
        this.#search.element.classList.add('ranking-search');
        this.#search.listen('search', ({ value }) => this.#run(() => this.#searchRanking(value)));
        this.#header.setActions([this.#search.element]);

        this.#own = new OwnGladiatorJump();
        this.#root.querySelector('#ranking-own').append(this.#own.element);
        this.#own.listen('jump', detail => this.#run(() => this.#jumpToGladiator(detail)));

        this.#tabs = new Tabs({ variant: 'pill', label: 'Listas do ranking' });
        this.#root.querySelector('#ranking-tabs').append(this.#tabs.element);
        this.#tabs.listen('select', ({ id }) => this.#run(() => this.#select(id)));

        this.#podium = this.#root.querySelector('#ranking-podium');
        this.#remove = this.#root.querySelector('#ranking-remove');
        this.#add = this.#root.querySelector('#ranking-add');
        this.#remove.innerHTML = icon('close', { size: 15, className: 'icon' });
        this.#add.innerHTML = icon('plus', { size: 16, className: 'icon' });
        this.#remove.addEventListener('click', () => this.#run(() => this.#removeTab()));
        this.#add.addEventListener('click', () => this.#run(() => this.#addTab()));

        this.#table = new RankingTable();
        this.#root.querySelector('#ranking-table-host').append(this.#table.element);
        this.#customHost = this.#root.querySelector('#ranking-custom-host');
        this.#status = this.#root.querySelector('#ranking-status');

        this.#pager = new Pagination({ variant: 'numbered', controlled: true });
        this.#root.querySelector('#ranking-pager').append(this.#pager.element);
        this.#pager.listen('change', ({ page }) => this.#run(() => this.#goPage(page)));
        this.#pager.listen('jump', ({ position }) => this.#run(() => this.#goPosition(position)));

        this.#renderTabs();
        this.#built = true;
    }

    /**
     * @param {{ query?: { at?: number, q?: string } }} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        this.#build();
        this.#signal = signal;
        const query = route.query ?? {};
        this.#search.set(query.q ?? '');
        this.#searchTerm = query.q ?? '';
        this.#selected = GENERAL;
        this.#mode = 'page';
        this.#customTag = null;
        this.#tabs.select(GENERAL, { silent: true });
        this.#renderTabs();

        const tabs = await secondaryRequest(() => ranking.tabs({ signal }), signal);
        if (signal?.aborted) return;
        this.#hashtags = tabs ?? [];
        this.#renderTabs();

        const mine = await secondaryRequest(() => ranking.mine({ signal }), signal);
        if (signal?.aborted) return;
        this.#setMine(mine?.gladiators ?? []);

        const needsTop = Boolean(query.at || query.q);
        if (needsTop) {
            const page = await secondaryRequest(() => ranking.page({ offset: 0, signal }), signal);
            if (signal?.aborted) return;
            if (page) this.#useTop(page);
        }

        if (query.q) return this.#loadPage({ offset: 0, search: query.q, signal, strict: true });
        if (query.at) return this.#loadWindow({ position: query.at, signal, strict: true });
        return this.#loadPage({ offset: 0, signal, strict: true });
    }

    /** Stops the table timer and forgets the shell. */
    unmount() {
        this.#table?.destroy();
        this.#pager?.destroy();
        this.#built = false;
        this.#header = null;
        this.#search = null;
        this.#own = null;
        this.#tabs = null;
        this.#pager = null;
        this.#table = null;
        this.#podium = null;
        this.#customHost = null;
        this.#status = null;
    }

    /**
     * Runs a user-triggered read and reports a refusal without clearing the current table.
     *
     * @param {() => Promise<unknown>} task
     */
    async #run(task) {
        try {
            await task();
        }
        catch (error) {
            if (this.#signal?.aborted) return;
            writeErrorToast(error);
        }
    }

    /** @param {object[]} list */
    #setMine(list) {
        this.#mine = list;
        this.#ownIds = new Set(list.map(gladiator => Number(gladiator.id)));
        this.#own.setGladiators(list);
        this.#updateRemove();
    }

    /** @param {{ total: number, ranking: object[] }} page */
    #useTop(page) {
        this.#top = ranking.top ?? page.ranking.slice(0, 3);
        this.#total = Number(page.total) || this.#total;
        this.#header.set({ title: 'Ranking', subtitle: subtitle(this.#total) });
        this.#renderPodium();
    }

    #renderTabs() {
        if (!this.#tabs) return;
        this.#tabs.setItems([
            { id: GENERAL, label: 'Geral' },
            { id: FRIENDS, label: 'Amigos' },
            ...this.#hashtags.map(tag => ({ id: tag, label: tag })),
        ]);
        this.#tabs.select(this.#selected, { silent: true });
        this.#updateRemove();
    }

    #renderPodium() {
        if (!this.#podium) return;
        this.#podium.innerHTML = this.#top.slice(0, 3).map((row, index) => renderTemplate(podiumItemTemplate, {
            place: index + 1,
            name: row.gladiator,
            mmr: number(row.mmr),
        })).join('');
        this.#podium.hidden = this.#top.length === 0;
    }

    #updateRemove() {
        if (!this.#remove) return;
        const custom = this.#selected !== GENERAL && this.#selected !== FRIENDS;
        this.#remove.hidden = !custom || !profile.user?.premium;
    }

    /**
     * @param {string} id Tab id.
     */
    async #select(id) {
        if (id === this.#selected && (id === GENERAL || id === FRIENDS) && this.#mode === 'page') return;
        this.#selected = id;
        this.#tabs.select(id, { silent: true });
        this.#updateRemove();
        this.#customTag = null;
        if (id === GENERAL) return this.#loadPage({ offset: 0, search: this.#searchTerm });
        if (id === FRIENDS) return this.#loadPage({ offset: 0, scope: 'friends', search: this.#searchTerm });
        this.#customTag = id;
        return this.#loadCustom({ offset: 0, tag: id });
    }

    /**
     * @param {string} value
     */
    async #searchRanking(value) {
        this.#searchTerm = value;
        if (this.#selected !== GENERAL && this.#selected !== FRIENDS) {
            this.#customOffset = 0;
            return this.#loadCustom({ offset: 0, tag: this.#customTag });
        }
        return this.#loadPage({
            offset: 0,
            scope: this.#selected === FRIENDS ? 'friends' : 'all',
            search: value,
        });
    }

    /**
     * Loads a page of the gladiator ranking.
     *
     * @param {{ offset?: number, scope?: 'all'|'friends', search?: string, signal?: AbortSignal,
     *   strict?: boolean }} options
     */
    async #loadPage({ offset = 0, scope = 'all', search = this.#searchTerm, signal = this.#signal, strict = false } = {}) {
        const token = ++this.#request;
        this.#status.textContent = 'Carregando...';
        this.#table.setBusy(true);
        let data;
        try {
            data = await settleRequest(() => ranking.page({ offset, search, scope, signal }), signal);
        }
        catch (error) {
            this.#table.setBusy(false);
            this.#status.textContent = '';
            this.#pager.cancel();
            if (strict) throw error;
            if (!signal?.aborted) writeErrorToast(error);
            return;
        }
        if (!data || signal?.aborted || token !== this.#request) return;

        const total = Number(data.total) || 0;
        if (total <= offset && total > 0) {
            this.#pager.cancel();
            return this.#loadPage({ offset: 0, scope, search, signal, strict });
        }
        this.#mode = 'page';
        this.#customTag = null;
        this.#table.element.hidden = false;
        this.#customHost.hidden = true;
        this.#table.setRows(data.ranking.map(row => ({ ...row, mine: this.#ownIds.has(Number(row.id)) })));
        this.#table.setContext({
            around: null,
            page: Math.floor(offset / PAGE_SIZE) + 1,
            total,
            pageSize: PAGE_SIZE,
            label: scope === 'friends' ? 'Ranking dos amigos' : search ? `Resultados para “${search}”` : 'Ranking geral',
        });
        this.#table.setBusy(false);
        this.#pager.element.hidden = total === 0;
        this.#pager.set({
            page: Math.floor(offset / PAGE_SIZE) + 1,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            total,
            pageSize: PAGE_SIZE,
        });
        this.#status.textContent = '';
        if (scope === 'all' && !search) {
            this.#total = total;
            if (offset === 0) this.#useTop({ total, ranking: data.ranking });
            else this.#header.set({ title: 'Ranking', subtitle: subtitle(this.#total) });
        }
    }

    /**
     * Loads a window centred on a gladiator or a position.
     *
     * @param {{ gladiatorId?: number, position?: number, emit?: boolean, signal?: AbortSignal, strict?: boolean }} options
     */
    async #loadWindow({ gladiatorId, position, emit = false, signal = this.#signal, strict = false } = {}) {
        const token = ++this.#request;
        this.#status.textContent = 'Carregando...';
        this.#table.setBusy(true);
        let window;
        try {
            window = await settleRequest(() => ranking.window({
                gladiatorId,
                position,
                size: WINDOW_SIZE,
                signal,
            }), signal);
        }
        catch (error) {
            this.#table.setBusy(false);
            this.#status.textContent = '';
            this.#pager.cancel();
            if (strict) throw error;
            if (!signal?.aborted) writeErrorToast(error);
            return;
        }
        if (!window || signal?.aborted || token !== this.#request) return;

        this.#mode = 'window';
        this.#selected = GENERAL;
        this.#customTag = null;
        this.#tabs.select(GENERAL, { silent: true });
        this.#remove.hidden = true;
        this.#table.element.hidden = false;
        this.#customHost.hidden = true;
        this.#table.setRows(window.rows.map(row => ({ ...row, mine: this.#ownIds.has(Number(row.id)) })));
        this.#table.setContext({
            around: window.around,
            page: window.page,
            total: window.total,
            pageSize: window.pageSize,
        });
        this.#table.setBusy(false);
        this.#pager.element.hidden = window.total === 0;
        this.#pager.set({
            page: window.page,
            pages: Math.max(1, Math.ceil(window.total / window.pageSize)),
            total: window.total,
            pageSize: window.pageSize,
        });
        this.#status.textContent = '';
        this.#table.reveal(window.position);
        this.#markActiveOwn(window.position);
        this.#total = window.total;
        this.#header.set({ title: 'Ranking', subtitle: subtitle(this.#total) });
        if (emit) {
            events.emit(APP_EVENTS.rankingJumped, {
                gladiatorId: gladiatorId ?? null,
                position: window.position,
            });
        }
    }

    /**
     * @param {{ gladiator: { id: number, name: string }, position: number }} detail
     */
    async #jumpToGladiator({ gladiator }) {
        this.#search.set('');
        this.#searchTerm = '';
        this.#own.setActive(gladiator.id);
        this.#selected = GENERAL;
        this.#tabs.select(GENERAL, { silent: true });
        await this.#loadWindow({ gladiatorId: gladiator.id, emit: true });
    }

    /**
     * @param {number} position
     */
    async #goPosition(position) {
        this.#search.set('');
        this.#searchTerm = '';
        this.#selected = GENERAL;
        this.#tabs.select(GENERAL, { silent: true });
        await this.#loadWindow({ position, emit: true });
    }

    /**
     * @param {number} page
     */
    async #goPage(page) {
        if (this.#selected !== GENERAL && this.#selected !== FRIENDS) {
            this.#customOffset = Math.max(0, (page - 1) * PAGE_SIZE);
            return this.#loadCustom({ offset: this.#customOffset, tag: this.#customTag });
        }
        return this.#loadPage({
            offset: Math.max(0, (page - 1) * PAGE_SIZE),
            scope: this.#selected === FRIENDS ? 'friends' : 'all',
            search: this.#searchTerm,
        });
    }

    /**
     * @param {{ offset?: number, tag: string }} options
     */
    async #loadCustom({ offset = 0, tag }) {
        const token = ++this.#request;
        this.#status.textContent = 'Carregando...';
        this.#pager.cancel();
        let rows;
        try {
            rows = await settleRequest(() => ranking.hashtag({ tab: tag, search: this.#searchTerm, signal: this.#signal }), this.#signal);
        }
        catch (error) {
            this.#status.textContent = '';
            if (!this.#signal?.aborted) writeErrorToast(error);
            return;
        }
        if (!rows || this.#signal?.aborted || token !== this.#request) return;
        this.#mode = 'custom';
        this.#customTag = tag;
        this.#customOffset = Math.min(Math.max(0, offset), Math.max(0, rows.length - 1));
        const total = rows.length;
        const page = Math.floor(this.#customOffset / PAGE_SIZE) + 1;
        const visible = rows.slice(this.#customOffset, this.#customOffset + PAGE_SIZE);
        this.#customHost.innerHTML = renderTemplate(customRankingTemplate);
        const text = this.#customHost.querySelector('.ranking-context-text');
        text.textContent = total
            ? `Ranking da lista ${tag} · posições ${this.#customOffset + 1}–${Math.min(total, this.#customOffset + PAGE_SIZE)} · página ${page} de ${Math.max(1, Math.ceil(total / PAGE_SIZE))}`
            : `Ranking da lista ${tag} · nenhum mestre`;
        const body = this.#customHost.querySelector('tbody');
        body.innerHTML = visible.length
            ? visible.map(row => renderTemplate(customRankingRowTemplate, {
                mine: Number(row.id) === Number(profile.user?.id) ? 'is-mine' : '',
                position: row.position,
                nick: row.nick,
                score: row.score,
                time: Number(row.time).toFixed(1),
            })).join('')
            : '<tr class="ranking-row ranking-empty"><td colspan="4">Nenhum mestre nesta lista.</td></tr>';
        this.#customHost.hidden = false;
        this.#table.element.hidden = true;
        this.#status.textContent = '';
        this.#pager.element.hidden = total === 0;
        this.#pager.set({
            page,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            total,
            pageSize: PAGE_SIZE,
        });
        this.#updateRemove();
    }

    async #addTab() {
        if (!profile.user?.premium) {
            showTutorPitch();
            return;
        }
        if (Number(profile.user.credits) <= 0) {
            showNoCredit();
            return;
        }
        const value = await showInput('Nome da lista que deseja criar', '');
        if (!value) return;
        const name = value.trim().toLowerCase().replace(/^#/, '');
        if (!TAG.test(name)) {
            createToast('A lista deve conter somente letras, números e underline', 'error');
            return;
        }
        try {
            await ranking.watch(name, true);
            if (!this.#hashtags.includes(name)) this.#hashtags.push(name);
            this.#hashtags.sort();
            this.#renderTabs();
            this.#selected = name;
            this.#renderTabs();
            createToast(`Lista ${name} criada`, 'success');
            await this.#loadCustom({ offset: 0, tag: name });
        }
        catch (error) {
            if (error.code === 'TUTOR_ONLY') {
                profile.user.premium = false;
                createToast('Esta função só pode ser usada por contas de instituições de ensino', 'error');
            }
            else if (error.code === 'NO_CREDITS') {
                profile.user.credits = 0;
                createToast('Você não possui créditos para usar esta função', 'error');
            }
            else writeErrorToast(error);
        }
    }

    async #removeTab() {
        if (this.#selected === GENERAL || this.#selected === FRIENDS) return;
        const name = this.#selected;
        const answer = await showDialog(`Remover a lista <span class="highlight">${name}</span>?`, ['Remover', 'Cancelar']);
        if (answer !== 'Remover') return;
        try {
            await ranking.watch(name, false);
            this.#hashtags = this.#hashtags.filter(tag => tag !== name);
            this.#selected = GENERAL;
            this.#renderTabs();
            createToast(`Lista ${name} removida`, 'success');
            await this.#loadPage({ offset: 0 });
        }
        catch (error) {
            writeErrorToast(error);
        }
    }

    /**
     * Rings the own chip whose gladiator is at the window's position, when there is one.
     *
     * @param {number} position
     */
    #markActiveOwn(position) {
        const own = this.#mine.find(gladiator => gladiator.state === 'ranked' && Number(gladiator.position) === Number(position));
        this.#own.setActive(own ? own.id : null);
    }
}

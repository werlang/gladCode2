import { Message } from '../components/dialog.js';
import { decorateRadios } from '../components/form-controls.js';
import { formatMessageTime } from '../helpers/date-format.js';
import { renderTemplate } from '../helpers/html.js';
import { DuelModel, ReportModel } from '../models/social.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import {
    battleRowTemplate,
    battlesEmptyRowTemplate,
    battlesHeadTemplate,
    battlesPlaceholderTemplate,
    cancelDuelTemplate,
    duelRowTemplate,
    duelsEmptyRowTemplate,
    duelsHeadTemplate,
    duelsPlaceholderTemplate,
    favoriteRowTemplate,
    favoritesEmptyRowTemplate,
    favoritesHeadTemplate,
    favoritesPlaceholderTemplate,
    noRowsTemplate,
    playbackTemplate,
} from '../templates/profile-reports.js';

const PAGE_SIZE = 10;

/** The report tabs, in the order of the tab buttons. */
const TABS = ['battles', 'duels', 'favorites'];

/**
 * How each report tab loads and draws its rows.
 */
const VIEWS = {
    battles: {
        head: battlesHeadTemplate,
        placeholder: battlesPlaceholderTemplate,
        emptyRow: battlesEmptyRowTemplate,
        empty: { icon: 'scroll', title: 'Nenhuma batalha para mostrar', summary: '' },
        load: ({ offset, unread }) => ReportModel.battles({ offset, unreadOnly: unread }),
        rows: data => data.reports,
    },
    favorites: {
        head: favoritesHeadTemplate,
        placeholder: favoritesPlaceholderTemplate,
        emptyRow: favoritesEmptyRowTemplate,
        empty: {
            icon: 'star',
            title: 'Nenhuma batalha favorita',
            summary: 'Selecione suas batalhas favoritas para aparecer nesta tabela. Assim você também as protege de serem apagadas quando ficarem muito antigas',
        },
        load: ({ offset }) => ReportModel.favorites({ offset }),
        rows: data => data.reports,
    },
    duels: {
        head: duelsHeadTemplate,
        placeholder: duelsPlaceholderTemplate,
        emptyRow: duelsEmptyRowTemplate,
        empty: { icon: 'shield-halved', title: 'Você ainda não possui duelos', summary: '' },
        load: ({ offset }) => DuelModel.reports({ offset }),
        rows: data => data.duels,
    },
};

/**
 * The time cells shared by every report row.
 *
 * @param {string} time Timestamp.
 * @returns {{ date: string, elapsed: string }}
 */
function timeCells(time) {
    return { date: formatMessageTime(time), elapsed: formatMessageTime(time, { short: true }) };
}

/**
 * The RELATÓRIOS tab: ranked battle reports, duels and favourite battles.
 */
export class ReportsTab {
    #panel = document.querySelector('#report-container');
    #table = this.#panel.querySelector('#bhist-container .table');
    #unread = this.#panel.querySelector('#unread');
    #offsets = { battles: 0, duels: 0, favorites: 0 };
    #totals = { battles: 0, duels: 0, favorites: 0 };
    #selected = 'battles';
    #request = 0;

    /** Binds the tabs, pages and the unread filter. */
    init() {
        decorateRadios(this.#panel);
        this.#panel.querySelectorAll('#tab-container .tab').forEach((tab, index) => {
            tab.addEventListener('click', () => this.#select(TABS[index]));
        });
        this.#panel.querySelector('#prev').addEventListener('click', () => this.#page(-1));
        this.#panel.querySelector('#next').addEventListener('click', () => this.#page(1));
        this.#unread.querySelector('input').addEventListener('change', () => {
            if (this.#selected === 'battles') this.fetch({ offset: this.#onlyUnread() ? 0 : this.#offsets.battles });
        });
    }

    /** Opens the tab on the selected report. */
    show() {
        this.fetch({ offset: this.#offsets[this.#selected], placeholder: true });
    }

    /** @returns {boolean} Whether only unread battles are asked for. */
    #onlyUnread() {
        return this.#unread.querySelector('input').checked;
    }

    /** @param {string} id Tab id. */
    #select(id) {
        const same = id === this.#selected;
        this.#selected = id;
        this.#panel.querySelectorAll('#tab-container .tab').forEach((tab, index) => {
            tab.classList.toggle('selected', TABS[index] === id);
        });
        this.fetch({ offset: this.#offsets[id], placeholder: !same });
    }

    /** @param {number} direction -1 for the previous page, 1 for the next. */
    #page(direction) {
        this.fetch({ offset: this.#offsets[this.#selected] + direction * PAGE_SIZE });
    }

    /**
     * Loads a page of the selected report.
     *
     * @param {{ offset?: number, placeholder?: boolean }} options
     */
    async fetch({ offset = 0, placeholder = false }) {
        const id = this.#selected;
        const view = VIEWS[id];
        const request = ++this.#request;
        this.#offsets[id] = offset;
        this.#unread.style.display = id === 'battles' ? '' : 'none';

        if (placeholder) this.#table.innerHTML = view.head + view.placeholder.repeat(PAGE_SIZE);
        this.#panel.querySelectorAll('.page-nav button').forEach(button => {
            button.disabled = true;
        });

        const data = await view.load({ offset, unread: this.#onlyUnread() });
        if (request !== this.#request) return;

        const total = parseInt(data.total, 10);
        this.#totals[id] = total;
        if (total <= offset && total > 0) {
            this.fetch({ offset: 0 });
            return;
        }

        const rows = view.rows(data) ?? [];
        this.#table.innerHTML = view.head;
        if (total === 0) {
            const emptyState = renderTemplate(emptyStateTemplate, { variantClass: 'compact', actionHtml: '', ...view.empty });
            this.#table.insertAdjacentHTML('beforeend', renderTemplate(noRowsTemplate, { emptyState }));
        }
        else {
            rows.forEach(row => this.#table.append(this.#row(id, row)));
        }

        const nav = this.#panel.querySelector('.page-nav');
        if (nav) nav.hidden = total === 0;
        const counters = this.#panel.querySelectorAll('.page-nav span');
        counters[0].textContent = total === 0 ? 0 : offset + 1;
        counters[1].textContent = Math.min(offset + PAGE_SIZE, total);
        counters[2].textContent = total;
        this.#panel.querySelector('#prev').disabled = offset <= 0;
        this.#panel.querySelector('#next').disabled = offset + PAGE_SIZE >= total;
    }

    /**
     * @param {string} id Tab id.
     * @param {Record<string, any>} row Report row.
     * @returns {HTMLElement}
     */
    #row(id, row) {
        const template = document.createElement('template');
        if (id === 'battles') template.innerHTML = this.#battleRow(row);
        else if (id === 'favorites') template.innerHTML = this.#favoriteRow(row);
        else template.innerHTML = this.#duelRow(row);
        const element = template.content.firstElementChild;

        if (id === 'battles') {
            element.querySelector('.favorite').addEventListener('click', event => this.#toggleFavorite(event.currentTarget, row.id));
        }
        else if (id === 'favorites') {
            element.querySelector('.favorite').addEventListener('click', () => this.#askUnfavorite(element, row.id));
        }
        else {
            element.querySelector('.remove')?.addEventListener('click', async () => {
                await DuelModel.remove(row.id);
                new Message({ message: 'Desafio cancelado' }).show();
                this.fetch({ offset: this.#offsets.duels });
            });
        }
        return element;
    }

    /** @param {Record<string, any>} row Battle report. */
    #battleRow(row) {
        const reward = parseFloat(row.reward);
        return renderTemplate(battleRowTemplate, {
            unread: row.read ? '' : 'unread',
            starClass: row.favorite ? 'fas' : 'far',
            starTitle: row.favorite ? 'Tirar dos favoritos' : 'Guardar nos favoritos',
            glad: row.gladiator,
            rewardClass: reward < 0 ? 'red' : reward > 0 ? 'green' : '',
            reward: `${reward > 0 ? '+' : ''}${reward.toFixed(1)}`,
            ...timeCells(row.time),
            playback: row.expired ? '' : renderTemplate(playbackTemplate, { hash: row.hash }),
        });
    }

    /** @param {Record<string, any>} row Favourite battle. */
    #favoriteRow(row) {
        return renderTemplate(favoriteRowTemplate, {
            glad: row.gladiator,
            comment: row.comment,
            ...timeCells(row.time),
            playback: renderTemplate(playbackTemplate, { hash: row.hash }),
        });
    }

    /** @param {Record<string, any>} row Duel. */
    #duelRow(row) {
        let enemy = row.enemy;
        let enemyClass = '';
        let tail = renderTemplate(playbackTemplate, { hash: row.log });
        if (!row.enemy && row.log) {
            enemy = 'Gladiador Esquecido';
            enemyClass = 'forgotten';
        }
        else if (!row.enemy) {
            enemy = '???';
            tail = cancelDuelTemplate;
        }
        return renderTemplate(duelRowTemplate, {
            unread: !row.read || (!row.enemy && !row.log) ? 'unread' : '',
            mine: row.glad || 'Gladiador Esquecido',
            mineClass: row.glad ? '' : 'forgotten',
            enemy,
            enemyClass,
            user: row.user,
            ...timeCells(row.time),
            tail,
        });
    }

    /**
     * Keeps a battle as a favourite (asking for a comment) or stops keeping it.
     *
     * @param {HTMLElement} cell The star cell.
     * @param {number} id Report id.
     */
    #toggleFavorite(cell, id) {
        const star = cell.querySelector('i');
        if (star.classList.contains('fas')) {
            star.classList.replace('fas', 'far');
            cell.title = 'Guardar nos favoritos';
            ReportModel.setFavorite(id, false);
            return;
        }
        new Message({
            message: 'Informe um comentário sobre esta batalha',
            buttons: { ok: 'OK', cancel: 'CANCEL' },
            input: { placeholder: 'Comentário...' },
        }).show().click('ok', ({ input }) => {
            star.classList.replace('far', 'fas');
            cell.title = 'Tirar dos favoritos';
            ReportModel.setFavorite(id, true, input);
        });
    }

    /**
     * @param {HTMLElement} row Favourite row.
     * @param {number} id Report id.
     */
    #askUnfavorite(row, id) {
        new Message({
            message: 'Remover esta batalha dos favoritos?',
            buttons: { yes: 'Sim', no: 'Não' },
        }).show().click('yes', async () => {
            row.remove();
            await ReportModel.setFavorite(id, false);
            this.fetch({ offset: this.#offsets.favorites });
        });
    }
}

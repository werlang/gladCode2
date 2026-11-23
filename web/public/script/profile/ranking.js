import { Message } from '../components/dialog.js';
import { createToast } from '../components/toast.js';
import { escapeHtml, renderTemplate } from '../helpers/html.js';
import { runReadTask, secondaryRequest, settleRequest, writeErrorToast, writeThenRead } from '../helpers/section-request.js';
import { RankModel } from '../models/rank.js';
import { profile } from './session.js';
import { showNoCredit, showTutorPitch } from './tutor.js';
import {
    generalHeadTemplate,
    generalPlaceholderTemplate,
    generalRowTemplate,
    hashtagHeadTemplate,
    hashtagPlaceholderTemplate,
    hashtagRowTemplate,
    tabTemplate,
} from '../templates/profile-ranking.js';

const PAGE_SIZE = 10;
const GENERAL = 'geral';

/**
 * The RANKING tab: the general gladiator ranking and, for tutors, one tab
 * per followed hashtag with the ranking of its trainings.
 */
export class RankingTab {
    #panel = document.querySelector('#ranking-container');
    #table = this.#panel.querySelector('.table');
    #search = this.#panel.querySelector('#search .input');
    /** Page offset and total per tab, by tab id. */
    #pages = { [GENERAL]: { offset: 0, total: 0 } };
    #selected = GENERAL;
    /** Answers to older requests are dropped. */
    #request = 0;
    /** The current navigation signal; user-triggered loads keep using it. */
    #signal = null;
    /** The page holding the user's best gladiator, read once and only for an unfiltered route. */
    #personalOffset = null;

    /** Binds the controls; the route decides the first page and filter. */
    init() {
        this.#panel.querySelector('#tab-general').addEventListener('click', () => runReadTask(() => this.#select(GENERAL), this.#signal));
        this.#panel.querySelector('#add-tab').addEventListener('click', () => this.#askHashtag());
        this.#panel.querySelector('#prev').addEventListener('click', () => runReadTask(() => this.#page(-1), this.#signal));
        this.#panel.querySelector('#next').addEventListener('click', () => runReadTask(() => this.#page(1), this.#signal));
        this.#search.addEventListener('input', () => runReadTask(() => this.fetch({ offset: 0, signal: this.#signal }), this.#signal));
    }

    /**
     * Reads the page holding the signed-in master's best gladiator, once.
     *
     * @param {AbortSignal} [signal]
     * @returns {Promise<number>}
     */
    async #bestOffset(signal) {
        if (this.#personalOffset !== null) return this.#personalOffset;
        const value = await secondaryRequest(() => RankModel.myBestOffset({ signal }), signal);
        if (value === undefined) return 0;
        const offset = Math.floor(value / PAGE_SIZE) * PAGE_SIZE;
        this.#personalOffset = offset;
        return offset;
    }

    /**
     * Opens the tab: applies the route's search term, draws the hashtag tabs and the selected ranking.
     *
     * @param {{ query?: { q?: string } }} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        this.#signal = signal;
        const filtered = route.query?.q !== undefined;
        const token = ++this.#request;
        this.#search.value = filtered ? route.query.q : '';
        const offset = filtered ? 0 : await this.#bestOffset(signal);
        if (signal?.aborted || token !== this.#request) return;
        this.#pages[GENERAL].offset = offset;
        if (filtered && this.#pages[this.#selected]) this.#pages[this.#selected].offset = 0;
        await this.#drawTabs({ signal });
        if (signal?.aborted || token !== this.#request) return;
        return this.fetch({ offset: this.#pages[this.#selected].offset, placeholder: true, signal });
    }

    /** @param {{ signal?: AbortSignal }} [options] */
    async #drawTabs({ signal } = {}) {
        const tags = await secondaryRequest(() => RankModel.tabs({ signal }), signal);
        if (signal?.aborted) return;
        this.#panel.querySelectorAll('#tab-container .tab.user').forEach(tab => tab.remove());
        const add = this.#panel.querySelector('#add-tab');
        if (!tags) {
            if (this.#selected !== GENERAL) this.#selected = GENERAL;
            add.style.display = 'none';
            this.#markSelected();
            return;
        }
        if (!tags.includes(this.#selected) && this.#selected !== GENERAL) this.#selected = GENERAL;

        tags.forEach(tag => {
            this.#pages[tag] ??= { offset: 0, total: 0 };
            add.insertAdjacentHTML('beforebegin', renderTemplate(tabTemplate, { name: tag, selected: '' }));
            const tab = add.previousElementSibling;
            tab.addEventListener('click', () => runReadTask(() => this.#select(tag), this.#signal));
        });
        add.style.display = profile.user.premium ? '' : 'none';
        this.#markSelected();
    }

    /** Highlights the selected tab and gives a tutor's hashtag tab its close button. */
    #markSelected() {
        this.#panel.querySelectorAll('#tab-container .tab').forEach(tab => {
            const id = tab.id === 'tab-general' ? GENERAL : tab.textContent;
            tab.classList.toggle('selected', id === this.#selected);
            tab.querySelector('i.close')?.remove();
            if (profile.user.premium && id === this.#selected && tab.classList.contains('user')) {
                tab.insertAdjacentHTML('beforeend', "<i class='fas fa-times close' role='button' title='Remover aba'></i>");
                tab.querySelector('.close').addEventListener('click', event => {
                    event.stopPropagation();
                    this.#askRemove(id);
                });
            }
        });
    }

    /** @param {string} id Tab id. */
    #select(id) {
        const same = id === this.#selected;
        this.#selected = id;
        this.#markSelected();
        return this.fetch({ offset: this.#pages[id].offset, placeholder: !same, signal: this.#signal });
    }

    /** @param {string} name Hashtag. */
    #askRemove(name) {
        new Message({
            message: `Deseja remover a aba <b>#${escapeHtml(name)}</b>`,
            buttons: { yes: 'SIM', no: 'NÃO' },
        }).show().click('yes', () => writeThenRead(
            async () => {
                await RankModel.unwatch(name);
                createToast(`Aba #${escapeHtml(name)} removida`, 'success');
            },
            () => {
                this.#selected = GENERAL;
                return this.show({}, { signal: this.#signal });
            },
            { signal: this.#signal, onWriteError: writeErrorToast },
        ));
    }

    #askHashtag() {
        if (!profile.user.premium) {
            showTutorPitch();
            return;
        }
        if (parseFloat(profile.user.credits) <= 0) {
            showNoCredit();
            return;
        }

        const box = new Message({
            message: 'Nome da <b>#hashtag</b> que deseja rastrear',
            buttons: { ok: 'OK', cancel: 'CANCELAR' },
            input: { placeholder: 'suahashtag' },
            preventKill: true,
        }).show();
        const field = box.element.querySelector('.input');
        const wrapper = document.createElement('div');
        wrapper.className = 'wrapper';
        field.replaceWith(wrapper);
        wrapper.insertAdjacentHTML('beforeend', '<span><b>#</b></span>');
        wrapper.append(field);
        field.focus();

        box.click('cancel', () => box.kill());
        box.click('ok', ({ input }) => {
            const text = input.toLowerCase();
            const match = text.match(/^#?([a-z0-9_]+)$/);
            if (text === '') {
                box.kill();
            }
            else if (match) {
                box.kill();
                this.#addHashtag(match[1]);
            }
            else {
                createToast('A #hashtag deve conter somente letras, números e underline', 'error');
            }
        });
    }

    /** @param {string} name Hashtag. */
    async #addHashtag(name) {
        await writeThenRead(
            async () => {
                try {
                    await RankModel.watch(name);
                    createToast(`Aba #${escapeHtml(name)} criada`, 'success');
                }
                catch (error) {
                    if (error.code === 'TUTOR_ONLY') {
                        createToast('Esta função só pode ser usada por contas verificadas de instituições de ensino', 'error');
                        profile.user.premium = false;
                    }
                    else if (error.code === 'NO_CREDITS') {
                        createToast('Você não possui créditos para utilizar essa função', 'error');
                        profile.user.credits = 0;
                    }
                    else throw error;
                }
            },
            () => this.#drawTabs({ signal: this.#signal }),
            { signal: this.#signal, onWriteError: writeErrorToast },
        );
    }

    /** @param {number} direction -1 for the previous page, 1 for the next. */
    #page(direction) {
        return this.fetch({ offset: this.#pages[this.#selected].offset + direction * PAGE_SIZE, signal: this.#signal });
    }

    /**
     * Loads a page of the selected ranking.
     *
     * @param {{ offset?: number, placeholder?: boolean, signal?: AbortSignal }} options `placeholder`
     *   shows grey rows while it loads (when switching tabs).
     */
    async fetch({ offset = 0, placeholder = false, signal } = {}) {
        const id = this.#selected;
        const general = id === GENERAL;
        const request = ++this.#request;
        const head = general ? generalHeadTemplate : hashtagHeadTemplate;
        this.#pages[id].offset = offset;

        if (placeholder) {
            this.#table.innerHTML = head + (general ? generalPlaceholderTemplate : hashtagPlaceholderTemplate).repeat(PAGE_SIZE);
        }
        this.#panel.querySelectorAll('.page-nav button').forEach(button => {
            button.disabled = true;
        });

        const search = this.#search.value;
        let data;
        if (general) {
            data = await settleRequest(() => RankModel.general({ offset, search, signal }), signal);
        }
        else {
            const ranking = await settleRequest(() => RankModel.hashtag({ tab: id, search, signal }), signal);
            if (!ranking) return;
            data = { ranking };
        }
        if (!data || signal?.aborted || request !== this.#request) return;

        const total = general ? data.total : data.ranking.length;
        this.#pages[id].total = total;
        if (total < offset) {
            return this.fetch({ offset: 0, signal });
        }

        const list = Array.from({ length: Math.min(PAGE_SIZE, Math.max(0, total - (general ? offset : 0))) }, (_, index) => {
            const row = general ? data.ranking[index] : data.ranking[offset + index];
            if (!row) return '';
            return general ? this.#generalRow(row) : this.#hashtagRow(row);
        }).filter(Boolean);
        this.#table.innerHTML = head + list.join('');

        const counters = this.#panel.querySelectorAll('.page-nav span');
        counters[0].textContent = total === 0 ? 0 : offset + 1;
        counters[1].textContent = Math.min(offset + PAGE_SIZE, total);
        counters[2].textContent = total;
        this.#panel.querySelector('#prev').disabled = offset <= 0;
        this.#panel.querySelector('#next').disabled = offset + PAGE_SIZE >= total;
    }

    /** @param {Record<string, any>} row General ranking row. */
    #generalRow(row) {
        const change = Math.trunc(row.change24h);
        return renderTemplate(generalRowTemplate, {
            mine: profile.user.nickname === row.master ? 'mine' : '',
            position: row.position,
            glad: row.gladiator,
            master: row.master,
            trend: change > 0 ? 'green' : change < 0 ? 'red' : '',
            arrow: change !== 0 ? "<img src='icon/arrow-up-green.png' alt=''>" : '',
            change: Math.abs(change),
            mmr: row.mmr,
        });
    }

    /** @param {Record<string, any>} row Hashtag ranking row. */
    #hashtagRow(row) {
        return renderTemplate(hashtagRowTemplate, {
            mine: profile.user.id === row.id ? 'mine' : '',
            position: row.position,
            nick: row.nick,
            score: row.score,
            time: Number(row.time).toFixed(1),
        });
    }
}

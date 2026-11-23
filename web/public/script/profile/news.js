import { Button } from '../components/button.js';
import { Countdown } from '../components/countdown.js';
import { PageHeader } from '../components/page-header.js';
import { createToast } from '../components/toast.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { formatDayMonth, formatShortMonth } from '../helpers/date-format.js';
import { isAborted, runReadTask, secondaryRequest, settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { icon } from '../templates/icons.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import {
    featuredNewsTemplate,
    newsErrorTemplate,
    newsShellTemplate,
    newsTodoTemplate,
    previousNewsTemplate,
} from '../templates/profile-news.js';
import { NewsModel } from '../models/news.js';
import { TournamentModel } from '../models/tournament.js';
import { notifications } from '../services/notifications.js';

/** Fallback hero when a post has no image of its own. */
const ARENA_IMAGE = '/image/home/arena-3d.jpg';
const ARENA_ALT = 'O coliseu 3D visto de cima durante uma batalha';

/**
 * The Notícias section: the featured post, previous posts, “Aguardando você” and the next
 * tournament. The primary feed is independent of the two secondary asides.
 */
export class NewsTab {
    #root = document.querySelector('#panel #news-container');
    #built = false;
    #header = null;
    #featured = null;
    #previous = null;
    #list = null;
    #more = null;
    #empty = null;
    #error = null;
    #todoList = null;
    #todoCount = null;
    #todoEmpty = null;
    #tournament = null;
    #tournamentName = null;
    #bracket = null;
    #countdown = null;
    #markAll = null;
    #posts = [];
    #nextOffset = 0;
    #hasMore = false;
    #signal = null;
    #route = {};

    /** Builds the section once; show() refreshes its data. */
    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(newsShellTemplate);
        const headerElement = createElement(pageHeaderTemplate);
        this.#root.prepend(headerElement);
        this.#header = new PageHeader({ element: headerElement });
        this.#header.set({
            title: 'Notícias',
            subtitle: 'O que mudou na arena e o que está esperando por você.',
        });
        const action = createElement("<button type='button' class='button secondary' id='news-mark-read'>Marcar tudo como lido</button>");
        this.#header.setActions([action]);
        this.#markAll = new Button({ element: action }).setText('Marcar tudo como lido', 'check').click(() => this.#markAllRead());

        this.#featured = this.#root.querySelector('#news-featured');
        this.#previous = this.#root.querySelector('#news-previous');
        this.#list = this.#root.querySelector('#news-list');
        this.#more = this.#root.querySelector('#news-more');
        this.#empty = this.#root.querySelector('#news-empty');
        this.#error = this.#root.querySelector('#news-error');
        this.#todoList = this.#root.querySelector('#news-todo-list');
        this.#todoCount = this.#root.querySelector('#news-todo-count');
        this.#todoEmpty = this.#root.querySelector('#news-todo-empty');
        this.#tournament = this.#root.querySelector('#news-tournament');
        this.#tournamentName = this.#root.querySelector('#news-tournament-name');
        this.#bracket = this.#root.querySelector('#news-bracket');
        this.#more.addEventListener('click', () => runReadTask(() => this.#loadMore(), this.#signal));
        this.#built = true;
    }

    /**
     * Opens the section.
     *
     * @param {object} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        if (signal?.aborted) return;
        this.#route = route;
        this.#signal = signal;
        this.#stopCountdown();

        let posts;
        try {
            posts = await settleRequest(() => NewsModel.list(0, { markRead: false, signal }), signal);
        }
        catch (error) {
            if (signal?.aborted || isAborted(error)) return;
            this.#build();
            this.#renderError(error, route, signal);
            return;
        }
        if (signal?.aborted) return;
        if (!posts) return;
        this.#build();
        this.#posts = [];
        this.#nextOffset = 0;
        this.#error.hidden = true;
        this.#empty.hidden = true;
        this.#previous.hidden = true;
        this.#featured.innerHTML = "<div class='news-featured-skeleton' aria-hidden='true'></div>";
        this.#root.setAttribute('aria-busy', 'true');
        this.#posts = posts;
        this.#nextOffset = posts.length;
        this.#hasMore = posts.length === 5;
        this.#root.removeAttribute('aria-busy');
        this.#renderPosts();
        await Promise.allSettled([
            this.#loadAside(signal),
            this.#loadTournament(signal),
        ]);
    }

    /** @param {object[]} posts */
    #renderPosts() {
        this.#featured.replaceChildren();
        this.#list.replaceChildren();
        if (!this.#posts.length) {
            this.#empty.hidden = false;
            this.#empty.innerHTML = renderTemplate(emptyStateTemplate, {
                variantClass: 'compact',
                icon: 'news',
                title: 'Nenhuma notícia ainda',
                summary: 'Quando a arena mudar, a novidade aparece aqui.',
                actionHtml: '',
            });
            this.#previous.hidden = true;
            this.#more.hidden = true;
            return;
        }
        this.#empty.hidden = true;
        const [featured, ...previous] = this.#posts;
        this.#featured.innerHTML = renderTemplate(featuredNewsTemplate, {
            image: featured.image || ARENA_IMAGE,
            imageAlt: featured.image ? (featured.imageAlt || featured.title) : ARENA_ALT,
            mediaClass: featured.image ? '' : 'is-fallback',
            ribbon: featured.read ? '' : "<span class='news-ribbon'>NOVA</span>",
            category: featured.category,
            version: `v${featured.version}`,
            date: formatDayMonth(featured.time),
            title: featured.title,
            excerpt: featured.excerpt,
            hash: featured.hash,
        });
        previous.forEach(post => {
            this.#list.insertAdjacentHTML('beforeend', renderTemplate(previousNewsTemplate, {
                hash: post.hash,
                day: new Date(post.time).getDate(),
                month: formatShortMonth(post.time),
                title: post.title,
                excerpt: post.excerpt,
                category: post.category,
                unreadClass: post.read ? '' : 'is-unread',
            }));
        });
        this.#previous.hidden = previous.length === 0;
        this.#more.hidden = !this.#hasMore;
    }

    /** @param {Error} error @param {{}} route @param {AbortSignal} signal */
    #renderError(error, route, signal) {
        this.#root.removeAttribute('aria-busy');
        this.#featured.replaceChildren();
        this.#previous.hidden = true;
        this.#empty.hidden = true;
        this.#error.hidden = false;
        this.#error.innerHTML = renderTemplate(newsErrorTemplate, { message: error?.message || 'Não foi possível carregar as notícias.' });
        const retry = this.#error.querySelector('#news-retry');
        retry.addEventListener('click', () => runReadTask(() => this.show(route, { signal }), signal));
    }

    /** Loads the next page of older posts and appends it. */
    async #loadMore() {
        if (!this.#hasMore) return;
        const posts = await settleRequest(() => NewsModel.list(this.#nextOffset, { markRead: false, signal: this.#signal }), this.#signal);
        if (!posts || this.#signal?.aborted) return;
        this.#nextOffset += posts.length;
        this.#hasMore = posts.length === 5;
        this.#posts.push(...posts);
        this.#renderPosts();
    }

    /** Clears the unread ribbons optimistically and rolls them back on refusal. */
    async #markAllRead() {
        const before = this.#posts.map(post => Boolean(post.read));
        const unread = this.#posts.some(post => !post.read);
        this.#posts = this.#posts.map(post => ({ ...post, read: true }));
        this.#renderPosts();
        try {
            await NewsModel.markAllRead();
            await notifications.refresh().catch(() => {});
            if (unread) createToast('Notícias marcadas como lidas', 'success');
        }
        catch (error) {
            this.#posts = this.#posts.map((post, index) => ({ ...post, read: before[index] }));
            this.#renderPosts();
            writeErrorToast(error);
        }
    }

    /** @param {AbortSignal} signal */
    async #loadAside(signal) {
        if (!this.#todoList) return;
        const feed = await secondaryRequest(() => notifications.feed({ signal }), signal);
        if (signal?.aborted) return;
        const counts = notifications.counts;
        const todo = [];
        for (const need of feed?.needs ?? []) {
            const duel = need.href.includes('/battle');
            todo.push({
                kind: duel ? 'duel' : 'friend',
                text: need.text,
                action: duel ? 'Responder ao desafio' : 'Ver convite',
                href: need.href,
            });
        }
        if (counts?.reports?.ranked) {
            todo.push({
                kind: 'reports',
                text: `${counts.reports.ranked} batalha${counts.reports.ranked === 1 ? '' : 's'} ranqueada${counts.reports.ranked === 1 ? '' : 's'} para assistir.`,
                action: 'Abrir relatórios',
                href: '/reports',
            });
        }
        if (counts?.reports?.duel) {
            todo.push({
                kind: 'reports',
                text: `${counts.reports.duel} duelo${counts.reports.duel === 1 ? '' : 's'} concluído${counts.reports.duel === 1 ? '' : 's'} para ver.`,
                action: 'Abrir relatórios',
                href: '/reports?tab=duels',
            });
        }
        if (counts?.potions?.count) {
            const left = (new Date(counts.potions.nextExpiry) - new Date(counts.potions.serverNow)) / 3600000;
            const hours = Math.max(1, Math.ceil(left));
            todo.push({
                kind: 'potions',
                text: left > 0
                    ? `Suas poções expiram em ${hours} hora${hours === 1 ? '' : 's'}.`
                    : `${counts.potions.count} poç${counts.potions.count === 1 ? 'ão encomendada' : 'ões encomendadas'} no apotecário.`,
                action: 'Ver poções',
                href: '/potion',
            });
        }

        this.#todoCount.textContent = String(todo.length);
        this.#todoList.replaceChildren();
        todo.forEach(item => {
            this.#todoList.insertAdjacentHTML('beforeend', renderTemplate(newsTodoTemplate, {
                kind: item.kind,
                icon: icon(item.kind === 'duel' ? 'battle' : item.kind === 'friend' ? 'friends' : item.kind === 'potions' ? 'potions' : 'reports', { size: 16 }),
                text: item.text,
                action: item.action,
                href: item.href,
            }));
        });
        this.#todoEmpty.hidden = todo.length > 0;
    }

    /** @param {AbortSignal} signal */
    async #loadTournament(signal) {
        const next = await secondaryRequest(() => TournamentModel.next({ signal }), signal);
        if (signal?.aborted) return;
        this.#stopCountdown();
        if (!next) {
            this.#tournament.hidden = true;
            return;
        }
        this.#tournament.hidden = false;
        this.#tournamentName.textContent = `${next.name} · Rodada ${next.round}`;
        this.#bracket.href = `/tourn/${next.hash}/${next.round}`;
        this.#countdown = new Countdown(this.#root.querySelector('#news-countdown'), {
            deadline: next.deadline,
            now: next.now,
            onTick: (left, parts) => {
                const [hours, minutes, seconds] = parts;
                this.#root.querySelector('[data-news-time="hours"]').textContent = hours;
                this.#root.querySelector('[data-news-time="minutes"]').textContent = minutes;
                this.#root.querySelector('[data-news-time="seconds"]').textContent = seconds;
            },
            onEnd: () => { this.#tournament.hidden = true; },
        });
        this.#countdown.start();
    }

    #stopCountdown() {
        this.#countdown?.stop();
        this.#countdown = null;
    }

    /** Stops the countdown when the shell leaves the section. */
    unmount() {
        this.#stopCountdown();
    }
}

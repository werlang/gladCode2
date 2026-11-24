import { Button } from '../components/button.js';
import { Countdown } from '../components/countdown.js';
import { PageHeader } from '../components/page-header.js';
import { createToast } from '../components/toast.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { formatDayMonth, formatShortMonth } from '../helpers/date-format.js';
import { NewsPager } from '../helpers/news-pager.js';
import { postIsRead } from '../helpers/news-read.js';
import { potionTimeLeft } from '../helpers/potion-time.js';
import { isAborted, runReadTask, secondaryRequest, settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { icon } from '../templates/icons.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import {
    featuredNewsTemplate,
    newsErrorTemplate,
    newsShellTemplate,
    newsTodoTemplate,
    newsVersionTemplate,
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
    #pager = new NewsPager();
    #readAt = null;
    #optimisticRead = false;
    #loaded = false;
    #marking = false;
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
        this.#setMarkAllEnabled(false);

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
        this.#build();
        this.#stopCountdown();

        // Build and mark the section busy before the first await, so the header and skeleton can
        // paint while the API answers. The late response is still dropped when navigation left.
        this.#posts = [];
        this.#pager = new NewsPager();
        this.#loaded = false;
        this.#setMarkAllEnabled(false);
        this.#error.hidden = true;
        this.#empty.hidden = true;
        this.#previous.hidden = true;
        this.#more.disabled = false;
        this.#featured.innerHTML = "<div class='news-featured-skeleton' aria-hidden='true'></div>";
        this.#root.setAttribute('aria-busy', 'true');

        let posts;
        try {
            posts = await settleRequest(() => NewsModel.list(0, { markRead: false, signal }), signal);
        }
        catch (error) {
            if (signal?.aborted || isAborted(error)) return;
            this.#renderError(error, route, signal);
            return;
        }
        if (signal?.aborted || !posts) return;
        this.#posts = posts;
        this.#pager.reset(posts.length);
        this.#loaded = true;
        this.#setMarkAllEnabled(true);
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
        const featuredRead = postIsRead(featured, this.#readAt, this.#optimisticRead);
        this.#featured.innerHTML = renderTemplate(featuredNewsTemplate, {
            image: featured.image || ARENA_IMAGE,
            imageAlt: featured.image ? (featured.imageAlt || featured.title) : ARENA_ALT,
            mediaClass: featured.image ? '' : 'is-fallback',
            ribbon: featuredRead ? '' : "<span class='news-ribbon'>NOVA</span>",
            category: featured.category,
            versionHtml: featured.version ? renderTemplate(newsVersionTemplate, { version: featured.version }) : '',
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
                unreadClass: postIsRead(post, this.#readAt, this.#optimisticRead) ? '' : 'is-unread',
            }));
        });
        this.#previous.hidden = previous.length === 0;
        this.#more.hidden = !this.#pager.hasMore;
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
        const pager = this.#pager;
        this.#more.disabled = true;
        try {
            const posts = await pager.next(offset => settleRequest(
                () => NewsModel.list(offset, { markRead: false, signal: this.#signal }),
                this.#signal,
            ));
            // A new navigation has its own pager; a late page must not land in it.
            if (this.#pager !== pager || !posts || this.#signal?.aborted) return;
            this.#posts.push(...posts);
            this.#renderPosts();
        }
        finally {
            if (this.#pager === pager) this.#more.disabled = false;
        }
    }

    /** Enables the mark-all action only once the first page is on screen. */
    #setMarkAllEnabled(on) {
        if (!this.#markAll) return;
        this.#markAll.element.disabled = !on;
        this.#markAll.element.setAttribute('aria-disabled', String(!on));
    }

    /**
     * Clears the unread ribbons optimistically and rolls them back on refusal. The server marker is
     * kept, so a feed read that started before this write cannot bring the NOVA ribbons back.
     */
    async #markAllRead() {
        if (!this.#loaded || this.#marking) return;
        this.#marking = true;
        this.#optimisticRead = true;
        this.#renderPosts();
        try {
            const answer = await NewsModel.markAllRead();
            this.#readAt = answer.readAt ?? null;
            this.#optimisticRead = false;
            this.#renderPosts();
            await notifications.refresh().catch(() => {});
            createToast('Notícias marcadas como lidas', 'success');
        }
        catch (error) {
            this.#optimisticRead = false;
            this.#renderPosts();
            writeErrorToast(error);
        }
        finally {
            this.#marking = false;
        }
    }

    /** @param {AbortSignal} signal */
    async #loadAside(signal) {
        if (!this.#todoList) return;
        const feed = await secondaryRequest(() => notifications.feed({ signal }), signal);
        if (signal?.aborted) return;
        const counts = notifications.counts;
        const todo = [];
        const friendRequests = [];
        for (const need of feed?.needs ?? []) {
            const duel = need.href.includes('/battle');
            const row = {
                kind: duel ? 'duel' : 'friend',
                text: need.text,
                action: duel ? 'Responder ao desafio' : 'Ver convite',
                href: need.href,
            };
            (duel ? todo : friendRequests).push(row);
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
            const left = potionTimeLeft(counts.potions);
            todo.push({
                kind: 'potions',
                text: left && left.hours > 0
                    ? `Suas poções expiram em ${left.hours} hora${left.hours === 1 ? '' : 's'}.`
                    : left && left.minutes > 0
                        ? `Suas poções expiram em ${left.minutes} minuto${left.minutes === 1 ? '' : 's'}.`
                        : `${counts.potions.count} poç${counts.potions.count === 1 ? 'ão encomendada' : 'ões encomendadas'} no apotecário.`,
                action: 'Ver poções',
                href: '/potion',
            });
        }

        todo.push(...friendRequests);
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

import { showDialog } from '../components/dialog.js';
import { Avatar } from '../components/avatar.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { createToast } from '../components/toast.js';
import { InviteBanner } from '../components/invite-banner.js';
import { FriendRow } from '../components/friend-row.js';
import { PageHeader } from '../components/page-header.js';
import { SearchField } from '../components/search-field.js';
import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { secondaryRequest, settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { FriendModel } from '../models/social.js';
import { friends } from '../services/friends.js';
import { friendsShellTemplate, friendSearchRowTemplate } from '../templates/friends.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import { challengeFriend } from './duels.js';

/**
 * The AMIGOS section: pending invites, the friends list with online/best gladiator and the master
 * search. Friend rows are keyed by the friendship id; actions use the other master's user id.
 */
export class FriendsTab {
    #root = document.querySelector('#friends-container');
    #built = false;
    #header = null;
    #invites = null;
    #list = null;
    #friendsCount = null;
    #online = null;
    #empty = null;
    #search = null;
    #results = null;
    #searchEmpty = null;
    #signal = null;
    #searchToken = 0;
    #confirmed = [];

    /** Builds the section. */
    init() {
        this.#build();
    }

    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(friendsShellTemplate);
        const header = createElement(pageHeaderTemplate);
        this.#root.querySelector('#friends-header').append(header);
        this.#header = new PageHeader({ element: header });
        this.#header.set({ title: 'Amigos', subtitle: 'Mestres com quem você troca mensagens e duelos.' });

        this.#invites = this.#root.querySelector('#friends-invites');
        this.#list = this.#root.querySelector('#friends-list');
        this.#friendsCount = this.#root.querySelector('#friends-count');
        this.#online = this.#root.querySelector('#friends-online');
        this.#empty = this.#root.querySelector('#friends-empty');

        this.#search = new SearchField({
            variant: 'dark',
            label: 'Apelido do mestre',
            placeholder: 'Apelido do mestre',
        });
        this.#root.querySelector('#friends-search-field').append(this.#search.element);
        this.#search.listen('search', ({ value }) => this.#run(() => this.#searchMasters(value)));
        this.#results = this.#root.querySelector('#friends-search-results');
        this.#searchEmpty = this.#root.querySelector('#friends-search-empty');
        this.#built = true;
    }

    /**
     * @param {object} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        this.#build();
        this.#signal = signal;
        this.#search.set('');
        this.#searchMasters('', { signal });
        return this.#load({ signal });
    }

    /** @param {{ signal?: AbortSignal }} [options] */
    async #load({ signal = this.#signal } = {}) {
        const data = await settleRequest(() => friends.load({ signal }), signal);
        if (!data || signal?.aborted) return;
        this.#confirmed = data.confirmed ?? [];
        this.#renderInvites(data.pending ?? []);
        this.#renderFriends();
    }

    /** @param {object[]} pending */
    #renderInvites(pending) {
        this.#invites.replaceChildren();
        for (const request of pending) {
            const banner = new InviteBanner();
            const detail = request.mutual
                ? `Mestre nível ${request.level} · ${request.mutual} ${request.mutual === 1 ? 'amigo em comum' : 'amigos em comum'}`
                : `Mestre nível ${request.level}`;
            banner.set({
                picture: request.picture,
                name: request.nick,
                message: `${request.nick} quer ser seu amigo`,
                detail,
                label: 'Convite de amizade',
            });
            banner.listen('accept', () => this.#run(() => this.#answer(banner, request, true)));
            banner.listen('refuse', () => this.#run(() => this.#answer(banner, request, false)));
            this.#invites.append(banner.element);
        }
    }

    #renderFriends() {
        this.#list.replaceChildren();
        this.#friendsCount.textContent = `· ${this.#confirmed.length}`;
        const online = this.#confirmed.filter(friend => friend.online).length;
        this.#root.querySelector('.friends-online-text').textContent = online ? `${online} online agora` : 'Ninguém online';
        this.#online.classList.toggle('is-online', online > 0);
        this.#empty.hidden = this.#confirmed.length > 0;
        for (const friend of this.#confirmed) {
            const row = new FriendRow({ friend });
            row.listen('message', () => events.emit(APP_EVENTS.messagesOpened, { userId: friend.user }));
            row.listen('challenge', () => this.#run(() => this.#challenge(friend)));
            row.listen('more', () => this.#run(() => this.#more(friend)));
            this.#list.append(row.element);
        }
    }

    /**
     * @param {InviteBanner} banner
     * @param {object} request
     * @param {boolean} accepted
     */
    async #answer(banner, request, accepted) {
        banner.setBusy(true);
        try {
            await friends.answer(request.id, accepted);
            banner.clear();
            createToast(accepted ? `Agora você e ${escapeHtml(request.nick)} são amigos` : 'Convite recusado', accepted ? 'success' : 'info');
            await this.#load();
        }
        catch (error) {
            banner.setBusy(false);
            writeErrorToast(error);
        }
    }

    /** @param {object} friend */
    #challenge(friend) {
        challengeFriend(friend.nick, friend.user);
    }

    /** @param {object} friend */
    async #more(friend) {
        const answer = await showDialog(
            `Desfazer a amizade com <span class="highlight">${escapeHtml(friend.nick)}</span>?`,
            ['Desfazer', 'Cancelar'],
        );
        if (answer !== 'Desfazer') return;
        try {
            await FriendModel.remove(friend.id);
            this.#confirmed = this.#confirmed.filter(item => item.id !== friend.id);
            this.#renderFriends();
            createToast('Amizade desfeita', 'success');
        }
        catch (error) {
            writeErrorToast(error);
        }
    }

    /**
     * @param {string} text
     * @param {{ signal?: AbortSignal }} [options]
     */
    async #searchMasters(text, { signal = this.#signal } = {}) {
        const token = ++this.#searchToken;
        if (!text.trim()) {
            this.#results.replaceChildren();
            this.#searchEmpty.hidden = false;
            this.#searchEmpty.textContent = 'Digite um apelido para encontrar mestres.';
            return;
        }
        const users = await secondaryRequest(() => FriendModel.search(text, { signal }), signal);
        if (signal?.aborted || token !== this.#searchToken) return;
        this.#results.replaceChildren();
        this.#searchEmpty.hidden = (users?.length ?? 0) > 0;
        this.#searchEmpty.textContent = 'Nenhum mestre encontrado.';
        for (const user of users ?? []) {
            const row = createElement(renderTemplate(friendSearchRowTemplate, {
                level: user.level ?? 0,
                action: this.#actionLabel(user.state),
            }));
            const avatar = new Avatar({ size: 'sm', name: user.nick, picture: user.picture });
            row.querySelector('.friend-search-avatar').append(avatar.element);
            row.querySelector('.friend-search-name').textContent = user.nick;
            const action = row.querySelector('.friend-search-action');
            if (user.state === 'none') {
                action.classList.add('button', 'primary', 'small');
                action.addEventListener('click', () => this.#run(() => this.#add(user, action)));
            }
            else {
                action.className = 'friend-search-state';
                action.disabled = true;
            }
            this.#results.append(row);
        }
    }

    /** @param {string} state @returns {string} */
    #actionLabel(state) {
        return state === 'sent' ? 'Convite enviado' : state === 'friends' ? 'Amigos' : state === 'incoming' ? 'Convite recebido' : 'Adicionar';
    }

    /**
     * @param {object} user
     * @param {HTMLButtonElement} button
     */
    async #add(user, button) {
        button.disabled = true;
        try {
            await friends.request(user.user);
            button.textContent = 'Convite enviado';
            button.className = 'friend-search-state';
            createToast(`Convite enviado para ${escapeHtml(user.nick)}`, 'success');
        }
        catch (error) {
            button.disabled = false;
            if (error.code === 'FRIENDSHIP_EXISTS') {
                button.textContent = 'Convite enviado';
                button.className = 'friend-search-state';
            }
            else writeErrorToast(error);
        }
    }

    /** @param {() => Promise<unknown>} task */
    async #run(task) {
        try {
            await task();
        }
        catch (error) {
            if (!this.#signal?.aborted) writeErrorToast(error);
        }
    }
}

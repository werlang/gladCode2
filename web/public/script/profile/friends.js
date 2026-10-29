import { showDialog, showMessage, showTextArea } from '../components/dialog.js';
import { elapsedString } from '../helpers/date-format.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { FriendModel, MessageModel } from '../models/social.js';
import { challengeFriend } from './duels.js';
import { friendRowTemplate, requestRowTemplate, searchRowTemplate } from '../templates/profile.js';

/** Longest private message, in characters (the API refuses longer ones). */
const MAX_MESSAGE = 1000;

/**
 * Writes a private message to a user (the API e-mails them about it).
 *
 * @param {number} user User id.
 * @param {string} nick Nickname.
 */
export async function writeMessage(user, nick) {
    const message = await showTextArea(`Mensagem para <span class='highlight'>${escapeHtml(nick)}</span>:`, 'Olá...', MAX_MESSAGE);
    if (!message) return;
    try {
        await MessageModel.send(user, message);
    }
    catch (error) {
        if (error.code !== 'MESSAGE_TOO_LONG') throw error;
        showMessage('A mensagem é longa demais. Encurte o texto e tente novamente.');
        return;
    }
    showMessage('Mensagem enviada');
}

/**
 * The AMIGOS tab: friend requests, friends with their actions (message,
 * duel, unfriend) and the user search.
 */
export class FriendsTab {
    #panel = document.querySelector('#friend-panel');
    #options = this.#panel.querySelector('#friends .options');
    /** Friend of the row whose options menu is open. */
    #current = null;

    /** Binds the options menu and the search. */
    init() {
        this.#panel.querySelector('#request').classList.add('hidden');
        this.#panel.querySelector('#friends').classList.add('hidden');

        document.addEventListener('click', () => {
            if (this.#options.classList.contains('open')) this.#closeOptions();
        });
        this.#options.querySelector('.unfriend').addEventListener('click', () => this.#askUnfriend());
        this.#options.querySelector('.message').addEventListener('click', () => {
            if (this.#current) writeMessage(this.#current.friend.user, this.#current.friend.nick);
        });
        this.#options.querySelector('.duel').addEventListener('click', () => {
            if (this.#current) challengeFriend(this.#current.friend.nick, this.#current.friend.user);
        });

        const search = this.#panel.querySelector('#search .input');
        search.addEventListener('input', () => this.#search(search.value));
    }

    /** Lists the requests and the friends. */
    async show() {
        const data = await FriendModel.list();
        this.#panel.querySelector('#request').classList.toggle('hidden', !data.pending.length);
        this.#panel.querySelector('#friends').classList.toggle('hidden', !data.confirmed.length);

        const requests = this.#panel.querySelector('#request .table');
        requests.replaceChildren();
        data.pending.forEach(request => {
            const row = createElement(renderTemplate(requestRowTemplate, {
                level: request.level,
                picture: request.picture,
                nick: request.nick,
            }));
            row.querySelector('.check').addEventListener('click', () => this.#answer(request.id, true));
            row.querySelector('.close').addEventListener('click', () => this.#answer(request.id, false));
            requests.append(row);
        });

        const friends = this.#panel.querySelector('#friends .table');
        friends.replaceChildren();
        data.confirmed.forEach(friend => {
            const row = createElement(renderTemplate(friendRowTemplate, {
                level: friend.level,
                picture: friend.picture,
                nick: friend.nick,
                active: elapsedString(friend.idleMinutes),
            }));
            row.querySelector('.button-open').addEventListener('click', event => {
                event.stopPropagation();
                this.#openOptions(event.currentTarget, row, friend);
            });
            friends.append(row);
        });
    }

    /**
     * @param {number} id Request id.
     * @param {boolean} accept Accept it.
     */
    async #answer(id, accept) {
        await FriendModel.answer(id, accept);
        this.show();
    }

    /**
     * Unrolls the options menu beside a friend's button.
     *
     * @param {HTMLElement} button The row's options button.
     * @param {HTMLElement} row Friend row.
     * @param {Record<string, any>} friend Friend.
     */
    #openOptions(button, row, friend) {
        this.#closeOptions();
        button.classList.add('open');
        this.#current = { row, friend };
        const menu = this.#options;
        menu.style.top = `${button.offsetTop}px`;
        menu.style.display = 'block';
        menu.style.left = `${button.offsetLeft - menu.offsetWidth + button.offsetWidth}px`;
        menu.animate?.([{ transform: 'scale(0)', transformOrigin: 'top right' }, { transform: 'scale(1)', transformOrigin: 'top right' }], 300);
        menu.classList.add('open');
    }

    #closeOptions() {
        this.#panel.querySelectorAll('#friends .button-open.open').forEach(button => button.classList.remove('open'));
        this.#options.classList.remove('open');
        this.#options.removeAttribute('style');
    }

    async #askUnfriend() {
        if (!this.#current) return;
        const { row, friend } = this.#current;
        const answer = await showDialog(`Deseja remover <span class='highlight'>${escapeHtml(friend.nick)}</span> da sua lista de amigos?`, ['Sim', 'Não']);
        if (answer !== 'Sim') return;
        await FriendModel.remove(friend.id);
        row.remove();
    }

    /** @param {string} text Nickname search. */
    async #search(text) {
        const users = await FriendModel.search(text);
        const table = this.#panel.querySelector('#search .table');
        table.replaceChildren();
        (Array.isArray(users) ? users : []).forEach(user => {
            const row = createElement(renderTemplate(searchRowTemplate, { nick: user.nick }));
            row.querySelector('.send-message').addEventListener('click', () => writeMessage(user.user, user.nick));
            row.querySelector('.add-friend').addEventListener('click', () => this.#invite(user));
            table.append(row);
        });
    }

    /** @param {{ user: number, nick: string }} user User to invite (the API e-mails them). */
    async #invite(user) {
        const nick = escapeHtml(user.nick);
        try {
            await FriendModel.add(user.user);
        }
        catch (error) {
            if (error.code !== 'FRIENDSHIP_EXISTS') throw error;
            showMessage(`O usuário <span class='highlight'>${nick}</span> já está em sua lista de amigos`);
            return;
        }
        showMessage(`Convite enviado para <span class='highlight'>${nick}</span>`);
    }
}

import { Message, showDialog } from '../components/dialog.js';
import { Avatar } from '../components/avatar.js';
import { Composer } from '../components/composer.js';
import { ConversationList } from '../components/conversation-list.js';
import { MessageThread } from '../components/message-thread.js';
import { PageHeader } from '../components/page-header.js';
import { SearchField } from '../components/search-field.js';
import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { isAborted, secondaryRequest, settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { FriendModel } from '../models/social.js';
import { messages } from '../services/messages.js';
import { icon } from '../templates/icons.js';
import { newMessageRowTemplate, newMessagePickerTemplate, messagesShellTemplate } from '../templates/messages.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import { challengeFriend } from './duels.js';

/**
 * The MENSAGENS section: the conversation list, the open thread and the composer. Conversations are
 * keyed by the other master's user id.
 */
export class MessagesTab {
    #root = document.querySelector('#messages-container');
    #built = false;
    #header = null;
    #list = null;
    #thread = null;
    #composer = null;
    #newButton = null;
    #shell = null;
    #current = null;
    #signal = null;
    #request = 0;
    #sending = false;

    /** Builds the section shell. */
    init() {
        this.#build();
    }

    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(messagesShellTemplate);
        const header = createElement(pageHeaderTemplate);
        this.#root.querySelector('#messages-header').append(header);
        this.#header = new PageHeader({ element: header });
        this.#header.set({ title: 'Mensagens', subtitle: 'Conversas privadas com outros mestres.' });
        this.#newButton = document.createElement('button');
        this.#newButton.type = 'button';
        this.#newButton.className = 'button primary';
        this.#newButton.innerHTML = `${icon('messages', { size: 16, className: 'icon' })}<span>Nova mensagem</span>`;
        this.#newButton.addEventListener('click', () => this.#run(() => this.#newMessage()));
        this.#header.setActions([this.#newButton]);

        this.#shell = this.#root.querySelector('#messages-shell');
        this.#list = new ConversationList();
        this.#root.querySelector('#messages-list-pane').append(this.#list.element);
        this.#list.listen('select', ({ userId }) => this.#run(() => this.#open(userId)));

        this.#thread = new MessageThread();
        this.#root.querySelector('#messages-thread-pane').append(this.#thread.element);
        this.#thread.listen('back', () => this.#run(() => this.#closeThread()));
        this.#thread.listen('challenge', ({ user }) => this.#run(() => this.#challenge(user)));
        this.#thread.listen('more', ({ user }) => this.#run(() => this.#more(user)));

        this.#composer = new Composer();
        this.#root.querySelector('#messages-thread-pane').append(this.#composer.element);
        this.#composer.listen('send', ({ text }) => this.#run(() => this.#send(text)));
        this.#built = true;
    }

    /**
     * @param {{ query?: { userId?: number } }} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        this.#build();
        this.#signal = signal;
        const token = ++this.#request;
        const conversations = await settleRequest(() => messages.list({ signal }), signal);
        if (!conversations || signal?.aborted || token !== this.#request) return;
        this.#list.setConversations(conversations);
        const requested = Number(route.query?.userId) || null;
        if (requested) return this.#open(requested, { push: false, signal });
        if (!this.#isPhone() && conversations.length) {
            return this.#open(Number(conversations[0].user?.id), { push: false, signal });
        }
        this.#closeThread({ push: false });
    }

    /** @returns {boolean} */
    #isPhone() {
        return Boolean(globalThis.matchMedia?.('(max-width: 700px)').matches);
    }

    /**
     * Opens a conversation.
     *
     * @param {number} userId
     * @param {{ push?: boolean, signal?: AbortSignal }} [options]
     */
    async #open(userId, { push = true, signal = this.#signal } = {}) {
        const token = ++this.#request;
        this.#thread.setBusy(true);
        let data;
        try {
            data = await settleRequest(() => messages.open(userId, { signal }), signal);
        }
        catch (error) {
            this.#thread.setBusy(false);
            if (!isAborted(error) && !signal?.aborted) writeErrorToast(error);
            return;
        }
        if (!data || signal?.aborted || token !== this.#request) return;
        this.#current = data.user;
        if (!this.#list.has(data.user.id)) this.#list.upsert({ user: data.user, last: null, unread: 0 });
        this.#thread.setConversation(data);
        this.#thread.setBusy(false);
        this.#list.select(userId, { silent: true });
        this.#composer.setPlaceholder(`Escreva para ${data.user.nick}`);
        this.#composer.clear();
        this.#composer.element.hidden = false;
        this.#shell.classList.add('is-thread');
        if (push) events.emit(APP_EVENTS.messagesOpened, { userId: Number(userId) });
        try {
            const read = await messages.markRead(userId);
            this.#list.markRead(userId);
            if (read.read) this.#thread.setBusy(false);
        }
        catch (error) {
            if (!isAborted(error)) writeErrorToast(error);
        }
        this.#composer.focus();
    }

    /** @param {{ push?: boolean }} [options] */
    #closeThread({ push = true } = {}) {
        this.#current = null;
        this.#thread.clear();
        this.#composer.clear();
        this.#composer.element.hidden = true;
        this.#shell.classList.remove('is-thread');
        if (push) events.emit(APP_EVENTS.messagesOpened, { userId: null });
    }

    /** @param {string} text */
    async #send(text) {
        if (!this.#current || this.#sending) return;
        const body = String(text ?? '').trim();
        if (!body) return;
        this.#sending = true;
        this.#composer.setBusy(true);
        try {
            const message = await messages.send(this.#current.id, body);
            this.#thread.append(message);
            this.#list.updateLast(this.#current.id, message);
            this.#composer.clear();
            this.#composer.setPlaceholder(`Escreva para ${this.#current.nick}`);
        }
        catch (error) {
            writeErrorToast(error);
        }
        finally {
            this.#sending = false;
            this.#composer.setBusy(false);
            this.#composer.focus();
        }
    }

    /** @param {{ nick: string, id: number }} user */
    #challenge(user) {
        challengeFriend(user.nick, user.id);
    }

    /** @param {{ nick: string, id: number }} user */
    async #more(user) {
        const answer = await showDialog(
            `Conversa com <span class="highlight">${escapeHtml(user.nick)}</span>`,
            ['Desafiar', 'Fechar'],
        );
        if (answer === 'Desafiar') this.#challenge(user);
    }

    /** Opens the recipient picker for a new conversation. */
    async #newMessage() {
        const dialog = new Message({
            message: "<h2 class='new-message-title'>Nova mensagem</h2><div class='new-message-picker'></div>",
            buttons: { cancel: 'CANCELAR' },
            class: 'new-message-dialog',
            preventKill: true,
        }).show();
        const picker = dialog.element.querySelector('.new-message-picker');
        picker.innerHTML = renderTemplate(newMessagePickerTemplate);
        const search = new SearchField({
            label: 'Buscar mestre',
            placeholder: 'Gladiador ou mestre',
        });
        picker.querySelector('.new-message-search').append(search.element);
        const results = picker.querySelector('.new-message-results');
        let request = 0;
        const open = row => {
            dialog.kill();
            this.#run(() => this.#open(row.user, { push: true }));
        };
        const addRow = user => {
            const row = createElement(renderTemplate(newMessageRowTemplate, {
                userId: user.user ?? user.id,
                name: user.nick,
                level: user.level ?? 0,
            }));
            const avatar = new Avatar({ size: 'sm', name: user.nick, picture: user.picture });
            row.querySelector('.new-message-avatar').append(avatar.element);
            row.addEventListener('click', () => open(user));
            results.append(row);
        };
        const friends = await secondaryRequest(() => FriendModel.list(), this.#signal);
        (friends?.confirmed ?? []).forEach(addRow);
        search.listen('search', ({ value }) => {
            const token = ++request;
            if (!value) return;
            FriendModel.search(value, { signal: this.#signal }).then(users => {
                if (token !== request) return;
                results.replaceChildren();
                (users ?? []).forEach(addRow);
            }).catch(() => {});
        });
        dialog.getButton('cancel')?.addEventListener('click', () => dialog.kill(), { once: true });
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

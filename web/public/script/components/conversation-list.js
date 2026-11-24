import { Avatar } from './avatar.js';
import { BaseComponent } from './base-component.js';
import { SearchField } from './search-field.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { formatMessageTime } from '../helpers/date-format.js';
import { conversationListTemplate, conversationRowTemplate } from '../templates/messages.js';

/**
 * @param {string} time
 * @returns {string}
 */
function when(time) {
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    return formatMessageTime(time, { short: true });
}

/**
 * The left pane of Mensagens (docs/frontend/components.md): search, one row per master and the
 * current-row highlight. Rows are keyed by the other master's user id.
 */
export class ConversationList extends BaseComponent {
    #search;
    #rows = new Map();
    #conversations = [];
    #filter = '';

    /**
     * @param {{ element?: HTMLElement, conversations?: object[] }} [options]
     */
    constructor({ element, conversations = [] } = {}) {
        super(element ?? createElement(conversationListTemplate));
        this.#search = new SearchField({
            label: 'Buscar conversas',
            placeholder: 'Buscar conversas',
        });
        this.element.querySelector('.conversation-search').append(this.#search.element);
        this.#search.listen('search', ({ value }) => {
            this.setFilter(value);
            this.emit('search', { query: value });
        });
        this.setConversations(conversations);
    }

    /**
     * @param {object[]} conversations
     * @returns {this}
     */
    setConversations(conversations = []) {
        this.#conversations = Array.isArray(conversations) ? conversations.slice() : [];
        this.#rows.clear();
        const list = this.element.querySelector('.conversation-rows');
        list.replaceChildren();
        for (const conversation of this.#conversations) list.append(this.#createRow(conversation));
        this.setFilter(this.#filter);
        return this;
    }

    /**
     * Whether the list already has a conversation with one master.
     *
     * @param {number} userId
     * @returns {boolean}
     */
    has(userId) {
        return this.#rows.has(Number(userId));
    }

    /**
     * Adds a conversation selected before any message existed, or replaces its row.
     *
     * @param {{ user: object, last?: object, unread?: number }} conversation
     * @returns {this}
     */
    upsert(conversation) {
        const id = Number(conversation.user?.id);
        const existing = this.#rows.get(id);
        if (existing) return this.select(id, { silent: true });
        this.#conversations.unshift(conversation);
        this.element.querySelector('.conversation-rows').prepend(this.#createRow(conversation));
        this.setFilter(this.#filter);
        return this;
    }

    /**
     * @param {{ user: object, last?: object, unread?: number }} conversation
     * @returns {HTMLElement}
     */
    #createRow(conversation) {
        const user = conversation.user ?? {};
        const last = conversation.last ?? {};
        const row = createElement(renderTemplate(conversationRowTemplate, {
            unread: conversation.unread ? 'is-unread' : '',
            name: user.nick ?? '',
            time: when(last.time),
            snippet: `${last.mine ? 'Você: ' : ''}${last.body ?? ''}`,
        }));
        const avatar = new Avatar({ size: 'md', name: user.nick, picture: user.picture });
        row.querySelector('.conversation-avatar').append(avatar.element);
        row.addEventListener('click', () => this.select(user.id, { silent: false }));
        const count = row.querySelector('.conversation-count');
        count.textContent = conversation.unread ? String(conversation.unread) : '';
        count.hidden = !conversation.unread;
        this.#rows.set(Number(user.id), { row, conversation });
        return row;
    }

    /**
     * @param {number} userId
     * @param {{ silent?: boolean }} [options]
     * @returns {this}
     */
    select(userId, { silent = false } = {}) {
        const id = Number(userId);
        for (const [key, { row }] of this.#rows) {
            const on = key === id;
            row.classList.toggle('is-current', on);
            row.setAttribute('aria-current', on ? 'page' : 'false');
        }
        if (!silent) this.emit('select', { userId: id });
        return this;
    }

    /**
     * @param {number} userId
     * @returns {this}
     */
    markRead(userId) {
        const entry = this.#rows.get(Number(userId));
        if (!entry) return this;
        entry.conversation.unread = 0;
        entry.row.classList.remove('is-unread');
        const count = entry.row.querySelector('.conversation-count');
        count.textContent = '';
        count.hidden = true;
        return this;
    }

    /**
     * @param {number} userId
     * @param {object} message The message just sent.
     * @returns {this}
     */
    updateLast(userId, message) {
        const entry = this.#rows.get(Number(userId));
        if (!entry) return this;
        entry.conversation.last = message;
        entry.row.querySelector('.conversation-snippet').textContent = `Você: ${message.body ?? ''}`;
        entry.row.querySelector('.conversation-time').textContent = when(message.time);
        return this;
    }

    /** @param {string} text @returns {this} */
    setFilter(text) {
        this.#filter = String(text ?? '').trim().toLowerCase();
        let visible = 0;
        for (const { row, conversation } of this.#rows.values()) {
            const haystack = `${conversation.user?.nick ?? ''} ${conversation.last?.body ?? ''}`.toLowerCase();
            const on = !this.#filter || haystack.includes(this.#filter);
            row.hidden = !on;
            if (on) visible += 1;
        }
        this.element.querySelector('.conversation-empty').hidden = visible > 0 || this.#conversations.length === 0;
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        this.element.setAttribute('aria-busy', String(Boolean(on)));
        return this;
    }
}

import { Avatar } from './avatar.js';
import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import { messageThreadTemplate, threadDayTemplate, threadMessageTemplate } from '../templates/messages.js';

/** @param {string} time @returns {string} */
function clock(time) {
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** @param {string} time @returns {string} */
function day(time) {
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

/** @param {string} body @returns {{ text: string, hash: string }} */
function splitReplay(body) {
    const text = String(body ?? '');
    const match = text.match(/\/play\/([\w-]+)/);
    if (!match) return { text, hash: '' };
    return {
        text: text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim(),
        hash: match[1],
    };
}

/**
 * The conversation pane (docs/frontend/components.md): header, day markers, incoming/outgoing
 * bubbles, a shared replay card and the live region. User text is always set with `textContent`.
 */
export class MessageThread extends BaseComponent {
    #avatar;
    #user = null;
    #messages = [];
    #body;

    /** @param {{ element?: HTMLElement }} [options] */
    constructor({ element } = {}) {
        super(element ?? createElement(renderTemplate(messageThreadTemplate, {
            back: icon('back', { size: 16, className: 'icon thread-back-icon' }),
            swords: icon('battle', { size: 15, className: 'icon' }),
            more: icon('dots', { size: 16, className: 'icon' }),
        })));
        this.#body = this.element.querySelector('.thread-body');
        this.#avatar = new Avatar({ size: 'md' });
        this.element.querySelector('.thread-avatar').append(this.#avatar.element);
        this.element.querySelector('.thread-back').addEventListener('click', () => this.emit('back', {}));
        this.element.querySelector('.thread-challenge').addEventListener('click', () => {
            if (this.#user) this.emit('challenge', { user: this.#user });
        });
        this.element.querySelector('.thread-more').addEventListener('click', () => {
            if (this.#user) this.emit('more', { user: this.#user });
        });
    }

    /**
     * @param {{ user: { id: number, nick: string, picture?: string, level?: number, online?: boolean },
     *   messages: object[] }} conversation
     * @returns {this}
     */
    setConversation({ user, messages = [] } = {}) {
        this.#user = user ?? null;
        this.#messages = Array.isArray(messages) ? messages.slice().reverse() : [];
        this.element.hidden = !this.#user;
        this.element.querySelector('.thread-name').textContent = this.#user?.nick ?? '';
        this.element.querySelector('.thread-challenge').setAttribute('aria-label', this.#user ? `Desafiar ${this.#user.nick}` : 'Desafiar');
        this.#avatar.set({
            name: this.#user?.nick ?? '',
            picture: this.#user?.picture ?? '',
            level: Number(this.#user?.level) || 0,
        });
        this.setOnline(Boolean(this.#user?.online));
        const empty = this.element.querySelector('.thread-empty');
        empty.textContent = this.#messages.length ? '' : 'Nenhuma mensagem ainda. Diga olá.';
        empty.hidden = !this.#user || this.#messages.length > 0;
        this.#render();
        return this;
    }

    /**
     * @param {object} message
     * @returns {this}
     */
    append(message) {
        this.#messages.push(message);
        this.element.querySelector('.thread-empty').hidden = true;
        this.#append(message);
        this.scrollToEnd();
        return this;
    }

    /** @returns {this} */
    clear() {
        this.#user = null;
        this.#messages = [];
        this.#body.replaceChildren();
        this.element.hidden = true;
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setOnline(on) {
        const node = this.element.querySelector('.thread-online');
        node.replaceChildren();
        const dot = document.createElement('span');
        dot.className = 'thread-online-dot';
        dot.hidden = !on;
        node.append(dot, document.createTextNode(on ? 'Online agora' : 'Offline'));
        node.classList.toggle('is-online', Boolean(on));
        this.#avatar.setOnline(Boolean(on));
        return this;
    }

    /** @returns {this} */
    scrollToEnd() {
        this.#body.scrollTop = this.#body.scrollHeight;
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        this.element.setAttribute('aria-busy', String(Boolean(on)));
        return this;
    }

    #render() {
        this.#body.replaceChildren();
        const empty = this.element.querySelector('.thread-empty');
        empty.hidden = !this.#user || this.#messages.length > 0;
        let lastDay = '';
        for (const message of this.#messages) {
            const label = day(message.time);
            if (label && label !== lastDay) {
                this.#body.insertAdjacentHTML('beforeend', renderTemplate(threadDayTemplate, { label }));
                lastDay = label;
            }
            this.#append(message);
        }
        this.scrollToEnd();
    }

    /** @param {object} message */
    #append(message) {
        const user = this.#user;
        const sender = message.mine ? 'Você' : user?.nick ?? '';
        const node = createElement(renderTemplate(threadMessageTemplate, {
            mine: message.mine ? 'is-mine' : '',
            sender,
            time: clock(message.time),
        }));
        const quote = node.querySelector('.thread-quote');
        if (message.quote) {
            quote.textContent = message.quote;
            quote.hidden = false;
        }
        const text = node.querySelector('.thread-text');
        const { text: body, hash } = splitReplay(message.body);
        text.textContent = body;
        if (hash) {
            const replay = document.createElement('a');
            replay.className = 'thread-replay';
            replay.href = `/play/${hash}`;
            replay.target = '_blank';
            replay.rel = 'noopener';
            replay.innerHTML = `<span class='thread-replay-thumb'><img src='/image/home/arena-3d.jpg' alt=''></span><span class='thread-replay-copy'>${icon('play', { size: 13, className: 'icon' })}<span><strong>Replay compartilhado</strong><small>Assistir</small></span></span>`;
            node.querySelector('.thread-bubble').append(replay);
        }
        this.#body.append(node);
    }
}

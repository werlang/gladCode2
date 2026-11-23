import { showMessage } from '../components/dialog.js';
import { formatMessageTime } from '../helpers/date-format.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { fadeIn, fadeOut, show } from '../helpers/animate.js';
import { MessageModel } from '../models/social.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import { fullMessageTemplate, messageRowTemplate, replyTemplate } from '../templates/profile.js';

/** Tallest the reply box grows, in px. */
const MAX_REPLY_HEIGHT = 300;

/**
 * The MENSAGENS tab: received messages, reading, replying, marking unread
 * and deleting them.
 */
export class MessagesTab {
    #panel = document.querySelector('#message-panel');
    #page = 1;
    /** The current navigation signal; reloads keep using it. */
    #signal = null;

    /** Binds the pages. */
    init() {
        this.#panel.querySelector('#prev').addEventListener('click', () => {
            this.#page--;
            this.#show();
        });
        this.#panel.querySelector('#next').addEventListener('click', () => {
            this.#page++;
            this.#show();
        });
    }

    /** Reloads the current page with the mounted section's signal. */
    #show() {
        return this.show({}, { signal: this.#signal });
    }

    /**
     * Lists a page of messages.
     *
     * @param {object} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        this.#signal = signal;
        this.#panel.querySelector('#full-message')?.remove();
        const table = this.#panel.querySelector('.table');
        show(table);

        const { meta, messages: info } = await MessageModel.list(this.#page, { signal });
        if (signal?.aborted) return;
        const pageNav = this.#panel.querySelector('#page-title');
        if (meta.total == 0) {
            pageNav.hidden = true;
            table.innerHTML = renderTemplate(emptyStateTemplate, {
                variantClass: 'compact', icon: 'envelope-open', title: 'Você ainda não possui mensagens', summary: '', actionHtml: '',
            });
            return;
        }
        pageNav.hidden = false;

        const counters = this.#panel.querySelectorAll('#page-title span');
        counters[0].textContent = meta.start;
        counters[1].textContent = meta.end;
        counters[2].textContent = meta.total;
        this.#panel.querySelector('#prev').disabled = meta.page == 1;
        this.#panel.querySelector('#next').disabled = meta.end == meta.total;

        table.replaceChildren();
        info.forEach(message => {
            const row = createElement(renderTemplate(messageRowTemplate, {
                unread: message.read ? '' : 'unread',
                nick: message.nick,
                message: message.message,
                elapsed: formatMessageTime(message.time, { short: true }),
            }));
            row.addEventListener('click', () => this.#open(message));
            table.append(row);
        });
    }

    /**
     * Shows a message in full and marks it read.
     *
     * @param {Record<string, any>} message Message.
     */
    async #open(message) {
        const full = createElement(renderTemplate(fullMessageTemplate, {
            picture: message.picture,
            nick: message.nick,
            time: formatMessageTime(message.time),
            message: message.message,
        }));
        full.style.display = 'none';
        this.#panel.append(full);
        MessageModel.markRead(message.id, true);

        full.querySelector('#back').addEventListener('click', () => this.#show());
        full.querySelector('#reply').addEventListener('click', () => this.#reply(full, message));
        full.querySelector('#unread').addEventListener('click', async () => {
            await MessageModel.markRead(message.id, false);
            this.#show();
        });
        full.querySelector('#delete').addEventListener('click', async () => {
            await MessageModel.remove(message.id);
            this.#show();
        });

        await fadeOut(this.#panel.querySelector('.table'));
        fadeIn(full);
    }

    /**
     * Opens the reply box under a message.
     *
     * @param {HTMLElement} full The open message.
     * @param {Record<string, any>} message Message.
     */
    #reply(full, message) {
        const buttons = full.querySelector('.row.buttons');
        buttons.style.display = 'none';
        const reply = createElement(replyTemplate);
        full.append(reply);
        fadeIn(reply);
        const input = reply.querySelector('.input');
        input.focus();
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = `${Math.min(MAX_REPLY_HEIGHT, input.scrollHeight + input.offsetHeight - input.clientHeight)}px`;
        });

        reply.querySelector('#send').addEventListener('click', async () => {
            const text = input.value;
            try {
                await MessageModel.reply(message.id, text);
            }
            catch (error) {
                if (error.code === 'MESSAGE_TOO_LONG') showMessage('A resposta é longa demais. Encurte o texto e tente novamente.');
                else if (error.code === 'INVALID_MESSAGE') showMessage('A resposta não pode ficar vazia nem ter emojis.');
                else throw error;
                return;
            }
            this.#show();
        });
        reply.querySelector('#cancel').addEventListener('click', () => {
            reply.remove();
            buttons.style.display = '';
        });
    }
}

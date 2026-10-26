import { BaseComponent } from './base-component.js';
import { Message } from './dialog.js';
import { showLoginDialog } from './header.js';
import { uploadImage } from './image-upload.js';
import { createToast } from './toast.js';
import { HELP_TABLE, dressMessage, linkMessage, sendFeedback } from '../helpers/chat-commands.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { fadeIn, slideDown, slideUp } from '../helpers/animate.js';
import { caretToEnd, insertTab, randomId } from '../helpers/text-edit.js';
import { ChatModel } from '../models/chat.js';
import { UserModel } from '../models/user.js';
import {
    chatPanelTemplate,
    chatTableCellTemplate,
    chatTableRowTemplate,
    chatTableTemplate,
    codeModalTemplate,
    codeTokenTemplate,
    expandCodeTemplate,
    imageTokenTemplate,
    messageTemplate,
    panelButtonsTemplate,
    roomTemplate,
    systemMessageTemplate,
} from '../templates/chat.js';

/** Emoji picker categories, in the order of the category buttons (after "recent"). */
const EMOJI_CATEGORIES = ['Smileys & People', 'Animals & Nature', 'Food & Drink', 'Activities', 'Travel & Places', 'Objects', 'Symbols', 'Flags'];
const EMOJI_SHEET = 'https://cdn.jsdelivr.net/npm/emoji-datasource-google@4.1.0/img/google/sheets-128/64.png';
/** Recent emoji reachable with CTRL+1..0. */
const SHORTCUTS = 10;
/** Code blocks taller than this start collapsed. */
const BRIEF_CODE_HEIGHT = 150;
/** How often new messages and unread counts are fetched, in ms. */
const POLL_MS = 5000;
/** Below this window width the side panel starts hidden. */
const DEFAULT_OPEN_WIDTH = 1340;

/**
 * The chat: room list, message window, composer with emoji, code and image
 * tokens, /commands and the emoji picker. Without a push channel it polls for
 * new messages and unread counts.
 *
 * `full` is the chat page; otherwise it is a side panel that can be hidden.
 */
export class ChatPanel extends BaseComponent {
    #full;
    #emoji;
    #recentEmoji = [];
    /** When each room was last read (Unix time), by room id. */
    #visited = {};
    /** Room id of each room element. */
    #roomIds = new Map();
    /** Message id of each message element. */
    #messageIds = new WeakMap();
    /** Unicode of each emoji element. */
    #emojiCodes = new WeakMap();
    /** Code of each code token, by token id. */
    #codes = new Map();
    /** Image URL of each image token, by token id. */
    #images = new Map();
    #sendQueue = [];
    #sending = false;
    #loadingOlder = false;
    #poll = null;

    /**
     * @param {HTMLElement} element The `#chat-panel` container.
     * @param {{ full?: boolean, defaultOpen?: number }} [options] `full` for the
     *   chat page; `defaultOpen` is the window width below which the panel starts hidden.
     */
    constructor(element, { full = true, defaultOpen = DEFAULT_OPEN_WIDTH } = {}) {
        super(element);
        this.#full = full;
        this.#render(defaultOpen);
    }

    /** Loads the rooms and emoji and starts listening for messages. */
    async start() {
        const user = await UserModel.current();
        if (!UserModel.isLogged(user)) {
            this.#askLogin();
            return;
        }

        this.#bindComposer();
        this.#bindButtons();
        await Promise.all([this.#loadEmoji(), this.refreshRooms()]);
        this.#checkNotifications();
        this.#poll = setInterval(() => this.#syncTick(), POLL_MS);
    }

    /**
     * @param {number} defaultOpen Width below which the side panel starts hidden.
     */
    #render(defaultOpen) {
        this.element.classList.add('preload');
        if (this.#full) this.element.classList.add('full');
        else if (window.innerWidth < defaultOpen) this.element.classList.add('hidden');

        this.element.innerHTML = renderTemplate(chatPanelTemplate, {
            panelButtons: this.#full ? '' : panelButtonsTemplate,
        });
        setTimeout(() => this.element.classList.remove('preload'), 1000);
    }

    /** @param {string} selector Selector inside the panel. */
    #find(selector) {
        return this.element.querySelector(selector);
    }

    /** Invites a visitor without a session to sign in. */
    #askLogin() {
        const ask = async () => {
            if (document.querySelector('#dialog-box')) return;
            const { button } = await new Message({
                message: 'Faça login na gladCode para participar do chat',
                buttons: this.#full ? { login: 'LOGIN' } : { cancel: 'Cancelar', login: 'LOGIN' },
            }).show().wait();
            if (button === 'login') showLoginDialog();
        };
        if (this.#full) ask();
        else this.element.classList.add('hidden');
        this.on(this.element, 'click', ask);
    }

    // ----- rooms -------------------------------------------------------------

    /** @returns {HTMLElement|null} The open room. */
    #openRoom() {
        return this.#find('.room.open');
    }

    /** @returns {number|undefined} The open room's id. */
    #openRoomId() {
        const room = this.#openRoom();
        return room ? this.#roomIds.get(room) : undefined;
    }

    /**
     * Fetches the rooms and redraws the list, keeping the open room open.
     *
     * @param {{ open?: string }} [options] Name of a room to open (just joined or created).
     */
    async refreshRooms({ open } = {}) {
        const data = await ChatModel.rooms();
        if (data.status !== 'SUCCESS') return;

        const openId = this.#openRoomId();
        const container = this.#find('#room-container');
        container.replaceChildren();
        this.#roomIds.clear();

        data.room.forEach((room, order) => {
            const element = createElement(renderTemplate(roomTemplate, { name: room.name }));
            element.style.order = order;
            this.#roomIds.set(element, room.id);
            this.#visited[room.id] ??= room.visited;
            element.addEventListener('click', () => this.#toggleRoom(element));
            element.addEventListener('keydown', event => {
                if (event.key === 'Enter') this.#toggleRoom(element);
            });
            container.append(element);

            if (room.id === openId) {
                element.classList.add('open');
            }
        });

        if (openId !== undefined && !this.#openRoom()) {
            // the open room is gone (left, kicked or banned)
            this.#find('#chat-window')?.remove();
        }
        else if (openId !== undefined) {
            container.querySelectorAll('.room:not(.open)').forEach(room => room.classList.remove('visible'));
        }

        if (open) {
            const target = [...this.#roomIds].find(([, id]) => data.room.find(room => room.id === id)?.name.toLowerCase() === open.toLowerCase())?.[0];
            if (target && !target.classList.contains('open')) this.#toggleRoom(target);
        }
    }

    /**
     * Opens a room's messages, or closes the open room (side panel only; the
     * chat page always keeps one open).
     *
     * @param {HTMLElement} room Room element.
     */
    #toggleRoom(room) {
        if (this.element.classList.contains('hidden')) {
            this.#toggleVisibility();
            return;
        }
        if (this.#find('#emoji-ui').classList.contains('visible')) this.#toggleEmojiPicker();
        const isOpen = room.classList.contains('open');
        if (this.#full && isOpen) return;

        this.#find('#chat-window')?.remove();
        this.element.querySelectorAll('.room').forEach(other => {
            other.classList.remove('open');
            other.classList.add('visible');
        });
        room.querySelector('#title i').classList.remove('hide');
        if (!this.#full && isOpen) return;

        const chatWindow = document.createElement('div');
        chatWindow.id = 'chat-window';
        this.#find('#view-area').prepend(chatWindow);
        room.classList.add('open');
        this.element.querySelectorAll('.room').forEach(other => {
            if (other !== room) other.classList.remove('visible');
        });
        const badge = room.querySelector('#title .notification');
        badge.classList.add('hide');
        badge.textContent = '0';

        const roomId = this.#roomIds.get(room);
        this.#loadMessages(roomId);
        this.#find('#message-box').focus();
        chatWindow.addEventListener('scroll', () => {
            const first = chatWindow.querySelector('.baloon');
            if (first && first.offsetTop - chatWindow.scrollTop > -100) {
                this.#loadMessages(roomId, { older: true });
            }
        }, { passive: true });
    }

    /** Updates the unread counts of the closed rooms. */
    async #checkNotifications() {
        const data = await ChatModel.notifications(this.#visited);
        if (data.status !== 'SUCCESS') return;

        this.#roomIds.forEach((id, room) => {
            const count = parseInt(data.notifications[id], 10);
            if (!(count > 0) || room.classList.contains('open')) return;
            const badge = room.querySelector('#title .notification');
            badge.classList.remove('hide');
            badge.textContent = count;
            badge.classList.toggle('small', count >= 1000);
            room.querySelector('#title i').classList.add('hide');
        });
    }

    /** Fetches what arrived since the last look. */
    #syncTick() {
        if (document.hidden) return;
        const room = this.#openRoomId();
        if (room !== undefined) this.#loadMessages(room, { sync: true });
        this.#checkNotifications();
    }

    // ----- messages ----------------------------------------------------------

    /**
     * Loads a room's messages: the latest, the ones before the first shown
     * (`older`) or the ones since the room was last read (`sync`).
     *
     * @param {number} roomId Room id.
     * @param {{ older?: boolean, sync?: boolean }} [options]
     */
    async #loadMessages(roomId, { older = false, sync = false } = {}) {
        if (this.#loadingOlder) return;
        this.#loadingOlder = true;

        const chatWindow = () => this.#find('#chat-window');
        const first = chatWindow()?.querySelector('.baloon-container');
        const before = older && first ? this.#messageIds.get(first) ?? 0 : 0;

        let data;
        try {
            data = await ChatModel.messages(roomId, { before, sync, visited: this.#visited[roomId] });
        }
        finally {
            this.#loadingOlder = false;
        }
        if (data.visited) this.#visited[roomId] = data.visited;

        const view = chatWindow();
        if (data.status !== 'SUCCESS' || !view || this.#openRoomId() !== roomId) return;

        const oldHeight = view.scrollHeight;
        const oldTop = view.scrollTop;
        const messages = older ? data.messages : [...data.messages].reverse();
        messages.forEach(message => this.#addMessage(view, message, older));

        view.scrollTop = older ? view.scrollHeight - oldHeight + oldTop : view.scrollHeight;
    }

    /**
     * Adds a message balloon at the top (`older`) or bottom of the window.
     *
     * @param {HTMLElement} view The message window.
     * @param {Record<string, any>} message Message from the server.
     * @param {boolean} older Add it above the others.
     */
    #addMessage(view, message, older) {
        if (message.system == 1) {
            const system = createElement(renderTemplate(systemMessageTemplate, { message: message.message }));
            this.#messageIds.set(system, message.id);
            if (older) view.prepend(system);
            else view.append(system);
            return;
        }

        const text = this.#emoji.replace_unified(message.message);
        const { html, url } = dressMessage(text);
        const classes = [];
        if (message.me) classes.push('me');
        if (text.replace(/<span class="emoji[\w\W]+?<\/span><\/span>/g, '') === '') classes.push('no-text');

        const containers = view.querySelectorAll('.baloon-container');
        const neighbour = older ? containers[0] : containers[containers.length - 1];
        const sameSender = neighbour?.querySelector('.name')?.textContent === message.apelido;
        if (!older && sameSender) classes.push('sequence');
        if (older && sameSender) neighbour.classList.add('sequence');

        const balloon = createElement(renderTemplate(messageTemplate, {
            classes: classes.join(' '),
            photo: message.foto,
            name: message.apelido,
            message: html,
            time: message.time,
        }));
        this.#messageIds.set(balloon, message.id);
        if (older) view.prepend(balloon);
        else {
            view.append(balloon);
            fadeIn(balloon, 600);
        }

        balloon.querySelectorAll('code').forEach(code => this.#dressCode(code, Boolean(message.me)));
        if (url) this.#linkUrl(balloon.querySelector('.text'), url);
    }

    /**
     * Highlights a code block and collapses it when it is long.
     *
     * @param {HTMLElement} code `<code>` element.
     * @param {boolean} mine Whether the user sent it.
     */
    #dressCode(code, mine) {
        const lines = (code.textContent.match(/\n/g) ?? []).length + 1;
        Prism.highlightElement(code);
        if (!mine) code.classList.add('dark');

        const pre = code.parentElement;
        if (code.offsetHeight <= BRIEF_CODE_HEIGHT) {
            pre.classList.add('brief');
            return;
        }
        pre.classList.add('collapsed');
        const expand = createElement(renderTemplate(expandCodeTemplate, { lines }));
        pre.append(expand);
        expand.addEventListener('click', async () => {
            const icon = expand.querySelector('.plus');
            if (expand.classList.toggle('open')) {
                pre.classList.remove('collapsed');
                icon.classList.replace('fa-plus-square', 'fa-minus-square');
                await slideDown(pre);
            }
            else {
                icon.classList.replace('fa-minus-square', 'fa-plus-square');
                await slideUp(pre);
                pre.classList.add('collapsed');
                pre.style.display = '';
            }
        });
    }

    /**
     * Makes a message's web address a link, or shows it when it is an image.
     *
     * @param {HTMLElement} text The message text.
     * @param {string} url The address.
     */
    #linkUrl(text, url) {
        const probe = new Image();
        const apply = isImage => {
            text.innerHTML = linkMessage(text.innerHTML, url, isImage);
        };
        probe.onload = () => apply(true);
        probe.onerror = () => apply(false);
        probe.src = url;
    }

    /**
     * Prints a table in the message window (command answers, /help).
     *
     * @param {import('../helpers/chat-commands.js').ChatTable} table Rows of cells.
     */
    #printTable(table) {
        let view = this.#find('#chat-window');
        if (!view) {
            view = document.createElement('div');
            view.id = 'chat-window';
            this.#find('#view-area').prepend(view);
        }
        const rows = table.map(row => renderTemplate(chatTableRowTemplate, {
            cells: row.map(cell => renderTemplate(chatTableCellTemplate, { classes: cell.class ?? '', data: cell.data })).join(''),
        })).join('');
        const element = createElement(renderTemplate(chatTableTemplate, { rows }));
        view.append(element);
        fadeIn(element, 600);
        view.scrollTop = view.scrollHeight;
    }

    // ----- composer ----------------------------------------------------------

    #bindComposer() {
        const box = this.#find('#message-box');

        this.on(box, 'keydown', event => {
            if (!box.querySelector('span')) box.append(document.createElement('span'));

            if (event.ctrlKey && event.key.toLowerCase() === 'e') {
                event.preventDefault();
                this.#toggleEmojiPicker();
            }
            const shortcut = '1234567890'.indexOf(event.key);
            if (event.ctrlKey && shortcut !== -1) {
                event.preventDefault();
                this.#find(`#emoji-container #categ-0`)?.querySelectorAll('.emoji-outer')[shortcut]?.click();
            }
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.#send();
            }
        });

        this.on(box, 'keyup', () => {
            const empty = box.textContent === '' && !box.querySelector('img, .emoji-outer');
            this.#find('#send').classList.toggle('hidden', empty);
            this.#find('#help').classList.toggle('hidden', !empty);

            if (/&lt;&gt;/.test(box.innerHTML)) this.#insertCodeToken(box);
            if (/!@/.test(box.innerHTML)) this.#insertImageToken(box);
        });
    }

    /**
     * Removes the text that triggered a token from the composer.
     *
     * @param {HTMLElement} box Composer.
     * @param {RegExp} trigger Escaped trigger text.
     */
    #stripTrigger(box, trigger) {
        box.querySelectorAll('span').forEach(span => {
            if (trigger.test(span.innerHTML)) span.innerHTML = span.innerHTML.replace(trigger, '');
        });
    }

    /**
     * `<>` typed: adds a code token and opens the code editor for it.
     *
     * @param {HTMLElement} box Composer.
     */
    #insertCodeToken(box) {
        this.#stripTrigger(box, /&lt;&gt;/);
        const id = `code-icon-${randomId(5)}`;
        box.insertAdjacentHTML('beforeend', renderTemplate(codeTokenTemplate, { id: id.slice(10) }));
        const token = box.querySelector(`#${id}`);
        token.addEventListener('click', () => this.#editCode(token));
        this.#editCode(token);
    }

    /**
     * `!@` typed: adds an image token and opens the upload widget.
     *
     * @param {HTMLElement} box Composer.
     */
    async #insertImageToken(box) {
        this.#stripTrigger(box, /!@/);
        const id = `img-icon-${randomId(5)}`;
        box.insertAdjacentHTML('beforeend', renderTemplate(imageTokenTemplate, { id: id.slice(9) }));
        const token = box.querySelector(`#${id}`);

        const url = await uploadImage();
        if (url) {
            box.append(document.createElement('span'));
            this.#images.set(id, url);
            token.addEventListener('click', () => window.open(url));
        }
        else {
            token.remove();
        }
        setTimeout(() => caretToEnd(box), 300);
    }

    /**
     * Edits the code of a code token in a modal; empty code removes the token.
     *
     * @param {HTMLImageElement} token Code token.
     */
    #editCode(token) {
        const fog = createElement(codeModalTemplate);
        document.body.append(fog);
        fadeIn(fog, undefined, 'flex');
        const terminal = fog.querySelector('#terminal');
        terminal.value = this.#codes.get(token.id) ?? '';
        terminal.focus();
        const fit = () => {
            terminal.style.height = 'auto';
            terminal.style.height = `${terminal.scrollHeight}px`;
        };
        fit();

        const close = () => {
            fog.remove();
            caretToEnd(this.#find('#message-box'));
        };
        const cancel = () => {
            if (!this.#codes.has(token.id)) token.remove();
            close();
        };
        const confirm = () => {
            if (terminal.value) this.#codes.set(token.id, terminal.value);
            else {
                this.#codes.delete(token.id);
                token.remove();
            }
            close();
        };

        fog.querySelector('#cancel').addEventListener('click', cancel);
        fog.querySelector('#ok').addEventListener('click', confirm);
        terminal.addEventListener('keydown', event => {
            if (event.key === 'Tab') {
                event.preventDefault();
                insertTab(terminal, event.shiftKey);
            }
            else if (event.key === 'Escape') cancel();
            else if (event.ctrlKey && event.key === 'Enter') confirm();
        });
        terminal.addEventListener('input', fit);
    }

    /**
     * The composer's content as message text: emoji as their characters, code
     * tokens as `<code>` and image tokens as `<img>`.
     *
     * @returns {string}
     */
    #composedText() {
        const box = this.#find('#message-box');
        let text = '';
        const walk = node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (this.#emojiCodes.has(node)) {
                text += this.#emojiCodes.get(node);
                return;
            }
            if (node.classList.contains('code-icon')) {
                text += this.#codes.has(node.id) ? `<code>${this.#codes.get(node.id)}</code>` : '';
                return;
            }
            if (node.classList.contains('img-icon')) {
                text += this.#images.has(node.id) ? `<img src='${this.#images.get(node.id)}'>` : '';
                return;
            }
            node.childNodes.forEach(walk);
        };
        box.childNodes.forEach(walk);
        return text;
    }

    /** Sends the composed message, or shows the help for `/help`. */
    #send() {
        const box = this.#find('#message-box');
        const text = this.#composedText();
        box.replaceChildren();
        box.focus();
        this.#codes.clear();
        this.#images.clear();
        this.#find('#send').classList.add('hidden');
        this.#find('#help').classList.remove('hidden');

        if (text === '/help') {
            this.#printTable(HELP_TABLE);
            return;
        }
        if (this.#find('#emoji').classList.contains('selected')) this.#toggleEmojiPicker();

        this.#sendQueue.push(text);
        this.#flushQueue();
    }

    /** Sends the queued messages one at a time, in order. */
    async #flushQueue() {
        if (this.#sending) return;
        this.#sending = true;
        try {
            while (this.#sendQueue.length) {
                const message = this.#sendQueue.shift();
                const room = this.#openRoomId() ?? '';
                if (message === '') continue;

                const data = await ChatModel.send({ message, room, recentEmoji: this.#recentEmoji });
                this.#applyFeedback(data);
                if (data.status === 'SENT' && room !== '') this.#loadMessages(room, { sync: true });
            }
        }
        finally {
            this.#sending = false;
        }
    }

    /**
     * Shows what a sent command did and updates the room list.
     *
     * @param {Record<string, any>} data SEND answer.
     */
    #applyFeedback(data) {
        const { toast, table, rooms } = sendFeedback(data);
        if (toast) createToast(...toast);
        if (table) this.#printTable(table);
        if (rooms) this.refreshRooms({ open: rooms.insert });
    }

    // ----- emoji -------------------------------------------------------------

    /** Builds the emoji picker: recent emoji first, then every category. */
    async #loadEmoji() {
        this.#emoji = new EmojiConvertor();
        this.#emoji.use_sheet = true;
        this.#emoji.supports_css = true;
        // draw from the sheet even where the system has its own emoji, so the picker and messages look the same everywhere
        this.#emoji.allow_native = false;
        this.#emoji.img_set = 'google';
        this.#emoji.img_sets.google.sheet = EMOJI_SHEET;
        this.#emoji.init_unified();

        this.#recentEmoji = await ChatModel.recentEmoji();

        const groups = [this.#recentEmoji.map((unicode, order) => ({ unicode, order })), ...EMOJI_CATEGORIES.map(() => [])];
        Object.entries(this.#emoji.map.unicode).forEach(([unicode, info]) => {
            const index = EMOJI_CATEGORIES.indexOf(info.category) + 1;
            if (index > 0) groups[index].push({ unicode, order: info.order });
        });

        const container = this.#find('#emoji-container');
        const titles = [...this.#find('#category-buttons').querySelectorAll('i')].map(icon => icon.title);
        groups.forEach((group, index) => {
            const category = document.createElement('div');
            category.id = `categ-${index}`;
            category.className = 'categ-container';
            category.insertAdjacentHTML('beforeend', `<div class='title'></div>`);
            category.querySelector('.title').textContent = titles[index] ?? '';

            group.sort((a, b) => a.order - b.order);
            let previous = null;
            group.forEach(({ unicode }, position) => {
                const markup = this.#emoji.replace_unified(unicode);
                // the emoji map lists some emoji more than once
                if (markup === previous) return;
                previous = markup;
                const emoji = this.#emojiElement(unicode);
                if (!emoji) return;
                if (index === 0) category.append(this.#shortcut(emoji, position));
                else category.append(emoji);
            });
            container.append(category);
        });

        this.#bindEmojiPicker(container);
    }

    /**
     * @param {string} unicode Emoji characters.
     * @returns {HTMLElement|null} The emoji's sheet sprite, or `null` when the sheet lacks it.
     */
    #emojiElement(unicode) {
        const element = createElement(this.#emoji.replace_unified(unicode));
        if (!element) return null;
        this.#emojiCodes.set(element, unicode);
        return element;
    }

    /**
     * Wraps a recent emoji with its CTRL+number label.
     *
     * @param {HTMLElement} emoji Emoji element.
     * @param {number} position Position among the recent emoji.
     * @returns {HTMLElement}
     */
    #shortcut(emoji, position) {
        const wrapper = document.createElement('div');
        wrapper.className = 'shortcut';
        const number = document.createElement('span');
        number.className = 'number';
        number.textContent = position < SHORTCUTS ? (position + 1) % SHORTCUTS : '';
        if (position >= SHORTCUTS) wrapper.classList.add('hidden');
        wrapper.append(number, emoji);
        return wrapper;
    }

    /**
     * @param {HTMLElement} container The picker's scroll area.
     */
    #bindEmojiPicker(container) {
        const buttons = [...this.#find('#category-buttons').querySelectorAll('i')];
        const categories = () => [...container.querySelectorAll('.categ-container')];
        let jumping = false;

        this.on(container, 'scroll', () => {
            if (jumping) return;
            const top = container.getBoundingClientRect().top;
            const current = categories().findLastIndex(category => category.getBoundingClientRect().top - top <= 10);
            buttons.forEach((button, index) => button.classList.toggle('selected', index === Math.max(0, current)));
        }, { passive: true });

        buttons.forEach((button, index) => this.on(button, 'click', () => {
            jumping = true;
            container.scrollTop = 0;
            container.scrollTop = categories()[index].getBoundingClientRect().top - container.getBoundingClientRect().top;
            jumping = false;
        }));

        this.on(container, 'click', event => {
            const emoji = event.target.closest('.emoji-outer');
            if (emoji && this.#emojiCodes.has(emoji)) this.#pickEmoji(this.#emojiCodes.get(emoji));
        });
    }

    /**
     * Adds an emoji to the composer and moves it to the front of the recent ones.
     *
     * @param {string} unicode Emoji characters.
     */
    #pickEmoji(unicode) {
        const emoji = this.#emojiElement(unicode);
        if (!emoji) return;
        const known = this.#recentEmoji.indexOf(unicode);
        if (known !== -1) {
            this.#recentEmoji.splice(known, 1);
        }
        else {
            const recent = this.#find('#emoji-container #categ-0');
            recent.querySelector('.title').after(this.#shortcut(this.#emojiElement(unicode), 0));
            recent.querySelectorAll('.shortcut').forEach((shortcut, index) => {
                shortcut.querySelector('.number').textContent = index < SHORTCUTS ? (index + 1) % SHORTCUTS : '';
                shortcut.classList.toggle('hidden', index >= SHORTCUTS);
            });
        }
        this.#recentEmoji.unshift(unicode);

        const box = this.#find('#message-box');
        emoji.contentEditable = 'false';
        const after = document.createElement('span');
        box.append(emoji, after);
        caretToEnd(box);
        this.#find('#send').classList.remove('hidden');
        this.#find('#help').classList.add('hidden');
    }

    #toggleEmojiPicker() {
        if (!this.#full && !this.#openRoom()) return;
        const button = this.#find('#emoji');
        const open = button.classList.toggle('selected');
        this.#find('#emoji-ui').classList.toggle('visible', open);
    }

    // ----- panel buttons -----------------------------------------------------

    #bindButtons() {
        const activate = (selector, action) => {
            const button = this.#find(selector);
            this.on(button, 'click', action);
            this.on(button, 'keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') action();
            });
        };
        activate('#send', () => this.#send());
        activate('#help', () => this.#printTable(HELP_TABLE));
        activate('#emoji', () => this.#toggleEmojiPicker());
        if (!this.#full) {
            activate('#show-hide', () => this.#toggleVisibility());
            activate('#open-new', () => {
                window.open('chat');
                this.#toggleVisibility();
            });
        }
    }

    /** Shows or hides the side panel, closing the open room when hiding. */
    #toggleVisibility() {
        if (this.element.classList.contains('hidden')) {
            this.element.classList.remove('hidden');
            return;
        }
        this.#openRoom()?.click();
        this.element.classList.add('hidden');
        if (this.#find('#emoji').classList.contains('selected')) this.#toggleEmojiPicker();
    }

    /** Stops polling and removes the listeners. */
    destroy() {
        clearInterval(this.#poll);
        super.destroy();
    }
}

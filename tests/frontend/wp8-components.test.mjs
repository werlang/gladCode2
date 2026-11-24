// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wp8-components.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * A node with everything the WP8 components touch. Template roots keep the class and hidden
 * attribute of their markup, so a row can be found by the class the template gave it.
 */
function fakeNode() {
    const classes = new Set();
    const attributes = new Map();
    const listeners = new Map();
    const children = new Map();
    const appended = [];
    const node = {
        innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, className: '',
        href: '', target: '', rel: '', scrollTop: 0, scrollHeight: 120, inserted: [], appendedNodes: appended,
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: name => classes.has(name),
        },
        querySelector: selector => {
            if (!children.has(selector)) children.set(selector, fakeNode());
            return children.get(selector);
        },
        querySelectorAll: () => [],
        append: (...nodes) => { appended.push(...nodes); },
        prepend: (...nodes) => { appended.unshift(...nodes); },
        replaceChildren: (...nodes) => { appended.length = 0; appended.push(...nodes); },
        addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        removeEventListener: () => {},
        dispatchEvent: event => {
            if (!event.target) Object.defineProperty(event, 'target', { value: node, configurable: true });
            for (const listener of listeners.get(event.type) ?? []) listener(event);
            return true;
        },
        setAttribute: (name, value) => attributes.set(name, String(value)),
        getAttribute: name => attributes.get(name) ?? null,
        removeAttribute: name => attributes.delete(name),
        hasAttribute: name => attributes.has(name),
        insertAdjacentHTML: (position, html) => node.inserted.push([position, html]),
        focus: () => {},
        closest: () => null,
    };
    Object.defineProperty(node, 'className', {
        get: () => [...classes].join(' '),
        set: value => {
            classes.clear();
            String(value).split(/\s+/).filter(Boolean).forEach(name => classes.add(name));
        },
    });
    node.className = '';
    return node;
}

/** Builds a template root, keeping the classes its markup declared. */
function fromMarkup(markup) {
    const node = fakeNode();
    const match = String(markup).match(/class='([^']*)'/);
    if (match) node.className = match[1];
    if (/\shidden[\s>]/.test(markup)) node.hidden = true;
    return node;
}

globalThis.document = {
    createElement: () => {
        const template = fakeNode();
        let markup = '';
        Object.defineProperty(template, 'innerHTML', {
            get: () => markup,
            set: value => { markup = value; template.content.firstElementChild = fromMarkup(markup); },
        });
        template.content = { firstElementChild: fakeNode() };
        return template;
    },
    createTextNode: text => ({ textContent: String(text) }),
    body: fakeNode(),
};

const { ConversationList } = await import('../../web/public/script/components/conversation-list.js');
const { MessageThread } = await import('../../web/public/script/components/message-thread.js');
const { Composer } = await import('../../web/public/script/components/composer.js');
const { FriendRow } = await import('../../web/public/script/components/friend-row.js');
const { InviteBanner } = await import('../../web/public/script/components/invite-banner.js');

const CONVERSATIONS = [
    {
        user: { id: 9, nick: 'MestreArena', picture: '', level: 23, online: true },
        last: { time: '2026-11-24 03:30:00', body: 'Olha esse replay', mine: false },
        unread: 2,
    },
    {
        user: { id: 10, nick: 'GladiadorX', picture: '', level: 10, online: false },
        last: { time: '2026-11-23 18:00:00', body: 'Bora duelar', mine: true },
        unread: 0,
    },
];

test('a conversation row shows its unread count, snippet and current state', () => {
    const list = new ConversationList({ conversations: CONVERSATIONS });
    const rows = list.element.querySelector('.conversation-rows');
    assert.equal(rows.appendedNodes.length, 2);
    const [first, second] = rows.appendedNodes;
    assert.equal(first.classList.contains('is-unread'), true);
    assert.equal(first.querySelector('.conversation-count').textContent, '2');
    assert.equal(first.querySelector('.conversation-count').hidden, false);
    assert.equal(second.classList.contains('is-unread'), false);
    assert.equal(second.querySelector('.conversation-count').hidden, true);
});

test('selecting a conversation highlights one row and emits its master', () => {
    const list = new ConversationList({ conversations: CONVERSATIONS });
    const rows = list.element.querySelector('.conversation-rows').appendedNodes;
    const selected = [];
    list.element.addEventListener('select', event => selected.push(event.detail));
    list.select(10);
    assert.equal(rows[0].classList.contains('is-current'), false);
    assert.equal(rows[1].classList.contains('is-current'), true);
    assert.equal(rows[1].getAttribute('aria-current'), 'page');
    assert.deepEqual(selected, [{ userId: 10 }]);
    list.select(10, { silent: true });
    assert.equal(selected.length, 1);
});

test('marking a conversation read clears its badge and upsert adds a new master first', () => {
    const list = new ConversationList({ conversations: CONVERSATIONS });
    const rows = list.element.querySelector('.conversation-rows');
    const first = rows.appendedNodes[0];
    list.markRead(9);
    assert.equal(first.classList.contains('is-unread'), false);
    assert.equal(first.querySelector('.conversation-count').hidden, true);

    list.upsert({ user: { id: 11, nick: 'Novo', picture: '', level: 2, online: false }, last: null, unread: 0 });
    assert.equal(rows.appendedNodes.length, 3);
    assert.equal(rows.appendedNodes[0].classList.contains('conversation-row'), true);
    assert.equal(list.has(11), true);
    assert.equal(list.has(999), false);
});

test('search filters conversation rows by master or last message', () => {
    const list = new ConversationList({ conversations: CONVERSATIONS });
    const rows = list.element.querySelector('.conversation-rows').appendedNodes;
    list.setFilter('replay');
    assert.equal(rows[0].hidden, false);
    assert.equal(rows[1].hidden, true);
    list.setFilter('gladiador');
    assert.equal(rows[0].hidden, true);
    assert.equal(rows[1].hidden, false);
    list.setFilter('');
    assert.equal(rows[0].hidden, false);
    assert.equal(rows[1].hidden, false);
});

test('a thread renders day separators, bubbles and a shared replay card', () => {
    const online = [];
    const thread = new MessageThread();
    thread.setConversation({
        user: { id: 9, nick: 'MestreArena', picture: '', level: 23, online: true },
        messages: [
            { id: 2, sender: 9, mine: false, time: '2026-11-24 03:30:00', body: 'Olha: /play/wp6log100', quote: '', read: false },
            { id: 1, sender: 277, mine: true, time: '2026-11-23 03:00:00', body: 'Boa!', quote: 'oi', read: true },
        ],
    });
    const body = thread.element.querySelector('.thread-body');
    assert.equal(thread.element.hidden, false);
    assert.equal(thread.element.querySelector('.thread-name').textContent, 'MestreArena');
    assert.equal(body.inserted.length, 2);
    assert.match(body.inserted[0][1], /Ontem|Hoje|\d/);
    assert.equal(body.appendedNodes.length, 2);
    const [oldest, newest] = body.appendedNodes;
    assert.equal(oldest.classList.contains('is-mine'), true);
    assert.equal(oldest.querySelector('.thread-quote').textContent, 'oi');
    assert.equal(oldest.querySelector('.thread-quote').hidden, false);
    assert.equal(newest.classList.contains('is-mine'), false);
    assert.equal(newest.querySelector('.thread-text').textContent, 'Olha:');
    const replay = newest.querySelector('.thread-bubble').appendedNodes[0];
    assert.equal(replay.href, '/play/wp6log100');

    thread.setOnline(false);
    assert.equal(thread.element.querySelector('.thread-online').classList.contains('is-online'), false);
    online.push(thread.element.querySelector('.thread-online').textContent);
});

test('appending a sent message adds one bubble and clears the empty note', () => {
    const thread = new MessageThread();
    thread.setConversation({
        user: { id: 9, nick: 'MestreArena', picture: '', level: 23, online: false },
        messages: [],
    });
    const body = thread.element.querySelector('.thread-body');
    assert.equal(thread.element.querySelector('.thread-empty').hidden, false);
    thread.append({ id: 3, sender: 277, mine: true, time: '2026-11-24 04:00:00', body: 'Nova', quote: '', read: false });
    assert.equal(body.appendedNodes.length, 1);
    assert.equal(thread.element.querySelector('.thread-empty').hidden, true);
    assert.equal(body.appendedNodes[0].querySelector('.thread-text').textContent, 'Nova');
});

test('the composer sends on Enter, keeps Shift+Enter for a new line and never sends a blank', () => {
    const composer = new Composer();
    const input = composer.element.querySelector('.composer-input');
    const send = composer.element.querySelector('.composer-send');
    const sent = [];
    composer.element.addEventListener('send', event => sent.push(event.detail));

    composer.element.dispatchEvent({ type: 'submit', preventDefault: () => {} });
    assert.deepEqual(sent, []);

    input.value = 'Olá';
    input.dispatchEvent({ type: 'input' });
    assert.equal(send.disabled, false);
    input.dispatchEvent({ type: 'keydown', key: 'Enter', shiftKey: true, preventDefault: () => {} });
    assert.deepEqual(sent, []);
    input.dispatchEvent({ type: 'keydown', key: 'Enter', shiftKey: false, preventDefault: () => {} });
    assert.deepEqual(sent, [{ text: 'Olá' }]);

    composer.setBusy(true);
    assert.equal(send.disabled, true);
    assert.equal(input.disabled, true);
    composer.setBusy(false);
    composer.clear();
    assert.equal(input.value, '');
    assert.equal(send.disabled, true);
});

test('a friend row shows level, best gladiator, renown and its three actions', () => {
    const friend = {
        id: 4, user: 9, nick: 'MestreArena', level: 23, picture: '', online: true,
        bestGladiator: 'Spartacus', bestRenown: 1420.5,
    };
    const row = new FriendRow({ friend });
    const actions = [];
    row.element.addEventListener('message', event => actions.push(['message', event.detail.friend]));
    row.element.addEventListener('challenge', event => actions.push(['challenge', event.detail.friend]));
    row.element.addEventListener('more', event => actions.push(['more', event.detail.friend]));
    assert.equal(row.element.querySelector('.friend-name').textContent, 'MestreArena');
    assert.equal(row.element.querySelector('.friend-meta-text').textContent, 'Nível 23 · melhor: Spartacus');
    assert.match(row.element.querySelector('.friend-mmr').textContent, /1\.420/);
    row.element.querySelector('.friend-message').dispatchEvent({ type: 'click' });
    row.element.querySelector('.friend-challenge').dispatchEvent({ type: 'click' });
    row.element.querySelector('.friend-more').dispatchEvent({ type: 'click', currentTarget: row.element.querySelector('.friend-more') });
    assert.deepEqual(actions.map(([name]) => name), ['message', 'challenge', 'more']);
    assert.equal(actions[0][1], friend);
});

test('an invite banner carries the friend-request label and its two answers', () => {
    const banner = new InviteBanner();
    const answers = [];
    banner.element.addEventListener('accept', () => answers.push('accept'));
    banner.element.addEventListener('refuse', () => answers.push('refuse'));
    banner.set({
        name: 'Mestre 01', picture: '', message: 'Mestre 01 quer ser seu amigo',
        detail: 'Mestre nível 9 · 2 amigos em comum', label: 'Convite de amizade',
    });
    assert.equal(banner.element.hidden, false);
    assert.equal(banner.element.getAttribute('aria-label'), 'Convite de amizade');
    assert.equal(banner.element.querySelector('.invite-message').textContent, 'Mestre 01 quer ser seu amigo');
    banner.element.querySelector('.invite-accept').dispatchEvent({ type: 'click' });
    banner.element.querySelector('.invite-refuse').dispatchEvent({ type: 'click' });
    assert.deepEqual(answers, ['accept', 'refuse']);
});

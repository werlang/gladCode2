// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/services-social.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { MessagesService } = await import('../../web/public/script/services/messages.js');
const { FriendsService } = await import('../../web/public/script/services/friends.js');
const { APP_EVENTS } = await import('../../web/public/script/helpers/event-bus.js');

/** A bus double that records app events and lets a test fire one. */
function fakeBus() {
    const emitted = [];
    const listeners = new Map();
    return {
        emitted,
        on(name, listener) {
            listeners.set(name, [...(listeners.get(name) ?? []), listener]);
            return () => listeners.set(name, (listeners.get(name) ?? []).filter(item => item !== listener));
        },
        emit(name, detail) {
            emitted.push({ name, detail });
            for (const listener of listeners.get(name) ?? []) listener(detail);
        },
    };
}

/** A conversation model double. */
function fakeModel() {
    const calls = [];
    return {
        calls,
        list: async options => { calls.push(['list', options]); return { conversations: [{ user: { id: 9 }, last: null, unread: 2 }] }; },
        thread: async (userId, options) => { calls.push(['thread', userId, options]); return { user: { id: userId }, messages: [] }; },
        send: async (userId, text) => { calls.push(['send', userId, text]); return { id: 4, sender: 7, mine: true, time: 't', body: text, quote: '', read: false }; },
        markRead: async userId => { calls.push(['markRead', userId]); return { userId, read: 2, unreadTotal: 3 }; },
    };
}

test('the messages service unwraps the list and forwards thread paging', async () => {
    const model = fakeModel();
    const service = new MessagesService({ model, bus: fakeBus() });
    const controller = new AbortController();
    assert.deepEqual(await service.list({ signal: controller.signal }), [{ user: { id: 9 }, last: null, unread: 2 }]);
    const thread = await service.open(9, { offset: 30, signal: controller.signal });
    assert.equal(thread.user.id, 9);
    assert.deepEqual(model.calls, [
        ['list', { signal: controller.signal }],
        ['thread', 9, { offset: 30, signal: controller.signal }],
    ]);
});

test('a conversation read emits the authoritative unread total', async () => {
    const model = fakeModel();
    const bus = fakeBus();
    const service = new MessagesService({ model, bus });
    const result = await service.markRead(9);
    assert.deepEqual(result, { userId: 9, read: 2, unreadTotal: 3 });
    assert.deepEqual(bus.emitted, [{
        name: APP_EVENTS.messagesRead,
        detail: { userId: 9, read: 2, unreadTotal: 3 },
    }]);
});

test('a sent message is returned to the thread', async () => {
    const service = new MessagesService({ model: fakeModel(), bus: fakeBus() });
    const message = await service.send(9, 'Olá');
    assert.equal(message.body, 'Olá');
    assert.equal(message.mine, true);
});

test('answering an invite emits the friendship fact with the answer', async () => {
    const model = {
        list: async () => ({ pending: [], confirmed: [] }),
        add: async userId => ({ sent: userId }),
        search: async (text, options) => [{ user: 9, nick: text, state: options?.signal ? 'none' : 'none' }],
        answer: async (id, accepted) => { model.answered = { id, accepted }; },
        remove: async () => undefined,
    };
    const bus = fakeBus();
    const service = new FriendsService({ model, bus });
    await service.answer(4, true);
    assert.deepEqual(model.answered, { id: 4, accepted: true });
    assert.deepEqual(bus.emitted, [{ name: APP_EVENTS.friendsAnswered, detail: { id: 4, accepted: true } }]);
    assert.deepEqual(await service.search('Ana'), [{ user: 9, nick: 'Ana', state: 'none' }]);
    assert.deepEqual(await service.request(9), { sent: 9 });
});

test('the friends service forwards the navigation signal to the list', async () => {
    const seen = [];
    const service = new FriendsService({
        model: { list: async options => { seen.push(options); return { pending: [], confirmed: [] }; } },
        bus: fakeBus(),
    });
    const controller = new AbortController();
    await service.load({ signal: controller.signal });
    assert.deepEqual(seen, [{ signal: controller.signal }]);
});

// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/services-notifications.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { NotificationService, normalizeCounts } = await import('../../web/public/script/services/notifications.js');

const COUNTS = {
    user: { level: 23, xp: 120, silver: 1250 },
    messages: 2,
    friends: 1,
    news: 3,
    gladiators: { remaining: 2, outdated: 1 },
    duels: 1,
    reports: { ranked: 2, duel: 1 },
};

function fakeBus() {
    const emitted = [];
    return {
        emitted,
        emit(name, detail) {
            emitted.push({ name, detail });
        },
    };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

test('normalizeCounts joins the counters with the potion clock and computes the bell', () => {
    const counts = normalizeCounts(COUNTS, {
        serverNow: '2026-01-01 10:00:00',
        slots: [
            { id: 1, identifier: 'hp3', name: 'Vida III', icon: 'hp', expiresAt: '2026-01-01 10:03:00', seconds: 180 },
            { id: 2, identifier: 'ap2', name: 'Habilidade II', icon: 'ap', expiresAt: '2026-01-01 10:01:00', seconds: 60 },
        ],
    });

    assert.equal(counts.bell, 8);
    assert.deepEqual(counts.potions, {
        count: 2,
        nextExpiry: '2026-01-01 10:01:00',
        serverNow: '2026-01-01 10:00:00',
    });
    assert.equal(counts.messages, 2);
    assert.equal(counts.reports.ranked, 2);
});

test('normalizeCounts falls back to the slot seconds when the API has no expiry yet', () => {
    const counts = normalizeCounts(COUNTS, {
        serverNow: '2026-01-01 10:00:00',
        slots: [{ id: 1, identifier: 'hp3', name: 'Vida III', icon: 'hp', seconds: 90 }],
    });

    assert.equal(counts.potions.count, 1);
    assert.equal(counts.potions.nextExpiry, '2026-01-01 10:01:30');
});

test('refresh() emits one joined payload; a failed slots read keeps the previous potion state', async () => {
    const bus = fakeBus();
    let failSlots = false;
    const service = new NotificationService({
        counts: async () => COUNTS,
        slots: async () => {
            if (failSlots) throw new Error('slots down');
            return {
                serverNow: '2026-01-01 10:00:00',
                slots: [{ id: 1, identifier: 'hp3', name: 'Vida III', icon: 'hp', expiresAt: '2026-01-01 10:03:00', seconds: 180 }],
            };
        },
        bus,
    });

    const first = await service.refresh();
    failSlots = true;
    const second = await service.refresh();

    assert.equal(first.potions.count, 1);
    assert.deepEqual(second.potions, first.potions);
    assert.equal(bus.emitted.length, 2);
    assert.deepEqual(bus.emitted[0], { name: 'notifications:counts', detail: first });
});

test('start() polls, pauses while the page is hidden, resumes on visibilitychange and stops cleanly', async () => {
    const bus = fakeBus();
    let interval = null;
    let cleared = null;
    const listeners = new Set();
    const documentRef = {
        hidden: false,
        addEventListener: (name, handler) => listeners.add(handler),
        removeEventListener: (name, handler) => listeners.delete(handler),
    };
    let calls = 0;
    const service = new NotificationService({
        counts: async () => { calls += 1; return COUNTS; },
        slots: async () => ({ serverNow: '2026-01-01 10:00:00', slots: [] }),
        bus,
        intervalMs: 30000,
        setInterval: callback => { interval = callback; return 7; },
        clearInterval: id => { cleared = id; },
    });

    service.start({ document: documentRef });
    await flush();
    assert.equal(calls, 1);
    assert.equal(listeners.size, 1);

    documentRef.hidden = true;
    interval();
    await flush();
    assert.equal(calls, 1);

    documentRef.hidden = false;
    for (const handler of listeners) handler();
    await flush();
    assert.equal(calls, 2);

    service.stop();
    assert.equal(cleared, 7);
    assert.equal(listeners.size, 0);
});

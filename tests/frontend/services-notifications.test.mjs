// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/services-notifications.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { NotificationService, normalizeCounts } = await import('../../web/public/script/services/notifications.js');
const { APP_EVENTS } = await import('../../web/public/script/helpers/event-bus.js');

const COUNTS = {
    version: '2.10.0',
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
    assert.equal(counts.version, '2.10.0');
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

test('start() uses the global interval with the correct receiver', () => {
    const bus = fakeBus();
    const service = new NotificationService({
        counts: async () => COUNTS,
        slots: async () => ({ serverNow: '2026-01-01 10:00:00', slots: [] }),
        bus,
    });
    const documentRef = { hidden: true, addEventListener: () => {}, removeEventListener: () => {} };
    try {
        service.start({ document: documentRef });
    }
    finally {
        service.stop();
    }
    assert.equal(service.counts, null);
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

test('feed() composes the panel rows from needs, reports and unread news', async () => {
    const { DuelModel, FriendModel, ReportModel } = await import('../../web/public/script/models/social.js');
    const { NewsModel } = await import('../../web/public/script/models/news.js');
    const original = {
        duels: DuelModel.challenges,
        friends: FriendModel.list,
        reports: ReportModel.unreadFeed,
        duelsDone: DuelModel.unreadReports,
        news: NewsModel.list,
    };
    DuelModel.challenges = async () => [{ id: 4, time: '2026-01-01 10:00:00', nick: 'Ana' }];
    FriendModel.list = async () => ({ pending: [{ id: 9, nick: 'Marco' }], confirmed: [] });
    ReportModel.unreadFeed = async () => ({ total: 1, reports: [{ id: 5, time: '2026-01-01 09:00:00', gladiator: 'Magnus' }] });
    DuelModel.unreadReports = async () => [{ id: 6, time: '2026-01-01 09:30:00', user: 'Bo' }];
    NewsModel.list = async () => [{ hash: 'ab12', title: 'Nova arena', time: '2026-01-01 08:00:00' }];
    try {
        const service = new NotificationService({
            counts: async () => COUNTS,
            slots: async () => ({ serverNow: '2026-01-01 10:00:00', slots: [] }),
            bus: fakeBus(),
        });
        await service.refresh();
        const feed = await service.feed();
        assert.deepEqual(feed.needs.map(item => item.id), ['duel-4', 'friend-9']);
        assert.deepEqual(feed.news.map(item => item.id), ['duel-report-6', 'report-5', 'news-ab12']);
        assert.equal(feed.news[0].href, '/reports?tab=duels');
        assert.match(feed.needs[0].text, /Ana desafiou/);
    }
    finally {
        DuelModel.challenges = original.duels;
        FriendModel.list = original.friends;
        ReportModel.unreadFeed = original.reports;
        DuelModel.unreadReports = original.duelsDone;
        NewsModel.list = original.news;
    }
});

test('a read conversation or an answered invite refreshes the counters, and stop unsubscribes', async () => {
    const bus = fakeBus();
    const listeners = new Map();
    let unsubscribed = 0;
    bus.on = (name, listener) => {
        listeners.set(name, [...(listeners.get(name) ?? []), listener]);
        return () => { unsubscribed += 1; };
    };
    let calls = 0;
    const service = new NotificationService({
        counts: async () => { calls += 1; return COUNTS; },
        slots: async () => ({ serverNow: '2026-01-01 10:00:00', slots: [] }),
        bus,
    });
    const documentRef = { hidden: false, addEventListener: () => {}, removeEventListener: () => {} };
    service.start({ document: documentRef });
    await flush();
    assert.equal(calls, 1);
    assert.deepEqual([...listeners.keys()], [APP_EVENTS.messagesRead, APP_EVENTS.friendsAnswered]);

    for (const listener of listeners.get(APP_EVENTS.messagesRead)) listener({ userId: 7, read: 1, unreadTotal: 0 });
    await flush();
    assert.equal(calls, 2);
    for (const listener of listeners.get(APP_EVENTS.friendsAnswered)) listener({ id: 3, accepted: true });
    await flush();
    assert.equal(calls, 3);
    service.stop();
    assert.equal(unsubscribed, 2);
});

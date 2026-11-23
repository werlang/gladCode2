// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/profile-signals.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

/** A deferred promise resolved by the test. */
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return { promise, resolve, reject };
}

/** The parts of an element the section controllers touch. */
function fakeNode(children = {}) {
    const classes = new Set();
    const listeners = new Map();
    const element = {
        innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false,
        replaced: 0, appended: 0, removed: 0, style: {}, offsetWidth: 0, offsetHeight: 0,
        getClientRects: () => [],
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: name => classes.has(name),
        },
        querySelector: selector => children[selector] ?? null,
        querySelectorAll: () => [],
        replaceChildren: () => { element.replaced += 1; },
        append: () => { element.appended += 1; },
        prepend: () => { element.appended += 1; },
        remove: () => { element.removed += 1; },
        addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        fire: (name, event = {}) => Promise.all((listeners.get(name) ?? []).map(listener => listener(event))),
        removeEventListener: () => {},
        insertAdjacentHTML: () => {},
        setAttribute: () => {},
        removeAttribute: () => {},
        getAttribute: () => null,
        focus: () => {},
        closest: () => null,
        animate: null,
    };
    return element;
}

/** Installs just enough document for the controllers to construct and render. */
function installDocument(map) {
    globalThis.getComputedStyle = () => ({ display: 'block' });
    globalThis.document = {
        querySelector: selector => map.get(selector) ?? null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        createElement: () => {
            const node = fakeNode();
            node.content = {
                firstElementChild: fakeNode({
                    '.page-header-title': fakeNode(),
                    '.page-header-subtitle': fakeNode(),
                    '.page-header-actions': fakeNode(),
                }),
            };
            return node;
        },
        body: fakeNode(),
        documentElement: fakeNode(),
        activeElement: null,
    };
}

const { NewsTab } = await import('../../web/public/script/profile/news.js');
const { FriendsTab } = await import('../../web/public/script/profile/friends.js');
const { GladsTab } = await import('../../web/public/script/profile/glads.js');
const { MessagesTab } = await import('../../web/public/script/profile/messages.js');
const { PotionsTab } = await import('../../web/public/script/profile/potions.js');
const { RankingTab } = await import('../../web/public/script/profile/ranking.js');
const { ReportsTab } = await import('../../web/public/script/profile/reports.js');
const { SettingsTab } = await import('../../web/public/script/profile/settings.js');
const { BattleTab } = await import('../../web/public/script/profile/battle.js');
const { ChallengeList } = await import('../../web/public/script/profile/duels.js');
const { RankedBattle } = await import('../../web/public/script/profile/ranked.js');
const { NewsModel } = await import('../../web/public/script/models/news.js');
const { DuelModel, FriendModel, MessageModel, ReportModel } = await import('../../web/public/script/models/social.js');
const { GladiatorModel } = await import('../../web/public/script/models/gladiator.js');
const { PotionModel } = await import('../../web/public/script/models/potion.js');
const { RankModel } = await import('../../web/public/script/models/rank.js');
const { profile } = await import('../../web/public/script/profile/session.js');

profile.user = { id: 1, nickname: 'Test', level: 10, premium: false, silver: 0 };

/** The Notícias shell's nodes, so show() can build its loading state. */
function newsContainer() {
    const children = {};
    for (const selector of [
        '#news-featured', '#news-previous', '#news-list', '#news-more', '#news-empty', '#news-error',
        '#news-todo-list', '#news-todo-count', '#news-todo-empty', '#news-tournament',
        '#news-tournament-name', '#news-bracket', '#news-countdown',
    ]) {
        children[selector] = fakeNode();
    }
    return fakeNode(children);
}

test('news drops a response that arrives after the section was left', async () => {
    const container = newsContainer();
    installDocument(new Map([['#panel #news-container', container]]));
    const original = NewsModel.list;
    const pending = deferred();
    NewsModel.list = () => pending.promise;
    try {
        const tab = new NewsTab();
        const controller = new AbortController();
        const shown = tab.show({}, { signal: controller.signal });
        // the loading shell is painted before the API answers
        assert.match(container.innerHTML, /news-page/);
        assert.match(container.querySelector('#news-featured').innerHTML, /news-featured-skeleton/);
        controller.abort();
        pending.resolve([{ title: 'Late', time: '2026-01-01', body: 'x', hash: 'ab' }]);
        await shown;
        // the late post never reaches the section
        assert.doesNotMatch(container.querySelector('#news-featured').innerHTML, /Late/);
    }
    finally {
        NewsModel.list = original;
    }
});

test('friends ignores a reopened request that resolves out of order', async () => {
    const options = fakeNode();
    const requests = fakeNode();
    const friends = fakeNode();
    const requestTable = fakeNode();
    const friendTable = fakeNode();
    const searchInput = fakeNode();
    const searchTable = fakeNode();
    const panel = fakeNode({
        '#friends .options': options,
        '#request': requests,
        '#friends': friends,
        '#request .table': requestTable,
        '#friends .table': friendTable,
        '#search .input': searchInput,
        '#search .table': searchTable,
    });
    installDocument(new Map([['#friend-panel', panel]]));
    const original = FriendModel.list;
    const first = deferred();
    const second = deferred();
    const calls = [first, second];
    FriendModel.list = () => calls.shift().promise;
    try {
        const tab = new FriendsTab();
        const firstController = new AbortController();
        const firstShown = tab.show({}, { signal: firstController.signal });
        firstController.abort();

        const secondController = new AbortController();
        const secondShown = tab.show({}, { signal: secondController.signal });
        first.resolve({ pending: [], confirmed: [] });
        await firstShown;
        assert.equal(requestTable.replaced, 0);
        assert.equal(friendTable.replaced, 0);

        second.resolve({ pending: [], confirmed: [] });
        await secondShown;
        assert.equal(requestTable.replaced, 1);
        assert.equal(friendTable.replaced, 1);
    }
    finally {
        FriendModel.list = original;
    }
});

test('gladiators drop a response that arrives after the section was left', async () => {
    const container = fakeNode();
    const battle = fakeNode();
    installDocument(new Map([
        ['#glads-container .glad-card-container', container],
        ['#menu #battle', battle],
    ]));
    const original = GladiatorModel.list;
    const pending = deferred();
    GladiatorModel.list = () => pending.promise;
    try {
        const tab = new GladsTab();
        const controller = new AbortController();
        const shown = tab.show({}, { signal: controller.signal });
        controller.abort();
        pending.resolve([{ name: 'Late' }]);
        await shown;
        assert.equal(container.replaced, 0);
        assert.equal(battle.classList.contains('disabled'), false);
    }
    finally {
        GladiatorModel.list = original;
    }
});

test('messages drop a late page and keep the previous table', async () => {
    const table = fakeNode();
    const pageTitle = fakeNode();
    const panel = fakeNode({
        '.table': table,
        '#page-title': pageTitle,
        '#prev': fakeNode(),
        '#next': fakeNode(),
    });
    table.innerHTML = 'previous';
    installDocument(new Map([['#message-panel', panel]]));
    const original = MessageModel.list;
    const pending = deferred();
    MessageModel.list = () => pending.promise;
    try {
        const tab = new MessagesTab();
        const controller = new AbortController();
        const shown = tab.show({}, { signal: controller.signal });
        controller.abort();
        pending.resolve({ meta: { total: 0, start: 0, end: 0, page: 1 }, messages: [] });
        await shown;
        assert.equal(table.innerHTML, 'previous');
    }
    finally {
        MessageModel.list = original;
    }
});

test('potions do not draw slots from an aborted load', async () => {
    const container = fakeNode();
    const browse = fakeNode();
    const panel = fakeNode({
        '#my-pots': container,
        '#browse': browse,
    });
    installDocument(new Map([['#apot-container', panel]]));
    const original = PotionModel.slots;
    const pending = deferred();
    PotionModel.slots = () => pending.promise;
    try {
        const tab = new PotionsTab();
        const controller = new AbortController();
        const shown = tab.show({}, { signal: controller.signal });
        controller.abort();
        pending.resolve({ slots: [], level: 1, unlockLevels: [0, 0, 0, 0] });
        await shown;
        assert.equal(container.replaced, 0);
        tab.unmount();
    }
    finally {
        PotionModel.slots = original;
    }
});

test('reports keep the placeholder when the page arrives after leaving', async () => {
    const table = fakeNode();
    const unread = fakeNode({ input: fakeNode() });
    const panel = fakeNode({
        '#bhist-container .table': table,
        '#unread': unread,
        '#prev': fakeNode(),
        '#next': fakeNode(),
    });
    installDocument(new Map([['#report-container', panel]]));
    const original = ReportModel.battles;
    const pending = deferred();
    ReportModel.battles = () => pending.promise;
    try {
        const tab = new ReportsTab();
        const controller = new AbortController();
        const shown = tab.show({}, { signal: controller.signal });
        const placeholder = table.innerHTML;
        controller.abort();
        pending.resolve({ total: 1, reports: [{ id: 1 }] });
        await shown;
        assert.equal(table.innerHTML, placeholder);
    }
    finally {
        ReportModel.battles = original;
    }
});

test('battle loads the default ranked mode with the navigation signal', async () => {
    const panel = fakeNode();
    installDocument(new Map([
        ['#panel #battle-container', panel],
        ['#duel-challenge', fakeNode({ '.table': fakeNode() })],
        ['#battle-container #ranked.wrapper .glad-card-container', fakeNode()],
        ['#battle-container #match-find', fakeNode()],
        ['#panel #battle-container #tourn.wrapper', fakeNode({ '#create': fakeNode(), '#join': fakeNode() })],
        ['#panel #battle-container #train.wrapper', fakeNode({ '#create': fakeNode(), '#join': fakeNode() })],
    ]));
    const tab = new BattleTab(() => {});
    const received = [];
    tab.ranked = { refresh: options => received.push(options) };
    tab.challenges = { refresh: options => received.push(options) };
    const controller = new AbortController();
    await tab.show({}, { signal: controller.signal });
    assert.deepEqual(received, [{ signal: controller.signal }]);
});

test('tournament and training routes load only their own mode', async () => {
    const buttons = ['ranked', 'duel', 'tourn', 'train'].map(id => {
        const button = fakeNode();
        button.id = id;
        return button;
    });
    const wrappers = Object.fromEntries(['ranked', 'duel', 'tourn', 'train'].map(id => [id, fakeNode()]));
    const panel = fakeNode();
    panel.querySelectorAll = selector => {
        if (selector === '#battle-mode .button') return buttons;
        if (selector === '.wrapper') return Object.values(wrappers);
        return [];
    };
    panel.querySelector = selector => {
        const match = selector.match(/^#(\w+)\.wrapper$/);
        return match ? wrappers[match[1]] : null;
    };
    installDocument(new Map([
        ['#panel #battle-container', panel],
        ['#duel-challenge', fakeNode({ '.table': fakeNode() })],
        ['#battle-container #ranked.wrapper .glad-card-container', fakeNode()],
        ['#battle-container #match-find', fakeNode()],
        ['#panel #battle-container #tourn.wrapper', fakeNode({ '#create': fakeNode(), '#join': fakeNode() })],
        ['#panel #battle-container #train.wrapper', fakeNode({ '#create': fakeNode(), '#join': fakeNode() })],
    ]));
    for (const mode of ['tourn', 'train']) {
        const tab = new BattleTab(() => {});
        const loaded = [];
        tab.ranked = { refresh: async () => { throw new Error('ranked down'); } };
        tab.challenges = { refresh: async () => { throw new Error('duels down'); } };
        tab.tournaments = { refresh: async options => loaded.push(['tourn', options]) };
        tab.trainings = { refresh: async options => loaded.push(['train', options]) };
        const controller = new AbortController();
        await tab.show({ subtab: mode }, { signal: controller.signal });
        assert.deepEqual(loaded, [[mode, { signal: controller.signal }]]);
        assert.equal(buttons.find(button => button.id === mode).classList.contains('selected'), true);
        assert.notEqual(wrappers[mode].style.display, 'none');
    }
});

test('battle duel challenges drop a late list', async () => {
    const table = fakeNode();
    const panel = fakeNode({ '.table': table });
    installDocument(new Map([['#duel-challenge', panel]]));
    const original = DuelModel.challenges;
    const pending = deferred();
    DuelModel.challenges = () => pending.promise;
    try {
        const list = new ChallengeList(() => {});
        const controller = new AbortController();
        const shown = list.refresh({ signal: controller.signal });
        controller.abort();
        pending.resolve([{ id: 1 }]);
        await shown;
        assert.equal(table.replaced, 0);
    }
    finally {
        DuelModel.challenges = original;
    }
});

test('the ranked battle cards drop a late gladiator list', async () => {
    const container = fakeNode();
    installDocument(new Map([
        ['#battle-container #ranked.wrapper .glad-card-container', container],
        ['#battle-container #match-find', fakeNode()],
    ]));
    const original = GladiatorModel.list;
    const pending = deferred();
    GladiatorModel.list = () => pending.promise;
    try {
        const ranked = new RankedBattle(() => {});
        const controller = new AbortController();
        const shown = ranked.refresh({ signal: controller.signal });
        controller.abort();
        pending.resolve([{ name: 'Late' }]);
        await shown;
        assert.equal(container.replaced, 0);
    }
    finally {
        GladiatorModel.list = original;
    }
});

test('settings makes no changes when its navigation signal was already aborted', async () => {
    const nickname = fakeNode();
    nickname.value = 'keep';
    const panel = fakeNode({
        '#nickname .input': nickname,
        '#language select': fakeNode(),
        '#site-theme select': fakeNode(),
        '#glad-view select': fakeNode(),
    });
    installDocument(new Map([['#profile-panel', panel]]));
    profile.user = { ...profile.user, nickname: 'Other', picture: '', preferences: { friend: true } };
    const tab = new SettingsTab();
    const controller = new AbortController();
    controller.abort();
    tab.show({}, { signal: controller.signal });
    assert.equal(nickname.value, 'keep');
});

test('a failed friend search clears only its side panel', async () => {
    const options = fakeNode({ '.unfriend': fakeNode(), '.message': fakeNode(), '.duel': fakeNode() });
    const requests = fakeNode();
    const friendBox = fakeNode();
    const requestTable = fakeNode();
    const friendTable = fakeNode();
    const searchInput = fakeNode();
    const searchTable = fakeNode();
    const panel = fakeNode({
        '#friends .options': options,
        '#request': requests,
        '#friends': friendBox,
        '#request .table': requestTable,
        '#friends .table': friendTable,
        '#search .input': searchInput,
        '#search .table': searchTable,
    });
    installDocument(new Map([['#friend-panel', panel]]));
    const original = { list: FriendModel.list, search: FriendModel.search };
    FriendModel.list = async () => ({ pending: [], confirmed: [] });
    FriendModel.search = async () => {
        throw new Error('search down');
    };
    try {
        const tab = new FriendsTab();
        tab.init();
        const controller = new AbortController();
        await tab.show({}, { signal: controller.signal });
        searchInput.value = 'any';
        await searchInput.fire('input');
        assert.equal(searchTable.replaced, 1);
        assert.equal(requestTable.replaced, 1);
        assert.equal(friendTable.replaced, 1);
    }
    finally {
        FriendModel.list = original.list;
        FriendModel.search = original.search;
    }
});

test('a failed potion catalogue still loads the primary slots', async () => {
    const container = fakeNode();
    const browse = fakeNode();
    const panel = fakeNode({ '#my-pots': container, '#browse': browse });
    installDocument(new Map([
        ['#apot-container', panel],
        ['#apot-panel', fakeNode()],
    ]));
    const original = { catalog: PotionModel.catalog, apothecary: PotionModel.apothecary, slots: PotionModel.slots };
    PotionModel.catalog = async () => {
        throw new Error('catalogue down');
    };
    PotionModel.apothecary = async () => {
        throw new Error('apothecary down');
    };
    let slotReads = 0;
    PotionModel.slots = async () => {
        slotReads += 1;
        return { slots: [], level: 1, unlockLevels: [0, 0, 0, 0] };
    };
    profile.user = { ...profile.user, apothecary: 1 };
    try {
        const tab = new PotionsTab();
        await tab.init();
        assert.equal(slotReads, 1);
        assert.equal(container.replaced, 1);
        assert.equal(browse.disabled, true);
        tab.unmount();
    }
    finally {
        PotionModel.catalog = original.catalog;
        PotionModel.apothecary = original.apothecary;
        PotionModel.slots = original.slots;
    }
});

test('a failed duel friend filter does not reject the duel mode', async () => {
    const panel = fakeNode({
        '#duel.wrapper .input': fakeNode(),
        '#duel.wrapper #table-friends': fakeNode(),
        '#duel.wrapper #challenge': fakeNode(),
    });
    installDocument(new Map([
        ['#panel #battle-container', panel],
        ['#duel-challenge', fakeNode({ '.table': fakeNode() })],
        ['#battle-container #ranked.wrapper .glad-card-container', fakeNode()],
        ['#battle-container #match-find', fakeNode()],
        ['#panel #battle-container #tourn.wrapper', fakeNode({ '#create': fakeNode(), '#join': fakeNode() })],
        ['#panel #battle-container #train.wrapper', fakeNode({ '#create': fakeNode(), '#join': fakeNode() })],
    ]));
    const original = FriendModel.filter;
    FriendModel.filter = async () => {
        throw new Error('friends down');
    };
    let challengeLoads = 0;
    try {
        const tab = new BattleTab(() => {});
        tab.ranked = { refresh: async () => { throw new Error('ranked down'); } };
        tab.challenges = { refresh: async () => { challengeLoads += 1; } };
        tab.tournaments = { refresh: async () => { throw new Error('tournaments down'); } };
        tab.trainings = { refresh: async () => { throw new Error('trainings down'); } };
        const controller = new AbortController();
        await tab.show({ subtab: 'duel' }, { signal: controller.signal });
        assert.equal(challengeLoads, 1);
    }
    finally {
        FriendModel.filter = original;
    }
});

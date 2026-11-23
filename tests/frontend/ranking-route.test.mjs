// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/ranking-route.test.mjs
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

/** The parts of an element the ranking controller touches. */
function fakeNode(children = {}) {
    const classes = new Set();
    const listeners = new Map();
    const element = {
        innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false,
        replaced: 0, appended: 0, removed: 0, style: {},
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

/** Installs just enough document for the controller to construct and render. */
function installDocument(map) {
    globalThis.getComputedStyle = () => ({ display: 'block' });
    globalThis.document = {
        querySelector: selector => map.get(selector) ?? null,
        querySelectorAll: () => [],
        addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        fire: (name, event = {}) => Promise.all((listeners.get(name) ?? []).map(listener => listener(event))),
        removeEventListener: () => {},
        createElement: () => fakeNode(),
        body: fakeNode(),
        documentElement: fakeNode(),
        activeElement: null,
    };
}

const { RankingTab } = await import('../../web/public/script/profile/ranking.js');
const { RankModel } = await import('../../web/public/script/models/rank.js');
const { RequestError } = await import('../../web/public/script/helpers/request.js');
const { runSectionTask, settleRequest } = await import('../../web/public/script/helpers/section-request.js');
const { profile } = await import('../../web/public/script/profile/session.js');

profile.user = { id: 1, nickname: 'Test', level: 10, premium: false, silver: 0 };

test('ranking starts a filtered route at page zero and drops the late answer', async () => {
    const table = fakeNode();
    const search = fakeNode();
    const panel = fakeNode({
        '.table': table,
        '#search .input': search,
        '#tab-general': fakeNode(),
        '#add-tab': fakeNode(),
        '#prev': fakeNode(),
        '#next': fakeNode(),
    });
    panel.querySelectorAll = selector => (selector === '.page-nav span' ? [fakeNode(), fakeNode(), fakeNode()] : []);
    installDocument(new Map([['#ranking-container', panel]]));
    const original = {
        tabs: RankModel.tabs,
        general: RankModel.general,
        best: RankModel.myBestOffset,
    };
    const tabs = deferred();
    const general = deferred();
    RankModel.tabs = () => tabs.promise;
    RankModel.general = query => {
        assert.equal(query.offset, 0);
        assert.equal(query.search, 'Magnus');
        assert.ok(query.signal);
        return general.promise;
    };
    let bestCalls = 0;
    RankModel.myBestOffset = async () => {
        bestCalls += 1;
        return 127;
    };
    try {
        const tab = new RankingTab();
        const controller = new AbortController();
        const shown = tab.show({ query: { q: 'Magnus' } }, { signal: controller.signal });
        assert.equal(bestCalls, 0);
        assert.equal(search.value, 'Magnus');
        tabs.resolve([]);
        await Promise.resolve();
        await Promise.resolve();
        const placeholder = table.innerHTML;
        controller.abort();
        general.resolve({ total: 1, ranking: [{ position: 1, gladiator: 'Magnus', master: 'Mestre', change24h: 0, mmr: 1400 }] });
        await shown;
        assert.equal(table.innerHTML, placeholder);
    }
    finally {
        RankModel.tabs = original.tabs;
        RankModel.general = original.general;
        RankModel.myBestOffset = original.best;
    }
});

test('ranking clears the filter when the route no longer has q', async () => {
    const table = fakeNode();
    const search = fakeNode();
    const panel = fakeNode({
        '.table': table,
        '#search .input': search,
        '#tab-general': fakeNode(),
        '#add-tab': fakeNode(),
        '#prev': fakeNode(),
        '#next': fakeNode(),
    });
    panel.querySelectorAll = selector => (selector === '.page-nav span' ? [fakeNode(), fakeNode(), fakeNode()] : []);
    installDocument(new Map([['#ranking-container', panel]]));
    const original = {
        tabs: RankModel.tabs,
        general: RankModel.general,
        best: RankModel.myBestOffset,
    };
    search.value = 'Magnus';
    const offsets = [];
    RankModel.tabs = async () => [];
    RankModel.general = query => {
        offsets.push(query.offset);
        return Promise.resolve({ total: 200, ranking: [] });
    };
    RankModel.myBestOffset = async () => 127;
    try {
        const tab = new RankingTab();
        await tab.show({}, { signal: new AbortController().signal });
        assert.equal(search.value, '');
        assert.deepEqual(offsets, [120]);
    }
    finally {
        RankModel.tabs = original.tabs;
        RankModel.general = original.general;
        RankModel.myBestOffset = original.best;
    }
});

test('a typed search rejected by navigation is swallowed at the section boundary', async () => {
    const table = fakeNode();
    const search = fakeNode();
    const panel = fakeNode({
        '.table': table,
        '#search .input': search,
        '#tab-general': fakeNode(),
        '#add-tab': fakeNode(),
        '#prev': fakeNode(),
        '#next': fakeNode(),
    });
    panel.querySelectorAll = selector => (selector === '.page-nav span' ? [fakeNode(), fakeNode(), fakeNode()] : []);
    installDocument(new Map([['#ranking-container', panel]]));
    const original = {
        tabs: RankModel.tabs,
        general: RankModel.general,
        best: RankModel.myBestOffset,
    };
    RankModel.tabs = async () => [];
    RankModel.myBestOffset = async () => 0;
    RankModel.general = async () => ({ total: 200, ranking: [] });
    try {
        const tab = new RankingTab();
        tab.init();
        const controller = new AbortController();
        await tab.show({}, { signal: controller.signal });

        const aborted = () => new RequestError(0, 'Request aborted', undefined, { aborted: true });
        RankModel.general = () => {
            if (controller.signal.aborted) return Promise.reject(aborted());
            return new Promise((resolve, reject) => {
                controller.signal.addEventListener('abort', () => reject(aborted()), { once: true });
            });
        };
        search.value = 'Delay';
        const before = table.innerHTML;
        const typed = search.fire('input');
        controller.abort();
        await typed;
        assert.equal(table.innerHTML, before);
    }
    finally {
        RankModel.tabs = original.tabs;
        RankModel.general = original.general;
        RankModel.myBestOffset = original.best;
    }
});

test('the section request boundary recognizes abort errors and keeps other failures', async () => {
    const aborted = new RequestError(0, 'Request aborted', undefined, { aborted: true });
    assert.equal(await settleRequest(async () => {
        throw aborted;
    }), undefined);
    await runSectionTask(async () => {
        throw aborted;
    });
    await assert.rejects(settleRequest(async () => {
        throw new Error('server down');
    }), /server down/);
});

// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/ranking-route.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

/** A small node with the parts the ranking components touch. */
function fakeNode(children = {}) {
    const classes = new Set();
    const listeners = new Map();
    const auto = new Map();
    const element = {
        innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false,
        replaced: 0, appended: 0, appendedNodes: [], style: {}, dataset: {}, tabIndex: 0,
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: name => classes.has(name),
        },
        querySelector: selector => {
            if (Object.hasOwn(children, selector)) return children[selector];
            if (!auto.has(selector)) auto.set(selector, fakeNode());
            return auto.get(selector);
        },
        querySelectorAll: () => [],
        replaceChildren: () => { element.replaced += 1; element.textContent = ''; },
        append: (...nodes) => {
            element.appended += nodes.length;
            element.appendedNodes.push(...nodes);
            element.textContent += nodes.map(node => node.textContent ?? '').join('');
        },
        remove: () => {},
        addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        removeEventListener: () => {},
        dispatchEvent: event => {
            if (!event.target) Object.defineProperty(event, 'target', { value: element, configurable: true });
            for (const listener of listeners.get(event.type) ?? []) listener(event);
            return true;
        },
        fire: (name, detail) => {
            const event = new CustomEvent(name, { detail });
            Object.defineProperty(event, 'target', { value: element, configurable: true });
            for (const listener of listeners.get(name) ?? []) listener(event);
        },
        click: () => {
            const event = new CustomEvent('click');
            Object.defineProperty(event, 'target', { value: element, configurable: true });
            for (const listener of listeners.get('click') ?? []) listener(event);
        },
        focus: () => { globalThis.document.activeElement = element; },
        contains: candidate => candidate === element,
        setAttribute: (name, value) => { element[name] = value; },
        getAttribute: name => element[name] ?? null,
        removeAttribute: name => { delete element[name]; },
        insertAdjacentHTML: () => {},
        scrollIntoView: () => {},
    };
    return element;
}

function installDocument(map) {
    globalThis.document = {
        querySelector: selector => map.get(selector) ?? null,
        querySelectorAll: () => [],
        createElement: () => {
            const node = fakeNode();
            node.content = { firstElementChild: fakeNode() };
            return node;
        },
        createTextNode: text => ({ textContent: String(text) }),
        createDocumentFragment: () => {
            const fragment = fakeNode();
            fragment.isFragment = true;
            return fragment;
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        body: fakeNode(),
        documentElement: fakeNode(),
        activeElement: null,
    };
}

const { RankingTab } = await import('../../web/public/script/profile/ranking.js');
const { RankingService, ranking } = await import('../../web/public/script/services/ranking.js');
const { RankingTable } = await import('../../web/public/script/components/ranking-table.js');
const { OwnGladiatorJump } = await import('../../web/public/script/components/own-gladiator-jump.js');
const { profile } = await import('../../web/public/script/profile/session.js');
const { APP_EVENTS, events } = await import('../../web/public/script/helpers/event-bus.js');

profile.user = { id: 1, nickname: 'Test', level: 10, premium: false, silver: 0, credits: 0 };

function panel() {
    const pager = fakeNode();
    const own = fakeNode();
    const table = fakeNode({ '#ranking-pager': pager, '#ranking-own': own });
    return { panel: table, pager };
}

function patchRanking(overrides) {
    const original = {};
    for (const [key, value] of Object.entries(overrides)) {
        original[key] = ranking[key];
        ranking[key] = value;
    }
    return () => {
        for (const [key, value] of Object.entries(original)) ranking[key] = value;
    };
}

test('the section opens the general ranking at offset zero', async () => {
    const { panel: root } = panel();
    installDocument(new Map([['#ranking-container', root]]));
    const calls = [];
    const restore = patchRanking({
        tabs: async () => [],
        mine: async () => ({ gladiators: [] }),
        page: async query => {
            calls.push(query);
            return { total: 4, ranking: [{ id: 1, gladiator: 'Aurora', master: 'ArenaIris', mmr: 1487, change7d: 3, position: 1 }] };
        },
        window: async () => assert.fail('the initial route is not a window'),
    });
    try {
        const tab = new RankingTab();
        await tab.show({}, { signal: new AbortController().signal });
        assert.deepEqual(calls.map(call => ({ offset: call.offset, search: call.search, scope: call.scope })), [
            { offset: 0, search: '', scope: 'all' },
        ]);
    }
    finally {
        restore();
    }
});

test('the ranking route opens the window at the requested position', async () => {
    const { panel: root } = panel();
    installDocument(new Map([['#ranking-container', root]]));
    const calls = { page: [], window: [] };
    const restore = patchRanking({
        tabs: async () => [],
        mine: async () => ({ gladiators: [] }),
        page: async query => {
            calls.page.push(query);
            return { total: 4, ranking: [{ id: 1, gladiator: 'Aurora', master: 'ArenaIris', mmr: 1487, change7d: 3, position: 1 }] };
        },
        window: async query => {
            calls.window.push(query);
            return {
                total: 4, position: 3, page: 1, pageSize: 10, around: 'Brutus',
                rows: [{ id: 2, gladiator: 'Brutus', master: 'ArenaIris', mmr: 1362, change7d: 0, position: 3 }],
            };
        },
    });
    try {
        const tab = new RankingTab();
        await tab.show({ query: { at: 3 } }, { signal: new AbortController().signal });
        assert.deepEqual(calls.page.map(call => call.offset), [0]);
        assert.deepEqual(calls.window.map(call => ({ position: call.position, size: call.size })), [{ position: 3, size: 9 }]);
    }
    finally {
        restore();
    }
});

test('a ranked own chip jumps through the window and the shell URL event', async () => {
    const { panel: root } = panel();
    installDocument(new Map([['#ranking-container', root]]));
    const windows = [];
    const jumped = [];
    const unsubscribe = events.on(APP_EVENTS.rankingJumped, detail => jumped.push(detail));
    const restore = patchRanking({
        tabs: async () => [],
        mine: async () => ({ gladiators: [{ id: 9, name: 'Aurora', position: 2, state: 'ranked', skin: '' }] }),
        page: async () => ({ total: 4, ranking: [] }),
        window: async query => {
            windows.push(query);
            return { total: 4, position: 2, page: 1, pageSize: 10, around: 'Aurora', rows: [] };
        },
    });
    try {
        const tab = new RankingTab();
        await tab.show({}, { signal: new AbortController().signal });
        // The own component is the first appended node of #ranking-own.
        const own = root.querySelector('#ranking-own').appendedNodes[0];
        // Find the ranked chip rendered by the component.
        const list = own.querySelector('.own-gladiator-list');
        const chip = list.appendedNodes.find(node => node.dataset.state === 'ranked');
        chip.click();
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.deepEqual(windows.map(query => ({ gladiatorId: query.gladiatorId })), [{ gladiatorId: 9 }]);
        assert.deepEqual(jumped, [{ gladiatorId: 9, position: 2 }]);
    }
    finally {
        unsubscribe();
        restore();
    }
});

test('the ranking service caches the podium from the first unfiltered page', async () => {
    const page = {
        total: 10,
        ranking: [
            { id: 1, gladiator: 'A', mmr: 3, position: 1 },
            { id: 2, gladiator: 'B', mmr: 2, position: 2 },
            { id: 3, gladiator: 'C', mmr: 1, position: 3 },
        ],
    };
    const model = {
        general: async () => page,
        window: async query => ({ query }),
        mine: async () => ({ gladiators: [] }),
    };
    const service = new RankingService({ model });
    await service.page({ offset: 0 });
    assert.equal(service.top.length, 3);
    await service.page({ offset: 10 });
    assert.equal(service.top.length, 3);
    await service.page({ offset: 0, search: 'A' });
    assert.equal(service.top.length, 3);
    assert.deepEqual(await service.window({ position: 2 }), { query: { position: 2 } });
});

test('the table marks the own row, the trend and the context', () => {
    const element = fakeNode();
    const table = new RankingTable({ element });
    table.setRows([
        { id: 1, gladiator: 'Aurora', master: 'ArenaIris', mmr: 1487, change7d: 9, position: 1, mine: true },
        { id: 2, gladiator: 'Brutus', master: 'ArenaIris', mmr: 1362, change7d: -3, position: 2 },
        { id: 3, gladiator: 'Cícero', master: 'ArenaIris', mmr: 1188, change7d: 0, position: 3 },
    ]);
    const html = element.querySelector('tbody').innerHTML;
    assert.match(html, /VOCÊ/);
    assert.match(html, /is-mine/);
    assert.match(html, /subiu 9/);
    assert.match(html, /desceu 3/);
    table.setContext({ around: 'Aurora', position: 1, page: 1, total: 40, pageSize: 10 });
    assert.match(element.querySelector('.ranking-context-text').textContent, /Em volta de/);
});

test('an own strip keeps the position of outdated and broken chips', () => {
    const element = fakeNode();
    const jumps = [];
    const strip = new OwnGladiatorJump({ element, paint: () => {} });
    strip.listen('jump', detail => jumps.push(detail));
    strip.setGladiators([
        { id: 1, name: 'Aurora', position: 2, state: 'ranked', skin: '' },
        { id: 2, name: 'Cícero', position: 220, state: 'outdated', skin: '' },
        { id: 3, name: 'Ferrugem', position: 240, state: 'broken', skin: '' },
    ]);
    const chips = element.querySelector('.own-gladiator-list').appendedNodes;
    assert.equal(chips.length, 3);
    assert.equal(chips[0].disabled, false);
    assert.equal(chips[0].dataset.state, 'ranked');
    assert.equal(chips[1].disabled, false);
    assert.equal(chips[1].dataset.state, 'outdated');
    assert.equal(chips[2].disabled, false);
    assert.equal(chips[2].dataset.state, 'broken');
    chips[1].click();
    assert.deepEqual(jumps, [{ gladiator: { id: 2, name: 'Cícero' }, position: 220 }]);
});

test('a search answer that arrives after leaving does not replace the table', async () => {
    const { panel: root } = panel();
    installDocument(new Map([['#ranking-container', root]]));
    let release;
    let started;
    const startedPromise = new Promise(resolve => { started = resolve; });
    const restore = patchRanking({
        tabs: async () => [],
        mine: async () => ({ gladiators: [] }),
        page: query => {
            if (query.search === 'Aurora') {
                started();
                return new Promise(resolve => { release = () => resolve({ total: 1, ranking: [] }); });
            }
            return Promise.resolve({ total: 4, ranking: [] });
        },
        window: async () => ({ total: 4, position: 1, page: 1, pageSize: 10, around: null, rows: [] }),
    });
    try {
        const tab = new RankingTab();
        await tab.show({}, { signal: new AbortController().signal });
        const body = root.querySelector('#ranking-table-host').appendedNodes[0].querySelector('tbody');
        body.innerHTML = 'previous rows';
        const controller = new AbortController();
        const shown = tab.show({ query: { q: 'Aurora' } }, { signal: controller.signal });
        await startedPromise;
        controller.abort();
        release();
        await shown;
        assert.equal(body.innerHTML, 'previous rows');
    }
    finally {
        restore();
    }
});

test('Voltar ao topo leaves the window and reloads the general first page', async () => {
    const { panel: root } = panel();
    installDocument(new Map([['#ranking-container', root]]));
    const calls = [];
    const topped = [];
    const unsubscribe = events.on(APP_EVENTS.rankingTopped, detail => topped.push(detail));
    const restore = patchRanking({
        tabs: async () => [],
        mine: async () => ({ gladiators: [] }),
        page: async query => {
            calls.push(query.offset);
            return { total: 4, ranking: [] };
        },
        window: async () => ({ total: 4, position: 3, page: 1, pageSize: 10, around: 'Brutus', rows: [] }),
    });
    try {
        const tab = new RankingTab();
        await tab.show({ query: { at: 3 } }, { signal: new AbortController().signal });
        const table = root.querySelector('#ranking-table-host').appendedNodes[0];
        table.querySelector('.ranking-top').click();
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(calls.at(-1), 0);
        assert.deepEqual(topped, [{}]);
    }
    finally {
        unsubscribe();
        restore();
    }
});

test('a stale read failure is ignored without a toast', async () => {
    const { panel: root } = panel();
    installDocument(new Map([['#ranking-container', root]]));
    let failOld;
    let started;
    const startedPromise = new Promise(resolve => { started = resolve; });
    const restore = patchRanking({
        tabs: async () => [],
        mine: async () => ({ gladiators: [] }),
        page: query => {
            if (query.search === 'Old') {
                started();
                return new Promise((resolve, reject) => { failOld = () => reject(new Error('old failure')); });
            }
            return Promise.resolve({ total: 4, ranking: [] });
        },
        window: async () => ({ total: 4, position: 1, page: 1, pageSize: 10, around: null, rows: [] }),
    });
    try {
        const tab = new RankingTab();
        await tab.show({}, { signal: new AbortController().signal });
        const old = tab.show({ query: { q: 'Old' } }, { signal: new AbortController().signal });
        await startedPromise;
        const fresh = tab.show({ query: { q: 'New' } }, { signal: new AbortController().signal });
        await fresh;
        failOld();
        await old;
        assert.equal(document.body.appendedNodes.length, 0);
    }
    finally {
        restore();
    }
});

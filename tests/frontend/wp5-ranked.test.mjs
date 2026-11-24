// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wp5-ranked.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
    return { promise, resolve, reject };
}

/** A tiny element with the children and events the ranked components touch. */
function fakeNode() {
    const classes = new Set();
    const listeners = new Map();
    const children = new Map();
    const node = {
        dataset: {}, hidden: false, disabled: false, innerHTML: '', textContent: '', className: '', value: '',
        style: { width: '', setProperty: () => {}, removeProperty: () => {} },
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
        append: (...items) => { node.appended.push(...items); },
        replaceChildren: () => { node.appended = []; },
        appended: [],
        remove: () => {},
        contains: () => false,
        addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        removeEventListener: () => {},
        dispatchEvent: event => {
            Object.defineProperty(event, 'target', { value: node, configurable: true });
            for (const listener of listeners.get(event.type) ?? []) listener(event);
            return true;
        },
        insertAdjacentHTML: () => {},
        setAttribute: () => {},
        removeAttribute: () => {},
        getAttribute: () => null,
    };
    return node;
}

const pickerRoot = fakeNode();
const versusRoot = fakeNode();
globalThis.document = {
    querySelector: selector => selector === '#ranked-picker' ? pickerRoot : selector === '#ranked-versus' ? versusRoot : null,
    querySelectorAll: () => [],
    createElement: tagName => {
        const node = fakeNode();
        if (tagName === 'template') node.content = { firstElementChild: fakeNode() };
        return node;
    },
    body: fakeNode(),
    documentElement: fakeNode(),
    addEventListener: () => {},
    removeEventListener: () => {},
};

const { RankedBattle } = await import('../../web/public/script/profile/ranked.js');
const { GladiatorModel } = await import('../../web/public/script/models/gladiator.js');
const { PotionModel } = await import('../../web/public/script/models/potion.js');
const { RankedModel } = await import('../../web/public/script/models/social.js');
const { profile } = await import('../../web/public/script/profile/session.js');
const { site } = await import('../../web/public/script/helpers/request.js');

profile.user = { level: 10, xp: '0', silver: '0' };
const glad = { id: 9001, name: 'Aurora', vstr: 10, vagi: 10, vint: 10, mmr: 1400, skin: '' };

/** Waits for the promise chains the components start without returning them. */
const tick = () => new Promise(resolve => setTimeout(resolve, 30));

test('leaving the section aborts matchmaking before the battle starts', async () => {
    const original = {
        list: GladiatorModel.list,
        slots: PotionModel.slots,
        match: RankedModel.match,
        fight: RankedModel.fight,
    };
    GladiatorModel.list = async () => [glad];
    PotionModel.slots = async () => ({ slots: [] });
    const pendingMatch = deferred();
    let fightCalls = 0;
    RankedModel.match = (id, options) => {
        assert.equal(id, 9001);
        assert.ok(options?.signal);
        return pendingMatch.promise;
    };
    RankedModel.fight = () => { fightCalls += 1; return Promise.resolve({ hash: 'x' }); };
    try {
        const ranked = new RankedBattle(() => {});
        const controller = new AbortController();
        await ranked.refresh({ signal: controller.signal, selectId: 9001 });
        assert.equal(versusRoot.appended.at(-1).querySelector('.versus-side').querySelector('.versus-name--mine').textContent, 'Aurora');
        versusRoot.appended.at(-1).dispatchEvent(new CustomEvent('fight'));
        await tick();
        controller.abort();
        pendingMatch.resolve({ opponents: [], match: 'm' });
        await tick();
        assert.equal(fightCalls, 0);
        const picker = pickerRoot.appended.at(-1);
        assert.equal(picker.classList.contains('is-disabled'), false);
    }
    finally {
        GladiatorModel.list = original.list;
        PotionModel.slots = original.slots;
        RankedModel.match = original.match;
        RankedModel.fight = original.fight;
    }
});

test('the chosen gladiator survives leaving and returning', async () => {
    const original = { list: GladiatorModel.list, slots: PotionModel.slots };
    GladiatorModel.list = async () => [glad];
    PotionModel.slots = async () => ({ slots: [] });
    try {
        const ranked = new RankedBattle(() => {});
        const first = new AbortController();
        await ranked.refresh({ signal: first.signal, selectId: 9001 });
        first.abort();
        const second = new AbortController();
        await ranked.refresh({ signal: second.signal, selectId: null });
        const versus = versusRoot.appended.at(-1);
        assert.equal(versus.querySelector('.versus-side').querySelector('.versus-name--mine').textContent, 'Aurora');
        assert.equal(versus.querySelector('.versus-side').querySelector('.versus-name--mine').hidden, false);
        assert.equal(versus.querySelector('.versus-fight').disabled, false);
    }
    finally {
        GladiatorModel.list = original.list;
        PotionModel.slots = original.slots;
    }
});


test('a successful match starts exactly one ranked battle', async () => {
    const original = {
        list: GladiatorModel.list,
        slots: PotionModel.slots,
        match: RankedModel.match,
        fight: RankedModel.fight,
        siteGet: site.get,
        raf: globalThis.requestAnimationFrame,
    };
    GladiatorModel.list = async () => [glad];
    PotionModel.slots = async () => ({ slots: [] });
    RankedModel.match = async () => ({
        opponents: [{ name: 'Brutus', master: 'GladiadorX', skin: '', vstr: 1, vagi: 1, vint: 1, mmr: 1000 }],
        match: 'match-token',
    });
    let fightCalls = 0;
    RankedModel.fight = async match => {
        fightCalls += 1;
        assert.equal(match, 'match-token');
        return {
            hash: 'abc',
            error: '',
            summary: { level: 10, xp: 10, silver: 20, gladiator: { id: 9001, name: 'Aurora', mmr: 1410, skin: '' } },
        };
    };
    site.get = async () => '';
    globalThis.requestAnimationFrame = callback => { callback(performance.now() + 5000); return 1; };
    let fought = 0;
    try {
        const ranked = new RankedBattle(() => { fought += 1; });
        await ranked.refresh({ signal: new AbortController().signal, selectId: 9001 });
        versusRoot.appended.at(-1).dispatchEvent(new CustomEvent('fight'));
        await new Promise(resolve => setTimeout(resolve, 80));
        assert.equal(fightCalls, 1);
        assert.equal(fought, 1);
    }
    finally {
        GladiatorModel.list = original.list;
        PotionModel.slots = original.slots;
        RankedModel.match = original.match;
        RankedModel.fight = original.fight;
        site.get = original.siteGet;
        globalThis.requestAnimationFrame = original.raf;
    }
});

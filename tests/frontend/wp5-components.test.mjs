// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wp5-components.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { attributeSegments, gladiatorCrest, gladiatorLanguage, gladiatorRecord, gladiatorState } = await import(
    '../../web/public/script/components/gladiator-card.js'
);
const { FlightGuard } = await import('../../web/public/script/helpers/flight-guard.js');
const { blockedGladiatorMessage } = await import('../../web/public/script/profile/gladiator-feedback.js');

test('a broken gladiator outranks the outdated state of the same record', () => {
    assert.equal(gladiatorState({}), 'ready');
    assert.equal(gladiatorState({ outdated: true }), 'outdated');
    assert.equal(gladiatorState({ broken: true }), 'broken');
    assert.equal(gladiatorState({ outdated: true, broken: true }), 'broken');
});

test('the crest names the language stored in the gladiator', () => {
    assert.equal(gladiatorLanguage({ code: 'loop(){ stepForward(); }' }), 'c');
    assert.equal(gladiatorLanguage({ code: 'def setup():\n    pass\n\ndef loop():\n    pass' }), 'python');
    assert.equal(gladiatorLanguage({ blocks: '<xml/>', code: 'loop(){}' }), 'blocks');
    assert.equal(gladiatorCrest({ code: 'loop(){}' }), 'C');
    assert.equal(gladiatorCrest({ code: 'def loop():\n    pass' }), 'PY');
    assert.equal(gladiatorCrest({ blocks: '<xml/>' }), '{ }');
});

test('the ten attribute segments scale the 0–30 points and stay in range', () => {
    assert.equal(attributeSegments(0), 0);
    assert.equal(attributeSegments(1), 0);
    assert.equal(attributeSegments(2), 1);
    assert.equal(attributeSegments(14), 5);
    assert.equal(attributeSegments(15), 5);
    assert.equal(attributeSegments(30), 10);
    assert.equal(attributeSegments(99), 10);
    assert.equal(attributeSegments(-5), 0);
    assert.equal(attributeSegments('12'), 4);
    assert.equal(attributeSegments(null), 0);
});


test('the record line never shows a false 0–0 for older battles or a new gladiator', () => {
    assert.equal(gladiatorRecord({ battles: 0, wins: 0, losses: 0 }), 'SEM BATALHAS REGISTRADAS');
    assert.equal(gladiatorRecord({ battles: 9, wins: 0, losses: 0 }), 'SEM RESULTADOS CONHECIDOS');
    assert.equal(gladiatorRecord({ battles: 9, wins: 5, losses: 4 }), '5 VITÓRIAS · 4 DERROTAS');
    assert.equal(gladiatorRecord({ battles: 9 }), 'SEM RESULTADOS CONHECIDOS');
});

test('a matchmaking flight guard runs one task at a time', async () => {
    const guard = new FlightGuard();
    let release;
    let runs = 0;
    const task = () => {
        runs += 1;
        return new Promise(resolve => { release = resolve; });
    };
    const first = guard.run(task);
    const second = guard.run(task);
    assert.equal(await second, undefined);
    assert.equal(runs, 1);
    assert.equal(guard.running, true);
    release('done');
    assert.equal(await first, 'done');
    assert.equal(guard.running, false);
});

test('a failed matchmaking task releases the flight guard', async () => {
    const guard = new FlightGuard();
    await assert.rejects(guard.run(async () => { throw new Error('refused'); }), /refused/);
    assert.equal(guard.running, false);
    await assert.doesNotReject(guard.run(async () => 'next'));
});

test('the blocked-gladiator message escapes the name', () => {
    const message = blockedGladiatorMessage({ name: '<img src=x onerror=alert(1)>', broken: true });
    assert.match(message, /travou/);
    assert.doesNotMatch(message, /<img/);
    assert.match(message, /&lt;img/);
});

test('a card destroy removes its document listener', async () => {
    const added = [];
    const removed = [];
    const element = () => {
        const children = new Map();
        return {
            dataset: {}, hidden: false, disabled: false, innerHTML: '', textContent: '', className: '',
            classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
            querySelector: selector => {
                if (!children.has(selector)) children.set(selector, element());
                return children.get(selector);
            },
            querySelectorAll: () => [],
            append: () => {}, replaceChildren: () => {}, remove: () => {},
            addEventListener: () => {}, removeEventListener: () => {},
            setAttribute: () => {}, removeAttribute: () => {}, getAttribute: () => null,
        };
    };
    globalThis.document = {
        addEventListener: (...args) => added.push(args[0]),
        removeEventListener: (...args) => removed.push(args[0]),
        createElement: () => {
            const template = element();
            template.content = { firstElementChild: element() };
            return template;
        },
        body: element(),
    };
    try {
        const { GladiatorCard } = await import('../../web/public/script/components/gladiator-card.js');
        const card = new GladiatorCard();
        assert.equal(added.filter(name => name === 'click').length, 1);
        card.destroy();
        assert.equal(removed.filter(name => name === 'click').length, 1);
    }
    finally {
        delete globalThis.document;
    }
});

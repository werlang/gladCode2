// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wp5-components.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { attributeSegments, gladiatorCrest, gladiatorLanguage, gladiatorState } = await import(
    '../../web/public/script/components/gladiator-card.js'
);

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

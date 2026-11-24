// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wp9-fixes.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

// battle.js only reads the document when a section is constructed; the helper is DOM-free.
globalThis.document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => {
        const node = {
            content: { firstElementChild: null },
            classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
            append: () => {}, addEventListener: () => {}, setAttribute: () => {},
        };
        node.content.firstElementChild = node;
        return node;
    },
    body: { append: () => {} },
    addEventListener: () => {},
};

const { duelInviteData, duelInviteDetail } = await import('../../web/public/script/profile/battle.js');

test('a duel invite only names the challenger gladiator, never an invented deadline', () => {
    assert.equal(duelInviteDetail({ gladiator: 'Arcanista' }), 'Luta com Arcanista.');
    assert.equal(duelInviteDetail({ gladiator: '  Ligeira  ' }), 'Luta com Ligeira.');
    assert.equal(duelInviteDetail({}), '');
    assert.equal(duelInviteDetail(null), '');
    for (const duel of [{ gladiator: 'Arcanista' }, { gladiator: '' }, {}, null]) {
        const invite = duelInviteData(duel);
        assert.doesNotMatch(invite.detail, /2\s*dias?|prazo|expira|deadline/i);
        assert.doesNotMatch(invite.message, /2\s*dias?|prazo|expira|deadline/i);
    }
    assert.deepEqual(duelInviteData({ nick: 'Marco', gladiator: 'Arcanista' }), {
        picture: undefined,
        name: 'Marco',
        message: 'Marco desafiou você para um duelo',
        detail: 'Luta com Arcanista.',
        acceptLabel: 'Escolher gladiador e aceitar',
        refuseLabel: 'Recusar',
    });
});

// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wp9-fix2.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { gladiatorSlots } = await import('../../web/public/script/helpers/gladiator-slots.js');

test('gladiator slots stay honest under, at and over the level limit', () => {
    const under = gladiatorSlots(2, 3);
    assert.equal(under.badge, '2/3');
    assert.equal(under.canAdd, true);
    assert.equal(under.over, false);
    assert.match(under.subtitle, /^2 de 3 vagas ocupadas\./);

    const at = gladiatorSlots(3, 3);
    assert.equal(at.badge, '3/3');
    assert.equal(at.canAdd, false);
    assert.equal(at.full, true);
    assert.equal(at.over, false);
    assert.match(at.subtitle, /^3 de 3 vagas ocupadas\./);

    const over = gladiatorSlots(4, 3);
    assert.equal(over.badge, '4');
    assert.equal(over.canAdd, false);
    assert.equal(over.full, true);
    assert.equal(over.over, true);
    assert.equal(over.subtitle, '4 gladiadores · seu nível permite 3. Grave no editor para atualizar a versão do motor.');
    assert.doesNotMatch(over.badge, /\//);
    assert.doesNotMatch(over.subtitle, /4 de 3/);
});

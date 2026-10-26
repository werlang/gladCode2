// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { gladiatorLimit } from '../../public_html/script/profile/glads.js';
import { formatRemaining } from '../../public_html/script/profile/potions.js';
import { xpToNextLevel } from '../../public_html/script/profile/session.js';
import { typeRoundTime, validRoundTime } from '../../public_html/script/profile/tournaments.js';
import { battleSizes } from '../../public_html/script/profile/trainings.js';

test('potion time left drops the hours and minutes that are zero', () => {
    assert.equal(formatRemaining(3725), '1h 2m 5s');
    assert.equal(formatRemaining(65), '1m 5s');
    assert.equal(formatRemaining(9), '9s');
    assert.equal(formatRemaining(-3), '0s');
});

test('the round time field reads typed digits as hours and minutes', () => {
    assert.equal(typeRoundTime('0m', '5'), '5m');
    assert.equal(typeRoundTime('5m', '3'), '53m');
    assert.equal(typeRoundTime('53m', '0'), '5h 30m');
    assert.equal(typeRoundTime('5h 30m', '0'), '23h 00m');
    assert.equal(typeRoundTime('5h 30m', 'Backspace'), '53m');
    assert.equal(typeRoundTime('2h 39m', '9'), '23h 59m');
    assert.equal(validRoundTime('23h 59m'), true);
    assert.equal(validRoundTime('45m'), true);
    assert.equal(validRoundTime('24h 00m'), false);
});

test('training battles split participants into near-even groups', () => {
    assert.deepEqual(battleSizes(6, 3), { players: '3', second: '' });
    assert.deepEqual(battleSizes(7, 3), { players: '3', second: 'e 2' });
    assert.deepEqual(battleSizes(5, 3), { players: '3', second: 'e 2' });
    assert.deepEqual(battleSizes(2, 3), { players: '', second: '2' });
});

test('masters unlock a gladiator every ten levels, up to six', () => {
    assert.equal(gladiatorLimit(1), 1);
    assert.equal(gladiatorLimit(10), 2);
    assert.equal(gladiatorLimit(60), 6);
    assert.equal(gladiatorLimit(99), 6);
    assert.equal(xpToNextLevel(10), 2600);
});

// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/potion-time.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { potionTime } from '../../web/public/script/components/painel-menu.js';
import { potionTimeLeft } from '../../web/public/script/helpers/potion-time.js';

test('the rail badge and the Notícias row share one floored hour count', () => {
    const potions = { nextExpiry: '2026-11-23 13:59:00', serverNow: '2026-11-23 11:00:00' };
    assert.deepEqual(potionTimeLeft(potions), { hours: 2, minutes: 59 });
    assert.equal(potionTime(potions), '2 h');
});

test('under an hour both show the remaining minutes', () => {
    const potions = { nextExpiry: '2026-11-23 11:45:00', serverNow: '2026-11-23 11:00:00' };
    assert.deepEqual(potionTimeLeft(potions), { hours: 0, minutes: 45 });
    assert.equal(potionTime(potions), '45 min');
});

test('no expiry or an unreadable clock yields no time', () => {
    assert.equal(potionTimeLeft(null), null);
    assert.equal(potionTimeLeft({ nextExpiry: null, serverNow: '2026-11-23 11:00:00' }), null);
    assert.equal(potionTimeLeft({ nextExpiry: 'not a date', serverNow: '2026-11-23 11:00:00' }), null);
    assert.equal(potionTime(null), '');
});

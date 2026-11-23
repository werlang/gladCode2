// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/profile-stats.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { winRatePercent } from '../../web/public/script/helpers/profile-stats.js';

test('the win rate uses only known results and has no value when none is known', () => {
    assert.equal(winRatePercent({ wins: 1, known: 1 }), 100);
    assert.equal(winRatePercent({ wins: 1, known: 4 }), 25);
    // unknown historical battles are not a zero in the denominator
    assert.equal(winRatePercent({ wins: 1, known: 1, battles: 9 }), 100);
    assert.equal(winRatePercent({ wins: 0, known: 0, battles: 4 }), null);
    assert.equal(winRatePercent({}), null);
    assert.equal(winRatePercent({ wins: 5, known: 4 }), 100);
});

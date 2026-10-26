// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { snapValue } from '../../web/public/script/components/slider.js';

test('slider values snap to steps inside the range', () => {
    const range = { min: 0, max: 4000, step: 100 };
    assert.equal(snapValue(1234, range), 1200);
    assert.equal(snapValue(1250, range), 1300);
    assert.equal(snapValue(-50, range), 0);
    assert.equal(snapValue(9000, range), 4000);
    assert.equal(snapValue(0.30000000000000004, { min: 0, max: 1, step: 0.1 }), 0.3);
});

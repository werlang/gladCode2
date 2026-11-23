// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/news-read.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { postIsRead } from '../../web/public/script/helpers/news-read.js';

test('the mark-all server marker keeps a stale feed response read', () => {
    const older = { time: '2026-11-20 10:00:00', read: false };
    assert.equal(postIsRead(older, '2026-11-23 20:00:00.000'), true);
    // the optimistic preview covers the gap before the API answers
    assert.equal(postIsRead(older, null, true), true);
    // a post published after the marker is correctly new
    assert.equal(postIsRead({ time: '2026-11-24 10:00:00', read: false }, '2026-11-23 20:00:00.000'), false);
    assert.equal(postIsRead({ time: '2026-11-20 10:00:00', read: true }, null), true);
    assert.equal(postIsRead(older, null), false);
    assert.equal(postIsRead({ time: 'not a date' }, '2026-11-23 20:00:00.000'), false);
});

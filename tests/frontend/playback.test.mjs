// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { formatTimeline, frameAt } from '../../public_html/script/helpers/replay.js';
import { nextVersion } from '../../public_html/script/helpers/version.js';

const steps = [
    { simtime: 0, glads: [{ x: 0, y: 0, head: 350, hp: 10 }] },
    { simtime: 0.1, glads: [{ x: 1, y: 2, head: 10, hp: 9 }] },
    { simtime: 0.2, glads: [{ x: 9, y: 9, head: 10, hp: 9 }] },
];

test('fractional positions blend position and heading', () => {
    const frame = frameAt(steps, 0.5);
    assert.equal(frame.simtime, 0.05);
    assert.deepEqual(frame.glads[0], { x: 0.5, y: 1, head: 360, hp: 10 });
    assert.equal(frameAt(steps, 1), steps[1]);
});

test('a teleport jumps instead of sliding', () => {
    assert.equal(frameAt(steps, 1.5).glads[0], steps[1].glads[0]);
});

test('the timeline reads minutes and seconds', () => {
    assert.equal(formatTimeline(0), '0:00');
    assert.equal(formatTimeline(1415), '2:21');
});

test('releases bump the major, minor or patch number', () => {
    assert.equal(nextVersion(['2', '10', '0'], 0), '3.0');
    assert.equal(nextVersion(['2', '10', '0'], 1), '2.11');
    assert.equal(nextVersion(['2', '10'], 2), '2.10.1');
});

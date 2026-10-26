import assert from 'node:assert/strict';
import test from 'node:test';

import { TAP_MS, TAP_SLOP, TouchGestures } from '../../public_html/script/render2/touch-gestures.js';

test('one finger drags by its own motion', () => {
    const touches = new TouchGestures();
    touches.down(1, 100, 100, 0);
    assert.deepEqual(touches.move(1, 130, 90), { kind: 'drag', dx: 30, dy: -10 });
    assert.deepEqual(touches.move(1, 130, 100), { kind: 'drag', dx: 0, dy: 10 });
});

test('two fingers spreading pinch out, and their midpoint pans', () => {
    const touches = new TouchGestures();
    touches.down(1, 100, 100, 0);
    touches.down(2, 200, 100, 10);
    const spread = touches.move(2, 300, 100);
    assert.equal(spread.kind, 'pinch');
    assert.equal(spread.scale, 2);
    assert.equal(spread.dx, 50);
    assert.equal(spread.dy, 0);
    assert.equal(spread.twist, 0);
    assert.equal(touches.travel, 50);
});

test('two fingers turning twist by the change in their angle', () => {
    const touches = new TouchGestures();
    touches.down(1, 0, 0, 0);
    touches.down(2, 100, 0, 0);
    const turn = touches.move(2, 0, 100);
    assert.ok(Math.abs(turn.twist - Math.PI / 2) < 1e-9);
    assert.ok(Math.abs(turn.scale - 1) < 1e-9);
});

test('a third finger is ignored', () => {
    const touches = new TouchGestures();
    touches.down(1, 0, 0, 0);
    touches.down(2, 100, 0, 0);
    touches.down(3, 50, 50, 0);
    assert.equal(touches.move(3, 80, 80), null);
    assert.equal(touches.count, 3);
});

test('the finger left after a pinch does not drag until the screen is clear', () => {
    const touches = new TouchGestures();
    touches.down(1, 0, 0, 0);
    touches.down(2, 100, 0, 0);
    touches.up(2, 50);
    assert.equal(touches.move(1, 40, 40), null);
    touches.up(1, 60);
    touches.down(1, 0, 0, 100);
    assert.deepEqual(touches.move(1, 5, 0), { kind: 'drag', dx: 5, dy: 0 });
});

test('a short, still, lone touch is a tap', () => {
    const touches = new TouchGestures();
    touches.down(1, 100, 100, 0);
    touches.move(1, 100 + TAP_SLOP - 1, 100);
    assert.deepEqual(touches.up(1, TAP_MS - 1), { x: 100, y: 100 });
});

test('a drag, a long press, a pinch or a cancel is no tap', () => {
    const touches = new TouchGestures();
    touches.down(1, 100, 100, 0);
    touches.move(1, 100 + TAP_SLOP + 1, 100);
    touches.move(1, 100, 100);
    assert.equal(touches.up(1, 50), null);

    touches.down(1, 100, 100, 0);
    assert.equal(touches.up(1, TAP_MS + 1), null);

    touches.down(1, 100, 100, 0);
    touches.down(2, 200, 100, 10);
    assert.equal(touches.up(2, 50), null);
    assert.equal(touches.up(1, 60), null);

    touches.down(1, 100, 100, 0);
    assert.equal(touches.up(1, 50, true), null);
});

test('untracked fingers and a cleared screen report nothing', () => {
    const touches = new TouchGestures();
    assert.equal(touches.move(9, 0, 0), null);
    assert.equal(touches.up(9, 0), null);
    touches.down(1, 0, 0, 0);
    touches.clear();
    assert.equal(touches.count, 0);
    assert.equal(touches.has(1), false);
});

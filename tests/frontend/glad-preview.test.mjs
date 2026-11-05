// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    QUARTER_TURN, ZOOM_MAX, ZOOM_MIN, availableMoves, clampZoom, dragYaw, nextAvailableMove, nextQuarterTurn,
    pinchZoom, skinKey, stepZoom, usesThreePreview, wheelZoom,
} from '../../web/public/script/helpers/glad-preview.js';

const MOVES = ['walk', 'cast', 'thrust', 'slash', 'shoot'];

test('the zoom buttons step by half a unit and stop at the limits', () => {
    assert.equal(stepZoom(1, 1), 1.5);
    assert.equal(stepZoom(1, -1), 1, 'zooming out from the smallest view stays there');
    assert.equal(stepZoom(3.5, 1), 3.5, 'zooming in from the largest view stays there');
    assert.equal(stepZoom(1.37, -1), 1, 'an off-grid pinch zoom is clamped, not pushed below the minimum');
    assert.equal(clampZoom(9), ZOOM_MAX);
    assert.equal(clampZoom(0), ZOOM_MIN);
});

test('the wheel zooms in when it scrolls up and out when it scrolls down, by the same factor each notch', () => {
    assert.ok(wheelZoom(2, -100) > 2);
    assert.ok(wheelZoom(2, 100) < 2);
    // one notch in and one notch out cancel out: the factors are reciprocal (2 * 2 = 4 before the limits)
    assert.ok(Math.abs(wheelZoom(2, -100) * wheelZoom(2, 100) - 4) < 1e-12);
    assert.equal(wheelZoom(3.5, -10000), ZOOM_MAX);
    assert.equal(wheelZoom(1, 10000), ZOOM_MIN);
});

test('a pinch follows the ratio of the finger gap, and ignores a missing gap', () => {
    assert.equal(pinchZoom(1, 100, 200), 2);
    assert.equal(pinchZoom(2, 200, 100), 1);
    assert.equal(pinchZoom(2, 0, 100), 2, 'no starting gap leaves the zoom where it was');
    assert.equal(pinchZoom(2, 100, 0), 2, 'fingers that touch at the same point do not zoom to zero');
    assert.equal(pinchZoom(3, 100, 1000), ZOOM_MAX);
});

test('the turn button lands on the next quarter turn, also after a free drag', () => {
    assert.equal(nextQuarterTurn(0), QUARTER_TURN);
    assert.equal(nextQuarterTurn(QUARTER_TURN), 2 * QUARTER_TURN);
    assert.equal(nextQuarterTurn(1), QUARTER_TURN, 'a drag to 1 rad is turned to the grid point above it');
    assert.equal(nextQuarterTurn(-0.5), 0);
    assert.equal(nextQuarterTurn(-QUARTER_TURN), 0);
    let yaw = 0;
    for (let turn = 0; turn < 4; turn += 1) yaw = nextQuarterTurn(yaw);
    assert.ok(Math.abs(yaw - 4 * QUARTER_TURN) < 1e-9, 'four clicks make a full turn');
});

test('dragging across the preview turns the model with the pointer', () => {
    assert.equal(dragYaw(0, 0), 0);
    assert.ok(dragYaw(0, 100) > 0 && dragYaw(0, -100) < 0);
    assert.ok(Math.abs(dragYaw(0, 100) + dragYaw(0, -100)) < 1e-12);
});

test('walk and cast are always available; the others need a worn layer that names them', () => {
    assert.deepEqual(availableMoves([]), { walk: true, cast: true, thrust: false, slash: false, shoot: false });
    const bow = { id: 'bow', move: 'shoot' };
    const sword = { id: 'male_sword', move: 'slash' };
    assert.deepEqual(availableMoves([bow, sword]), { walk: true, cast: true, thrust: false, slash: true, shoot: true });
    assert.deepEqual(availableMoves([{ id: 'male_shirt' }]), availableMoves([]));
});

test('the animation button cycles through the available moves only', () => {
    const only = { walk: true, cast: true, thrust: false, slash: false, shoot: false };
    assert.equal(nextAvailableMove(0, MOVES, only), 1, 'walk to cast');
    assert.equal(nextAvailableMove(1, MOVES, only), 0, 'cast back to walk, skipping the gear-only moves');
    const withBow = { ...only, shoot: true };
    assert.equal(nextAvailableMove(1, MOVES, withBow), 4, 'cast to shoot once a bow is worn');
    assert.equal(nextAvailableMove(4, MOVES, withBow), 0, 'shoot wraps to walk');
    assert.equal(nextAvailableMove(2, MOVES, { walk: false, cast: false, thrust: false, slash: false, shoot: false }), 2, 'nothing available keeps the move');
});

test('the 3D preview is used only when the player chose 3D and the feature gate is on', () => {
    const preference = (enabled, current) => ({ ENABLED: enabled, THREE: 'three', CLASSIC: 'classic', get: () => current });
    assert.equal(usesThreePreview(undefined), false, 'no preference script: sprite');
    assert.equal(usesThreePreview(preference(true, 'classic')), false);
    assert.equal(usesThreePreview(preference(true, 'three')), true);
    assert.equal(usesThreePreview(preference(false, 'three')), false, 'ENABLE_RENDER2 off forces the sprite');
    assert.equal(usesThreePreview({ get: () => 'three' }), false, 'a preference without the gate flag is not trusted');
});

test('a set of worn layers has one key whatever its order', () => {
    assert.equal(skinKey(['male-light', 'male', 'male_shirt']), skinKey(['male', 'male_shirt', 'male-light']));
    assert.notEqual(skinKey(['male']), skinKey(['female']));
});

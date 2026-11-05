// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/render2/creator.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { images } from '../../web/public/script/helpers/sprite-catalog.js';
import { PREVIEW_ACTIONS, PreviewMotion, WALK_SPEED } from '../../web/public/script/render2/creator-motion.js';
import { ZOOM, clampZoom, dragYaw, framing, nextQuarter, pinchZoom, wheelZoom } from '../../web/public/script/render2/creator-view.js';
import { ACTION_BY_ID, ACTION_SPECS, gaitForSpeed } from '../../web/public/script/render2/motion.js';
import { getAppearance } from '../../web/public/script/render2/palette.js';
import { WALK_GAIT, syntyNeeds } from '../../web/public/script/render2/synty-model.js';

const QUARTER = Math.PI / 2;
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? ''} ${actual} != ${expected}`);
/** A look as the creator builds it: the skin's tokens resolved through the sprite catalogue. */
const look = (...ids) => getAppearance(ids, 0, new Map(), images);

/** Runs a preview loop in fixed steps and records the step indices that start the action and release it. */
function run(motion, steps, dt = 0.125) {
    const starts = [];
    const fires = [];
    for (let i = 0; i < steps; i += 1) {
        const step = motion.advance(dt);
        if (step.start) starts.push(i);
        if (step.fire) fires.push(i);
    }
    return { starts, fires };
}

test('the rotate button steps through the four facings and a full round comes back to the front', () => {
    close(nextQuarter(0), QUARTER, 'front to right');
    close(nextQuarter(QUARTER), Math.PI, 'right to back');
    let yaw = 0;
    for (let click = 0; click < 4; click += 1) yaw = nextQuarter(yaw);
    close(yaw, 2 * Math.PI, 'four clicks');
    // after a drag: between two facings the next one ahead; one almost reached is skipped, so the click turns
    close(nextQuarter(0.3), QUARTER, 'between');
    close(nextQuarter(-0.3), 0, 'behind the front');
    close(nextQuarter(QUARTER - 0.02), Math.PI, 'almost a quarter');
});

test('zoom stays between the sprite zooms, from the whole body to the head', () => {
    assert.equal(clampZoom(0.2), 1);
    assert.equal(clampZoom(2), 2);
    assert.equal(clampZoom(9), 3.5);
    assert.equal(clampZoom(Number.NaN), 1);
    assert.equal(ZOOM.step, 0.5);
    // scrolling up zooms in, the same scroll back returns, and the range holds
    assert.ok(wheelZoom(2, -100) > 2);
    close(wheelZoom(wheelZoom(2, -100), 100), 2, 'reversible wheel');
    assert.equal(wheelZoom(3, -5000), 3.5);
    assert.equal(wheelZoom(1.5, 5000), 1);
    // fingers twice as far apart double the zoom; a broken pinch keeps it
    assert.equal(pinchZoom(1, 100, 200), 2);
    assert.equal(pinchZoom(2, 100, 50), 1);
    assert.equal(pinchZoom(1.5, 0, 80), 1.5);
});

test('dragging across the whole view turns the gladiator half round, following the pointer', () => {
    close(dragYaw(300, 300), Math.PI);
    close(dragYaw(-150, 300), -QUARTER);
    assert.ok(Number.isFinite(dragYaw(10, 0)));
});

test('at ×1 the whole body is in view, at ×3.5 the head and shoulders', () => {
    const height = 0.85;
    const fov = 30;
    const view = (zoom) => {
        const { distance, targetY } = framing(zoom, { height, fov });
        const half = distance * Math.tan((fov * Math.PI) / 360);
        return { bottom: targetY - half, top: targetY + half, distance };
    };
    const whole = view(1);
    assert.ok(whole.bottom < 0 && whole.top > height, JSON.stringify(whole));
    const close3 = view(3.5);
    assert.ok(close3.bottom > height * 0.6 && close3.top > height, JSON.stringify(close3));
    // twice the zoom, half the distance
    close(view(2).distance, whole.distance / 2);
});

test('each creator animation plays the battle action that does it', () => {
    assert.equal(PREVIEW_ACTIONS.walk, null);
    assert.equal(ACTION_BY_ID[PREVIEW_ACTIONS.cast], 'fireball');
    assert.equal(ACTION_BY_ID[PREVIEW_ACTIONS.thrust], 'melee');
    assert.equal(ACTION_BY_ID[PREVIEW_ACTIONS.slash], 'melee');
    assert.equal(ACTION_BY_ID[PREVIEW_ACTIONS.shoot], 'ranged');
    assert.equal(new PreviewMotion('dance').action, null);
});

test('a shot repeats: drawn, released once after the full draw, then drawn again', () => {
    const motion = new PreviewMotion('shoot');
    const { starts, fires } = run(motion, 40);
    assert.equal(starts[0], 0);
    assert.ok(starts.length >= 3);
    for (let i = 0; i < starts.length - 1; i += 1) {
        const inCycle = fires.filter((index) => index > starts[i] && index < starts[i + 1]);
        assert.equal(inCycle.length, 1, `cycle ${i}`);
        // never released before the bow is fully drawn
        assert.ok((inCycle[0] - starts[i]) * 0.125 >= ACTION_SPECS.ranged.holdAt, `cycle ${i}`);
    }
});

test('melee swings repeat without any release, the heavy hammer more slowly than the rapier', () => {
    const swings = run(new PreviewMotion('slash', 'rapier'), 40);
    assert.ok(swings.starts.length >= 4);
    assert.deepEqual(swings.fires, []);
    assert.ok(new PreviewMotion('slash', 'warhammer').period > new PreviewMotion('slash', 'rapier').period);
    // every swing has finished before the next one starts
    assert.ok(new PreviewMotion('thrust', 'spear').period > ACTION_SPECS.thrust.duration);
});

test('the walk is a full walk, never a jog, at the clip\'s own pace', () => {
    // the fighter's locomotion weight is full from 0.45 m/s; the Synty blend starts jogging past WALK_GAIT.speed
    assert.ok(WALK_SPEED > 0.45 && WALK_SPEED < WALK_GAIT.speed);
    const motion = new PreviewMotion('walk');
    let step;
    const frames = 64;
    for (let i = 0; i < frames; i += 1) step = motion.advance(WALK_GAIT.seconds / frames);
    assert.equal(step.start, false);
    close(step.walk.dz / step.walk.seconds, WALK_SPEED, 'speed');
    // one clip cycle of time is one gait cycle of ground
    close(step.walk.travelled / gaitForSpeed(WALK_SPEED).cycleLength, 1, 'phase');
});

test('a look loads only its own gear, besides the default sword and bow', () => {
    const plain = syntyNeeds([look('male', 'male-light')]);
    assert.deepEqual(plain.kinds, ['sword', 'bow']);
    assert.deepEqual(plain.genders, ['Masc']);
    assert.deepEqual(plain.shields, []);
    const spearwoman = syntyNeeds([look('female', 'female-light', 'female_spear', 'female_shield_5', 'female_bandana_red')]);
    assert.deepEqual(spearwoman.kinds, ['sword', 'bow', 'spear']);
    assert.deepEqual(spearwoman.shields, ['whiteBoss']);
    assert.deepEqual(spearwoman.props, ['bandana']);
    assert.deepEqual(spearwoman.genders, ['Femn']);
    assert.ok(spearwoman.atlases.includes('vikingShield'));
    assert.deepEqual(syntyNeeds([look('male', 'skeleton')]).bodies, ['skeleton']);
    assert.deepEqual(syntyNeeds([]).genders, ['Masc']);
});

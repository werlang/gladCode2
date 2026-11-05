// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/render2/creator.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { images } from '../../web/public/script/helpers/sprite-catalog.js';
import { PREVIEW_ACTIONS, PreviewMotion, WALK_SPEED } from '../../web/public/script/render2/creator-motion.js';
import { ZOOM, clampZoom, dragYaw, framing, nextQuarter, pinchZoom, viewInsets, wheelZoom } from '../../web/public/script/render2/creator-view.js';
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

/**
 * Where a world point lands on screen (-1 to 1 each way) for the creator camera: placed `distance` from the target
 * and raised by `pitch`, looking at it, like the stage's `lookAt` camera.
 */
function onScreen([x, y, z], { distance, targetY }, { fov, pitch }) {
    const sub = (a, b) => a.map((value, i) => value - b[i]);
    const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const unit = (a) => a.map((value) => value / Math.hypot(...a));
    const camera = [0, targetY + Math.sin(pitch) * distance, Math.cos(pitch) * distance];
    const forward = unit(sub([0, targetY, 0], camera));
    const right = unit(cross(forward, [0, 1, 0]));
    const up = cross(right, forward);
    const v = sub([x, y, z], camera);
    const depth = dot(v, forward);
    const tan = Math.tan((fov * Math.PI) / 360);
    return { x: dot(v, right) / (depth * tan), y: dot(v, up) / (depth * tan) };
}

test('at ×1 the whole gladiator and its ring fill the band the controls leave free', () => {
    const body = { height: 0.82, fov: 30, pitch: 0.14, ring: 0.55 };
    const margin = 0.06;
    for (const insets of [{ top: 0, bottom: 0 }, { top: 0.12, bottom: 0.12 }, { top: 0.21, bottom: 0.14 }]) {
        const camera = framing(1, { ...body, insets });
        const head = onScreen([0, body.height, 0], camera, body);
        const front = onScreen([0, 0, body.ring], camera, body);
        const side = onScreen([body.ring, 0, 0], camera, body);
        const label = JSON.stringify(insets);
        assert.ok(head.y <= 1 - 2 * insets.top - margin + 1e-6, `head ${head.y} ${label}`);
        assert.ok(front.y >= -1 + 2 * insets.bottom + margin - 1e-6, `ring front ${front.y} ${label}`);
        assert.ok(Math.abs(side.x) <= 1 - margin + 1e-6, `ring side ${side.x} ${label}`);
        // and it is not lost in the middle of the band: it spans most of it
        assert.ok(head.y - front.y > 0.8 * (2 - 2 * insets.top - 2 * insets.bottom - 2 * margin), `span ${label}`);
    }
});

test('zooming in keeps the head at the top of the band and closes on the upper body', () => {
    const body = { height: 0.82, fov: 30, pitch: 0.14, ring: 0.55, insets: { top: 0.12, bottom: 0.12 } };
    const whole = framing(1, body);
    const near = framing(3.5, body);
    close(near.distance, whole.distance / 3.5);
    close(framing(2, body).distance, whole.distance / 2);
    // the head stays in the upper part of the band, under the controls, however close the camera comes
    for (const zoom of [1, 2, 3.5]) {
        const head = onScreen([0, body.height, 0], framing(zoom, body), body).y;
        assert.ok(head > 0.3 && head <= 1 - 0.24 - 0.06 + 1e-6, `zoom ${zoom}: head ${head}`);
    }
    // the ring has left the bottom of the band: only the head and shoulders are in view
    assert.ok(onScreen([0, 0, body.ring], near, body).y < -1);
    assert.ok(onScreen([0, body.height * 0.8, 0], near, body).y > -1 + 0.24);
});

test('the controls covering the view count against the end they are nearer to', () => {
    const view = { left: 0, right: 340, top: 0, bottom: 340 };
    // desktop: the preview buttons and PRONTO strips run 40 px over the view, the side columns stay beside it
    const desktop = [
        { left: -150, right: 490, top: -5, bottom: 40 },
        { left: -150, right: 490, top: 300, bottom: 345 },
        { left: -140, right: -20, top: 0, bottom: 340 },
        { left: 360, right: 505, top: 0, bottom: 340 },
    ];
    const d = viewInsets(view, desktop);
    close(d.top, 40 / 340);
    close(d.bottom, 40 / 340);
    // phone: the sub-menu row reaches 70 px into the view, the item list 48 px; the category row stays above
    const phone = [
        { left: -12, right: 352, top: -138, bottom: -70 },
        { left: -12, right: 352, top: -60, bottom: 70 },
        { left: -12, right: 352, top: 292, bottom: 427 },
    ];
    const p = viewInsets(view, phone);
    close(p.top, 70 / 340);
    close(p.bottom, 48 / 340);
    assert.deepEqual(viewInsets(view, []), { top: 0, bottom: 0 });
    assert.deepEqual(viewInsets({ left: 0, right: 0, top: 0, bottom: 0 }, phone), { top: 0, bottom: 0 });
    // a control over most of the view leaves the band its minimum
    assert.equal(viewInsets(view, [{ left: 0, right: 340, top: 0, bottom: 300 }]).top, 0.3);
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

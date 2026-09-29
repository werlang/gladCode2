import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTION_SPECS, REST, actionDuration, actionWeight, composePose, gaitForSpeed, hipHeight, locomotionPose, pose } from '../../public_html/script/render2/motion.js';
import { getAppearance, parseSkin } from '../../public_html/script/render2/palette.js';

test('the lowest foot is grounded at every gait phase', () => {
    const { amplitude, run } = gaitForSpeed(2);
    for (let phase = 0; phase < 1; phase += 0.05) {
        const p = locomotionPose(pose(), phase, amplitude, run);
        const height = hipHeight(p);
        assert.ok(Number.isFinite(height) && height > 0.4 && height < 1.2, `phase ${phase}: ${height}`);
    }
});

test('locomotion is periodic and legs swing in opposition', () => {
    const { amplitude, run } = gaitForSpeed(3);
    const start = locomotionPose(pose(), 0.13, amplitude, run);
    const wrapped = locomotionPose(pose(), 1.13, amplitude, run);
    for (const key of Object.keys(REST)) assert.ok(Math.abs(start[key] - wrapped[key]) < 1e-9, key);
    assert.ok(start.lhip * start.rhip < 0);
});

test('faster movement uses longer strides and a deeper run blend', () => {
    const walk = gaitForSpeed(1);
    const sprint = gaitForSpeed(5);
    assert.ok(sprint.cycleLength > walk.cycleLength);
    assert.ok(sprint.run > walk.run);
});

test('timed actions fade in and out and hold actions wait for release', () => {
    for (const spec of Object.values(ACTION_SPECS)) {
        assert.equal(actionWeight(spec, 0), 0);
        if (spec.hold) {
            assert.equal(actionWeight(spec, spec.blendIn + 1), 1);
            assert.ok(actionWeight(spec, 5, 1) < 1);
            assert.equal(actionDuration(spec), Infinity);
        }
        else {
            assert.ok(actionWeight(spec, spec.duration) < 1e-9);
            assert.ok(spec.contact < spec.duration);
        }
    }
});

test('composing a timed action produces finite channels', () => {
    for (const spec of Object.values(ACTION_SPECS)) {
        const duration = Number.isFinite(actionDuration(spec)) ? actionDuration(spec) : 1;
        for (let t = 0; t <= duration; t += duration / 20) {
            const out = composePose(pose(), pose(), spec, t, null, pose());
            for (const value of Object.values(out)) assert.ok(Number.isFinite(value));
        }
    }
});

test('appearance derives from skin tokens', () => {
    const tokens = parseSkin(JSON.stringify(['male_longsleeve_black', 'cape_red', 'male_staff']));
    assert.ok(tokens.length >= 3);
    const appearance = getAppearance(JSON.stringify(['male_staff', 'cape_red']), 0);
    assert.equal(appearance.weapon, 'staff');
    assert.ok(appearance.cape);
    assert.equal(getAppearance('not json', 1).weapon, 'sword');
});

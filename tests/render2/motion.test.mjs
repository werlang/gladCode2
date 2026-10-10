import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTION_BY_ID, ACTION_SPECS, REST, actionDuration, actionWeight, composePose, engineTiming, warpedTime, gaitForSpeed, hipHeight, locomotionPose, pose } from '../../public_html/script/render2/motion.js';
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

test('mid-action sampling produces distinct active poses differing from rest', () => {
    // Verifies that a gladiator sampled mid-animation (e.g. paused or scrubbed)
    // is in an active dynamic pose, never snapping back to neutral idle rest.
    for (const [id, name] of Object.entries(ACTION_BY_ID)) {
        const spec = ACTION_SPECS[name];
        assert.ok(spec, `Action ${name} should have a spec`);
        const duration = actionDuration(spec);
        assert.ok(duration > 0);
        // Sample at 40% into the action (e.g. during swing, cast, draw)
        const midTime = Number.isFinite(duration) ? duration * 0.4 : 0.3;
        const out = composePose(pose(), pose(), spec, midTime, null, pose());
        const weight = actionWeight(spec, midTime);
        assert.ok(weight > 0.1, `Action ${name} at ${midTime}s should have non-zero blend weight`);
        let differsFromRest = false;
        for (const [channel, val] of Object.entries(out)) {
            if (Math.abs(val - REST[channel]) > 0.05) {
                differsFromRest = true;
                break;
            }
        }
        assert.ok(differsFromRest, `Action ${name} at ${midTime}s must differ from neutral REST stance`);
    }
});

test('locomotion at arbitrary gait phase preserves active running posture', () => {
    const { amplitude, run } = gaitForSpeed(3.0);
    // At different walk cycle phases, limbs (hips, knees) must be displaced from neutral rest
    for (const phase of [0.0, 0.25, 0.5, 0.75]) {
        const p = locomotionPose(pose(), phase, amplitude, run);
        const legDisplacement = Math.abs(p.lhip - REST.lhip) + Math.abs(p.rhip - REST.rhip)
            + Math.abs(p.lknee - REST.lknee) + Math.abs(p.rknee - REST.rknee);
        assert.ok(legDisplacement > 0.4, `Gait phase ${phase} should keep legs displaced from rest (was ${legDisplacement})`);
    }
});


test('engine-paced actions connect on the step the engine resolves them and finish within the cycle', () => {
    for (const style of ['melee', 'slashBack', 'thrust', 'smash', 'stab', 'ranged', 'fireball', 'teleport']) {
        const spec = ACTION_SPECS[style];
        for (const rate of [0.4, 0.7, 1, 1.4, 2.5, 5]) {
            const timing = engineTiming(spec, rate);
            // The engine counts 0.5 / rate down in 0.1 s steps before resolving.
            assert.equal(timing.windup, Math.max(0.1, Math.ceil(0.5 / rate / 0.1 - 1e-6) * 0.1));
            assert.ok(Math.abs(warpedTime(spec, timing, timing.windup) - spec.contact) < 1e-9, `${style} at ${rate}`);
            const end = timing.windup + (spec.duration - spec.contact) / timing.follow;
            assert.ok(end <= timing.cycle + 1e-9 || timing.follow === 3, `${style} at ${rate} ends after the next attack can start`);
            let previous = -1;
            for (let t = 0; t <= timing.cycle; t += 0.01) {
                const time = warpedTime(spec, timing, t);
                assert.ok(time >= previous - 1e-9, 'action time never runs backwards');
                previous = time;
            }
        }
    }
});

test('slow attackers hold their guard before winding up instead of swinging in slow motion', () => {
    const spec = ACTION_SPECS.melee;
    const timing = engineTiming(spec, 0.4);
    assert.ok(timing.delay > 0);
    assert.equal(warpedTime(spec, timing, timing.delay / 2), 0);
    assert.ok(timing.lead >= 0.7);
    assert.equal(engineTiming(spec, 0), null);
});

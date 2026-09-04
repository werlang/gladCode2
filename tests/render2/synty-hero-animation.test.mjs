import assert from 'node:assert/strict';
import test from 'node:test';

import { ACTIONS } from '../../public_html/script/render2/battle-state.js';
import {
    HERO_BONE_NAMES,
    applyHitReaction,
    blendHeroPoses,
    getHeroActionDuration,
    sampleHeroPose,
} from '../../public_html/script/render2/synty-hero-animation.js';

const ACTION_NAMES = Object.keys(ACTIONS);

test('classifies transient engine actions as clips longer than one simlog frame', () => {
    const transient = ['fireball', 'teleport', 'block', 'assassinate', 'ambush', 'melee', 'ranged', 'potion'];
    const continuous = ['charge', 'movement', 'waiting', 'none'];

    transient.forEach((name) => assert.ok(getHeroActionDuration(ACTIONS[name]) > 0.1, name));
    continuous.forEach((name) => assert.equal(getHeroActionDuration(ACTIONS[name]), null, name));
});

/** Returns every numeric value nested inside one pose. */
function numericValues(value) {
    if (typeof value === 'number') return [value];
    if (!value || typeof value !== 'object') return [];
    return Object.values(value).flatMap(numericValues);
}

test('every engine action returns a complete finite pose', () => {
    ACTION_NAMES.forEach((name) => {
        const pose = sampleHeroPose(ACTIONS[name], 0.37, { weapon: 'sword', seed: 0.25 });

        assert.deepEqual(Object.keys(pose.bones), HERO_BONE_NAMES);
        assert.equal(numericValues(pose).every(Number.isFinite), true, `${name} contains a non-finite value`);
        assert.ok(pose.body.y >= -0.2 && pose.body.y <= 0.35, `${name} body height is unsafe`);
        assert.ok(Math.abs(pose.body.x) <= 0.75, `${name} body pitch is unsafe`);
        assert.ok(Math.abs(pose.body.z) <= 0.75, `${name} body roll is unsafe`);
    });
});

test('movement alternates opposing arms and legs across a stride', () => {
    const first = sampleHeroPose(ACTIONS.movement, 0.125, { weapon: 'sword', seed: 0 });
    const second = sampleHeroPose(ACTIONS.movement, 0.375, { weapon: 'sword', seed: 0 });

    // Contralateral gait on the sagittal axes: thighs swing on x, arms on y,
    // and each arm counters its same-side leg.
    assert.ok(first.bones.UpperLeg_L.x * second.bones.UpperLeg_L.x < 0);
    assert.ok(first.bones.UpperLeg_R.x * second.bones.UpperLeg_R.x < 0);
    assert.ok(first.bones.UpperLeg_L.x * first.bones.UpperLeg_R.x < 0);
    assert.ok(first.bones.Shoulder_L.y * first.bones.UpperLeg_L.x < 0);
    assert.ok(first.bones.Shoulder_R.y * first.bones.UpperLeg_R.x < 0);
    assert.notEqual(first.body.y, second.body.y);
});

test('melee exposes anticipation, contact, and recovery instead of a looping swing', () => {
    const anticipation = sampleHeroPose(ACTIONS.melee, 0.08, { weapon: 'sword', seed: 0 });
    const contact = sampleHeroPose(ACTIONS.melee, 0.32, { weapon: 'sword', seed: 0 });
    const recovery = sampleHeroPose(ACTIONS.melee, 0.72, { weapon: 'sword', seed: 0 });

    assert.ok(anticipation.bones.Shoulder_R.z < contact.bones.Shoulder_R.z);
    assert.ok(Math.abs(contact.body.y) > Math.abs(anticipation.body.y));
    assert.ok(Math.abs(recovery.bones.Shoulder_R.z + 1.08) < Math.abs(contact.bones.Shoulder_R.z + 1.08));
    assert.ok(contact.weapon.emphasis > anticipation.weapon.emphasis);
});

test('defensive, ranged, magic, teleport, and potion actions have distinct silhouettes', () => {
    const block = sampleHeroPose(ACTIONS.block, 0.4, { weapon: 'sword', seed: 0 });
    const ranged = sampleHeroPose(ACTIONS.ranged, 0.4, { weapon: 'bow', seed: 0 });
    const fireball = sampleHeroPose(ACTIONS.fireball, 0.4, { weapon: 'staff', seed: 0 });
    const teleport = sampleHeroPose(ACTIONS.teleport, 0.25, { weapon: 'sword', seed: 0 });
    const potion = sampleHeroPose(ACTIONS.potion, 0.4, { weapon: 'sword', seed: 0 });

    // Elbow flexion lives on the x axis; a block curls both forearms high.
    assert.ok(block.bones.Elbow_L.x > 1.05 && block.bones.Elbow_R.x > 1.05);
    // Bow draw: lead arm reaches forward while the draw arm curls tight.
    assert.ok(ranged.bones.Shoulder_L.y > 1.0 && ranged.bones.Elbow_R.x > 1.0);
    // Staff channel keeps both hands mirrored in front of the chest.
    assert.ok(Math.abs(fireball.bones.Shoulder_L.z - fireball.bones.Shoulder_R.z) < 0.3);
    assert.ok(teleport.body.y < block.body.y);
    assert.ok(potion.bones.Elbow_L.x > 0.9);
});

test('pose sampling and blending do not mutate prior poses', () => {
    const waiting = sampleHeroPose(ACTIONS.waiting, 0.2, { weapon: 'sword', seed: 0 });
    const before = structuredClone(waiting);
    const attack = sampleHeroPose(ACTIONS.assassinate, 0.3, { weapon: 'sword', seed: 0 });
    const blended = blendHeroPoses(waiting, attack, 0.5);

    assert.deepEqual(waiting, before);
    assert.notDeepEqual(blended, waiting);
    assert.notDeepEqual(blended, attack);
    assert.deepEqual(blendHeroPoses(waiting, attack, -1), waiting);
    assert.deepEqual(blendHeroPoses(waiting, attack, 2), attack);
});

test('attack lunges push forward during contact and settle back to zero', () => {
    const windup = sampleHeroPose(ACTIONS.melee, 0.1, { weapon: 'sword', seed: 0 });
    const contact = sampleHeroPose(ACTIONS.melee, 0.35, { weapon: 'sword', seed: 0 });
    const settled = sampleHeroPose(ACTIONS.melee, 0.8, { weapon: 'sword', seed: 0 });

    assert.ok(windup.lunge.forward < 0, 'anticipation pulls back before the strike');
    assert.ok(contact.lunge.forward > 0.25, 'contact commits the fighter forward');
    assert.ok(Math.abs(settled.lunge.forward) < 0.05, 'recovery returns the fighter to its engine position');
    assert.equal(sampleHeroPose(ACTIONS.waiting, 1, {}).lunge.forward, 0);

    const heavyContact = sampleHeroPose(ACTIONS.assassinate, 0.3, { weapon: 'sword', seed: 0 });
    assert.ok(heavyContact.lunge.forward > contact.lunge.forward, 'assassinate lunges deeper than a regular swing');
});

test('locomotion cadence follows replay ground speed', () => {
    const maxSwing = (speed) => {
        let largest = 0;
        for (let time = 0; time <= 0.65; time += 0.025) {
            const pose = sampleHeroPose(ACTIONS.movement, time, { weapon: 'sword', seed: 0, speed });
            largest = Math.max(largest, Math.abs(pose.bones.UpperLeg_L.x));
        }
        return largest;
    };

    // Faster fighters cover the stride envelope harder within the same window.
    const slow = maxSwing(0.5);
    const fast = maxSwing(2);
    assert.ok(fast > slow * 1.8, `expected faster stride envelope, got ${fast} vs ${slow}`);

    const sprint = sampleHeroPose(ACTIONS.charge, 0.2, { weapon: 'sword', seed: 0, speed: 1.5 });
    assert.ok(sprint.body.x < -0.15, 'charging leans the torso forward');
});

test('hit reactions recoil the spine and decay back to the base pose', () => {
    const base = sampleHeroPose(ACTIONS.block, 0.4, { weapon: 'sword', seed: 0 });
    const peak = applyHitReaction(base, 0.5);
    const settled = applyHitReaction(base, 1);
    const start = applyHitReaction(base, 0);

    assert.deepEqual(start, base, 'zero progress leaves the pose untouched');
    assert.ok(peak.bones.Spine_02.x > base.bones.Spine_02.x, 'impact bends the spine back');
    assert.ok(peak.body.y < base.body.y, 'impact drops the stance');
    assert.ok(Math.abs(settled.body.y - base.body.y) < 1e-9, 'reaction fully decays');
    assert.deepEqual(Object.keys(peak.bones), HERO_BONE_NAMES);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { ACTIONS } from '../../public_html/script/render2/battle-state.js';
import {
    HERO_BONE_NAMES,
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

    assert.ok(first.bones.UpperLeg_L.z * second.bones.UpperLeg_L.z < 0);
    assert.ok(first.bones.UpperLeg_R.z * second.bones.UpperLeg_R.z < 0);
    assert.ok(first.bones.UpperLeg_L.z * first.bones.UpperLeg_R.z > 0);
    assert.ok((first.bones.Shoulder_L.z + 1.08) * first.bones.UpperLeg_L.z < 0);
    assert.ok((first.bones.Shoulder_R.z + 1.08) * first.bones.UpperLeg_R.z < 0);
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

    assert.ok(block.bones.Elbow_L.y < -0.8 && block.bones.Elbow_R.y > 0.8);
    assert.ok(Math.abs(ranged.bones.Elbow_L.y - ranged.bones.Elbow_R.y) > 0.5);
    assert.ok(Math.abs(fireball.bones.Shoulder_L.z - fireball.bones.Shoulder_R.z) < 0.3);
    assert.ok(teleport.body.y < block.body.y);
    assert.ok(potion.bones.Elbow_L.y < -0.7);
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

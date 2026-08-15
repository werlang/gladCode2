import { ACTIONS } from './battle-state.js';

const ACTION_DURATIONS = new Map([
    [ACTIONS.fireball, 1.05],
    [ACTIONS.teleport, 0.72],
    [ACTIONS.block, 0.55],
    [ACTIONS.assassinate, 0.68],
    [ACTIONS.ambush, 0.72],
    [ACTIONS.melee, 0.8],
    [ACTIONS.ranged, 0.9],
    [ACTIONS.potion, 1.1],
]);

export const HERO_BONE_NAMES = Object.freeze([
    'Hips',
    'Spine_01',
    'Spine_02',
    'Spine_03',
    'Neck',
    'Head',
    'Clavicle_L',
    'Shoulder_L',
    'Elbow_L',
    'Hand_L',
    'Clavicle_R',
    'Shoulder_R',
    'Elbow_R',
    'Hand_R',
    'UpperLeg_L',
    'LowerLeg_L',
    'Ankle_L',
    'UpperLeg_R',
    'LowerLeg_R',
    'Ankle_R',
]);

const ZERO_ROTATION = Object.freeze({ x: 0, y: 0, z: 0 });

/** Returns the authored one-shot duration, or null for continuous actions. */
export function getHeroActionDuration(action) {
    return ACTION_DURATIONS.get(Number(action)) ?? null;
}

/** Keeps interpolation inputs inside their defined interval. */
function clamp01(value) {
    return Math.min(Math.max(Number(value) || 0, 0), 1);
}

/** Smooths key-pose transitions without overshooting their authored limits. */
function smoothstep(value) {
    const clamped = clamp01(value);
    return clamped * clamped * (3 - 2 * clamped);
}

/** Builds a complete pose so animation code never inherits stale bone values. */
function createPose(overrides = {}) {
    const bones = Object.fromEntries(HERO_BONE_NAMES.map((name) => [name, { ...ZERO_ROTATION }]));
    const pose = {
        body: { x: 0, y: 0, z: 0 },
        bones,
        weapon: { emphasis: 0 },
    };

    Object.entries(overrides.bones ?? {}).forEach(([name, rotation]) => {
        if (!bones[name]) return;
        Object.assign(bones[name], rotation);
    });
    Object.assign(pose.body, overrides.body);
    Object.assign(pose.weapon, overrides.weapon);
    return pose;
}

/** Applies sparse rotations over the relaxed combat-ready silhouette. */
function guardedPose(overrides = {}) {
    return createPose({
        body: overrides.body,
        weapon: overrides.weapon,
        bones: {
            Hips: { z: -0.03 },
            Spine_01: { z: 0.03 },
            Spine_02: { z: 0.02 },
            Spine_03: { z: 0.04 },
            Shoulder_L: { z: -1.08, y: -0.08 },
            Elbow_L: { z: -0.18 },
            Hand_L: { z: -0.06 },
            Shoulder_R: { z: -1.08, y: 0.12 },
            Elbow_R: { z: -0.28 },
            Hand_R: { z: -0.06 },
            UpperLeg_L: { z: 0 },
            UpperLeg_R: { z: 0 },
            ...overrides.bones,
        },
    });
}

/** Linearly blends complete values; rotations are applied as delta quaternions later. */
export function blendHeroPoses(from, to, amount) {
    const t = clamp01(amount);
    if (t === 0) return structuredClone(from);
    if (t === 1) return structuredClone(to);
    const blendRotation = (left, right) => ({
        x: left.x + (right.x - left.x) * t,
        y: left.y + (right.y - left.y) * t,
        z: left.z + (right.z - left.z) * t,
    });

    return {
        body: blendRotation(from.body, to.body),
        bones: Object.fromEntries(HERO_BONE_NAMES.map((name) => [
            name,
            blendRotation(from.bones[name], to.bones[name]),
        ])),
        weapon: {
            emphasis: from.weapon.emphasis + (to.weapon.emphasis - from.weapon.emphasis) * t,
        },
    };
}

/** Interpolates a normalized timeline made of authored key poses. */
function sampleTimeline(phase, keyframes) {
    const t = clamp01(phase);
    const nextIndex = keyframes.findIndex(([time]) => time >= t);
    if (nextIndex <= 0) return blendHeroPoses(keyframes[0][1], keyframes[0][1], 0);
    if (nextIndex === -1) {
        const last = keyframes.at(-1)[1];
        return blendHeroPoses(last, last, 0);
    }

    const [fromTime, fromPose] = keyframes[nextIndex - 1];
    const [toTime, toPose] = keyframes[nextIndex];
    return blendHeroPoses(fromPose, toPose, smoothstep((t - fromTime) / (toTime - fromTime)));
}

/** Subtle asymmetrical guard used for waiting and unknown/no-op actions. */
function sampleWaiting(time, seed) {
    const phase = time * 2.15 + seed * Math.PI * 2;
    const breath = Math.sin(phase) * 0.025;
    return guardedPose({
        body: { y: 0.014 + breath * 0.28, z: Math.sin(phase * 0.5) * 0.012 },
        bones: {
            Spine_02: { x: breath * 0.35, z: 0.025 },
            Spine_03: { x: breath * 0.22, z: 0.045 },
            Head: { y: Math.sin(phase * 0.37) * 0.035 },
            Shoulder_L: { z: -1.08 + breath * 0.5, y: -0.08 },
            Shoulder_R: { z: -1.08 - breath * 0.35, y: 0.12 },
        },
    });
}

/** Cyclic locomotion with planted-foot height changes and arm counter-swing. */
function sampleMovement(time, seed, charging = false) {
    const stride = time / (charging ? 0.42 : 0.5) * Math.PI * 2 + seed * Math.PI * 2;
    const swing = Math.sin(stride);
    const liftLeft = Math.max(0, Math.sin(stride + Math.PI / 2));
    const liftRight = Math.max(0, Math.sin(stride - Math.PI / 2));
    const amplitude = charging ? 0.72 : 0.52;
    return guardedPose({
        body: {
            x: charging ? -0.2 : -0.055,
            y: 0.045 + Math.sin(stride * 2 + 0.3) * (charging ? 0.045 : 0.028),
            z: -swing * (charging ? 0.055 : 0.035),
        },
        bones: {
            Spine_02: { y: -swing * 0.07, z: charging ? 0.08 : 0.03 },
            Shoulder_L: { z: -1.08 - swing * amplitude * 0.55, y: -0.08 },
            Shoulder_R: { z: -1.08 - swing * amplitude * 0.55, y: charging ? 0.18 : 0.12 },
            Elbow_L: { z: -0.28 - liftLeft * 0.18 },
            Elbow_R: { z: -0.36 - liftRight * 0.18 },
            UpperLeg_L: { z: swing * amplitude },
            LowerLeg_L: { z: -liftLeft * 0.68 },
            Ankle_L: { z: liftLeft * 0.32 },
            UpperLeg_R: { z: swing * amplitude },
            LowerLeg_R: { z: -liftRight * 0.68 },
            Ankle_R: { z: -liftRight * 0.32 },
        },
        weapon: { emphasis: charging ? 0.35 : 0.08 },
    });
}

/** Authored melee arc: coil, contact, follow-through, and balanced recovery. */
function sampleMelee(time, assassinate = false) {
    const duration = getHeroActionDuration(assassinate ? ACTIONS.assassinate : ACTIONS.melee);
    const ready = guardedPose();
    const anticipation = guardedPose({
        body: { x: assassinate ? -0.22 : -0.09, y: assassinate ? -0.04 : 0.01, z: 0.1 },
        bones: {
            Spine_02: { y: -0.28, z: -0.08 },
            Shoulder_R: { x: -0.22, y: -0.28, z: 0.38 },
            Elbow_R: { y: 1.05, z: -0.18 },
            Hand_R: { x: -0.18, z: 0.18 },
            Shoulder_L: { z: -0.82, y: 0.2 },
            UpperLeg_L: { z: assassinate ? 0.42 : 0.18 },
            UpperLeg_R: { z: assassinate ? -0.5 : -0.16 },
        },
        weapon: { emphasis: 0.22 },
    });
    const contact = guardedPose({
        body: { x: assassinate ? -0.38 : -0.2, y: assassinate ? 0.15 : 0.12, z: -0.16 },
        bones: {
            Hips: { y: 0.24, z: -0.1 },
            Spine_02: { y: 0.42, z: 0.15 },
            Spine_03: { y: 0.3, z: 0.08 },
            Shoulder_R: { x: 0.2, y: 0.46, z: -0.1 },
            Elbow_R: { y: 0.08, z: -0.12 },
            Hand_R: { x: 0.25, z: -0.3 },
            Shoulder_L: { z: -0.65, y: -0.24 },
            UpperLeg_L: { z: -0.38 },
            UpperLeg_R: { z: 0.48 },
            LowerLeg_R: { z: 0.48 },
        },
        weapon: { emphasis: 1 },
    });
    const followThrough = guardedPose({
        body: { x: -0.12, y: 0.055, z: -0.09 },
        bones: {
            Spine_02: { y: 0.24, z: 0.08 },
            Shoulder_R: { x: 0.12, y: 0.3, z: -0.72 },
            Elbow_R: { y: 0.35, z: -0.22 },
            Shoulder_L: { z: -0.86 },
            UpperLeg_L: { z: -0.2 },
            UpperLeg_R: { z: 0.24 },
        },
        weapon: { emphasis: 0.58 },
    });

    return sampleTimeline(time / duration, [
        [0, ready],
        [0.2, anticipation],
        [0.43, contact],
        [0.68, followThrough],
        [1, ready],
    ]);
}

/** Holds a readable braced guard rather than cycling continuously. */
function sampleBlock(time) {
    const settle = 0.92 + Math.sin(time * 3.2) * 0.025;
    return guardedPose({
        body: { x: -0.12, y: -0.015, z: 0.055 },
        bones: {
            Hips: { z: -0.12 },
            Spine_02: { x: -0.1, z: 0.14 },
            Shoulder_L: { x: 0.08, y: -0.35, z: -0.55 * settle },
            Elbow_L: { y: -1.25, z: -0.08 },
            Hand_L: { x: -0.18, z: -0.24 },
            Shoulder_R: { x: -0.08, y: 0.35, z: -0.55 * settle },
            Elbow_R: { y: 1.25, z: -0.08 },
            Hand_R: { x: 0.12, z: -0.22 },
            UpperLeg_L: { z: 0.2 },
            UpperLeg_R: { z: -0.24 },
            LowerLeg_R: { z: 0.28 },
        },
        weapon: { emphasis: 0.48 },
    });
}

/** Draw-and-release pose for bows, with a compact throwing pose fallback. */
function sampleRanged(time, weapon) {
    const phase = clamp01(time / getHeroActionDuration(ACTIONS.ranged));
    const ready = guardedPose();
    const draw = guardedPose({
        body: { x: -0.05, y: 0.025, z: 0.04 },
        bones: weapon === 'bow' ? {
            Spine_02: { y: -0.18, z: 0.03 },
            Shoulder_L: { x: -0.08, y: -0.3, z: 0.02 },
            Elbow_L: { y: -0.08, z: -0.12 },
            Shoulder_R: { x: 0.1, y: 0.3, z: -0.32 },
            Elbow_R: { y: 1.3, z: -0.08 },
            Hand_R: { x: -0.2, z: -0.22 },
        } : {
            Spine_02: { y: -0.28 },
            Shoulder_L: { z: -0.82 },
            Shoulder_R: { x: -0.2, y: -0.55, z: 0.16 },
            Elbow_R: { y: 1.12, z: -0.08 },
            Hand_R: { x: -0.25 },
        },
        weapon: { emphasis: 0.72 },
    });
    const release = guardedPose({
        body: { x: -0.11, y: 0.07, z: -0.05 },
        bones: {
            Spine_02: { y: 0.22 },
            Shoulder_L: { y: -0.38, z: -0.3 },
            Elbow_L: { y: -0.05, z: -0.1 },
            Shoulder_R: { y: -0.32, z: -0.22 },
            Elbow_R: { y: 0.1, z: -0.1 },
        },
        weapon: { emphasis: 1 },
    });
    return sampleTimeline(phase, [[0, ready], [0.5, draw], [0.62, release], [1, ready]]);
}

/** Two-handed channel and release silhouette used by staff and bare-hand casters. */
function sampleFireball(time) {
    const phase = clamp01(time / getHeroActionDuration(ACTIONS.fireball));
    const ready = guardedPose();
    const channel = guardedPose({
        body: { x: -0.08, y: 0.035 },
        bones: {
            Spine_02: { x: -0.1, z: 0.04 },
            Shoulder_L: { x: -0.08, y: -0.22, z: 0.85 },
            Elbow_L: { x: 0.12, y: -0.55, z: -0.8 },
            Hand_L: { x: -0.28, z: 0.16 },
            Shoulder_R: { x: -0.08, y: 0.22, z: 0.85 },
            Elbow_R: { x: -0.12, y: 0.55, z: -0.8 },
            Hand_R: { x: 0.28, z: 0.16 },
        },
        weapon: { emphasis: 0.55 },
    });
    const release = guardedPose({
        body: { x: -0.2, y: 0.1 },
        bones: {
            Spine_02: { x: 0.15 },
            Shoulder_L: { y: -0.18, z: 0.1 },
            Elbow_L: { y: -0.25, z: -0.22 },
            Shoulder_R: { y: 0.18, z: 0.1 },
            Elbow_R: { y: 0.25, z: -0.22 },
        },
        weapon: { emphasis: 1 },
    });
    return sampleTimeline(phase, [[0, ready], [0.46, channel], [0.68, release], [1, ready]]);
}

/** Low compression and expansion timed to the existing teleport effect. */
function sampleTeleport(time) {
    const phase = clamp01(time / getHeroActionDuration(ACTIONS.teleport));
    const ready = guardedPose();
    const compressed = guardedPose({
        body: { x: -0.28, y: -0.12, z: 0.02 },
        bones: {
            Hips: { x: -0.16, z: -0.12 },
            Spine_02: { x: 0.2, z: 0.1 },
            Shoulder_L: { y: 0.25, z: -0.62 },
            Elbow_L: { y: -0.72, z: -0.08 },
            Shoulder_R: { y: -0.25, z: -0.62 },
            Elbow_R: { y: 0.72, z: -0.08 },
            UpperLeg_L: { z: 0.28 },
            LowerLeg_L: { z: -0.5 },
            UpperLeg_R: { z: -0.28 },
            LowerLeg_R: { z: 0.5 },
        },
        weapon: { emphasis: 0.18 },
    });
    const expanded = guardedPose({
        body: { x: 0.04, y: 0.24 },
        bones: {
            Shoulder_L: { y: -0.3, z: -0.24 },
            Shoulder_R: { y: 0.3, z: -0.24 },
            UpperLeg_L: { z: -0.2 },
            UpperLeg_R: { z: 0.2 },
        },
        weapon: { emphasis: 0.7 },
    });
    return sampleTimeline(phase, [[0, ready], [0.42, compressed], [0.64, expanded], [1, ready]]);
}

/** Low ambush stance with controlled breathing and a forward weapon hand. */
function sampleAmbush(time, seed) {
    const pulse = Math.sin(time * 2.4 + seed * Math.PI * 2) * 0.018;
    return guardedPose({
        body: { x: -0.24, y: -0.09 + pulse, z: 0.08 },
        bones: {
            Spine_02: { x: 0.18, y: -0.12, z: 0.08 },
            Head: { x: -0.08 },
            Shoulder_L: { y: 0.16, z: -0.7 },
            Elbow_L: { y: -0.58, z: -0.08 },
            Shoulder_R: { y: -0.38, z: -0.52 },
            Elbow_R: { y: 0.82, z: -0.08 },
            UpperLeg_L: { z: 0.32 },
            LowerLeg_L: { z: -0.42 },
            UpperLeg_R: { z: -0.36 },
            LowerLeg_R: { z: 0.48 },
        },
        weapon: { emphasis: 0.42 },
    });
}

/** Raises the free hand toward the face, drinks, and returns to guard. */
function samplePotion(time) {
    const phase = clamp01(time / getHeroActionDuration(ACTIONS.potion));
    const ready = guardedPose();
    const drink = guardedPose({
        body: { x: 0.02, y: 0.015, z: 0.035 },
        bones: {
            Head: { x: -0.13, z: -0.05 },
            Shoulder_L: { x: -0.22, y: -0.16, z: -0.34 },
            Elbow_L: { x: -0.18, y: -1.38, z: -0.12 },
            Hand_L: { x: 0.28, z: 0.2 },
            Shoulder_R: { z: -0.92 },
        },
        weapon: { emphasis: 0.08 },
    });
    return sampleTimeline(phase, [[0, ready], [0.38, drink], [0.68, drink], [1, ready]]);
}

/**
 * Samples one deterministic local-space hero pose from an engine action.
 * Time starts at zero whenever the fighter changes action.
 */
export function sampleHeroPose(action, time, { weapon = 'sword', seed = 0 } = {}) {
    const elapsed = Math.max(Number(time) || 0, 0);
    const phaseSeed = Number(seed) || 0;

    switch (Number(action)) {
        case ACTIONS.fireball: return sampleFireball(elapsed);
        case ACTIONS.teleport: return sampleTeleport(elapsed);
        case ACTIONS.charge: return sampleMovement(elapsed, phaseSeed, true);
        case ACTIONS.block: return sampleBlock(elapsed);
        case ACTIONS.assassinate: return sampleMelee(elapsed, true);
        case ACTIONS.ambush: return sampleAmbush(elapsed, phaseSeed);
        case ACTIONS.melee: return sampleMelee(elapsed, false);
        case ACTIONS.ranged: return sampleRanged(elapsed, weapon);
        case ACTIONS.movement: return sampleMovement(elapsed, phaseSeed, false);
        case ACTIONS.potion: return samplePotion(elapsed);
        case ACTIONS.none:
        case ACTIONS.waiting:
        default: return sampleWaiting(elapsed, phaseSeed);
    }
}

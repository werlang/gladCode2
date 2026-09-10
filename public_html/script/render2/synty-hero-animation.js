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

/** Seconds per full locomotion cycle at reference speed. */
export const STRIDE_SECONDS = 0.52;

/**
 * Normalized contact/release moments inside each one-shot timeline.
 * The effects layer delays slash arcs and bow snaps onto these instants so
 * geometry and poses never cut against each other.
 */
export const ATTACK_CONTACT_PHASE = Object.freeze({
    melee: 0.38,
    assassinate: 0.38,
    rangedRelease: 0.52,
});

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

/**
 * Prefix given to consolidated rig bones so animation tracks can only bind to
 * the skeleton the skinned meshes actually use, never to leftover duplicate
 * nodes that survive inside the cloned source hierarchies.
 */
export const RIG_BONE_PREFIX = 'GC_';

/*
 * Rig axis contract, mapped empirically against the Synty pack skeleton:
 * - Shoulders: z swings the arm sideways from the T-pose (negative lowers it),
 *   y swings it forward/down, x swings it backward/up.
 * - Elbows: x flexes the forearm up/forward; y and z are mostly twist.
 * - Legs: x swings the thigh forward, z spreads it sideways, knees flex on x.
 * - Spine/Hips: x pitches, y yaws, z rolls.
 */

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

/**
 * Smootherstep easing: zero velocity *and* zero acceleration at both ends.
 * Key-pose blends use this so fast swings never pop on arrival — the classic
 * source of cut frames when a coil snaps into contact.
 */
function smootherstep(value) {
    const clamped = clamp01(value);
    return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
}

/** Cubic ease-out for strike phases: fast attack, soft landing. */
function easeOutCubic(value) {
    const clamped = clamp01(value);
    return 1 - (1 - clamped) ** 3;
}

/**
 * Builds a complete pose so animation code never inherits stale bone values.
 *
 * The `lunge` channel carries a temporary root-space translation used by
 * attacks; it always resolves back to zero so engine positions stay exact.
 */
function createPose(overrides = {}) {
    const bones = Object.fromEntries(HERO_BONE_NAMES.map((name) => [name, { ...ZERO_ROTATION }]));
    const pose = {
        body: { x: 0, y: 0, z: 0 },
        bones,
        lunge: { forward: 0, side: 0 },
        weapon: { emphasis: 0 },
    };

    Object.entries(overrides.bones ?? {}).forEach(([name, rotation]) => {
        if (!bones[name]) return;
        Object.assign(bones[name], rotation);
    });
    Object.assign(pose.body, overrides.body);
    Object.assign(pose.lunge, overrides.lunge);
    Object.assign(pose.weapon, overrides.weapon);
    return pose;
}

/** Adds sparse attack-recoil rotations on top of any pose without mutating it. */
export function applyHitReaction(basePose, progress) {
    const shape = Math.sin(clamp01(progress) * Math.PI);
    const intensity = shape * shape;
    const pose = structuredClone(basePose);
    const add = (name, x = 0, y = 0, z = 0) => {
        pose.bones[name].x += x * intensity;
        pose.bones[name].y += y * intensity;
        pose.bones[name].z += z * intensity;
    };

    add('Hips', 0.05, 0, -0.04);
    add('Spine_01', 0.16);
    add('Spine_02', 0.2);
    add('Spine_03', 0.13);
    add('Head', -0.18);
    add('Neck', -0.08);
    add('Clavicle_L', 0, 0, -0.18);
    add('Clavicle_R', 0, 0, -0.18);
    add('Shoulder_L', 0, 0.12, 0.14);
    add('Shoulder_R', 0, 0.12, 0.14);
    add('Elbow_L', 0.35);
    add('Elbow_R', 0.35);
    pose.body.y -= 0.05 * intensity;
    pose.body.x += 0.08 * intensity;
    pose.lunge.forward -= 0.09 * intensity;
    pose.weapon.emphasis += 0.18 * intensity;
    return pose;
}

/**
 * Relaxed combat-ready guard used as the base of every clip.
 *
 * Weapon arm carried low and forward, off hand raised across the chest,
 * feet in a slight split stance with soft knees.
 */
function guardedPose(overrides = {}) {
    return createPose({
        body: overrides.body,
        lunge: overrides.lunge,
        weapon: overrides.weapon,
        bones: {
            Hips: { y: 0.06 },
            Spine_01: { x: -0.03, y: -0.04 },
            Spine_02: { x: -0.02, y: -0.03 },
            Spine_03: { y: -0.02 },
            Neck: { y: 0.05 },
            Shoulder_L: { z: -1.2, y: 0.22 },
            Elbow_L: { x: 0.55 },
            Hand_L: { z: -0.15 },
            Shoulder_R: { z: -1.18, y: 0.32 },
            Elbow_R: { x: 0.85 },
            Hand_R: { x: -0.12 },
            UpperLeg_L: { x: -0.07, z: 0.045 },
            LowerLeg_L: { x: 0.12 },
            UpperLeg_R: { x: 0.1, z: -0.045 },
            LowerLeg_R: { x: 0.14 },
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
        lunge: {
            forward: from.lunge.forward + (to.lunge.forward - from.lunge.forward) * t,
            side: from.lunge.side + (to.lunge.side - from.lunge.side) * t,
        },
        weapon: {
            emphasis: from.weapon.emphasis + (to.weapon.emphasis - from.weapon.emphasis) * t,
        },
    };
}

/**
 * Blends with smootherstep easing so chained attacks never snap.
 * Linear blends cut frames at waypoints; eased blends keep velocity
 * continuous through anticipation → contact → recovery.
 */
export function blendHeroPosesEased(from, to, amount) {
    return blendHeroPoses(from, to, smootherstep(amount));
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
    // Strike segments (coil→contact) ease out for snap; recoveries ease smooth.
    const span = Math.max(toTime - fromTime, 1e-5);
    const raw = (t - fromTime) / span;
    return blendHeroPoses(fromPose, toPose, smootherstep(raw));
}

/** Subtle asymmetrical guard with breathing and slow weight shifts. */
function sampleWaiting(time, seed) {
    const phase = time * 2.15 + seed * Math.PI * 2;
    const swayPhase = time * 0.53 + seed * Math.PI * 2;
    const breath = Math.sin(phase) * 0.025;
    // Figure-eight weight shift: hips drift on y while the torso counter-rolls
    // on z, so the idle never slides — it sways like a standing human.
    const weightShift = Math.sin(swayPhase);
    const weightShift2 = Math.sin(swayPhase * 0.5 + 1.3);
    const lookAround = Math.sin(time * 0.31 + seed * 6.28) * 0.1;
    return guardedPose({
        body: {
            x: 0.006 + breath * 0.1,
            y: 0.01 + breath * 0.24 + weightShift2 * 0.004,
            z: weightShift * 0.02,
        },
        bones: {
            Hips: { y: 0.06 + weightShift * 0.04, x: weightShift2 * 0.015 },
            Spine_01: { x: -0.03 + breath * 0.2, y: -0.04 + weightShift * 0.02 },
            Spine_02: { x: -0.02 + breath * 0.3, y: -0.03 + weightShift * 0.03 },
            Spine_03: { y: -0.02 - weightShift * 0.02 },
            Neck: { y: 0.05 + Math.sin(phase * 0.23) * 0.12 + lookAround * 0.3 },
            Head: { x: Math.sin(phase * 0.31 + 1.2) * 0.05, y: lookAround },
            Shoulder_L: { z: -1.2 + breath * 0.06, y: 0.22 + weightShift * 0.02 },
            Elbow_L: { x: 0.55 + breath * 0.08 },
            Shoulder_R: { z: -1.18 + breath * 0.05, y: 0.32 - weightShift * 0.02 },
            Elbow_R: { x: 0.85 + breath * 0.1 },
            UpperLeg_L: { x: -0.07 - weightShift * 0.03, z: 0.045 },
            LowerLeg_L: { x: 0.12 + Math.max(0, weightShift) * 0.02 },
            UpperLeg_R: { x: 0.1 + weightShift * 0.03, z: -0.045 },
            LowerLeg_R: { x: 0.14 + Math.max(0, -weightShift) * 0.02 },
            Ankle_L: { x: -weightShift * 0.02 },
            Ankle_R: { x: weightShift * 0.02 },
        },
    });
}

/**
 * Core human gait driven by a continuous stride phase (radians).
 * Phase is integrated by the view from replay displacement, so speed changes
 * never snap the legs — the stride only hurries or relaxes.
 *
 * @param {number} stridePhase Integrated stride angle in radians.
 * @param {number} seed Per-fighter phase offset.
 * @param {boolean} charging Sprint variant with a deep forward lean.
 * @param {number} speed Normalized ground speed from replay displacement.
 */
export function sampleMovementPhase(stridePhase, { seed = 0, charging = false, speed = 1 } = {}) {
    const stride = stridePhase + seed * Math.PI * 2;
    const swing = Math.sin(stride);
    // Shaped lifts: quick pick-up, soft plant — avoids the robotic triangle wave.
    const liftLeftRaw = Math.max(0, Math.sin(stride + Math.PI / 2));
    const liftRightRaw = Math.max(0, Math.sin(stride - Math.PI / 2));
    const liftLeft = liftLeftRaw * liftLeftRaw * (3 - 2 * liftLeftRaw);
    const liftRight = liftRightRaw * liftRightRaw * (3 - 2 * liftRightRaw);
    const intensity = Math.min(Math.max(speed, 0.55), 1.25);
    const amplitude = (charging ? 0.85 : 0.62) * intensity;
    // Double-frequency bob: the body dips twice per cycle like a real walk.
    const bob = Math.abs(Math.sin(stride)) * (charging ? 0.05 : 0.028)
        + Math.sin(stride * 2 + 0.6) * 0.006 * intensity;
    const breath = Math.sin(stride * 0.5) * 0.008;
    return createPose({
        body: {
            x: (charging ? -0.18 : -0.05) + breath * 0.4 - intensity * 0.008,
            y: 0.03 + bob,
            z: -swing * (charging ? 0.05 : 0.03),
        },
        bones: {
            Hips: { y: -swing * 0.15, x: (charging ? -0.06 : -0.02) + Math.cos(stride) * 0.012 },
            Spine_01: { x: (charging ? -0.12 : -0.04) + breath * 0.3, y: -swing * 0.04 },
            Spine_02: { x: (charging ? -0.14 : -0.04) + breath * 0.4, y: swing * 0.1 },
            Spine_03: { y: -swing * 0.06, x: Math.sin(stride * 2) * 0.008 },
            Neck: { x: (charging ? 0.12 : 0.05) + intensity * 0.008, y: -swing * 0.05 },
            Head: { y: -swing * 0.04, x: Math.sin(stride * 2 + 1) * 0.012 },
            // Contralateral pump: each arm swings opposite its same-side leg,
            // elbows lag the shoulder by a quarter cycle like a real arm.
            Clavicle_L: { z: -0.05 - liftLeft * 0.09, y: -swing * 0.03 },
            Shoulder_L: { z: -1.08 + liftLeft * 0.04, y: -swing * amplitude * 0.55 },
            Elbow_L: { x: 0.62 + liftLeft * 0.6 + (charging ? 0.4 : 0) + Math.max(0, swing) * 0.08 },
            Hand_L: { x: liftLeft * 0.12 },
            Clavicle_R: { z: -0.05 - liftRight * 0.09, y: swing * 0.03 },
            Shoulder_R: { z: -1.08 + liftRight * 0.04, y: swing * amplitude * 0.55 },
            Elbow_R: { x: 0.62 + liftRight * 0.6 + (charging ? 0.45 : 0) + Math.max(0, -swing) * 0.08 },
            Hand_R: { x: liftRight * 0.12 },
            UpperLeg_L: { x: swing * amplitude, z: 0.035 + liftLeft * 0.008 },
            LowerLeg_L: { x: liftLeft * 1.05 + 0.1 - Math.max(0, -swing) * 0.25 },
            Ankle_L: { x: -0.16 + liftLeft * 0.42 - swing * 0.16 },
            UpperLeg_R: { x: -swing * amplitude, z: -0.035 - liftRight * 0.008 },
            LowerLeg_R: { x: liftRight * 1.05 + 0.1 - Math.max(0, swing) * 0.25 },
            Ankle_R: { x: -0.16 + liftRight * 0.42 + swing * 0.16 },
        },
        weapon: { emphasis: charging ? 0.35 : 0.08 },
    });
}

/**
 * Cyclic locomotion whose cadence follows actual ground speed.
 *
 * @param {number} time Action age in seconds.
 * @param {number} seed Per-fighter phase offset.
 * @param {boolean} charging Sprint variant with a deep forward lean.
 * @param {number} speed Normalized ground speed from replay displacement.
 */
function sampleMovement(time, seed, charging = false, speed = 1) {
    const cadence = Math.min(Math.max(speed, 0.45), 2.1) * (charging ? 1.35 : 1);
    const stridePhase = time / STRIDE_SECONDS * cadence * Math.PI * 2;
    return sampleMovementPhase(stridePhase, { seed, charging, speed });
}

/**
 * Authored melee arc remade for the top-down camera: a quick coil, an
 * eased-out horizontal sweep with the arm fully extended at contact, a
 * committed lunge with hip drive, and a settled recovery with overshoot
 * absorbed by the knees.
 *
 * Contact sits at 0.38 of the timeline so slash arcs scheduled by the
 * effects layer land exactly on the extended-arm frame.
 *
 * @param {number} time Action age in seconds.
 * @param {boolean} assassinate Crouched stab variant with extended reach.
 */
function sampleMelee(time, assassinate = false) {
    const duration = getHeroActionDuration(assassinate ? ACTIONS.assassinate : ACTIONS.melee);
    const reach = assassinate ? 1.35 : 1;
    const ready = guardedPose();
    const coil = guardedPose({
        body: { x: assassinate ? -0.26 : -0.12, y: assassinate ? -0.06 : 0.01, z: 0.1 },
        lunge: { forward: -0.16 * reach },
        bones: {
            Hips: { y: -0.42, x: assassinate ? -0.1 : -0.02 },
            Spine_01: { y: -0.2, x: -0.05 },
            Spine_02: { y: -0.44, x: -0.08 },
            Spine_03: { y: -0.26 },
            Head: { y: 0.32, x: assassinate ? -0.06 : 0 },
            Neck: { y: 0.1 },
            // Weapon arm cocked high behind the shoulder, wrist loaded.
            Clavicle_R: { z: -0.12 },
            Shoulder_R: { z: assassinate ? 0.55 : -1.3, y: assassinate ? -0.35 : -0.55 },
            Elbow_R: { x: assassinate ? 1.9 : 1.6 },
            Hand_R: { x: 0.25, z: 0.12 },
            // Off arm sweeps across the chest as a counterweight.
            Shoulder_L: { z: -0.7, y: 0.62 },
            Elbow_L: { x: 1.05 },
            Hand_L: { z: -0.18 },
            UpperLeg_L: { x: assassinate ? 0.5 : 0.26, z: 0.06 },
            LowerLeg_L: { x: 0.34 },
            Ankle_L: { x: assassinate ? -0.3 : -0.08 },
            UpperLeg_R: { x: assassinate ? -0.55 : -0.26, z: -0.06 },
            LowerLeg_R: { x: 0.4 },
            Ankle_R: { x: -0.2 },
        },
        weapon: { emphasis: 0.15 },
    });
    const contact = guardedPose({
        body: { x: assassinate ? -0.34 : -0.22, y: assassinate ? 0.14 : 0.1, z: -0.14 },
        lunge: { forward: 0.48 * reach },
        bones: {
            Hips: { y: 0.46, x: assassinate ? -0.12 : -0.05 },
            Spine_01: { y: 0.22, x: assassinate ? -0.1 : -0.06 },
            Spine_02: { y: 0.52, x: -0.12 },
            Spine_03: { y: 0.34 },
            Head: { y: -0.26, x: -0.05 },
            Neck: { y: -0.08 },
            // Arm whipped through the horizontal plane, fully extended,
            // wrist snapped so the blade leads from the top-down camera.
            Clavicle_R: { z: -0.02 },
            Shoulder_R: { z: assassinate ? -1.15 : -0.08, y: assassinate ? 1.1 : 1.5 },
            Elbow_R: { x: assassinate ? 0.3 : 0.08 },
            Hand_R: { x: 0.05, z: -0.1 },
            Shoulder_L: { z: -1.15, y: -0.38 },
            Elbow_L: { x: 0.7 },
            Hand_L: { z: -0.12 },
            UpperLeg_L: { x: -0.5, z: 0.07 },
            LowerLeg_L: { x: 0.22 },
            Ankle_L: { x: -0.1 },
            UpperLeg_R: { x: 0.58, z: -0.07 },
            LowerLeg_R: { x: 0.55 },
            Ankle_R: { x: -0.22 },
        },
        weapon: { emphasis: 1 },
    });
    const followThrough = guardedPose({
        body: { x: -0.12, y: 0.05, z: -0.08 },
        lunge: { forward: 0.24 * reach },
        bones: {
            Hips: { y: 0.26, x: -0.02 },
            Spine_01: { y: 0.14 },
            Spine_02: { y: 0.32, x: -0.06 },
            Spine_03: { y: 0.18 },
            Head: { y: -0.12 },
            Shoulder_R: { z: -0.55, y: 1.05 },
            Elbow_R: { x: 0.5 },
            Hand_R: { x: 0.1 },
            Shoulder_L: { z: -1.1, y: -0.1 },
            Elbow_L: { x: 0.62 },
            UpperLeg_L: { x: -0.22, z: 0.05 },
            LowerLeg_L: { x: 0.3 },
            UpperLeg_R: { x: 0.28, z: -0.05 },
            LowerLeg_R: { x: 0.26 },
            Ankle_L: { x: -0.12 },
            Ankle_R: { x: -0.14 },
        },
        weapon: { emphasis: 0.55 },
    });

    return sampleTimeline(time / duration, [
        [0, ready],
        [0.2, coil],
        [ATTACK_CONTACT_PHASE.melee, contact],
        [0.64, followThrough],
        [1, ready],
    ]);
}

/** Braced shield-high block with both forearms protecting the line of sight. */
function sampleBlock(time) {
    const settle = 0.94 + Math.sin(time * 3.2) * 0.03;
    const sway = Math.sin(time * 1.7) * 0.012;
    return guardedPose({
        body: { x: -0.1 + sway * 0.4, y: -0.025 + sway * 0.2, z: 0.04 + sway },
        bones: {
            Hips: { y: 0.04 + sway * 0.6 },
            Spine_01: { x: -0.08 },
            Spine_02: { x: -0.07, y: sway * 0.5 },
            Neck: { x: 0.08 },
            Head: { y: sway * 0.8 },
            Shoulder_L: { z: -0.72, y: 0.62 },
            Elbow_L: { x: 1.2 * settle },
            Hand_L: { z: -0.3 },
            Shoulder_R: { z: -0.68, y: 0.58 },
            Elbow_R: { x: 1.18 * settle },
            Hand_R: { x: 0.1, z: -0.28 },
            UpperLeg_L: { x: -0.16 + sway, z: 0.06 },
            LowerLeg_L: { x: 0.28 },
            Ankle_L: { x: -0.06 },
            UpperLeg_R: { x: 0.18 - sway, z: -0.06 },
            LowerLeg_R: { x: 0.3 },
            Ankle_R: { x: -0.06 },
        },
        weapon: { emphasis: 0.48 },
    });
}

/**
 * Draw-and-release for bows, with a compact throwing fallback.
 * Release sits at 0.52 of the timeline (0.47 s) so the arrow the engine
 * already spawned meets the string snap instead of chasing a late draw.
 */
function sampleRanged(time, weapon) {
    const phase = clamp01(time / getHeroActionDuration(ACTIONS.ranged));
    const ready = guardedPose();
    const draw = guardedPose({
        body: { x: -0.05, y: 0.015, z: 0.04 },
        lunge: { forward: weapon === 'bow' ? -0.04 : -0.08 },
        bones: weapon === 'bow' ? {
            Hips: { y: -0.14 },
            Spine_01: { x: -0.03, y: -0.08 },
            Spine_02: { y: -0.2 },
            Head: { y: 0.12, x: -0.02 },
            Neck: { y: 0.04 },
            // Bow arm locked forward; draw arm anchored to the cheek.
            // Slight tremor under full draw keeps the hold alive.
            Shoulder_L: { z: -0.28, y: 1.32 },
            Elbow_L: { x: 0.08 },
            Hand_L: { z: 0.2 },
            Clavicle_R: { z: -0.06 },
            Shoulder_R: { z: -0.9, y: 0.5 },
            Elbow_R: { x: 1.38 },
            Hand_R: { x: -0.2, z: -0.2 },
            UpperLeg_L: { x: -0.14, z: 0.05 },
            LowerLeg_L: { x: 0.18 },
            UpperLeg_R: { x: 0.16, z: -0.05 },
            LowerLeg_R: { x: 0.24 },
            Ankle_L: { x: -0.08 },
        } : {
            Hips: { y: -0.3 },
            Spine_01: { y: -0.14 },
            Spine_02: { y: -0.32 },
            Head: { y: 0.16 },
            Shoulder_L: { z: -1.05, y: 0.3 },
            Elbow_L: { x: 0.8 },
            Shoulder_R: { z: -0.5, y: -0.5 },
            Elbow_R: { x: 1.15 },
            Hand_R: { x: -0.28 },
        },
        weapon: { emphasis: 0.72 },
    });
    const release = guardedPose({
        body: { x: -0.1, y: 0.05, z: -0.04 },
        lunge: { forward: 0.09 },
        bones: weapon === 'bow' ? {
            Hips: { y: 0.1 },
            Spine_01: { y: 0.06 },
            Spine_02: { y: 0.16 },
            Head: { y: 0.04 },
            // Bow arm holds its line; the string hand punches back past the
            // ear and settles — the snap the top-down camera reads as a shot.
            Shoulder_L: { z: -0.26, y: 1.38 },
            Elbow_L: { x: 0.06 },
            Hand_L: { z: 0.14 },
            Shoulder_R: { z: -0.75, y: 0.28 },
            Elbow_R: { x: 0.72 },
            Hand_R: { x: -0.05, z: -0.24 },
            UpperLeg_L: { x: -0.1, z: 0.05 },
            UpperLeg_R: { x: 0.12, z: -0.05 },
        } : {
            Hips: { y: 0.26 },
            Spine_02: { y: 0.3 },
            Shoulder_L: { z: -1.0 },
            Shoulder_R: { z: -0.14, y: 1.42 },
            Elbow_R: { x: 0.1 },
        },
        weapon: { emphasis: 1 },
    });
    const followThrough = guardedPose({
        body: { x: -0.07, y: 0.03, z: -0.02 },
        lunge: { forward: 0.04 },
        bones: weapon === 'bow' ? {
            Hips: { y: 0.06 },
            Spine_02: { y: 0.1 },
            Shoulder_L: { z: -0.3, y: 1.3 },
            Elbow_L: { x: 0.1 },
            Shoulder_R: { z: -0.85, y: 0.4 },
            Elbow_R: { x: 0.95 },
            UpperLeg_L: { x: -0.08 },
            UpperLeg_R: { x: 0.1 },
        } : {
            Shoulder_R: { z: -0.4, y: 0.9 },
            Elbow_R: { x: 0.45 },
        },
        weapon: { emphasis: 0.6 },
    });
    return sampleTimeline(phase, [
        [0, ready],
        [0.38, draw],
        [ATTACK_CONTACT_PHASE.rangedRelease, release],
        [0.72, followThrough],
        [1, ready],
    ]);
}

/** Two-handed channel and release silhouette used by staff and bare-hand casters. */
function sampleFireball(time) {
    const phase = clamp01(time / getHeroActionDuration(ACTIONS.fireball));
    const ready = guardedPose();
    const gather = guardedPose({
        body: { x: -0.08, y: -0.015 },
        lunge: { forward: -0.07 },
        bones: {
            Spine_01: { x: -0.08 },
            Spine_02: { x: -0.06 },
            Head: { x: 0.1 },
            Shoulder_L: { z: -0.75, y: 0.58 },
            Elbow_L: { x: 1.28 },
            Hand_L: { z: 0.24 },
            Shoulder_R: { z: -0.72, y: 0.55 },
            Elbow_R: { x: 1.3 },
            Hand_R: { z: -0.24 },
            UpperLeg_L: { x: -0.12 },
            LowerLeg_L: { x: 0.2 },
            UpperLeg_R: { x: 0.14 },
            LowerLeg_R: { x: 0.22 },
        },
        weapon: { emphasis: 0.4 },
    });
    const release = guardedPose({
        body: { x: -0.18, y: 0.07 },
        lunge: { forward: 0.2 },
        bones: {
            Hips: { y: 0.08 },
            Spine_01: { x: 0.04 },
            Spine_02: { x: 0.08 },
            Head: { x: -0.14 },
            Shoulder_L: { z: -0.12, y: 1.38 },
            Elbow_L: { x: 0.14 },
            Hand_L: { z: 0.12 },
            Shoulder_R: { z: -0.1, y: 1.42 },
            Elbow_R: { x: 0.12 },
            Hand_R: { z: -0.12 },
            UpperLeg_L: { x: -0.24 },
            LowerLeg_L: { x: 0.3 },
            UpperLeg_R: { x: 0.26 },
            LowerLeg_R: { x: 0.24 },
        },
        weapon: { emphasis: 1 },
    });
    return sampleTimeline(phase, [[0, ready], [0.44, gather], [0.68, release], [1, ready]]);
}

/** Low compression and expansion timed to the existing teleport effect. */
function sampleTeleport(time) {
    const phase = clamp01(time / getHeroActionDuration(ACTIONS.teleport));
    const ready = guardedPose();
    const compressed = guardedPose({
        body: { x: -0.24, y: -0.16, z: 0.02 },
        bones: {
            Hips: { x: -0.14 },
            Spine_02: { x: 0.18 },
            Head: { x: 0.14 },
            Shoulder_L: { z: -0.62, y: 0.4 },
            Elbow_L: { x: 1.35 },
            Shoulder_R: { z: -0.6, y: 0.42 },
            Elbow_R: { x: 1.38 },
            UpperLeg_L: { x: 0.34, z: 0.06 },
            LowerLeg_L: { x: 0.62 },
            UpperLeg_R: { x: 0.36, z: -0.06 },
            LowerLeg_R: { x: 0.64 },
            Ankle_L: { x: -0.3 },
            Ankle_R: { x: -0.3 },
        },
        weapon: { emphasis: 0.18 },
    });
    const expanded = guardedPose({
        body: { x: 0.04, y: 0.24 },
        bones: {
            Spine_01: { x: -0.06 },
            Spine_02: { x: -0.05 },
            Neck: { x: -0.06 },
            Clavicle_L: { z: -0.12 },
            Shoulder_L: { z: -0.25, y: 0.35 },
            Elbow_L: { x: 0.18 },
            Clavicle_R: { z: -0.12 },
            Shoulder_R: { z: -0.22, y: 0.38 },
            Elbow_R: { x: 0.18 },
            UpperLeg_L: { x: -0.18 },
            LowerLeg_L: { x: 0.06 },
            UpperLeg_R: { x: 0.2 },
            LowerLeg_R: { x: 0.06 },
        },
        weapon: { emphasis: 0.7 },
    });
    return sampleTimeline(phase, [[0, ready], [0.42, compressed], [0.64, expanded], [1, ready]]);
}

/** Low ambush stance with controlled breathing and a forward weapon hand. */
function sampleAmbush(time, seed) {
    const pulse = Math.sin(time * 2.4 + seed * Math.PI * 2) * 0.018;
    const sway = Math.sin(time * 1.1 + seed * 4.2) * 0.015;
    return guardedPose({
        body: { x: -0.2 + sway * 0.3, y: -0.13 + pulse, z: 0.06 + sway },
        bones: {
            Hips: { y: 0.14 + sway, x: -0.1 },
            Spine_01: { x: 0.06 },
            Spine_02: { x: 0.1 + pulse * 0.4, y: -0.1 },
            Head: { x: -0.16, y: sway * 1.2 },
            Neck: { y: sway * 0.6 },
            Shoulder_L: { z: -1.05, y: 0.15 },
            Elbow_L: { x: 0.95 + pulse * 0.8 },
            Hand_L: { z: -0.3 },
            Shoulder_R: { z: -0.55, y: 0.85 },
            Elbow_R: { x: 0.35 + pulse * 0.6 },
            Hand_R: { x: 0.15 },
            UpperLeg_L: { x: 0.42, z: 0.1 },
            LowerLeg_L: { x: 0.72 },
            Ankle_L: { x: -0.38 },
            UpperLeg_R: { x: 0.46, z: -0.1 },
            LowerLeg_R: { x: 0.76 },
            Ankle_R: { x: -0.4 },
        },
        weapon: { emphasis: 0.42 },
    });
}

/** Raises the free hand toward the face, drinks, and returns to guard. */
function samplePotion(time) {
    const phase = clamp01(time / getHeroActionDuration(ACTIONS.potion));
    const ready = guardedPose();
    const raise = guardedPose({
        body: { x: -0.02, y: 0.008 },
        bones: {
            Head: { x: -0.05 },
            Shoulder_L: { z: -1.05, y: 0.45 },
            Elbow_L: { x: 1.15 },
            Hand_L: { z: 0.2 },
            UpperLeg_L: { x: -0.09 },
        },
        weapon: { emphasis: 0.1 },
    });
    const drink = guardedPose({
        body: { x: 0.02, y: 0.012 },
        bones: {
            Head: { x: -0.26 },
            Neck: { x: -0.1 },
            Shoulder_L: { z: -0.95, y: 0.55 },
            Elbow_L: { x: 1.62 },
            Hand_L: { z: 0.3 },
            UpperLeg_L: { x: -0.1 },
        },
        weapon: { emphasis: 0.08 },
    });
    return sampleTimeline(phase, [[0, ready], [0.3, raise], [0.44, drink], [0.74, drink], [1, ready]]);
}

/**
 * Samples one deterministic local-space hero pose from an engine action.
 * Time starts at zero whenever the fighter changes action.
 *
 * @param {number} action Engine action id.
 * @param {number} time Age of the active action in seconds.
 * @param {{ weapon?: string, seed?: number, speed?: number }} [options] Sampling options.
 * @returns {object} Complete pose including body, bones, lunge and weapon channels.
 */
export function sampleHeroPose(action, time, { weapon = 'sword', seed = 0, speed = 1 } = {}) {
    const elapsed = Math.max(Number(time) || 0, 0);
    const phaseSeed = Number(seed) || 0;

    switch (Number(action)) {
        case ACTIONS.fireball: return sampleFireball(elapsed);
        case ACTIONS.teleport: return sampleTeleport(elapsed);
        case ACTIONS.charge: return sampleMovement(elapsed, phaseSeed, true, speed);
        case ACTIONS.block: return sampleBlock(elapsed);
        case ACTIONS.assassinate: return sampleMelee(elapsed, true);
        case ACTIONS.ambush: return sampleAmbush(elapsed, phaseSeed);
        case ACTIONS.melee: return sampleMelee(elapsed, false);
        case ACTIONS.ranged: return sampleRanged(elapsed, weapon);
        case ACTIONS.movement: return sampleMovement(elapsed, phaseSeed, false, speed);
        case ACTIONS.potion: return samplePotion(elapsed);
        case ACTIONS.none:
        case ACTIONS.waiting:
        default: return sampleWaiting(elapsed, phaseSeed);
    }
}

// Re-exported for unit probes that validate easing stays finite.
export { easeOutCubic, smootherstep, smoothstep };

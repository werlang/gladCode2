/**
 * Pure pose math for the procedural gladiator rig. Nothing here touches Three.js,
 * so every curve can be unit-tested.
 *
 * Angle conventions (character faces +Z, +Y is up, +X is the character's left):
 *  - Limbs hang along -Y, so a negative X rotation swings them FORWARD.
 *  - Torso and head extend along +Y, so a positive X rotation leans FORWARD.
 *  - Knees fold the shin backward with a positive X rotation.
 *  - Torso twist (Y rotation) is positive toward the character's left.
 */

export const LEG_SEGMENT = 0.28;
export const FOOT_HEIGHT = 0.05;

/** Every animated channel with its idle value. */
export const REST = Object.freeze({
    y: 0, z: 0, lean: 0.04, twist: 0, roll: 0,
    lhip: -0.04, lknee: 0.08, rhip: 0.04, rknee: 0.08, lhz: 0.03, rhz: -0.03,
    lsh: 0.08, lel: -0.25, lsz: 0.12,
    rsh: -0.3, rel: -0.9, rsz: -0.12,
    hx: 0, hy: 0,
    draw: 0,
});

const CHANNELS = Object.keys(REST);
const LEG_CHANNELS = ['lhip', 'lknee', 'rhip', 'rknee'];

/**
 * Builds a full pose from overrides on top of the idle pose.
 *
 * @param {Partial<typeof REST>} [overrides] Channel overrides.
 * @returns {Record<string, number>} Complete pose.
 */
export function pose(overrides = {}) {
    return { ...REST, ...overrides };
}

/** Cubic ease used for every blend so limbs accelerate and settle instead of snapping. */
export function smoothstep(edge0, edge1, value) {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0 || 1)));
    return t * t * (3 - 2 * t);
}

/**
 * Blends two poses into `out` (allocation-free).
 *
 * @param {Record<string, number>} out Destination pose.
 * @param {Record<string, number>} from Pose at weight 0.
 * @param {Record<string, number>} to Pose at weight 1.
 * @param {number} weight Blend weight, clamped to 0..1.
 * @returns {Record<string, number>} `out`.
 */
export function blendPose(out, from, to, weight) {
    const w = Math.min(1, Math.max(0, weight));
    for (const key of CHANNELS) out[key] = from[key] + (to[key] - from[key]) * w;
    return out;
}

const ARM_CHANNELS = ['lsh', 'lel', 'lsz', 'rsh', 'rel', 'rsz'];

/** Guard poses held while a fight is on; the arms follow the weapon carried. */
export const COMBAT_STANCES = Object.freeze({
    oneHand: pose({ lean: 0.1, twist: -0.3, lsh: -0.6, lel: -1.35, lsz: 0.35, rsh: -1.05, rel: -1.55, rsz: -0.1, lhip: -0.32, lknee: 0.42, rhip: 0.3, rknee: 0.5, lhz: 0.09, rhz: -0.09 }),
    twoHand: pose({ lean: 0.1, twist: -0.25, lsh: -0.95, lel: -1.25, lsz: -0.05, rsh: -1.0, rel: -1.35, rsz: -0.1, lhip: -0.3, lknee: 0.4, rhip: 0.3, rknee: 0.5, lhz: 0.09, rhz: -0.09 }),
    bow: pose({ lean: 0.06, twist: -0.5, hy: 0.35, lsh: -1.2, lel: -0.25, lsz: 0.4, rsh: -0.5, rel: -1.2, rsz: -0.2, lhip: -0.25, lknee: 0.32, rhip: 0.25, rknee: 0.4, lhz: 0.1, rhz: -0.1 }),
    caster: pose({ lean: 0.04, lsh: -0.7, lel: -1.3, lsz: 0.25, rsh: -0.9, rel: -1.5, rsz: -0.15, lhip: -0.2, lknee: 0.3, rhip: 0.2, rknee: 0.35, lhz: 0.08, rhz: -0.08 }),
});

/** Melee swing specs cycled per weapon family, so consecutive blows do not repeat. */
export const MELEE_STYLES = Object.freeze({
    sword: ['melee', 'slashBack'], longsword: ['melee', 'slashBack'], saber: ['slashBack', 'melee'],
    lightblade: ['melee', 'slashBack'], axe: ['melee', 'slashBack'], mace: ['melee'],
    warhammer: ['smash'], spear: ['thrust'], trident: ['thrust'], staff: ['thrust', 'smash'],
    rapier: ['stab'], dagger: ['stab', 'slashBack'], wand: ['stab'],
});

/** Weapon families held with both hands. */
export const TWO_HANDED = Object.freeze(['staff', 'spear', 'trident', 'warhammer']);

/**
 * Layers the combat guard over a locomotion/idle pose: arms and torso follow the stance,
 * legs keep their motion but sink into a wider, bent stance.
 *
 * @param {Record<string, number>} out Pose to modify.
 * @param {Record<string, number>} stance One of {@link COMBAT_STANCES}.
 * @param {number} weight Combat weight from 0 to 1.
 * @param {number} moving Locomotion weight from 0 to 1.
 * @returns {Record<string, number>} `out`.
 */
export function applyCombatStance(out, stance, weight, moving) {
    if (weight <= 0) return out;
    for (const key of ARM_CHANNELS) out[key] += (stance[key] - out[key]) * weight * 0.9;
    out.twist += stance.twist * weight;
    out.hy += stance.hy * weight;
    out.lean += stance.lean * weight;
    const still = weight * (1 - moving);
    for (const key of ['lhip', 'lknee', 'rhip', 'rknee']) out[key] += (stance[key] - out[key]) * still;
    out.lknee += 0.25 * weight * moving;
    out.rknee += 0.25 * weight * moving;
    out.lhz += (stance.lhz - out.lhz) * weight;
    out.rhz += (stance.rhz - out.rhz) * weight;
    return out;
}

/**
 * Writes the locomotion pose for a gait phase.
 *
 * @param {Record<string, number>} out Destination pose.
 * @param {number} phase Gait phase, one full unit per two steps.
 * @param {number} amplitude Leg swing in radians.
 * @param {number} run 0 for a walk, 1 for a full sprint (bent elbows, high knees, forward lean).
 * @param {number} [strafe] Sideways share of the motion: +1 steps left, -1 steps right, 0 is straight.
 * @param {number} [back] 0..1 share of backwards travel (short guarded steps, upright torso).
 * @returns {Record<string, number>} `out`.
 */
export function locomotionPose(out, phase, amplitude, run, strafe = 0, back = 0) {
    const angle = phase * Math.PI * 2;
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const knee = 0.35 + 0.75 * run;
    const armSwing = amplitude * (0.75 + 0.25 * run);
    Object.assign(out, REST);
    out.lhip = -s * amplitude;
    out.rhip = s * amplitude;
    // A knee folds while its leg swings forward, i.e. when the hip angle is decreasing.
    out.lknee = REST.lknee + Math.max(0, c) * knee;
    out.rknee = REST.rknee + Math.max(0, -c) * knee;
    out.lsh = s * armSwing;
    out.lel = -0.3 - run * 0.9 - Math.max(0, -s) * 0.2;
    out.rsh = REST.rsh - s * armSwing * 0.45;
    out.rel = REST.rel - run * 0.4;
    out.lean = 0.06 + run * 0.28;
    out.twist = -s * (0.1 + 0.12 * run);
    out.roll = s * 0.03;
    out.y = Math.abs(c) * 0.012 * (1 + run);
    if (back > 0) {
        out.lean = REST.lean - 0.08 * back;
        out.lknee += 0.15 * back;
        out.rknee += 0.15 * back;
        out.twist *= 1 - 0.6 * back;
    }
    if (strafe !== 0) {
        // Side shuffle: the leading leg reaches out, the trailing one closes in, no forward swing.
        const side = Math.abs(strafe);
        const lead = strafe > 0;
        const reach = 0.1 + 0.3 * Math.max(0, s);
        const close = 0.1 + 0.3 * Math.max(0, -s);
        out.lhip += (REST.lhip - out.lhip) * side;
        out.rhip += (REST.rhip - out.rhip) * side;
        out.lhz = REST.lhz + (( lead ? reach : close) - REST.lhz) * side;
        out.rhz = REST.rhz + (-(lead ? close : reach) - REST.rhz) * side;
        out.lknee = REST.lknee + (0.2 + Math.max(0, lead ? s : -s) * 0.35) * side;
        out.rknee = REST.rknee + (0.2 + Math.max(0, lead ? -s : s) * 0.35) * side;
        out.twist *= 1 - side;
        out.roll = -strafe * 0.06 * side;
    }
    return out;
}

/**
 * Leg swing that keeps one gait cycle equal to the ground distance covered, so a
 * planted foot moves backward at exactly the body speed.
 *
 * @param {number} speed Ground speed in world units per second.
 * @returns {{ amplitude: number, run: number, cycleLength: number }} Gait parameters.
 */
export function gaitForSpeed(speed) {
    const amplitude = Math.min(1.05, 0.28 + 0.27 * speed);
    const run = smoothstep(2.4, 4.5, speed);
    // Two steps per cycle; each step spans the two-leg reach 2*L*sin(A).
    const cycleLength = 4 * (2 * LEG_SEGMENT) * Math.sin(amplitude);
    return { amplitude, run, cycleLength };
}

/**
 * Height the hips must sit at so the lowest foot rests exactly on the floor.
 *
 * @param {Record<string, number>} p Current pose.
 * @returns {number} Hip height above the ground.
 */
export function hipHeight(p) {
    const drop = (hip, knee) => LEG_SEGMENT * Math.cos(hip) + LEG_SEGMENT * Math.cos(hip + knee);
    return Math.max(drop(p.lhip, p.lknee), drop(p.rhip, p.rknee)) + FOOT_HEIGHT;
}

/*
 * Timed actions. Each key is [time, pose]; the pose blends in over `blendIn`,
 * follows the keys with smooth easing and blends back out over `blendOut`.
 * `contact` is the moment the blow/shot leaves the fighter, used to sync sound
 * and impact effects. `hold` actions sustain their last key while the engine
 * keeps reporting the action. `holdAt` pauses a wind-up at full draw until the
 * engine reports the shot (Fighter.fire), so release matches the projectile spawn.
 * `weapon` is the equipment used: melee/bow/orb persist until another kind is
 * used, the rest are shown only during the action.
 */
export const ACTION_SPECS = Object.freeze({
    melee: {
        duration: 0.6, blendIn: 0.07, blendOut: 0.22, contact: 0.2, weapon: 'melee',
        keys: [
            [0.1, pose({ lean: -0.18, twist: -0.75, rsh: -2.75, rel: -0.5, rsz: -0.25, lsh: 0.6, lel: -0.6, lsz: 0.7, lhip: 0.3, rhip: -0.25, lknee: 0.2, rknee: 0.25 })],
            [0.2, pose({ lean: 0.4, twist: 0.65, rsh: -1.3, rel: -0.08, rsz: -0.1, lsh: 0.3, lel: -0.5, z: 0.32, lhip: -0.75, lknee: 0.45, rhip: 0.5, rknee: 0.2 })],
            [0.34, pose({ lean: 0.5, twist: 0.85, rsh: -0.75, rel: -0.08, rsz: -0.05, lsh: 0.4, lel: -0.5, z: 0.34, lhip: -0.75, lknee: 0.45, rhip: 0.5, rknee: 0.2 })],
        ],
    },
    slashBack: {
        duration: 0.6, blendIn: 0.07, blendOut: 0.22, contact: 0.2, weapon: 'melee',
        keys: [
            [0.1, pose({ lean: 0.05, twist: 0.7, rsh: -1.35, rel: -0.5, rsz: 0.5, lsh: 0.5, lel: -0.6, lsz: 0.6, lhip: 0.25, rhip: -0.25, lknee: 0.25, rknee: 0.3 })],
            [0.2, pose({ lean: 0.3, twist: -0.85, rsh: -1.45, rel: -0.1, rsz: -1.25, lsh: 0.4, lel: -0.5, lsz: 0.5, z: 0.28, lhip: -0.7, lknee: 0.4, rhip: 0.45, rknee: 0.2 })],
            [0.34, pose({ lean: 0.35, twist: -1.05, rsh: -1.3, rel: -0.1, rsz: -1.5, lsh: 0.4, lel: -0.5, lsz: 0.5, z: 0.3, lhip: -0.7, lknee: 0.4, rhip: 0.45, rknee: 0.2 })],
        ],
    },
    thrust: {
        duration: 0.62, blendIn: 0.08, blendOut: 0.22, contact: 0.22, weapon: 'melee',
        keys: [
            [0.12, pose({ lean: 0.0, twist: -0.6, rsh: -0.9, rel: -1.9, rsz: -0.15, lsh: -0.95, lel: -1.1, lsz: 0.15, lhip: 0.3, rhip: -0.3, lknee: 0.35, rknee: 0.4 })],
            [0.22, pose({ lean: 0.45, twist: 0.35, rsh: -1.5, rel: -0.05, rsz: -0.1, lsh: -1.4, lel: -0.15, lsz: 0.12, z: 0.5, lhip: -0.95, lknee: 0.5, rhip: 0.55, rknee: 0.2 })],
            [0.38, pose({ lean: 0.5, twist: 0.4, rsh: -1.5, rel: -0.05, rsz: -0.1, lsh: -1.4, lel: -0.15, lsz: 0.12, z: 0.55, lhip: -0.95, lknee: 0.5, rhip: 0.55, rknee: 0.2 })],
        ],
    },
    smash: {
        duration: 0.85, blendIn: 0.1, blendOut: 0.28, contact: 0.34, weapon: 'melee',
        keys: [
            [0.2, pose({ lean: -0.3, twist: -0.55, rsh: -3.0, rel: -0.45, rsz: -0.2, lsh: -2.7, lel: -0.5, lsz: 0.3, lhip: 0.35, rhip: -0.3, lknee: 0.3, rknee: 0.35 })],
            [0.34, pose({ lean: 0.65, twist: 0.4, rsh: -1.15, rel: -0.1, rsz: -0.1, lsh: -1.05, lel: -0.15, lsz: 0.2, z: 0.35, lhip: -0.85, lknee: 0.5, rhip: 0.5, rknee: 0.25 })],
            [0.55, pose({ lean: 0.7, twist: 0.4, rsh: -1.0, rel: -0.1, rsz: -0.1, lsh: -0.95, lel: -0.15, lsz: 0.2, z: 0.35, lhip: -0.85, lknee: 0.5, rhip: 0.5, rknee: 0.25 })],
        ],
    },
    stab: {
        duration: 0.46, blendIn: 0.06, blendOut: 0.18, contact: 0.15, weapon: 'melee',
        keys: [
            [0.07, pose({ lean: -0.05, twist: -0.7, rsh: -1.0, rel: -1.6, rsz: -0.2, lsh: 0.6, lel: -0.5, lsz: 0.8, lhip: 0.25, rhip: -0.3, lknee: 0.4, rknee: 0.45 })],
            [0.15, pose({ lean: 0.5, twist: 0.1, rsh: -1.55, rel: -0.05, rsz: -0.1, lsh: 0.7, lel: -0.4, lsz: 0.9, z: 0.5, lhip: -1.0, lknee: 0.5, rhip: 0.6, rknee: 0.2 })],
            [0.28, pose({ lean: 0.5, twist: 0.1, rsh: -1.55, rel: -0.05, rsz: -0.1, lsh: 0.7, lel: -0.4, lsz: 0.9, z: 0.5, lhip: -1.0, lknee: 0.5, rhip: 0.6, rknee: 0.2 })],
        ],
    },
    assassinate: {
        duration: 0.6, blendIn: 0.08, blendOut: 0.2, contact: 0.22, weapon: 'melee',
        keys: [
            [0.1, pose({ lean: 0.35, twist: -0.5, rsh: -0.5, rel: -2.1, rsz: -0.2, lsh: -0.5, lel: -0.9, lhip: -0.5, lknee: 0.8, rhip: 0.4, rknee: 0.9, y: 0 })],
            [0.22, pose({ lean: 0.6, twist: 0.35, rsh: -1.5, rel: -0.03, lsh: 0.5, lel: -0.4, z: 0.6, lhip: -1.0, lknee: 0.5, rhip: 0.7, rknee: 0.1 })],
            [0.4, pose({ lean: 0.6, twist: 0.35, rsh: -1.5, rel: -0.03, lsh: 0.5, lel: -0.4, z: 0.6, lhip: -1.0, lknee: 0.5, rhip: 0.7, rknee: 0.1 })],
        ],
    },
    // Side-on archery stance: the chest turns a quarter so the bow arm points down the
    // heading, the head looks along it and the draw hand is pulled to the anchor near the chin.
    ranged: {
        duration: 0.8, blendIn: 0.14, blendOut: 0.25, contact: 0.5, holdAt: 0.46, weapon: 'bow',
        keys: [
            [0.16, pose({ lean: 0.02, twist: -1.5, hy: 0.6, lsh: 0, lel: 0, lsz: 1.5, rsh: -1.5, rsz: 0.8, rel: -0.3, draw: 0.3, lhip: -0.1, rhip: 0.12, lknee: 0.1, rknee: 0.1 })],
            [0.46, pose({ lean: 0.02, twist: -1.5, hy: 0.6, lsh: 0, lel: 0, lsz: 1.5, rsh: -2.05, rsz: 1.15, rel: -0.05, draw: 1, lhip: -0.1, rhip: 0.12, lknee: 0.1, rknee: 0.1 })],
            [0.55, pose({ lean: 0.0, twist: -1.45, hy: 0.58, lsh: 0, lel: 0, lsz: 1.5, rsh: -1.2, rsz: 0.5, rel: -0.6, draw: 0, lhip: -0.1, rhip: 0.12, lknee: 0.1, rknee: 0.1 })],
        ],
    },
    fireball: {
        duration: 0.75, blendIn: 0.12, blendOut: 0.22, contact: 0.46, holdAt: 0.42, weapon: 'orb',
        keys: [
            [0.2, pose({ lean: -0.12, lsh: -1.75, lel: -0.9, lsz: 0.15, rsh: -1.75, rel: -0.9, rsz: -0.15, lhip: -0.15, rhip: 0.2, hx: -0.15 })],
            [0.42, pose({ lean: -0.18, lsh: -2.0, lel: -0.7, lsz: 0.2, rsh: -2.0, rel: -0.7, rsz: -0.2, lhip: -0.15, rhip: 0.2, hx: -0.2 })],
            [0.52, pose({ lean: 0.3, lsh: -1.4, lel: -0.05, lsz: 0.08, rsh: -1.4, rel: -0.05, rsz: -0.08, z: 0.18, lhip: -0.4, lknee: 0.3, rhip: 0.35 })],
        ],
    },
    potion: {
        duration: 0.8, blendIn: 0.12, blendOut: 0.22, contact: 0.4, weapon: 'flask',
        keys: [
            [0.25, pose({ lean: -0.05, rsh: -1.05, rel: -2.35, rsz: -0.1, hx: -0.3, lsh: 0.15, lel: -0.35 })],
            [0.55, pose({ lean: -0.08, rsh: -1.1, rel: -2.5, rsz: -0.1, hx: -0.4, lsh: 0.15, lel: -0.35 })],
        ],
    },
    ambush: {
        duration: 0.9, blendIn: 0.15, blendOut: 0.3, contact: 0.2, weapon: 'melee',
        keys: [
            [0.25, pose({ lean: 0.55, lhip: -0.75, lknee: 1.35, rhip: -0.55, rknee: 1.25, lsh: -0.7, lel: -1.3, rsh: -0.6, rel: -1.6, hx: -0.4 })],
            [0.6, pose({ lean: 0.6, lhip: -0.8, lknee: 1.4, rhip: -0.6, rknee: 1.3, lsh: -0.7, lel: -1.3, rsh: -0.6, rel: -1.6, hx: -0.4 })],
        ],
    },
    teleport: {
        duration: 0.6, blendIn: 0.08, blendOut: 0.2, contact: 0.22, weapon: null,
        keys: [
            [0.2, pose({ lean: 0.12, lsh: -1.25, lel: -1.35, lsz: 0.55, rsh: -1.25, rel: -1.35, rsz: -0.55, lknee: 0.25, rknee: 0.25, lhip: -0.12, rhip: -0.12, hx: 0.1 })],
            [0.4, pose({ lean: -0.18, lsh: -2.9, lel: -0.15, lsz: 0.9, rsh: -2.9, rel: -0.15, rsz: -0.9, lhip: 0.05, rhip: -0.05, hx: -0.3 })],
        ],
    },
    block: {
        hold: true, blendIn: 0.12, blendOut: 0.2, weapon: 'shield',
        target: pose({ lean: 0.2, lhip: -0.55, lknee: 0.95, rhip: 0.3, rknee: 0.65, lsh: -1.55, lel: -0.3, lsz: -0.05, rsh: -0.95, rel: -2.1, rsz: 0.2, twist: 0.25, hx: 0.05 }),
    },
    charge: {
        hold: true, blendIn: 0.15, blendOut: 0.25, weapon: 'melee', keepLegs: true,
        target: pose({ lean: 0.4, rsh: -1.55, rel: -0.35, rsz: -0.15, lsh: 0.9, lel: -1.2, lsz: 0.25 }),
    },
});

/**
 * Maps engine action ids (see battle-state.js ACTIONS) to action specs.
 * Movement, waiting and none are not actions; they are locomotion/idle.
 */
export const ACTION_BY_ID = Object.freeze({
    0: 'fireball', 1: 'teleport', 2: 'charge', 3: 'block', 4: 'assassinate',
    5: 'ambush', 6: 'melee', 7: 'ranged', 11: 'potion',
});

/** Time of the last authored key of a timed action, plus its recovery. */
export function actionDuration(spec) {
    return spec.hold ? Infinity : spec.duration;
}

/**
 * Samples a spec's keyframes with smooth easing between keys.
 *
 * @param {Record<string, number>} out Destination pose.
 * @param {{ keys: Array<[number, Record<string, number>]> }} spec Timed action.
 * @param {number} time Seconds since the action started.
 * @returns {Record<string, number>} `out`.
 */
export function sampleKeys(out, spec, time) {
    const { keys } = spec;
    if (time <= keys[0][0]) {
        // Ramp from the wind-up's own pose so the first key is reached, not skipped.
        return Object.assign(out, keys[0][1]);
    }
    for (let i = 1; i < keys.length; i += 1) {
        if (time <= keys[i][0]) {
            const [t0, from] = keys[i - 1];
            const [t1, to] = keys[i];
            return blendPose(out, from, to, smoothstep(t0, t1, time));
        }
    }
    return Object.assign(out, keys[keys.length - 1][1]);
}

/**
 * Weight of an action pose over the base (locomotion) pose.
 *
 * @param {Record<string, number>} spec Action spec.
 * @param {number} time Seconds since the action started.
 * @param {number|null} releasedAt Seconds when a hold action ended, or null while it continues.
 * @returns {number} Weight from 0 to 1.
 */
export function actionWeight(spec, time, releasedAt = null) {
    const rampIn = smoothstep(0, spec.blendIn, time);
    if (spec.hold) {
        if (releasedAt === null) return rampIn;
        return rampIn * (1 - smoothstep(releasedAt, releasedAt + spec.blendOut, time));
    }
    return rampIn * (1 - smoothstep(spec.duration - spec.blendOut, spec.duration, time));
}

/**
 * Composes the final pose: locomotion base, action overlay, then keep-leg masking.
 *
 * @param {Record<string, number>} out Destination pose.
 * @param {Record<string, number>} base Locomotion/idle pose.
 * @param {object|null} spec Active action spec, or null.
 * @param {number} time Seconds since the action started.
 * @param {number|null} releasedAt Seconds when a hold action ended.
 * @param {Record<string, number>} scratch Reusable pose buffer.
 * @returns {Record<string, number>} `out`.
 */
export function composePose(out, base, spec, time, releasedAt, scratch) {
    if (!spec) return Object.assign(out, base);
    const target = spec.hold ? spec.target : sampleKeys(scratch, spec, time);
    blendPose(out, base, target, actionWeight(spec, time, releasedAt));
    if (spec.keepLegs) for (const key of LEG_CHANNELS) out[key] = base[key];
    return out;
}

/**
 * Preview animation for the gladiator creator: maps the creator's five animations (walk, cast, thrust,
 * slash, shoot) onto the arena's own action specs and Synty clips, so the 3D preview moves exactly as
 * a fighter does in battle. Pure: no Three.js, so it is unit tested (tests/render2/creator-pose.test.mjs).
 * `GladPreview3D` (editor/glad-preview-3d.js) calls {@link previewFrame} every frame and feeds the result
 * to `SyntyModel#applyPose`.
 */
import {
    ACTION_SPECS, COMBAT_STANCES, actionDuration, actionWeight, applyCombatStance, composePose, pose,
} from './motion.js';
import { BODIES, syntyOutfit } from './synty-outfit.js';

/**
 * Ground speed of the walk, in world units per second. It sits at the walk gait of synty-model.js
 * (`GAIT_CM_PER_SECOND.walk`, about 141 cm/s): below the run threshold, so the walk clips play.
 */
export const WALK_SPEED = 0.62;
/** Seconds the preview holds the guard between two repeats of an action. */
export const PREVIEW_REST_SECONDS = 0.5;
/** Yaw change below which the turn-in-place clips are not played (radians). */
const TURN_EPSILON = 0.01;

/**
 * Creator animation to action style. `walk` has no action (locomotion only); the other styles are
 * keys of `ACTION_SPECS` and of the Synty clip table in synty-model.js. `cast` plays the spell pose
 * (no orb is drawn in the preview); `shoot` is the bow shot, aimed and released at the spec's contact.
 */
export const PREVIEW_MOVES = Object.freeze({
    walk: { style: null },
    cast: { style: 'fireball' },
    thrust: { style: 'thrust' },
    slash: { style: 'melee' },
    shoot: { style: 'ranged' },
});

/**
 * Pose and motion state for one frame of the preview. The arguments are the creator's clock: `elapsed`
 * counts only while playing, `dt` is the frame time (0 while paused) and `turn` is the yaw still to turn.
 *
 * Paused, the preview shows its first frame like the sprite: walk stands at phase 0 and an action
 * shows the guard (no action), so pausing never leaves a limb mid-swing.
 *
 * @param {{ move?: string, elapsed?: number, dt?: number, playing?: boolean, turn?: number }} [frame]
 * @returns {{ pose: Record<string, number>, options: Record<string, any> }} The arguments of `SyntyModel#applyPose(pose, options)`.
 */
export function previewFrame({ move = 'walk', elapsed = 0, dt = 0, playing = false, turn = 0 } = {}) {
    const style = PREVIEW_MOVES[move]?.style ?? null;
    const spec = style ? ACTION_SPECS[style] : null;
    const walking = spec === null;

    // Action clock: the action runs once, then holds the guard for PREVIEW_REST_SECONDS before it repeats.
    const cycle = spec ? actionDuration(spec) + PREVIEW_REST_SECONDS : 0;
    const inAction = Boolean(spec) && playing && elapsed % cycle < spec.duration;
    const time = inAction ? elapsed % cycle : 0;
    const blend = inAction ? actionWeight(spec, time, null) : 0;
    const action = inAction ? { style, time, blend, contact: spec.contact ?? 0, fired: false } : null;

    // Upper-body pose for the spell overlay (`fireball`): the guard the fighter holds, plus the spec's keys.
    const base = applyCombatStance(pose(), COMBAT_STANCES.oneHand, 1, 0);
    const posed = action ? composePose(pose(), base, spec, time, null, pose()) : base;

    const motion = {
        dt: playing ? dt : 0,
        travel: walking && playing ? WALK_SPEED * dt : 0,
        speed: walking ? WALK_SPEED : 0,
        forward: walking ? WALK_SPEED : 0,
        lateral: 0,
        moveWeight: walking ? 1 : 0,
        // the guard stance is held through every action and while the preview waits between repeats
        combat: walking ? 0 : 1,
        action,
        flinch: 0,
        hitScale: 0,
        hitAngle: 0,
        turn: Math.abs(turn) > TURN_EPSILON ? turn : 0,
        stunned: false,
        dead: 0,
        victory: null,
    };
    // A paused walk stands on phase 0 (the sprite's frame 0); a playing walk accumulates its own stride.
    if (walking && !playing) motion.phase = 0;

    return {
        pose: posed,
        options: {
            armRecoil: 0,
            bodyRecoil: 0,
            stunned: false,
            aim: blend,
            elapsed: time,
            speed: motion.speed,
            reducedMotion: false,
            motion,
        },
    };
}

/**
 * Which weapon the preview holds for an animation: the bow for the shot, otherwise the melee weapon
 * the gladiator wears, otherwise the bow, otherwise nothing. The arena's default sword is never shown
 * for a gladiator who wears no weapon, which the sprite does not show either.
 *
 * @param {string} move Creator animation name.
 * @param {boolean} hasMelee The worn skin has a melee weapon.
 * @param {boolean} hasBow The worn skin has a bow.
 * @returns {'bow'|'melee'|'none'} Argument of `SyntyModel#setWeapons`.
 */
export function heldWeapon(move, hasMelee, hasBow) {
    if (move === 'shoot' && hasBow) return 'bow';
    if (hasMelee) return 'melee';
    return hasBow ? 'bow' : 'none';
}

/**
 * The Synty assets a gladiator needs, as keys: its gender (the locomotion clips), its weapon and bow,
 * its shield, its head props and its full body. `loadSynty` loads the union of these over every look
 * it is given, so the preview reloads only when a new layer needs an asset it does not have yet.
 *
 * @param {Record<string, any>} look Appearance from `palette.getAppearance`.
 * @returns {string[]} Asset keys such as `weapon:sword` or `prop:afro`.
 */
export function assetNeeds(look) {
    const outfit = syntyOutfit(look);
    return [
        `gender:${look.female ? 'Femn' : 'Masc'}`,
        `weapon:${outfit.weapon}`,
        `bow:${outfit.bow}`,
        ...(outfit.shield ? [`shield:${outfit.shield}`] : []),
        ...outfit.props.map((prop) => `prop:${prop.id}`),
        ...(BODIES[outfit.body] ? [`body:${outfit.body}`] : []),
    ];
}

import { ACTION_BY_ID, ACTION_SPECS, MELEE_STYLES, gaitForSpeed } from './motion.js';
import { WALK_GAIT } from './synty-model.js';

/**
 * The battle action each creator animation plays in 3D, as the engine action id a `Fighter` starts
 * (`motion.js` `ACTION_BY_ID`), or `null` for the walk:
 * - `walk`: the Synty walk cycle, in place;
 * - `cast`: the fireball, the spell pose with the orb growing between the hands (there is no Synty spell clip);
 * - `thrust` and `slash`: the worn weapon's melee attack, swing picked per weapon family as in battle
 *   (`MELEE_STYLES`: spears and tridents thrust two-handed, swords slash, rapiers and wands stab...);
 * - `shoot`: the bow shot (archery IK, nocked arrow, string pulled and released).
 */
export const PREVIEW_ACTIONS = Object.freeze({ walk: null, cast: 0, thrust: 6, slash: 6, shoot: 7 });

/** Seconds a drawn bow or a charged spell waits at full draw before it is released. */
export const HOLD_SECONDS = 0.3;
/** Seconds of guard between two repeats of an attack, shot or spell. */
export const REST_SECONDS = 0.5;
/** In-place walk: a little under the speed where the Synty locomotion starts blending into the run. */
export const WALK_SPEED = WALK_GAIT.speed * 0.95;
/** Ground credited per second so the legs cycle at the walk clip's authored pace (the gait phase follows distance). */
const WALK_STRIDE = gaitForSpeed(WALK_SPEED).cycleLength / WALK_GAIT.seconds;

/**
 * One creator animation as a loop of battle commands for a `Fighter`: the action to start at the top of each cycle,
 * when to release a drawn bow or charged spell (`Fighter#fire`), or, for the walk, the motion to hold
 * (`Fighter#seekMotion`), since the gladiator walks without going anywhere.
 */
export class PreviewMotion {
    #action;
    #holdAt;
    #period;
    #time = 0;
    #started = false;
    #fired = false;
    #travelled = 0;

    /**
     * @param {string} move Creator animation: `walk`, `cast`, `thrust`, `slash` or `shoot` (anything else walks).
     * @param {string} [weapon] Melee family of the outfit (`palette.getAppearance().weapon`), whose longest swing sets
     *   the length of a melee cycle.
     */
    constructor(move, weapon = 'sword') {
        this.#action = PREVIEW_ACTIONS[move] ?? null;
        if (this.#action === null) return;
        const name = ACTION_BY_ID[this.#action];
        const styles = name === 'melee' ? (MELEE_STYLES[weapon] ?? MELEE_STYLES.sword) : [name];
        const duration = Math.max(...styles.map(style => ACTION_SPECS[style].duration));
        this.#holdAt = ACTION_SPECS[name].holdAt ?? null;
        this.#period = duration + (this.#holdAt === null ? 0 : HOLD_SECONDS) + REST_SECONDS;
    }

    /** @returns {number|null} Engine action id this animation starts, or `null` for the walk. */
    get action() {
        return this.#action;
    }

    /** @returns {number} Seconds between two starts of the action (0 for the walk, which never restarts). */
    get period() {
        return this.#action === null ? 0 : this.#period;
    }

    /**
     * What the fighter does this frame, then moves the loop on by `dt` game seconds.
     *
     * @param {number} dt Game seconds this frame lasts.
     * @returns {{ start: boolean, fire: boolean, walk: { dx: number, dz: number, seconds: number, travelled: number }|null }}
     *   `start`: start the action now; `fire`: release the drawn shot or spell; `walk`: arguments for `Fighter#seekMotion`.
     */
    advance(dt) {
        const step = { start: false, fire: false, walk: null };
        if (this.#action === null) {
            this.#travelled += WALK_STRIDE * dt;
            step.walk = { dx: 0, dz: WALK_SPEED, seconds: 1, travelled: this.#travelled };
            return step;
        }
        if (!this.#started || this.#time >= this.#period) {
            this.#started = true;
            this.#fired = false;
            this.#time = this.#time >= this.#period ? this.#time % this.#period : 0;
            step.start = true;
        }
        if (this.#holdAt !== null && !this.#fired && this.#time >= this.#holdAt + HOLD_SECONDS) {
            this.#fired = true;
            step.fire = true;
        }
        this.#time += Math.max(0, dt);
        return step;
    }
}

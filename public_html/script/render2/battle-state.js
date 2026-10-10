/**
 * Numeric action identifiers emitted by the C simulation engine.
 */
export const ACTIONS = Object.freeze({
    fireball: 0,
    teleport: 1,
    charge: 2,
    block: 3,
    assassinate: 4,
    ambush: 5,
    melee: 6,
    ranged: 7,
    movement: 8,
    waiting: 9,
    none: 10,
    potion: 11,
});

/** The simulation uses a 25 by 25 Cartesian arena. */
export const ARENA_SIZE = 25;

/** The engine writes one replay patch every tenth of a second. */
export const STEP_DURATION_MS = 100;

/**
 * Creates a plain deep copy without sharing mutable arrays or objects.
 *
 * @template T
 * @param {T} value Value to copy.
 * @returns {T} Independent copy of the supplied value.
 */
function cloneValue(value) {
    if (Array.isArray(value)) {
        return /** @type {T} */ (value.map(cloneValue));
    }

    if (value && typeof value === 'object') {
        return /** @type {T} */ (Object.fromEntries(
            Object.entries(value).map(([key, child]) => [key, cloneValue(child)]),
        ));
    }

    return value;
}

/**
 * Applies the engine's recursive array-by-index patch semantics.
 *
 * The simlog intentionally omits unchanged gladiator fields after frame zero.
 * Arrays therefore cannot be replaced wholesale: each gladiator patch must be
 * merged into the gladiator at the same index.
 *
 * @param {unknown} target Previously expanded value.
 * @param {unknown} patch Incremental value emitted by the engine.
 * @returns {unknown} Expanded value with no references to the patch object.
 */
function mergePatch(target, patch) {
    if (Array.isArray(patch)) {
        // The C engine serializes an inactive/dead gladiator patch as `[]`.
        // Legacy deepMerge treats that empty array as a no-op when the target
        // at the same index is already a gladiator object.
        if (target && typeof target === 'object' && !Array.isArray(target)) {
            const output = cloneValue(target);
            patch.forEach((item, index) => {
                output[index] = mergePatch(target[index], item);
            });
            return output;
        }

        const targetArray = Array.isArray(target) ? target : [];
        const output = targetArray.map(cloneValue);

        patch.forEach((item, index) => {
            output[index] = mergePatch(targetArray[index], item);
        });

        return output;
    }

    if (patch && typeof patch === 'object') {
        const targetObject = target && typeof target === 'object' && !Array.isArray(target)
            ? target
            : {};
        const output = cloneValue(targetObject);

        Object.entries(patch).forEach(([key, value]) => {
            output[key] = mergePatch(targetObject[key], value);
        });

        return output;
    }

    return patch;
}

/**
 * Restores spaces encoded as hashes in persisted display names.
 *
 * @param {Record<string, unknown>} state Expanded replay state.
 * @returns {Record<string, unknown>} The same state after display normalization.
 */
function normalizeDisplayNames(state) {
    if (!Array.isArray(state.glads)) {
        return state;
    }

    state.glads.forEach((glad) => {
        for (const field of ['name', 'user']) {
            if (typeof glad[field] === 'string') {
                glad[field] = glad[field].replaceAll('#', ' ');
            }
        }
    });

    return state;
}

/**
 * Expands the compact simlog into immutable, complete frames.
 *
 * Projectile arrays are reset before every merge because the engine lists only
 * projectiles that exist in that frame. All other values inherit by index/key.
 *
 * @param {Array<Record<string, unknown>>} simulation Raw simlog patches.
 * @returns {Array<Record<string, unknown>>} Complete replay frames.
 */
export function expandSimulation(simulation) {
    if (!Array.isArray(simulation)) {
        throw new TypeError('Simulation log must be an array.');
    }

    /** @type {Record<string, unknown>} */
    let state = {};

    return simulation.map((patch) => {
        state.projectiles = [];
        state = /** @type {Record<string, unknown>} */ (mergePatch(state, patch));
        normalizeDisplayNames(state);
        return cloneValue(state);
    });
}

/**
 * Maps engine X/Y values to a centered Three.js X/Z plane without scaling.
 *
 * @param {{ x: number|string, y: number|string }} position Engine position.
 * @param {number} [height=0] Vertical world position.
 * @returns {{ x: number, y: number, z: number }} Three.js world position.
 */
export function toArenaPosition(position, height = 0) {
    return {
        x: Number(position.x) - ARENA_SIZE / 2,
        y: height,
        z: Number(position.y) - ARENA_SIZE / 2,
    };
}

/**
 * Converts the engine's clockwise heading into radians while preserving zero.
 *
 * @param {number|string} heading Heading in degrees, where 0 points north.
 * @returns {number} Normalized heading in radians.
 */
export function headingToRadians(heading) {
    const normalized = ((Number(heading) % 360) + 360) % 360;
    // Engine headings advance clockwise on its X/Y plane. Three.js rotates
    // counter-clockwise around Y, so the equivalent X/Z rotation is negative.
    return normalized === 0 ? 0 : -normalized * Math.PI / 180;
}

/**
 * Blends two scalar values.
 *
 * @param {number} from Value at zero progress.
 * @param {number} to Value at full progress.
 * @param {number} amount Progress from zero to one.
 * @returns {number} Interpolated value.
 */
export function lerp(from, to, amount) {
    return from + (to - from) * Math.min(Math.max(Number(amount) || 0, 0), 1);
}

/**
 * Blends two angles in radians through their shortest signed arc.
 *
 * @param {number} from Angle at zero progress in radians.
 * @param {number} to Angle at full progress in radians.
 * @param {number} amount Progress from zero to one.
 * @returns {number} Interpolated angle in radians.
 */
export function lerpAngle(from, to, amount) {
    const range = Math.PI * 2;
    const delta = ((to - from) % range + range * 1.5) % range - range / 2;
    return from + delta * Math.min(Math.max(Number(amount) || 0, 0), 1);
}

/**
 * Reports whether a point is on or beyond the poison radius.
 *
 * @param {{ x: number|string, y: number|string }} position Engine position.
 * @param {number|string} safeRadius Safe radius emitted in the current frame.
 * @returns {boolean} True when the gladiator is exposed to poison.
 */
export function isOutsideSafeZone(position, safeRadius) {
    const deltaX = ARENA_SIZE / 2 - Number(position.x);
    const deltaY = ARENA_SIZE / 2 - Number(position.y);
    return Math.hypot(deltaX, deltaY) >= Number(safeRadius);
}

/**
 * Returns the legacy replay interval for a signed playback speed.
 *
 * @param {number} speed Signed replay speed multiplier.
 * @returns {number} Milliseconds between replay frames.
 */
export function getPlaybackIntervalMs(speed) {
    return STEP_DURATION_MS / Math.abs(Number(speed) || 1);
}

/**
 * Builds a stable key for projectile lifecycle comparisons.
 *
 * @param {{ id?: number|string, type?: number|string }} projectile Projectile state.
 * @returns {string} Stable key inside a replay.
 */
function projectileKey(projectile) {
    return `${projectile.type ?? 'unknown'}:${projectile.id ?? 'unknown'}`;
}

/**
 * Derives one-shot visual/audio events from two complete replay frames.
 *
 * Continuous state such as position, heading, buffs and bars is intentionally
 * absent; renderers read those values directly from the current frame.
 *
 * @param {Record<string, unknown>|null} previous Previous complete frame.
 * @param {Record<string, unknown>} current Current complete frame.
 * @returns {Array<Record<string, unknown>>} Events that occurred at this frame.
 */
export function deriveStepEvents(previous, current) {
    if (!previous) {
        return [];
    }

    const events = [];
    const previousGlads = Array.isArray(previous.glads) ? previous.glads : [];
    const currentGlads = Array.isArray(current.glads) ? current.glads : [];

    currentGlads.forEach((glad, index) => {
        const prior = previousGlads[index] ?? {};
        const gladId = glad.id ?? index;
        const hpDelta = Number(glad.hp) - Number(prior.hp);

        if (hpDelta < 0) {
            events.push({ type: 'damage', gladId, amount: -hpDelta });
        }
        else if (hpDelta > 0) {
            events.push({ type: 'heal', gladId, amount: hpDelta });
        }

        if (Number(glad.lvl) > Number(prior.lvl)) {
            events.push({ type: 'level-up', gladId, level: Number(glad.lvl) });
        }

        if (Number(glad.hp) <= 0 && Number(prior.hp) > 0) {
            events.push({ type: 'death', gladId });
        }
        else if (Number(glad.hp) > 0 && Number(prior.hp) <= 0) {
            events.push({ type: 'revive', gladId });
        }

        if (Number(glad.action) !== Number(prior.action)) {
            events.push({ type: 'action', gladId, action: Number(glad.action), code: glad.code ?? '' });
        }
    });

    const previousProjectiles = Array.isArray(previous.projectiles) ? previous.projectiles : [];
    const currentProjectiles = Array.isArray(current.projectiles) ? current.projectiles : [];
    const previousByKey = new Map(previousProjectiles.map((projectile) => [projectileKey(projectile), projectile]));
    const currentByKey = new Map(currentProjectiles.map((projectile) => [projectileKey(projectile), projectile]));

    currentByKey.forEach((projectile, key) => {
        if (!previousByKey.has(key)) {
            events.push({ type: 'projectile-spawn', projectile: cloneValue(projectile) });
        }
    });

    previousByKey.forEach((projectile, key) => {
        if (!currentByKey.has(key)) {
            events.push({ type: 'projectile-impact', projectile: cloneValue(projectile) });
        }
    });

    return events;
}

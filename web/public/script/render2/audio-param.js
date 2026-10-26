/** Last target sent to each AudioParam by `glide`. */
const targets = new WeakMap();

/**
 * Glides an AudioParam toward `value` (`setTargetAtTime`), unless its last target is already within `tolerance`.
 * Each automation call crosses into the audio engine and was most of the per-frame sound cost when parameters were
 * re-aimed every frame at the same values (static fires, a still camera, slowly drifting levels).
 *
 * @param {AudioParam} param Parameter to move.
 * @param {number} value Target value.
 * @param {number} now Context time to start from.
 * @param {number} tau Time constant in seconds.
 * @param {number} [tolerance] Largest change ignored, in the parameter's units.
 * @returns {boolean} Whether an automation event was scheduled.
 */
export function glide(param, value, now, tau, tolerance = 1e-3) {
    const last = targets.get(param);
    if (last !== undefined && Math.abs(last - value) <= tolerance) return false;
    targets.set(param, value);
    param.setTargetAtTime(value, now, tau);
    return true;
}

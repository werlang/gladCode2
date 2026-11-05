/**
 * Pure rules of the gladiator creator's preview, shared by the sprite and the 3D views.
 */

/** Animations every outfit can play; the others need a weapon whose catalogue layer names them in `move`. */
const ALWAYS_AVAILABLE = ['walk', 'cast'];

/**
 * The animations a worn outfit can play: walking and casting always; thrust, slash and shoot only while a layer
 * that brings them is worn (a spear thrusts, a sword slashes, a bow shoots).
 *
 * @param {Array<{ move?: string }>} layers Worn catalogue layers.
 * @returns {Set<string>} Animation names.
 */
export function availableMoves(layers) {
    const available = new Set(ALWAYS_AVAILABLE);
    layers.forEach(layer => {
        if (layer?.move) available.add(layer.move);
    });
    return available;
}

/**
 * The animation the animation button moves to: the next one in button order that the outfit can play, wrapping
 * around (and staying put when no other one is available).
 *
 * @param {number} index Current animation index in `names`.
 * @param {string[]} names Animations in button order.
 * @param {Set<string>} available From {@link availableMoves}.
 * @returns {number} Index in `names`.
 */
export function nextMoveIndex(index, names, available) {
    for (let step = 1; step <= names.length; step++) {
        const next = (index + step) % names.length;
        if (available.has(names[next])) return next;
    }
    return index;
}

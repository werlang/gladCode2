/**
 * Pure rules of the gladiator creator's preview, shared by the sprite view and the 3D view: which
 * animations the worn gear allows, how the animation, zoom and turn buttons step, how a drag or a
 * pinch changes the view, and whether the 3D view is the one the player chose. DOM-free and free of
 * render2 imports, so it loads on every editor page and is unit tested (tests/frontend/glad-preview.test.mjs).
 */

/** Zoom limits and the button step, the same in both views (the sprite starts at 1). */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3.5;
export const ZOOM_STEP = 0.5;
/** One click of the turn button, in radians (the sprite's four directions). */
export const QUARTER_TURN = Math.PI / 2;
/** Radians turned per pixel dragged across the preview. */
const RADIANS_PER_PIXEL = 0.01;
/** Zoom change per pixel of wheel travel (exponential, so each notch scales the same). */
const WHEEL_ZOOM_PER_PIXEL = 0.0015;

/**
 * Keeps a zoom scale inside the creator's limits.
 *
 * @param {number} scale Zoom factor.
 * @returns {number} The scale within {@link ZOOM_MIN}..{@link ZOOM_MAX}.
 */
export function clampZoom(scale) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

/**
 * The zoom buttons: one step in or out, never past the limits.
 *
 * @param {number} scale Current zoom.
 * @param {number} direction `1` to zoom in ("Ampliar"), `-1` to zoom out ("Reduzir").
 * @returns {number} The new zoom.
 */
export function stepZoom(scale, direction) {
    return clampZoom(scale + Math.sign(direction) * ZOOM_STEP);
}

/**
 * The mouse wheel: exponential, so the same notch changes a small view and a large one alike.
 *
 * @param {number} scale Current zoom.
 * @param {number} deltaY Wheel travel in pixels (positive scrolls down, which zooms out).
 * @returns {number} The new zoom.
 */
export function wheelZoom(scale, deltaY) {
    return clampZoom(scale * Math.exp(-deltaY * WHEEL_ZOOM_PER_PIXEL));
}

/**
 * Two-finger pinch: the zoom follows the ratio of the finger gap to the gap when the pinch began.
 *
 * @param {number} startScale Zoom when the pinch began.
 * @param {number} startGap Distance between the fingers when the pinch began (px).
 * @param {number} gap Distance between the fingers now (px).
 * @returns {number} The new zoom; unchanged when a gap is unknown or zero.
 */
export function pinchZoom(startScale, startGap, gap) {
    if (!(startGap > 0) || !(gap > 0)) return clampZoom(startScale);
    return clampZoom(startScale * (gap / startGap));
}

/**
 * The turn button after a free drag: the next quarter turn above the current yaw, so the model always
 * lands on one of the four directions (like the sprite's up, left, down, right).
 *
 * @param {number} yaw Current yaw in radians (any value, a drag leaves it off the grid).
 * @returns {number} The next multiple of a quarter turn strictly above `yaw`.
 */
export function nextQuarterTurn(yaw) {
    // the epsilon keeps a yaw that is already on the grid from counting as "above" itself
    return (Math.floor(yaw / QUARTER_TURN + 1e-9) + 1) * QUARTER_TURN;
}

/**
 * A horizontal drag over the preview turns the model with the pointer.
 *
 * @param {number} yaw Current yaw in radians.
 * @param {number} deltaX Pointer movement since the last event, in pixels.
 * @returns {number} The new yaw.
 */
export function dragYaw(yaw, deltaX) {
    return yaw + deltaX * RADIANS_PER_PIXEL;
}

/**
 * Which animation buttons the worn gear allows. Walk and cast are always there; thrust, slash and
 * shoot need a worn layer that names them in its `move`.
 *
 * @param {Array<{ move?: string }>} worn Worn catalogue layers.
 * @returns {Record<string, boolean>} Animation name to availability.
 */
export function availableMoves(worn) {
    const available = { walk: true, cast: true, thrust: false, slash: false, shoot: false };
    for (const image of worn) {
        if (image.move) available[image.move] = true;
    }
    return available;
}

/**
 * The animation button: the next available animation after `current`, cycling. Walk is always
 * available, so the search always finds one; `current` is returned only if nothing else is.
 *
 * @param {number} current Index of the animation now shown.
 * @param {string[]} names Animation names in button order.
 * @param {Record<string, boolean>} available Result of {@link availableMoves}.
 * @returns {number} Index of the next available animation.
 */
export function nextAvailableMove(current, names, available) {
    for (let step = 1; step <= names.length; step += 1) {
        const index = (current + step) % names.length;
        if (available[names[index]]) return index;
    }
    return current;
}

/**
 * Whether the creator should draw the 3D gladiator: the player chose the 3D renderer on this device
 * and the 3D feature gate is on (`ENABLE_RENDER2`). Sprite mode is every other case, including a
 * missing preference script.
 *
 * @param {{ ENABLED?: boolean, get?: () => string, THREE?: string }|undefined} preference
 *   `window.BattleRendererPreference` (battle-renderer-preference.js).
 * @returns {boolean}
 */
export function usesThreePreview(preference) {
    return Boolean(preference?.ENABLED) && typeof preference.get === 'function' && preference.get() === preference.THREE;
}

/**
 * A stable identity of a set of worn layers, so the same gear never rebuilds the 3D model.
 *
 * @param {string[]} tokens Worn layer ids, in any order.
 * @returns {string} The sorted ids joined by `|`.
 */
export function skinKey(tokens) {
    return [...tokens].sort().join('|');
}

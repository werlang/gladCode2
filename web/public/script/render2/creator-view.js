/**
 * Pure view math of the gladiator creator's 3D preview: the turntable the gladiator stands on, the zoom and where the
 * camera goes for it, and how drags, the wheel and pinches change them. Nothing here touches Three.js or the DOM.
 */

/** Zoom of the creator view, like the sprite's: ×1 frames the whole body, ×3.5 the head and shoulders. */
export const ZOOM = Object.freeze({ min: 1, max: 3.5, step: 0.5 });
const QUARTER = Math.PI / 2;
/** A turn that lands within this share of a quarter short of a facing skips to the next one, so a click always turns. */
const QUARTER_SLACK = 0.05;
/**
 * Share of the body's height that half the view shows at ×1: the body fills about 70% of the height, clear of the
 * creator's buttons over the top and bottom of the view, and the battle's team ring under the feet fits across.
 */
const BODY_HALF_VIEW = 0.72;
/** Room left above the head, as a share of the body's height. */
const HEADROOM = 0.05;
/** Zoom change per pixel of wheel scroll (exponential, so scrolling in and out by the same amount returns). */
const WHEEL_RATE = 0.0015;

/**
 * @param {number} zoom Wanted zoom.
 * @returns {number} The zoom within {@link ZOOM} (×1 for anything that is not a number).
 */
export function clampZoom(zoom) {
    if (!Number.isFinite(zoom)) return ZOOM.min;
    return Math.min(ZOOM.max, Math.max(ZOOM.min, zoom));
}

/**
 * Where the turn button takes the gladiator: the next quarter turn ahead, like the sprite's four facings. A drag may
 * leave it between two facings; one that is almost reached counts as reached, so every click visibly turns.
 *
 * @param {number} yaw Current turntable angle in radians (0 faces the camera, a quarter faces screen right).
 * @returns {number} The next multiple of a quarter turn.
 */
export function nextQuarter(yaw) {
    return (Math.floor(yaw / QUARTER + QUARTER_SLACK) + 1) * QUARTER;
}

/**
 * How far a horizontal drag spins the turntable: a drag across the whole view turns the gladiator half round, the
 * front following the pointer.
 *
 * @param {number} pixels Horizontal pointer movement (positive to the right).
 * @param {number} width Width of the view in pixels.
 * @returns {number} Turntable angle change in radians.
 */
export function dragYaw(pixels, width) {
    return (pixels / Math.max(1, width)) * Math.PI;
}

/**
 * @param {number} zoom Current zoom.
 * @param {number} deltaY Wheel scroll in pixels (negative scrolls up, which zooms in).
 * @returns {number} The zoom after the scroll.
 */
export function wheelZoom(zoom, deltaY) {
    return clampZoom(zoom * Math.exp(-deltaY * WHEEL_RATE));
}

/**
 * @param {number} startZoom Zoom when the second finger came down.
 * @param {number} startDistance Distance between the fingers then (pixels).
 * @param {number} distance Distance between them now.
 * @returns {number} The zoom scaled by how far the fingers spread or closed.
 */
export function pinchZoom(startZoom, startDistance, distance) {
    if (!(startDistance > 0) || !(distance > 0)) return clampZoom(startZoom);
    return clampZoom(startZoom * (distance / startDistance));
}

/**
 * Camera framing for a zoom: at ×1 the whole body fits with a margin; zooming in closes the view on the top of the
 * body, keeping a little room over the head.
 *
 * @param {number} zoom View zoom.
 * @param {{ height: number, fov: number }} body Gladiator height (world units, feet at 0) and the camera's vertical field of view in degrees.
 * @returns {{ distance: number, targetY: number }} Camera distance from the gladiator and the height it looks at.
 */
export function framing(zoom, { height, fov }) {
    const half = (height * BODY_HALF_VIEW) / clampZoom(zoom);
    const distance = half / Math.tan((fov * Math.PI) / 360);
    const targetY = Math.max(height / 2, height * (1 + HEADROOM) - half);
    return { distance, targetY };
}

/**
 * Pure view math of the gladiator creator's 3D preview: the turntable the gladiator stands on, the zoom and where the
 * camera goes for it (inside the part of the view the controls leave free), and how drags, the wheel and pinches change
 * them. Nothing here touches Three.js or the DOM.
 */

/** Zoom of the creator view, like the sprite's: ×1 frames the whole body, ×3.5 the head and shoulders. */
export const ZOOM = Object.freeze({ min: 1, max: 3.5, step: 0.5 });
const QUARTER = Math.PI / 2;
/** A turn that lands within this share of a quarter short of a facing skips to the next one, so a click always turns. */
const QUARTER_SLACK = 0.05;
/** Room left above the head, as a share of the body's height. */
const HEADROOM = 0.05;
/** Room between what is framed and the edges of the free band, in screen units (the view spans -1 to 1). */
const EDGE_MARGIN = 0.06;
/** Controls may cover at most this share of the view at each end; the band keeps the rest. */
const MAX_INSET = 0.3;
/** Rounds of the framing solve (each one corrects the perspective of the last); it settles in a handful. */
const FRAMING_ROUNDS = 12;
const NO_INSETS = Object.freeze({ top: 0, bottom: 0 });
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
 * Where a point lands on screen for the creator camera: `distance` from the target, raised by `pitch` to look down on
 * it. Screen units run from -1 to 1 across the view (up and right positive).
 *
 * @param {number} x Point in world units (across the view).
 * @param {number} y Height over the feet.
 * @param {number} z Toward the camera.
 * @param {{ distance: number, targetY: number, pitch: number, tan: number, aspect: number }} camera Camera.
 * @returns {{ x: number, y: number }}
 */
function project(x, y, z, { distance, targetY, pitch, tan, aspect }) {
    const up = (y - targetY) * Math.cos(pitch) - z * Math.sin(pitch);
    const depth = distance - (y - targetY) * Math.sin(pitch) - z * Math.cos(pitch);
    return { x: x / (depth * tan * aspect), y: up / (depth * tan) };
}

/**
 * The height the camera looks at so the head top sits at screen height `screen`, from `distance` away.
 *
 * @param {number} top Head top, in world units.
 * @param {number} screen Wanted screen height of the head top (-1 to 1).
 * @param {{ distance: number, pitch: number, tan: number }} camera Camera.
 * @returns {number}
 */
function headPinnedTarget(top, screen, { distance, pitch, tan }) {
    return top - (screen * tan * distance) / (Math.cos(pitch) + screen * tan * Math.sin(pitch));
}

/**
 * Camera framing for a zoom. At ×1 the whole gladiator, from the top of its head to the front of the ring it stands
 * on, fills the band of the view the creator's controls leave free (with a margin), and the ring fits across; zooming
 * in brings the camera closer while the head keeps its place, so the view closes on the top of the body.
 *
 * @param {number} zoom View zoom.
 * @param {{ height: number, fov: number, pitch?: number, ring?: number, aspect?: number, insets?: { top: number, bottom: number } }} view
 *   Gladiator height (world units, feet at 0), the camera's vertical field of view in degrees and downward pitch in
 *   radians, the radius of the ring under the feet, the view's width over height, and the shares of the view's height
 *   that controls cover at the top and bottom (from {@link viewInsets}).
 * @returns {{ distance: number, targetY: number }} Camera distance from the gladiator and the height it looks at.
 */
export function framing(zoom, { height, fov, pitch = 0, ring = 0, aspect = 1, insets = NO_INSETS }) {
    const tan = Math.tan((fov * Math.PI) / 360);
    const top = height * (1 + HEADROOM);
    const bandTop = 1 - 2 * Math.min(MAX_INSET, insets.top) - EDGE_MARGIN;
    const bandBottom = -1 + 2 * Math.min(MAX_INSET, insets.bottom) + EDGE_MARGIN;
    const camera = { distance: height / tan, targetY: height / 2, pitch, tan, aspect };
    const ends = () => ({ head: project(0, top, 0, camera).y, front: project(0, 0, ring, camera).y });
    // each round scales the distance to the span the band leaves (or the ring's width needs), then centres the span;
    // perspective makes that only nearly right, so the next round corrects what is left
    for (let round = 0; round < FRAMING_ROUNDS; round += 1) {
        const { head, front } = ends();
        const side = Math.abs(project(ring, 0, 0, camera).x);
        camera.distance *= Math.max((head - front) / (bandTop - bandBottom), side / (1 - EDGE_MARGIN));
        const centre = (ends().head + ends().front) / 2;
        camera.targetY += (centre - (bandTop + bandBottom) / 2) * camera.distance * tan;
    }
    const whole = { ...camera };
    const headAt = ends().head;
    const close = { ...camera, distance: whole.distance / clampZoom(zoom) };
    // closer in, the head stays where it was at ×1
    const lift = headPinnedTarget(top, headAt, close) - headPinnedTarget(top, headAt, whole);
    return { distance: close.distance, targetY: whole.targetY + lift };
}

/**
 * How much of the view the creator's controls cover from the top and from the bottom: every control box that crosses
 * the view counts against the end it is nearer to (on a phone the sub-menu row and the item list run over the view,
 * on a desktop the preview buttons and PRONTO).
 *
 * @param {{ left: number, right: number, top: number, bottom: number }} view The view's box on the page.
 * @param {Array<{ left: number, right: number, top: number, bottom: number }>} controls Boxes of the controls around it.
 * @returns {{ top: number, bottom: number }} Shares of the view's height (0 to {@link MAX_INSET}).
 */
export function viewInsets(view, controls) {
    const height = view.bottom - view.top;
    if (!(height > 0)) return { ...NO_INSETS };
    const middle = (view.top + view.bottom) / 2;
    let top = 0;
    let bottom = 0;
    for (const box of controls) {
        const crosses = box.right > view.left && box.left < view.right && box.bottom > view.top && box.top < view.bottom && box.bottom > box.top;
        if (!crosses) continue;
        if ((box.top + box.bottom) / 2 < middle) top = Math.max(top, box.bottom - view.top);
        else bottom = Math.max(bottom, view.bottom - box.top);
    }
    return { top: Math.min(MAX_INSET, top / height), bottom: Math.min(MAX_INSET, bottom / height) };
}

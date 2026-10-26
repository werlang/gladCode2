/** A touch that ends within this many CSS pixels and milliseconds of where it began, alone, is a tap. */
export const TAP_SLOP = 10;
export const TAP_MS = 320;

/**
 * Turns the fingers on the canvas into camera gestures, with no DOM of its own (fed from pointer events):
 * one finger drags, two fingers pinch (distance ratio), twist (angle change) and pan (midpoint motion).
 * The first two fingers down drive a pinch; a third is ignored. When the count changes, the next move
 * measures from where the remaining fingers are, so the camera never jumps, and the finger left after a
 * pinch stays still until the screen is clear.
 */
export class TouchGestures {
    /** Finger id → its last position. */
    #points = new Map();
    /** The touch that may become a tap: where and when it started, and whether it stayed a lone, still finger. */
    #tap = null;
    /** Midpoint travel of the current two-finger gesture (resets when a finger is added or lifted). */
    #travel = 0;
    /** Two fingers were down since the screen was last clear: the finger left after a pinch does not drag. */
    #pinched = false;

    /** @returns {number} Fingers down. */
    get count() {
        return this.#points.size;
    }

    /** @returns {number} CSS pixels the two-finger midpoint has travelled since the pinch began. */
    get travel() {
        return this.#travel;
    }

    /**
     * @param {number} id Pointer id.
     * @returns {boolean} Whether this finger is being tracked.
     */
    has(id) {
        return this.#points.has(id);
    }

    /**
     * A finger touches down.
     *
     * @param {number} id Pointer id.
     * @param {number} x Client x.
     * @param {number} y Client y.
     * @param {number} time Timestamp in milliseconds.
     */
    down(id, x, y, time) {
        this.#points.set(id, { x, y });
        this.#travel = 0;
        if (this.#points.size > 1) this.#pinched = true;
        this.#tap = this.#points.size === 1 ? { id, x, y, time, still: true } : null;
    }

    /**
     * A finger moves.
     *
     * @param {number} id Pointer id.
     * @param {number} x Client x.
     * @param {number} y Client y.
     * @returns {{ kind: 'drag', dx: number, dy: number }|{ kind: 'pinch', x: number, y: number, dx: number, dy: number, scale: number, twist: number }|null}
     *   One finger: its motion. Two: the midpoint (client pixels) and its motion, the distance ratio (above 1 spreads)
     *   and the angle change in radians.
     */
    move(id, x, y) {
        const point = this.#points.get(id);
        if (!point) return null;
        if (this.#tap && Math.hypot(x - this.#tap.x, y - this.#tap.y) > TAP_SLOP) this.#tap.still = false;
        const ids = [...this.#points.keys()];
        if (ids.length === 1) {
            const gesture = { kind: 'drag', dx: x - point.x, dy: y - point.y };
            point.x = x;
            point.y = y;
            return this.#pinched ? null : gesture;
        }
        const pair = ids.slice(0, 2);
        if (!pair.includes(id)) return null;
        const [a, b] = pair.map((key) => this.#points.get(key));
        const before = measure(a, b);
        point.x = x;
        point.y = y;
        const after = measure(a, b);
        const gesture = {
            kind: 'pinch',
            x: after.x,
            y: after.y,
            dx: after.x - before.x,
            dy: after.y - before.y,
            scale: before.distance > 0 ? after.distance / before.distance : 1,
            twist: Math.atan2(Math.sin(after.angle - before.angle), Math.cos(after.angle - before.angle)),
        };
        this.#travel += Math.hypot(gesture.dx, gesture.dy);
        return gesture;
    }

    /**
     * A finger lifts (or the browser cancels it).
     *
     * @param {number} id Pointer id.
     * @param {number} time Timestamp in milliseconds.
     * @param {boolean} [cancelled] The touch was cancelled: never a tap.
     * @returns {{ x: number, y: number }|null} Where the tap landed, when this was one.
     */
    up(id, time, cancelled = false) {
        if (!this.#points.delete(id)) return null;
        this.#travel = 0;
        if (!this.#points.size) this.#pinched = false;
        const tap = this.#tap;
        if (tap?.id !== id) return null;
        this.#tap = null;
        return !cancelled && tap.still && time - tap.time <= TAP_MS ? { x: tap.x, y: tap.y } : null;
    }

    /** Forgets every finger (the window lost focus). */
    clear() {
        this.#points.clear();
        this.#tap = null;
        this.#travel = 0;
        this.#pinched = false;
    }
}

function measure(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

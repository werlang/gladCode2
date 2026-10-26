/**
 * Frame at a fractional step index: positions and headings blend between the
 * two neighbouring simlog steps, everything else comes from the earlier one.
 *
 * @param {object[]} steps Expanded simlog steps.
 * @param {number} index Step index, possibly fractional.
 * @returns {object|undefined}
 */
export function frameAt(steps, index) {
    const low = Math.floor(index);
    const fraction = index - low;
    const a = steps[low];
    const b = steps[Math.min(low + 1, steps.length - 1)];
    if (!a || !fraction || a === b || !Array.isArray(a.glads)) return a;

    const mix = (from, to) => Number(from) + (Number(to) - Number(from)) * fraction;
    return {
        ...a,
        simtime: mix(a.simtime, b.simtime),
        glads: a.glads.map((glad, slot) => {
            if (!glad) return glad;
            const next = Array.isArray(b?.glads) ? b.glads[slot] : null;
            // a teleport jumps; do not slide across the arena
            if (!next || Math.hypot(Number(next.x) - Number(glad.x), Number(next.y) - Number(glad.y)) > 3) return glad;
            const turn = ((Number(next.head) - Number(glad.head) + 540) % 360) - 180;
            return { ...glad, x: mix(glad.x, next.x), y: mix(glad.y, next.y), head: Number(glad.head) + turn * fraction };
        }),
    };
}

/**
 * The timeline label: minutes and seconds of a position in tenths of a second.
 *
 * @param {number} value Position in simlog steps (0.1 s).
 * @returns {string}
 */
export function formatTimeline(value) {
    const minutes = Math.floor(value / 600);
    const seconds = String(Math.floor(value / 10) % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}


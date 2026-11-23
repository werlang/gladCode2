/**
 * Whether a header theme pick needs a save. Picking the confirmed theme is a no-op unless a write
 * is still in flight, in which case the pick is a real revert and must go through the queue.
 *
 * @param {{ choice: string, confirmed: string, busy: boolean }} state
 * @returns {boolean}
 */
export function shouldSaveThemePick({ choice, confirmed, busy }) {
    return choice !== confirmed || Boolean(busy);
}

/**
 * The nickname value to put in the input after an undo preview or settlement. `null` means a newer
 * draft is in the field and must be kept. The preview is the value the undo sent; it lets a refused
 * undo put the input back on the confirmed nickname instead of leaving the refused preview there.
 *
 * @param {{ current: string, target: string, confirmed: string, preview?: string|null,
 *   phase: 'preview'|'settle' }} state
 * @returns {string|null}
 */
export function nicknameUndoValue({ current, target, confirmed, preview = null, phase }) {
    if (current === target || current === confirmed) return target;
    if (phase === 'settle' && preview !== null && current === preview) return target;
    return null;
}

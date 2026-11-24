/**
 * Whether a key event on a clickable row should activate that row. Events from a button or link inside
 * the row belong to that control (Enter/Space must press the control, not navigate the row).
 *
 * @param {KeyboardEvent|{ target?: unknown, key?: string }} event
 * @param {Element} row
 * @returns {boolean}
 */
export function isRowActivation(event, row) {
    return event?.target === row && (event.key === 'Enter' || event.key === ' ');
}

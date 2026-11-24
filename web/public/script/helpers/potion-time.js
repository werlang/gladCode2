/**
 * The whole time left before the soonest potion expiry, shared by the rail badge and the Notícias
 * “Aguardando você” row so both round the same way (docs/frontend/events.md, flow 7).
 *
 * @param {{ nextExpiry?: string|null, serverNow?: string }|null} potions
 * @returns {{ hours: number, minutes: number }|null} Null when there is no active expiry.
 */
export function potionTimeLeft(potions) {
    if (!potions?.nextExpiry) return null;
    const end = new Date(String(potions.nextExpiry).replace(' ', 'T')).getTime();
    const start = new Date(String(potions.serverNow).replace(' ', 'T')).getTime();
    if (!Number.isFinite(end) || !Number.isFinite(start)) return null;
    const totalMinutes = Math.max(0, Math.round((end - start) / 60000));
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}


/**
 * Remaining time as "1h 5m 30s" (hours and minutes only when non-zero).
 *
 * @param {number} seconds Seconds left.
 * @returns {string}
 */
export function formatRemaining(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total / 60) % 60;
    return [hours ? `${hours}h` : '', minutes || hours ? `${minutes}m` : '', `${total % 60}s`].filter(Boolean).join(' ');
}

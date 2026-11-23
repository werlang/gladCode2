/**
 * The profile's win rate over results the engine actually reported. A report without a result (an
 * older battle, before the placing/result was stored) is unknown and stays out of the denominator;
 * with no known result the rate has no value instead of looking like 0%.
 *
 * @param {{ wins?: number, known?: number, battles?: number }} [stats]
 * @returns {number|null} Percentage, or null when no result is known.
 */
export function winRatePercent(stats = {}) {
    const known = Math.max(0, Math.trunc(Number(stats.known ?? stats.battles ?? 0) || 0));
    if (!known) return null;
    const wins = Math.max(0, Math.trunc(Number(stats.wins) || 0));
    return Math.round((Math.min(wins, known) / known) * 100);
}

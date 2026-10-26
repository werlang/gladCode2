import { api } from '../helpers/request.js';

/**
 * Battle statistics (`/stats`). The API records them itself when a ranked battle ends.
 */
export class StatsModel {
    /**
     * Statistics of the ranked battles in a period and renown range.
     *
     * @param {{ start?: string, end?: string, minMmr: number, maxMmr: number }} filter
     *   `start`/`end` as `yyyy-mm-dd` (a date input's value); empty means the last month up to now.
     * @returns {Promise<{ average: Record<string, number>, usage: Record<string, number>, winRate: Record<string, number>,
     *   battles: { total: number, detailed: number }, duration?: number,
     *   attributes: { avg: Record<string, number>, winner: Record<string, number> },
     *   potions: { use: Record<string, number>, win: Record<string, number>, battles: number } }>}
     */
    static load({ start = '', end = '', minMmr, maxMmr }) {
        return api.get('stats', { start, end, minMmr, maxMmr });
    }
}

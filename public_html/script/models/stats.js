import { api } from '../helpers/request.js';
import { battleStats } from '../helpers/battle-stats.js';
import { BattleLogModel } from './battle-log.js';

const ENDPOINT = 'back_stats.php';

/**
 * `yyyy-mm-dd` (a date input's value) to the `dd/mm/yyyy` back_stats.php reads.
 *
 * @param {string} isoDate Date input value, possibly empty.
 * @returns {string}
 */
export function toBackendDate(isoDate) {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Battle statistics (`back_stats.php`).
 */
export class StatsModel {
    /**
     * Aggregated statistics of the battles in a period and renown range.
     *
     * @param {{ start?: string, end?: string, minMmr: number, maxMmr: number }} filter
     *   `start`/`end` as `yyyy-mm-dd`; empty means the last month up to now.
     * @returns {Promise<Record<string, any>>}
     */
    static load({ start = '', end = '', minMmr, maxMmr }) {
        return api.post(ENDPOINT, {
            action: 'load',
            start: toBackendDate(start),
            end: toBackendDate(end),
            smmr: minMmr,
            emmr: maxMmr,
        });
    }

    /**
     * Computes a finished battle's statistics from its log and stores them.
     *
     * @param {string} hash Battle log hash.
     * @returns {Promise<unknown>}
     */
    static async saveBattle(hash) {
        const { log } = await BattleLogModel.get(hash);
        const stats = battleStats(JSON.parse(log));
        return api.post(ENDPOINT, {
            action: 'SAVE',
            ...stats.uses,
            win: JSON.stringify(stats.win),
            avglvl: stats.avglvl,
            winnerlvl: stats.winnerlvl,
            duration: stats.duration,
            highstr: stats.high.STR,
            highagi: stats.high.AGI,
            highint: stats.high.INT,
            loghash: hash,
            potionuse: JSON.stringify(stats.potionuse),
            potionwin: JSON.stringify(stats.potionwin),
        });
    }
}

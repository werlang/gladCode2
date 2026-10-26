import { Mysql } from '../helpers/mysql.js';

/** Abilities counted per battle (`stats` columns), and how the report names them. */
const ABILITIES = {
    fireball: 'Fireball', teleport: 'Teleport', charge: 'Charge', block: 'Block',
    assassinate: 'Assassinate', ambush: 'Ambush', ranged: 'Ranged', melee: 'Melee',
};
const ATTRIBUTES = ['STR', 'AGI', 'INT'];

/**
 * @param {string|null} text JSON text stored in a `stats` column.
 * @returns {any[]}
 */
function parseList(text) {
    try {
        const value = JSON.parse(text ?? '[]');
        return Array.isArray(value) ? value : Object.values(value ?? {});
    }
    catch {
        return [];
    }
}

/**
 * Battle statistics (`stats`): one row per ranked battle, summarised for the stats page.
 */
export class Stats {
    /**
     * Summarises the battles of a period and renown range. Ported from back_stats.php.
     *
     * @param {{ start?: string, end?: string, minMmr: number, maxMmr: number }} filter `start` and
     *   `end` are `YYYY-MM-DD` (inclusive); without `start` the last month, without `end` up to now.
     * @returns {Promise<{
     *   average: Record<string, number>, usage: Record<string, number>, winRate: Record<string, number>,
     *   battles: { total: number, detailed: number }, duration?: number,
     *   attributes: { avg: Record<string, number>, winner: Record<string, number> },
     *   potions: { use: Record<string, number>, win: Record<string, number>, battles: number },
     * }>} Averages and percentages per ability (`Fireball`, ...), attribute (`STR`, ... and `lvl`) and potion id.
     */
    static async summary({ start = null, end = null, minMmr, maxMmr }) {
        const rows = await Mysql.select(
            `SELECT * FROM stats
            WHERE time >= COALESCE(?, DATE(NOW() - INTERVAL 1 MONTH))
                AND time <= IF(? IS NULL, NOW(), DATE(?) + INTERVAL 1 DAY)
                AND (avgmmr IS NULL OR (avgmmr >= ? AND avgmmr <= ?))`,
            [start, end, end, minMmr, maxMmr],
        );

        const uses = {};
        const wins = {};
        const time = { sum: 0, count: 0 };
        const attributes = { sum: { STR: 0, AGI: 0, INT: 0 }, count: { STR: 0, AGI: 0, INT: 0 }, total: 0 };
        const levels = { sum: { avg: 0, winner: 0 }, count: { avg: 0, winner: 0 } };
        const potions = { use: {}, win: {}, battles: 0 };

        for (const row of rows) {
            for (const ability of Object.keys(ABILITIES)) {
                uses[ability] ??= { sum: 0, count: 0 };
                if (row[ability] > 0) {
                    uses[ability].sum += row[ability];
                    uses[ability].count++;
                }
            }
            // what the winner did: abilities it cast and its highest attribute
            for (const won of parseList(row.win)) wins[won] = (wins[won] ?? 0) + 1;

            if (row.duration !== null) {
                time.sum += row.duration;
                time.count++;
            }
            for (const attribute of ATTRIBUTES) {
                const value = row[`high${attribute}`];
                if (value !== null && value !== undefined) {
                    attributes.sum[attribute] += value;
                    attributes.count[attribute]++;
                    attributes.total += value;
                }
            }
            for (const kind of ['avg', 'winner']) {
                const value = row[`${kind}lvl`];
                if (value !== null && value !== undefined) {
                    levels.sum[kind] += value;
                    levels.count[kind]++;
                }
            }
            if (row.potionuse !== null) {
                potions.battles++;
                for (const id of parseList(row.potionuse)) potions.use[id] = (potions.use[id] ?? 0) + 1;
                for (const id of parseList(row.potionwin)) potions.win[id] = (potions.win[id] ?? 0) + 1;
            }
        }

        const summary = {
            average: {},
            usage: {},
            winRate: {},
            battles: { total: rows.length, detailed: time.count },
            attributes: { avg: {}, winner: {} },
            potions,
        };
        if (rows.length) {
            for (const [ability, name] of Object.entries(ABILITIES)) {
                const { sum, count } = uses[ability];
                summary.average[name] = count ? sum / count : 0;
                summary.usage[name] = (count / rows.length) * 100;
                summary.winRate[name] = wins[ability] && count ? (wins[ability] / count) * 100 : 0;
            }
        }
        if (time.count) summary.duration = time.sum / time.count;
        for (const attribute of ATTRIBUTES) {
            if (attributes.total > 0) summary.attributes.avg[attribute] = (attributes.sum[attribute] / attributes.total) * 100;
            summary.attributes.winner[attribute] = wins[attribute] && attributes.count[attribute] ? (wins[attribute] / attributes.count[attribute]) * 100 : 0;
        }
        for (const kind of ['avg', 'winner']) {
            if (levels.count[kind]) summary.attributes[kind].lvl = levels.sum[kind] / levels.count[kind];
        }
        return summary;
    }
}

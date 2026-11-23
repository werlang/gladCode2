/**
 * Recomputes `reports.result` from the stored simlog of every report that already has a result.
 *
 * The engine log is a delta log: `hp` appears only on the step it changes, so a winner can be
 * absent from the raw last step. `deathOrder` accumulates that state; `rankedResults` then follows
 * the same win/draw rule as a new battle.
 *
 * Usage (from the API container):
 *   node scripts/recompute-battle-results.js --dry-run
 *   node scripts/recompute-battle-results.js --apply
 *
 * Only rows with `result IS NOT NULL` are considered: those are the rows written after migration
 * 014 added the column and are the ones the old derivation could have marked incorrectly. Rows
 * whose log file is gone are counted and left untouched; the command can be run repeatedly.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { deathOrder, engineText, rankedResults } from '../helpers/battle-results.js';
import { Mysql } from '../helpers/mysql.js';
import { logsDir } from '../model/battle-log.js';

const dryRun = !process.argv.includes('--apply');
const mode = dryRun ? 'dry-run' : 'apply';

/** @param {string} file @returns {Promise<unknown[]>} */
async function readSimulation(file) {
    const text = await readFile(file, 'utf8');
    try {
        return JSON.parse(text);
    }
    catch {
        // A raw engine simlog is a comma-separated stream, not an array; API logs are arrays.
        return JSON.parse(`[${text.replace(/,\s*$/, '')}]`);
    }
}

/** @param {Array<'win'|'loss'|'draw'>} results @returns {Record<string, number>} */
function count(results) {
    const counts = { win: 0, loss: 0, draw: 0, unknown: 0 };
    for (const result of results) counts[result] = (counts[result] ?? 0) + 1;
    return counts;
}

const rows = await Mysql.select(
    `SELECT r.id, r.log, r.gladiator, r.result, g.name, u.apelido
    FROM reports r
    INNER JOIN gladiators g ON g.cod = r.gladiator
    INNER JOIN usuarios u ON u.id = g.master
    WHERE r.result IS NOT NULL AND r.log IS NOT NULL
    ORDER BY r.log, r.id`,
);

const [{ unknown }] = await Mysql.select('SELECT COUNT(*) AS unknown FROM reports WHERE result IS NULL AND log IS NOT NULL');
const unknownSkipped = Number(unknown);

const byLog = new Map();
for (const row of rows) {
    if (!byLog.has(row.log)) byLog.set(row.log, []);
    byLog.get(row.log).push(row);
}

let updated = 0;
let unchanged = 0;
let missingLog = 0;
let unmatched = 0;
const before = [];
const after = [];

for (const [logId, reports] of byLog) {
    const file = path.join(logsDir(), String(logId));
    let simulation;
    try {
        simulation = await readSimulation(file);
    }
    catch {
        missingLog += reports.length;
        console.warn(`log ${logId}: file missing (${reports.length} report(s) left as they are)`);
        continue;
    }
    if (!Array.isArray(simulation) || !simulation.length) {
        missingLog += reports.length;
        console.warn(`log ${logId}: empty or invalid simulation (${reports.length} left as they are)`);
        continue;
    }

    let ordered;
    let results;
    try {
        ordered = deathOrder(simulation);
        results = rankedResults(ordered, ordered.some(entry => entry.hp > 0));
    }
    catch {
        missingLog += reports.length;
        console.warn(`log ${logId}: could not derive the placing (${reports.length} left as they are)`);
        continue;
    }
    const resultByName = new Map(ordered.map((entry, index) => [
        `${engineText(entry.name)}@${engineText(entry.user)}`,
        results[index],
    ]));

    for (const report of reports) {
        const result = resultByName.get(`${engineText(report.name)}@${engineText(report.apelido)}`);
        if (!result) {
            unmatched += 1;
            console.warn(`report ${report.id} (log ${logId}, gladiator ${report.gladiator}): no engine entry`);
            continue;
        }
        before.push(report.result);
        after.push(result);
        if (report.result === result) {
            unchanged += 1;
            continue;
        }
        updated += 1;
        console.log(`${mode} report ${report.id} (log ${logId}): ${report.result} -> ${result}`);
        if (!dryRun) await Mysql.update('reports', { result }, { id: report.id });
    }
}

console.log(JSON.stringify({
    mode,
    reports: rows.length,
    logs: byLog.size,
    updated,
    unchanged,
    missingLog,
    unmatched,
    unknownSkipped,
    before: count(before),
    after: count(after),
}, null, 2));

await Mysql.close();

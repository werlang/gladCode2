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
    `SELECT r.id, r.log, r.gladiator, r.result, g.name, g.master
    FROM reports r
    INNER JOIN gladiators g ON g.cod = r.gladiator
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
const before = [];
const after = [];
const skipped = [];
let hardSkipped = 0;
const skip = (report, logId, reason, hard = true) => {
    if (hard) hardSkipped += 1;
    skipped.push({ reportId: report.id, log: logId, master: report.master, reason });
    console.warn(`SKIP report ${report.id} (log ${logId}, master ${report.master}): ${reason}`);
};

for (const [logId, reports] of byLog) {
    const file = path.join(logsDir(), String(logId));
    let simulation;
    try {
        simulation = await readSimulation(file);
    }
    catch {
        for (const report of reports) skip(report, logId, 'log file missing', false);
        continue;
    }
    if (!Array.isArray(simulation) || !simulation.length) {
        for (const report of reports) skip(report, logId, 'log file empty or invalid', false);
        continue;
    }

    let ordered;
    let results;
    try {
        ordered = deathOrder(simulation);
        results = rankedResults(ordered, ordered.some(entry => entry.hp > 0));
    }
    catch {
        for (const report of reports) skip(report, logId, 'could not derive the placing from the log', false);
        continue;
    }

    const resultByName = new Map();
    const duplicateLogNames = new Set();
    ordered.forEach((entry, index) => {
        const name = engineText(entry.name);
        if (resultByName.has(name)) duplicateLogNames.add(name);
        else resultByName.set(name, results[index]);
    });
    const reportNames = new Map();
    for (const report of reports) {
        const name = engineText(report.name);
        reportNames.set(name, (reportNames.get(name) ?? 0) + 1);
    }

    for (const report of reports) {
        const name = engineText(report.name);
        if (duplicateLogNames.has(name)) {
            skip(report, logId, `ambiguous log gladiator name "${name}"`);
            continue;
        }
        if (reportNames.get(name) > 1) {
            skip(report, logId, `duplicate report gladiator name "${name}"`);
            continue;
        }
        const result = resultByName.get(name);
        if (!result) {
            skip(report, logId, `no gladiator named "${name}" in the log`);
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
    skipped: skipped.length,
    hardSkipped,
    skippedRows: skipped,
    unknownSkipped,
    before: count(before),
    after: count(after),
}, null, 2));
if (hardSkipped) process.exitCode = 2;

await Mysql.close();

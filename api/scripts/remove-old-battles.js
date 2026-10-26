/**
 * Cron job: expires old battle logs to save disk. Editor test battles go after a week and ranked
 * battles after a year (unless a master favourited the report); their files are deleted and the
 * rows marked `expired`, and rows older than three years go entirely. Duels, tournaments and
 * trainings are kept. `--dry-run` only counts.
 *
 * Usage: docker compose exec -T api node scripts/remove-old-battles.js [--dry-run]
 */
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { Mysql } from '../helpers/mysql.js';
import { logsDir } from '../model/battle-log.js';

/** How long each kind of battle keeps its log (trusted SQL intervals). */
const MODES = {
    editor: { keep: '1 WEEK', favorites: false },
    ranked: { keep: '1 YEAR', favorites: true },
};
/** Rows older than this are deleted, not only marked. */
const DELETE_AFTER = '3 YEAR';
/** Logs handled per statement. */
const BATCH = 1000;

const dryRun = process.argv.includes('--dry-run');

/**
 * @param {string} origin
 * @param {{ keep: string, favorites: boolean }} mode
 */
async function expire(origin, { keep, favorites }) {
    const rows = await Mysql.select(
        `SELECT id FROM logs WHERE origin = ? AND time < NOW() - INTERVAL ${keep} AND expired = 0
        ${favorites ? 'AND id NOT IN (SELECT DISTINCT log FROM reports WHERE favorite = 1 AND log IS NOT NULL)' : ''}`,
        [origin],
    );
    console.log(`Removing old ${origin} battles... ${rows.length} battles found.`);
    if (dryRun || !rows.length) return;

    let deleted = 0;
    for (let start = 0; start < rows.length; start += BATCH) {
        const ids = rows.slice(start, start + BATCH).map(row => row.id);
        await Promise.all(ids.map(id => rm(path.join(logsDir(), String(id)), { force: true })));
        await Mysql.update('logs', { expired: 1 }, { id: ids });
        const old = await Mysql.select(`SELECT id FROM logs WHERE id IN (?) AND time < NOW() - INTERVAL ${DELETE_AFTER}`, [ids]);
        if (old.length) deleted += await Mysql.delete('logs', { id: old.map(row => row.id) });
    }
    console.log(`Deleted ${deleted} records from logs table.`);
}

try {
    for (const [origin, mode] of Object.entries(MODES)) await expire(origin, mode);
}
catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
finally {
    await Mysql.close();
}

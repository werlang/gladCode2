import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mysql } from '../helpers/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const LOCK_NAME = 'gladcode_migrations';
const LOCK_TIMEOUT_SECONDS = 10;

/**
 * Splits a migration script into ordered, non-empty statements.
 *
 * Only full-line `--` comments are removed (a `--` sequence must start the
 * line, ignoring leading whitespace). This keeps semicolons and comment-like
 * sequences inside string literals and HTML bodies (e.g. `<!--`) intact,
 * unlike naive whole-text comment stripping.
 *
 * @param {string} sqlContent Migration SQL source.
 * @returns {string[]} Ordered executable SQL statements.
 */
export function splitSqlStatements(sqlContent) {
    const uncommentedSql = sqlContent
        .split('\n')
        .filter(line => !/^\s*--(\s|$)/.test(line))
        .join('\n');

    return uncommentedSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
}

/**
 * Runs versioned database migrations.
 *
 * Applies every `NNN_name.sql` file in `runner/migrations/` whose version is
 * absent from `schema_migrations`, in numeric order. Each migration runs in
 * its own transaction and is recorded only on success, so a failed run can
 * simply be retried. A named MySQL lock serializes concurrent runners.
 *
 * @param {{ db?: typeof Mysql, dir?: string, baseline?: number }} [options]
 * `baseline` adopts a pre-existing database: files with version <= baseline
 * are recorded as applied WITHOUT executing them (their schema is assumed
 * present), then newer files apply normally.
 * @returns {Promise<void>}
 */
export async function migrate({ db = Mysql, dir = MIGRATIONS_DIR, baseline = 0 } = {}) {
    await db.connect();

    try {
        // Acquire a named MySQL lock to prevent concurrent migration runs.
        // Locking inside try guarantees the release below always executes;
        // releasing a lock this session does not hold is a harmless no-op.
        const { rows: lockRows } = await db.query('SELECT GET_LOCK(?, ?) AS acquired', [LOCK_NAME, LOCK_TIMEOUT_SECONDS]);
        if (Number(lockRows[0]?.acquired) !== 1) {
            throw new Error(`Could not acquire migration lock '${LOCK_NAME}'`);
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const { rows } = await db.query('SELECT version FROM schema_migrations');
        const appliedVersions = new Set(rows.map(row => Number(row.version)));

        let files = [];
        try {
            files = await fs.readdir(dir);
        } catch {
            files = [];
        }

        const migrationFiles = files
            .filter(f => f.endsWith('.sql'))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        for (const file of migrationFiles) {
            const match = file.match(/^(\d+)_/);
            if (!match) continue;

            const version = parseInt(match[1], 10);
            if (appliedVersions.has(version)) {
                continue;
            }

            if (version <= baseline) {
                console.log(`Marking migration ${file} as applied (baseline, not executed)...`);
                await db.query(
                    'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
                    [version, file]
                );
                continue;
            }

            const filePath = path.join(dir, file);
            const sqlContent = await fs.readFile(filePath, 'utf-8');
            const statements = splitSqlStatements(sqlContent);

            console.log(`Applying migration ${file}...`);
            await db.withTransaction(async ({ connection }) => {
                for (const statement of statements) {
                    await connection.query(statement);
                }
                await connection.query(
                    'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
                    [version, file]
                );
            });
            console.log(`Successfully applied migration ${file}.`);
        }
    } finally {
        await db.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
    }
}

if (process.argv[1] === __filename) {
    const baselineArg = process.argv.find(arg => arg.startsWith('--baseline'));
    let baseline = 0;
    if (baselineArg !== undefined) {
        const match = baselineArg.match(/^--baseline=(\d+)$/);
        if (!match) {
            console.error(`Invalid flag '${baselineArg}'. Usage: node scripts/migrate.js [--baseline=N]`);
            process.exit(2);
        }
        baseline = parseInt(match[1], 10);
    }
    migrate({ baseline })
        .then(() => {
            console.log('Database migration completed successfully.');
            return Mysql.close();
        })
        .catch(async err => {
            console.error('Migration failed:', err);
            await Mysql.close();
            process.exit(1);
        });
}

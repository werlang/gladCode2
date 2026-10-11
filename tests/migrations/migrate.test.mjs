import assert from 'node:assert/strict';
import test from 'node:test';

import { migrate, splitSqlStatements } from '../../migrations/scripts/migrate.js';

/**
 * Builds an in-memory fake of the Mysql helper contract ({ connect, query,
 * withTransaction }) that records every statement instead of executing it.
 */
function makeFakeDb({ applied = [], denyLock = false } = {}) {
    const calls = [];
    const connection = {
        query: async (sql, params = []) => {
            calls.push({ sql, params, scope: 'tx' });
            return { rows: [] };
        },
    };
    return {
        calls,
        connect: async () => {},
        query: async (sql, params = []) => {
            calls.push({ sql, params, scope: 'pool' });
            if (sql.includes('GET_LOCK')) return { rows: [{ acquired: denyLock ? 0 : 1 }] };
            if (sql.includes('SELECT version FROM schema_migrations')) {
                return { rows: applied.map(version => ({ version })) };
            }
            return { rows: [] };
        },
        withTransaction: async (fn) => fn({ connection }),
    };
}

test('splits SQL statements correctly', () => {
    const sql = `
        -- Header comment
        CREATE TABLE foo (id INT);
        -- Mid comment
        INSERT INTO foo VALUES (1);
    `;
    assert.deepEqual(splitSqlStatements(sql), [
        'CREATE TABLE foo (id INT)',
        'INSERT INTO foo VALUES (1)',
    ]);
});

test('ignores semicolons inside line comments while preserving statement order', () => {
    const sql = `
        CREATE TABLE before_comment (id INT);
        -- comment before; after
        ALTER TABLE users ADD COLUMN example TEXT;
        INSERT INTO audit_log VALUES (1);
    `;
    assert.deepEqual(splitSqlStatements(sql), [
        'CREATE TABLE before_comment (id INT)',
        'ALTER TABLE users ADD COLUMN example TEXT',
        'INSERT INTO audit_log VALUES (1)',
    ]);
});

test('keeps dashes inside string literals and HTML bodies intact', () => {
    const sql = `INSERT INTO news (title, post) VALUES ('patch', '<!-- note --> a--b');`;
    assert.deepEqual(splitSqlStatements(sql), [
        `INSERT INTO news (title, post) VALUES ('patch', '<!-- note --> a--b')`,
    ]);
});

test('acquires lock, bootstraps tracking table, skips applied versions, releases lock', async () => {
    const db = makeFakeDb({ applied: [1, 2] });
    await migrate({ db });

    const poolCalls = db.calls.filter(call => call.scope === 'pool');
    assert.deepEqual(poolCalls[0], {
        sql: 'SELECT GET_LOCK(?, ?) AS acquired',
        params: ['gladcode_migrations', 10],
        scope: 'pool',
    });
    assert.ok(poolCalls.some(call => call.sql.includes('CREATE TABLE IF NOT EXISTS schema_migrations')));
    assert.deepEqual(poolCalls[poolCalls.length - 1], {
        sql: 'SELECT RELEASE_LOCK(?)',
        params: ['gladcode_migrations'],
        scope: 'pool',
    });
    assert.ok(!db.calls.some(call => call.sql.startsWith('INSERT INTO schema_migrations')));
});

test('applies the baseline schema when history is empty and records it', async () => {
    const db = makeFakeDb({ applied: [] });
    await migrate({ db });

    const txSql = db.calls
        .filter(call => call.scope === 'tx')
        .map(call => call.sql)
        .join('\n');
    assert.match(txSql, /CREATE TABLE `amizade`/);
    assert.match(txSql, /CREATE TABLE `news`/);
    assert.match(txSql, /CREATE TABLE `gladiators`/);

    const record = db.calls.find(call => call.sql.startsWith('INSERT INTO schema_migrations'));
    assert.deepEqual(record.params, [1, '001_initial_schema.sql']);
});

test('refuses to run without the lock and still releases it', async () => {
    const db = makeFakeDb({ denyLock: true });
    await assert.rejects(() => migrate({ db }), /Could not acquire migration lock/);
    assert.ok(!db.calls.some(call => call.scope === 'tx'));
    assert.ok(db.calls.some(call => call.sql.includes('RELEASE_LOCK')));
});

test('carries current-version gladiators forward once the baseline applied', async () => {
    const db = makeFakeDb({ applied: [1] });
    await migrate({ db });

    const txSql = db.calls
        .filter(call => call.scope === 'tx')
        .map(call => call.sql)
        .join('\n');
    assert.match(txSql, /UPDATE `gladiators` SET `version` = '2\.9\.3' WHERE `version` = '2\.9\.2'/);
    assert.ok(!txSql.includes('CREATE TABLE'));

    const record = db.calls.find(call => call.sql.startsWith('INSERT INTO schema_migrations'));
    assert.deepEqual(record.params, [2, '002_bump_gladiators_to_2_9_3.sql']);
});

test('baseline records old files without executing them, then migrates forward', async () => {
    const db = makeFakeDb({ applied: [] });
    await migrate({ db, baseline: 1 });

    const txSql = db.calls
        .filter(call => call.scope === 'tx')
        .map(call => call.sql)
        .join('\n');
    assert.ok(!txSql.includes('CREATE TABLE'));
    assert.match(txSql, /UPDATE `gladiators`/);

    const records = db.calls
        .filter(call => call.sql.startsWith('INSERT INTO schema_migrations'))
        .map(call => call.params);
    assert.deepEqual(records, [
        [1, '001_initial_schema.sql'],
        [2, '002_bump_gladiators_to_2_9_3.sql'],
    ]);
});

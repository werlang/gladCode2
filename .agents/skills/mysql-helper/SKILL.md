---
name: mysql-helper
description: Use gladCode's MySQL access layer — api/helpers/mysql.js (Mysql: find, findOne, get, count, insert, update, delete, select, withTransaction, where, raw, contains), its filter operators and value rules, the TRADITIONAL sql_mode and utf8mb3 tables, and the numbered SQL migrations run by migrations/migrate.sh. Use for any query, schema change or migration.
---

# gladCode MySQL helper

Localizes the global `mysql-helper` skill: follow it for the method; this file holds what is true in gladCode. On project facts, this file wins.

## Where

- `api/helpers/mysql.js`: `Mysql`, the only SQL executor of the API (a `mysql2/promise` pool of 10, `dateStrings`, `stringifyObjects`, `SET sql_mode='TRADITIONAL'` on each connection). Only `api/model/` calls it.
- `migrations/NNN_name.sql`: numbered migrations; `migrations/scripts/migrate.js` applies the missing ones in order, one transaction each, recorded in `schema_migrations`, under `GET_LOCK('gladcode_migrations')`. `migrations/helpers/mysql.js` is its own small helper.
- `migrations/001_initial_schema.sql`: the baseline schema.

## The helper's API

- `find(table, { filter, view, opt: { order: { col: 1|-1 }, limit, skip, forUpdate } }, context)` → rows; `findOne(...)` → row or `null`; `get(table, filter, context)` → row or 404 `RECORD_NOT_FOUND`; `count(table, filter, context)` → number.
- `insert(table, row | rows, context)` → `{ insertId, affectedRows }` (several rows share the first row's columns).
- `update(table, data, filter, context)` → affected rows; values may be plain, `{ inc: n }`, `{ dec: n }` or `Mysql.raw(...)`. `delete(table, filter, context)` → affected rows. Both refuse an empty filter (`SQL_NO_FILTER`).
- `select(sql, values, context)` → rows, for joins, aggregates and `FOR UPDATE` reads; it only runs `SELECT`/`WITH` (`SQL_NOT_READ`).
- `withTransaction(async context => ...)` commits, or rolls back and rethrows, and always releases the connection.
- Filters (`Mysql.where`): plain `=`, `null` (`IS NULL`), arrays or `{ in }` (`IN`, an empty list becomes `1=0`), `{ not }` (`!=`/`IS NOT NULL`), `{ like }` (escaped with `contains`), `{ between: [a, b] }`, `{ '<' | '<=' | '>' | '>=': v }`.
- `Mysql.raw('NOW()')` embeds trusted SQL as a value; `Mysql.contains(text)` gives an escaped `%text%`. Arrays expand in `IN (?)`.

## Rules

- Values always through `?` or the CRUD methods; identifiers are validated and quoted by the helper (`SQL_IDENTIFIER`). Never build SQL from request text; an object value is compared as a string, never expanded.
- `DATETIME` columns without fractions round `NOW(3)` up: write `NOW()` for values compared at once (deadlines, ends of turns).
- Most tables are utf8mb3: 4-byte characters fail to store or compare, so request text is refused upstream (`Validate.text`, see `api-development`).
- SQL errors become 500 `SQL_ERROR` with the SQL in `data`, which the error middleware never sends to clients.
- Schema changes: add the next `migrations/NNN_*.sql` (the `.gitignore` excludes `*.sql` except `migrations/*.sql` and `dev-tools/news/*.sql`). Statements end with `;`; keep each migration safe to run against production data and before the new code starts (the deploy migrates first).

## Deviations from `mysql-helper`

- `select` is public, limited to reads, instead of a private executor only: joins and window queries live in models.
- No `dump` method: dumps and restores go through `dev-tools/dump_restore.sh` in the `mysql` container.

## Commands

```bash
./migrations/migrate.sh                                   # apply pending migrations (Compose network, port 3306)
docker compose exec mysql mysql -u root -p                # a SQL shell
docker run --rm -v "$PWD":/w -v /w/migrations/node_modules -w /w/migrations node:22-alpine sh -c "npm ci && npm test"   # migration runner tests
```

# Database Migrations

Versioned MySQL migrations ported from the node-aec `db:migrate` flow
(`api/scripts/migrate.js` + `api/migrations/` there). MySQL adaptations:
named `GET_LOCK()` instead of `pg_advisory_lock`, `?` placeholders,
`TIMESTAMP` instead of `TIMESTAMPTZ`.

## Layout

- `runner/migrations/NNN_name.sql` — forward-only migration files, applied in
  numeric order. `001_initial_schema.sql` is the schema-only baseline
  (27 tables, no data) extracted from `database-2025.3.sql`.
- `runner/scripts/migrate.js` — exports `splitSqlStatements()` and
  `migrate()`; runnable directly as `npm run db:migrate` from `runner/`.
- `runner/helpers/mysql.js` — shared driver helper (env-configured pool,
  `{ rows }` result normalization, `withTransaction`). Models are the only
  normal production callers.
- `tests/runner/migrate.test.mjs` — `node:test` coverage for the splitter
  and the runner (fake-DB injected, no live database needed).

## How it works

1. Connects with `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE` (defaults
   `mysql:3306`, `root`, `gladcode`; the `runner` compose service injects
   these from `.env`).
2. Takes the `gladcode_migrations` named lock (10s timeout) so concurrent
   runners serialize; the lock releases in a `finally`.
3. Creates `schema_migrations(version, name, applied_at)` if missing.
4. Applies every `NNN_*.sql` file whose version is unrecorded, each in its
   own transaction, recording `(version, name)` only on success — a failed
   run is safe to retry.
5. Migrations are forward-only: never edit a file after it applied
   anywhere; ship fixes as new `NNN_*.sql` files.

## Authoring rules

- The splitter removes only full-line `--` comments, then splits on `;`.
  Dashes inside string literals and HTML bodies (e.g. `<!--`) survive, but
  keep migration SQL free of stored procedures/triggers — `;` inside routine
  bodies would split incorrectly (same limitation as node-aec).
- Keep migrations idempotent where cheap (`IF NOT EXISTS`, `DROP ... IF
  EXISTS`); the baseline drops and recreates all tables.
- `*.sql` is gitignored (DB dumps stay out), so new migration files need
  `git add -f` — deliberate, flag it in the handoff.

## Running

Migrations run in a dedicated one-shot container, never inside the
long-lived `runner` service:

```bash
# Deploy (also in .github/workflows/master-deploy.yml)
docker compose --profile tools build
docker compose up -d --force-recreate
docker compose --profile tools run --rm migrate
```

The `migrate` service (`Dockerfile-migrate`, `profiles: ["tools"]`) bakes
dependencies at build time, so it never depends on the `node_modules`
volume state, waits for a healthy `mysql` via `depends_on`, and exits when
done. Plain `docker compose up` never starts it. Local one-off runs use the
same command; `npm run db:migrate` from `runner/` only works when that
checkout has dependencies installed.

## Adopting a pre-existing database

A database created before this flow (e.g. production) must NOT run the
`001` baseline — it drops and recreates every table. Stamp it instead, then
migrate forward normally:

```bash
docker compose --profile tools run --rm migrate npm run db:migrate -- --baseline=1
```

`--baseline=N` records every migration with version <= N as applied WITHOUT
executing it, then applies newer files normally. It is idempotent and safe
to re-run.

## Version-bump data migrations

Non-breaking `version` bumps ship a gladiator carry-forward migration,
`NNN_bump_gladiators_to_X_Y_Z.sql`:

```sql
UPDATE `gladiators` SET `version` = '<new>' WHERE `version` = '<old>';
```

Only rows already on the replaced version move; older rows stay stale behind
the existing guards (old-version badge, duel cancel, matchmaking filter).
Omit the migration when the bump is BREAKING — stale owners must review
their code instead.

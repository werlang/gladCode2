---
name: test-first-delivery
description: Deliver gladCode behaviour changes with tests — which suite owns which layer (API Vitest, frontend and render2 node:test, web routes, migration runner, C engine and engine regression battles), their exact Docker commands, mocking conventions, golden values and the sabotage check for trunk code. Use whenever changing logic, fixing a bug or adding a test.
---

# gladCode test-first delivery

Localizes the global `testing` skill: follow it for the method (oracle rule, tiers, falsification, sabotage); this file holds what is true in gladCode. On project facts, this file wins.

## Suites

| Layer | Where | Command (all through Docker) |
| --- | --- | --- |
| API helpers, middleware, models, routes | `api/tests/unit/{helpers,middleware,model,route}/`, `app.test.js`; fixtures in `api/tests/fixtures/` | `docker compose exec -T api npx vitest run` |
| Frontend helpers and pages, 3D renderer pure parts | `tests/frontend/*.test.mjs`, `tests/render2/*.test.mjs` (`node:test`) | `docker run --rm -v "$PWD":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && npm run lint && npm test"` |
| Web page routes and old-address redirects | `web/tests/*.test.js` (`node:test`, starts `app` on a free port) | `docker compose exec -T web npm test` |
| Migration runner | `tests/migrations/migrate.test.mjs` (reads the real `migrations/` folder) | `docker run --rm -v "$PWD":/w -v /w/migrations/node_modules -w /w/migrations node:22-alpine sh -c "npm ci && npm test"` |
| C engine | `tests/engine/engine_test.c` | the `gladcode2-vm` command in its header |
| Engine regression battles | `tests/engine/run.sh`, gladiators in `tests/engine/glads/` | `bash tests/engine/run.sh` (needs the `gladcode2-vm` image) |

## Rules

- Never run Node, npm or Python on the host; every command above runs in a container.
- API model tests mock `helpers/mysql.js` (`vi.mock` with `select`, `findOne`, `insert`, `update`, `delete`, `count`, `raw`, `withTransaction: operation => operation({ connection: 'tx' })`). Assert what matters for safety: the owner filter, the `FOR UPDATE` SQL, the `{ connection: 'tx' }` context, and that nothing is written on refusal. A mocked query proves the call, not the SQL: run new SQL against the local stack too.
- Route tests mount one router on a bare `express()` with `errorMiddleware` and mock `auth.js` or the models (see `api/tests/unit/route/news.test.js`).
- Game formulas keep golden values from the old PHP (`api/tests/unit/helpers/battle-results.test.js`, `training.test.js`); a change to them is a game-balance change, not a refactor.
- Trunk code (`helpers/mysql.js`, `jwt.js`, `platform.js`, `middleware/`, `runner.js`, locks in models) gets a Fast Sabotage pass: copy the code inside the container and break one invariant per run, never in the working tree: `docker compose exec -T api sh -c 'rm -rf /tmp/sab && cp -r /app /tmp/sab && cd /tmp/sab && sed -i "<break it>" helpers/x.js && npx vitest run'`. Each sabotage must turn the suite red.
- `vi.mock` once-values left unconsumed leak into the next test: a test that throws early resets the mock it queued (`Mysql.select.mockReset()`).

## Known noise

- Vitest sometimes fails to start with `config must export or return an object` right after files change: run it again.
- `tests/engine/run.sh` intermittently reports `NO_VALID_LOG` for a crash case; rerun before investigating, and report the flake.

## Checks before finishing

- Every suite the change touches is green, lint has no errors, and a fixed bug has a test that fails without the fix.

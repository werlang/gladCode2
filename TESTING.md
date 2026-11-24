# Testing gladCode 2

Everything runs in Docker. The host has no Node or Python: `npm`, `node`, `npx`, `gcc` and the engine
only run inside a container (see [AGENTS.md](AGENTS.md) → Critical execution rules).

Start the development stack first when a check uses the running services:

```bash
# .env: COMPOSE_FILE=compose.yaml:compose.dev.yaml
docker compose up -d
MAILER_USER= docker compose up -d api   # keep test e-mails from reaching real users
```

Signed-in browser checks need a session cookie:

```bash
docker compose exec -T api node scripts/issue-session.js <userId>
```

## The gate

Run this before merging anything that touches `web/`, `api/` or root tooling. It needs no running stack:

```bash
docker run --rm -v "$PWD":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && npm run lint && npm test"
```

It does two things:

- `npm run lint` runs ESLint over `web/public/script`, `web/app.js`, `web/middleware`, `web/helpers`,
  `web/scripts` and `api/`.
- `npm test` runs `node --test tests/frontend/*.test.mjs tests/render2/*.test.mjs`: the frontend helpers
  and components, and the pure logic of the 3D renderer (no WebGL, no assets).

## Suites

| Command | Covers | Needs |
| :--- | :--- | :--- |
| `docker run --rm -v "$PWD":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && npm run lint && npm test"` | Lint of the whole JS tree; frontend and render2 unit tests. | Docker only |
| `docker compose exec -T api npx vitest run` | The API unit suite (Vitest + supertest, `api/tests/unit`). | The dev stack (`api`) |
| `docker compose exec -T web npm test` | Page routes, old-address redirects and the import map (`web/tests`). | The dev stack (`web`) |
| `docker run --rm -v "$PWD":/w -v /w/migrations/node_modules -w /w/migrations node:22-alpine sh -c "npm ci && npm test"` | The migration runner's statement splitting, ordering and locking (`tests/migrations`). | Docker only |
| `docker run --rm -v "$PWD":/w -w /w gladcode2-vm sh -c "gcc -o /tmp/engine_test tests/engine/engine_test.c -lm -lpthread && /tmp/engine_test"` | The C engine's unit tests (damage, movement, line of sight, …). | The `gladcode2-vm` image |
| `bash tests/engine/run.sh` | Real regression battles in `gladcode2-vm`: healthy battles and crashing C/Python gladiators, checked through `api/helpers/battle-results.js`. | The `gladcode2-vm` image and Docker |
| `docker run --rm -v "$PWD":/w -w /w node:22-alpine node api/scripts/api-docs.js` | Not a test: regenerates `docs/api/README.md` after changing a route. | Docker only |
| `docker run --rm --network host -v "$PWD":/w -v /tmp/opencode:/tmp node:22-alpine node dev-tools/ui-audit.mjs --base http://localhost:8085 --cookie "$COOKIE" --axe /path/axe.min.js` | Not a test: the phone/theme/accessibility audit (horizontal scroll, 44 px targets, unlabelled icon buttons, axe serious/critical) and optional screenshots. | The dev stack, Chrome CDP on `:9222` and axe-core |
| `docker run --rm -v "$PWD":/w -w /w node:22-alpine node dev-tools/render-boards.mjs /tmp/boards` | Not a test: renders the static `docs/design/painel/*.dc.html` boards for the visual audit. | Docker only |
| `docker run --rm -v "$PWD":/w -w /w node:22-alpine node dev-tools/check-docs.mjs` | Not a test: checks every relative Markdown link and the repository paths named in the docs. | Docker only |
| `docker run --rm -v "$PWD":/w -w /w node:22-alpine node web/scripts/compress-functions.js` | Not a test: rebuilds `script/functions.json` and the sample bundles after editing `web/public/script/functions/`. | Docker only |
| `git diff --check` | No trailing whitespace or whitespace errors. | Git |

### Frontend and render2 tests

`tests/frontend/` holds the tests of `web/public/script`:

- `helpers.test.mjs` — query strings, request bodies and `RequestError`, template escaping, date and
  duration formatting, compiler-error text.
- `components.test.mjs` — the async `Button` (spinner, double-send guard, failure restore) and the
  `Input`/`Select` error contract.
- `theme.test.mjs` — the theme choice resolves, the cache format, the boot script and a role mapping in
  `tokens.css` for every theme.
- `glad-card.test.mjs` — the card painter: sprite/3D style switching, death pose, placeholder fallbacks,
  a slow paint never overwriting a newer one.
- `profile.test.mjs` — potion countdown, round-time typing, training groups and the gladiator limit.
- `editor.test.mjs` — attribute costs, name rules, language detection, the setup block, breakpoints, the
  creator gate.
- `web-server.test.mjs` — template variables cannot close their script tag, old PHP addresses redirect,
  redirects stay on the site, origins are built from a base and a port.
- `playback.test.mjs`, `portrait-cache.test.mjs`, `skin-preview.test.mjs`, `stage-lifecycle.test.mjs`,
  `stats.test.mjs`, `wardrobe.test.mjs` — replay interpolation, the portrait cache, the creator's
  wardrobe and animation list, the stage lifecycle and WebGL release, slider snapping.

`tests/render2/` holds the pure logic of the 3D renderer: `battle-state`, `motion`, `outfit`, `quality`,
`touch`, `crowd`, `coliseum`, `landscape`, `creator`, `card-portrait`, `audio` and `synty-library` (the
last runs the real library and model with the FBX/image loads stubbed). None of them needs WebGL or the
Synty packs.

### Visual and accessibility audit

The board audit is [docs/design/painel/FIDELITY.md](docs/design/painel/FIDELITY.md). Its evidence lives
under `.orchestration/shots/WP9/` (local to the orchestration workspace) and was produced by the two
scripts above plus Chrome's DevTools protocol. `dev-tools/ui-audit.mjs` checks every section at
1440×900, 390×844 and 360×740 in Arena light, Arena dark and Classic. It needs a signed-in
`app_session` cookie (`api/scripts/issue-session.js`) and a local axe-core build; the summary of the
last run and every accepted difference are in the WP9 report.

### API tests

`docker compose exec -T api npx vitest run` runs `api/tests/unit`. The models are tested against a mocked
`Mysql`; no database is read or written.

- `app.test.js` — the Express wiring, CORS and error shape.
- `route/` — gladiators (saving and test battles), logs, news, users.
- `model/` — battle, gladiator, potion, ranking, release, social (messages/friends/notifications),
  stats, tournament, training, duel/ranked and the dev-tournament tooling.
- `middleware/` — `auth()` (session, optional session, administrator) and the error handler.
- `helpers/` — `battle-results` (golden values from the old PHP code), `battle-stats`, `email`,
  `gladiator-code`, `google-auth`, `mysql`, `platform` (CORS/CSRF), `runner`, `session`, `uploads`,
  `validation`.

### Web tests

`docker compose exec -T web npm test` runs `web/tests`:

- `routes.test.js` — every old PHP address redirects once and lands on a page that answers 200; unknown
  addresses are 404; `ENABLE_RENDER2` gates only the replay's 3D script and stylesheet (the page and its
  classic renderer always answer).
- `import-map.test.js` — every module folder is in the import map, three and `render2` are always mapped
  (the cards and the editor import them on demand), and the versioned URLs resolve.

### Migration tests

`migrations/` ships its own tests (`tests/migrations/migrate.test.mjs`) with a fake database: statement
splitting, the `schema_migrations` record, forward-only ordering, and the advisory lock that keeps two
deploys from migrating at once. `migrations/migrate.sh` applies the numbered files; the deploy runs it
before the services restart.

### Engine tests

- The C unit tests compile the engine sources directly and call the server functions; the command is in
  the header of `tests/engine/engine_test.c`.
- `tests/engine/run.sh` builds run folders the same way `api/model/battle.js` does and runs real battles.
  It asserts, through `crashedGladiators()` in `api/helpers/battle-results.js`, that healthy battles have
  no crashed gladiator and that the crashing samples are detected as `G0`/`G1` — including crashes on the
  first turn, mid-battle, in mixed teams, and attempts to forge `errorc.txt` or inject through `speak()`.
  It needs the `gladcode2-vm` image (`docker build -t gladcode2-vm Setup`) and removes its run folders at
  the end.

## Manual checks

### Browser and themes

After a change to a page, a component or a stylesheet, open the page on <http://localhost:8085> and check it
in **Arena light**, **Arena dark** and **Classic**, at desktop and phone widths:

- choose the theme in the profile settings, or write the cache and reload:
  `localStorage.setItem('gladcode-theme', JSON.stringify({ data: 'arena-dark', expires: false }))`;
- choose how gladiators are drawn (Coliseu 3D / Sprites) in the profile settings; the `gladview` cookie
  and `<html data-glad-view>` must follow on the next page.

The replay has no player-facing renderer choice: `ENABLE_RENDER2=1` runs the 3D renderer when the browser
has WebGL2, and the classic renderer takes over without it or when the 3D start throws. Check both by
disabling WebGL2 in the browser or starting a stack with `ENABLE_RENDER2=0`.

### Battle and tournament flows

`api/scripts/battle.js <id> <id> [--keep]` runs a battle between any two saved gladiators outside the
game modes for triage. `dev-tools/tournament.sh` creates and resets test tournaments without signing in;
the `/dev-tools` page does the same as an administrator. See [dev-tools/README.md](dev-tools/README.md).

### E-mail

Without `MAILER_USER` the API only logs `mail_skipped`. Never point a development stack at the production
SMTP credentials: friendship requests, messages, duel challenges, tournament starts and release
announcements send real e-mail.

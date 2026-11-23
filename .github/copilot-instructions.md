# gladCode Development & Copilot Guide

This guide provides instructions and architectural context for GitHub Copilot and developers working on **gladCode 2**. [AGENTS.md](../AGENTS.md) is the full reference.

---

## ⛔ CRITICAL ENVIRONMENT RULE

> [!CAUTION]
> **NO LOCAL NODE.JS OR PYTHON ON HOST MACHINE**
> The host machine does NOT have Node.js or Python installed natively.
> - **DO NOT** execute `node`, `npm`, `python`, `python3`, or `gcc` directly on the host shell.
> - **ALWAYS** use Docker for all commands, scripts, compilation, and service control:
>   - API: `docker compose exec api <command>`; web: `docker compose exec web <command>`; runner: `docker compose exec runner <command>`
>   - Repository tooling: `docker run --rm -v "$PWD":/w -w /w node:22-alpine <command>`
>   - Full environment control: `docker compose up -d`, `docker compose down`

---

## 🏛️ Architecture Overview

gladCode is a web-based programming game where users code AI gladiators in C or Python that battle autonomously in an arena. Docker Compose runs:

- **Web (`web/`)**: Express + Mustache page shells and the static frontend (`web/public/`). It never sees the session.
- **API (`api/`)**: Express REST API (routes in `route/`, models in `model/`, MySQL through `helpers/mysql.js`), documented in [docs/api/README.md](../docs/api/README.md). The browser calls it directly with the `app_session` cookie.
- **Runner (`runner/`)**: Express service executing user code in isolated containers through the host Docker socket (`gladcode2-vm`).
- **C Simulation Engine (`Payload/`)**: Multi-threaded server executing combat between gladiators via TCP sockets.
- **MySQL 8.0**, with numbered migrations in `migrations/`.

---

## 🔑 Key Workflows

### 1. Starting the Development Environment

```bash
# .env: COMPOSE_FILE=compose.yaml:compose.dev.yaml (live reload), WEB_PUBLISH/API_PUBLISH for host ports
docker compose up -d
MAILER_USER= docker compose up -d api                          # no emails to real users while testing
docker compose exec -T api node scripts/issue-session.js <id>  # app_session cookie for localhost
```

- **Site**: `http://localhost:<WEB_PUBLISH>`; **API**: `http://localhost:<API_PUBLISH>`
- **Dev tools** (accounts in `ADMIN_EMAILS`): `/dev-tools` on the site
- **Runner**: `http://runner:3000` (internal Docker network)

### 2. Database Management

```bash
./migrations/migrate.sh             # apply migrations
dev-tools/dump_restore.sh dump      # dev-tools/dump_gladcode.sql
dev-tools/dump_restore.sh restore
```

### 3. Tournament Testing

```bash
dev-tools/tournament.sh list            # test tournaments ([DEV-TEST])
dev-tools/tournament.sh create "Cup" 8  # random full teams
dev-tools/tournament.sh reset 12 2      # tournament 12 (id or hash) back to round 2
dev-tools/tournament.sh list-real 1 10
dev-tools/tournament.sh help
```

---

## ⚔️ How Battles Work (Critical Flow)

1. User writes C or Python code in the editor (`/editor`) using visual blocks (Blockly) or text (ACE editor).
2. Saving a gladiator (`POST`/`PUT /gladiators`) checks the code against `api/banned_functions.json` and runs a test battle; the code is stored as written with its attributes (STR/AGI/INT) and skin.
3. A battle (`api/model/battle.js` `Battle`, used by editor tests, ranked battles, duels, tournaments and trainings):
   - Creates a run folder in `data/runs/<dir>/` with the `Payload/` files and the gladiators' code (`code0.c`, `code1.py`, ...).
   - Sends an HTTP POST to the runner at `http://runner:3000/<dir>` (`sandbox` for editor tests only, `noitems` for tournaments).
4. The runner (`runner/app.js` & `runner.js`) executes a Docker container:
   - Spawns `gladcode2-vm` running `socket_compile.sh`.
   - Compiles user C files (`gcc -o code0 code0.c -lm`) or runs Python files (`python3 code0.py`).
   - Launches `gladCodeServerMain`, creating TCP sockets for each gladiator thread.
   - User gladiators communicate with the game engine via `gladCodeAPI.c` / `gladCodeAPI.py`.
5. The simulation produces a `simlog` JSON trace; the API stores it in `data/logs/<id>` and applies the battle's rules (`api/helpers/battle-results.js`).
6. `web/public/script/playback.js` expands the log into frames and runs the Three.js coliseum (`script/render2/`) by default; browsers without WebGL2, `ENABLE_RENDER2=0` or a failed 3D start fall back to the classic Phaser.js renderer (`script/render.js`). There is no player-facing renderer choice.

### Socket IPC Architecture

`User Code (code0.c)` → `gladCodeAPI.c` (client) → `Socket IPC` → `gladCodeServerMain.c` (server) → `gladCodeServerCore.c` (game logic)

---

## 📐 Project Conventions

### API (`api/`)
- Routes compose HTTP only: validate with `Validate`, call a model, answer JSON (camelCase). Document each route with a `METHOD /path` comment and regenerate `docs/api/README.md` (`node api/scripts/api-docs.js` through Docker).
- Models own the rules and the SQL; only models call `Mysql`, always with placeholders. Use `Mysql.withTransaction` and `SELECT ... FOR UPDATE` where two requests could race.
- `auth()` on every route that touches a master's data, `auth({ admin: true })` for admin tools; check ownership in the model.
- Refuse with `CustomError(status, message, CODE)`; clients branch on `code`.
- Tests: Vitest in `api/tests/unit/` (`docker compose exec -T api npx vitest run`).

```js
// api/model/example.js
const rows = await Mysql.select('SELECT cod, name FROM gladiators WHERE master = ? AND version = ?', [userId, VERSION]);
```

### Frontend JavaScript (`web/public/script/`)
- Native ES modules with named exports, loaded through the import map the views print (`{{{importMap}}}`, `{{#module}}page.js{{/module}}`). No jQuery and no new `window` globals.
- Page entries in `script/*.js`; DOM classes in `components/`; pure helpers in `helpers/`; markup strings in `templates/` (`{{key}}` escaped, `{{{key}}}` raw).
- Only `models/` calls the API, through `helpers/request.js` (`api`); failures are `RequestError`s carrying the API's `code`.
- Never `alert`/`confirm`/`prompt` (use `components/dialog.js`), never unescaped text in `innerHTML`, dialogs or toasts, never app data in `data-*` attributes.
- Lint and test through Docker: `docker run --rm -v "$PWD":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && npm run lint && npm test"`.
- Full rules: [Frontend Standards in AGENTS.md](../AGENTS.md#frontend-standards); the contract (conventions, component catalogue, events, page shell) is [docs/frontend/](../docs/frontend/README.md); the architecture is [GUIDE.md](../GUIDE.md).

### Branches & Commits
- Follow [CONTRIBUTING.md](../CONTRIBUTING.md): work branches from `dev` named `<type>/<slug>`, Conventional Commits `<type>(<scope>): <summary>` (imperative, at most 72 characters, scopes listed there), a body only when the reason is not obvious.

### Security & Banned Functions
User code is checked against `api/banned_functions.json`:
- Blocked C/Python functions: `setPosition`, `setHp`, `setAp`, `lvlUp`, `mudaPosicao`, `mudaPv`, `mudaPh`, `sobeNivel` (they only work in editor test battles, which run in the engine's sandbox).
- Docker containers run with CPU quota (`--cpu-quota=50000`) and a 30-second hard wall-clock timeout.

---

## 🔍 Debugging & Verification

### Inspecting Simulation Logs
If a battle fails or returns no log:
1. An editor test battle's `error` carries the compiler output or the engine error (`INVALID_ATTR`, ...); battles that count answer `NO_OUTPUT` and log the output as `battle_without_log` in `docker compose logs api`.
2. Run a folder by hand: copy `Payload/` into `data/runs/<name>/`, add `code0.c`, then `docker run --rm -v "$PWD/data/runs/<name>":/usercode -w /usercode gladcode2-vm sh socket_compile.sh` and read `errorc.txt` / `simlog`.
3. Check for "CLIENT TIMEOUT" errors caused by infinite loops lacking API yielding.

---

## 📁 Key Files Reference

- **`Payload/gladCodeAPI.c` / `.py`**: Gladiator client API functions (movement, attack, spells).
- **`Payload/gladCodeServerMain.c`**: Multi-threaded C socket server for battles.
- **`Payload/socket_compile.sh`**: Compilation script inside `gladcode2-vm`.
- **`api/model/battle.js`**: Battle orchestrator; **`api/helpers/battle-results.js`**: rewards and placings.
- **`runner/runner.js`**: Docker container lifecycle manager.
- **`web/public/script/playback.js`**: Replay loader and controls shared by both renderers.
- **`web/public/script/render.js`** / **`render2/`**: Classic Phaser.js 2D and Three.js 3D battle renderers.
- **`dev-tools/`** and **`/dev-tools`**: CLI and web tools for database and tournament management.

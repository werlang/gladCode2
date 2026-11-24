# AI Agent & Developer Guidelines (`AGENTS.md`)

This document serves as the authoritative guide for AI coding agents (Antigravity, Gemini, GitHub Copilot) and developers modifying or extending the **gladCode 2** repository.

Layer-by-layer project skills (API, models, MySQL, frontend, CSS, tests, docs, simulation) live in [`.agents/skills/`](.agents/skills/README.md); load the one for the layer you touch.

> [!IMPORTANT]
> **Project skills live only in `.agents/skills/`**, never in `.claude/skills/`, `.github/` or any other agent-specific folder, so every agent shares one copy. Before working on a layer, read [`.agents/skills/README.md`](.agents/skills/README.md) and the matching `.agents/skills/<name>/SKILL.md` (plus any `references/` it points to) yourself, even if your tool only discovers skills elsewhere and does not list them. A project skill overrides the global skill it localizes on project facts. Add or change project skills there, and do not copy or symlink them into another folder.

---

## ⛔ CRITICAL EXECUTION RULES

> [!CAUTION]
> **NO LOCAL PYTHON OR NODE ON HOST ENVIRONMENT**
> The host machine does **not** have Python or Node.js installed natively.
> - **NEVER** run commands like `npm run dev`, `node app.js`, `python3 script.py`, or `pip install` directly on the host shell.
> - **ALWAYS** execute Node, Python, C compilation, database operations, or scripts via **Docker** / **Docker Compose** containers:
>   - API: `docker compose exec api sh` (tests: `docker compose exec -T api npx vitest run`)
>   - Web: `docker compose exec web sh`
>   - Runner: `docker compose exec runner sh`
>   - MySQL: `docker compose exec mysql mysql -u root -p`
>   - Repository tooling (lint, frontend tests, generators): `docker run --rm -v "$PWD":/w -w /w node:22-alpine ...`
>   - Container control: `docker compose up -d`, `docker compose restart <service>`

---

## 🏛️ Architecture and ownership (read GUIDE.md)

[`GUIDE.md`](GUIDE.md) owns the system description: the services and their data flow, the repository map, the ownership boundaries of `api/`, `web/`, `runner/`, `Payload/` and `migrations/`, the frontend layers, the 3D renderer notes, the Synty asset rules and the configuration. Read it before changing a subsystem; this file keeps only the rules an agent must follow.

The layer skills in [`.agents/skills/`](.agents/skills/README.md) carry the layer-specific facts (API, models, MySQL, frontend, CSS, tests, docs, simulation). The frontend contract is [`docs/frontend/`](docs/frontend/README.md); the design boards and their board-by-board audit are [`docs/design/painel/`](docs/design/painel/README.md); the validation commands are in [`TESTING.md`](TESTING.md).

---

## 🗄️ Database & Configuration Standards

### Configuration
Every setting comes from the environment (`.env`, passed through `compose.yaml`); there are no config files. `.env.example` lists them: `MYSQL_*`, `JWT_SECRET` (at least 32 random characters in production), `SESSION_TTL_DAYS`, `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `MAILER_*`, `WEB_URL`/`WEB_PORT` and `API_URL`/`API_PORT` (the public URLs), `WEB_PUBLISH`/`API_PUBLISH` (the host ports the containers listen on), `ENABLE_RENDER2`, `MAINTENANCE`, `TRUST_PROXY`, `RUNNER_CONCURRENCY` (battles the engine runs at once, 6; the next ones wait, and editor test battles run one at a time per master or address).

`compose.yaml` runs the production images. For development set `COMPOSE_FILE=compose.yaml:compose.dev.yaml` in `.env`: `compose.dev.yaml` mounts `api/`, `web/` and `runner/` and runs them with `node --watch`, and publishes MySQL (`MYSQL_PORT`) and the runner (`RUNNER_PORT`) on 127.0.0.1. Production publishes only the web and API ports; nothing installs packages at start-up or mounts source there.

### Database Access Pattern
Only models touch the database, through `Mysql` from `api/helpers/mysql.js`, always with placeholders:

```js
import { Mysql } from '../helpers/mysql.js';

const glad = await Mysql.findOne('gladiators', { filter: { cod: id, master: userId } });
const rows = await Mysql.select('SELECT g.cod, u.apelido FROM gladiators g INNER JOIN usuarios u ON u.id = g.master WHERE g.version = ?', [VERSION]);
await Mysql.withTransaction(async context => {
    const [team] = await Mysql.select('SELECT * FROM teams WHERE id = ? FOR UPDATE', [teamId], context);
    await Mysql.update('teams', { modified: Mysql.raw('NOW()') }, { id: teamId }, context);
});
```

Schema changes are numbered SQL files in `migrations/` applied by `migrations/migrate.sh` (the deploy runs it); see the simulation skill's `references/database_migrations.md`. `DATETIME` columns without fractions round `NOW(3)` up, so write `NOW()` when the value is compared right away (deadlines, ends of turns).

---

## 🛠️ Developer & Agent Workflows

### 1. Launching the Local Stack
```bash
# .env: COMPOSE_FILE=compose.yaml:compose.dev.yaml, WEB_PUBLISH/API_PUBLISH for the local ports
docker compose up -d
MAILER_USER= docker compose up -d api      # never email real users while testing
docker compose exec -T api node scripts/issue-session.js 277   # app_session cookie for localhost
docker compose exec -T api node scripts/seed-dev-potions.js    # dev potion catalogue (refuses production)
```

### 2. Resetting or Backing Up Database
```bash
dev-tools/dump_restore.sh dump      # writes dev-tools/dump_gladcode.sql
dev-tools/dump_restore.sh restore
```

### 3. Managing Tournaments
The `/dev-tools` page (administrators) or the CLI, which needs no sign-in:

```bash
dev-tools/tournament.sh list                 # test tournaments
dev-tools/tournament.sh create "Cup" 8       # test tournament of random full teams
dev-tools/tournament.sh reset 12 2           # tournament 12 (id or hash) back to round 2
dev-tools/tournament.sh export 12 cup.json
dev-tools/tournament.sh help
```

### 4. Direct Simulation Debugging
Run the engine on a hand-made folder, like the API's `Battle` builds them:

```bash
mkdir -p data/runs/test_run && cp Payload/* data/runs/test_run/
cat << 'EOF' > data/runs/test_run/code0.c
#include "gladCodeCore.c"
setup(){ setName("Test@nick"); setSTR(10); setAGI(14); setINT(9); setSlots("0,0,0,0"); }
loop(){ stepForward(); }
EOF
docker run --rm -v "$PWD/data/runs/test_run":/usercode -w /usercode gladcode2-vm sh socket_compile.sh   # add "sandbox" for setHp/setPosition/setAp/lvlUp
cat data/runs/test_run/errorc.txt data/runs/test_run/simlog
```

---

## 🔍 Common Issues & Diagnostics

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **"CLIENT TIMEOUT"** | Gladiator code stuck in infinite loop without calling API functions or socket stalled | Verify gladiator code contains valid loop calling `gladCodeAPI` actions |
| **Empty `simlog` / `NO_OUTPUT`** | GCC compilation failed for gladiator code or C server | Editor test battles carry the compiler output in `error`; battles that count answer `NO_OUTPUT` and log it as `battle_without_log` (`docker compose logs api`, also printed by `scripts/battle.js`); run the folder by hand (Direct Simulation Debugging) for more |
| **`NOT_SIGNED_IN` (401)** | Missing or expired `app_session` cookie, or a different `JWT_SECRET` | Sign in again; locally use `scripts/issue-session.js` |
| **`CORS_ORIGIN_DENIED` / `CSRF_ORIGIN_DENIED` (403)** | The page's origin is not `WEB_URL:WEB_PORT` | Fix `WEB_URL`/`WEB_PORT` (public URL) in `.env`; host ports are `WEB_PUBLISH`/`API_PUBLISH` |
| **Container Timeout** | Simulation took longer than 30s | Runner kills container via `docker kill {dirname}`. Check for blocking calls or high turn counts |
| **Gladiator `version = 'broken'`, shown as outdated** | Its client crashed (runtime error) during a ranked battle: the engine marked it `"crashed":1` in the simlog and the ranked battle flagged it, removing it from matchmaking | Owner fixes the runtime error and saves the gladiator again to upgrade its version |
| **"ERRO DE SINTAXE" / `NO_OUTPUT` in Matchmaking** | Opponent saved code no longer compiles (runtime crashes no longer fail ranked battles) | Triage candidate pool via pairwise test battles; fix gladiator code or downgrade version |

For detailed guidance on programmatically invoking battles and triaging errors, see [Debugging & Programmatic Battles](.agents/skills/gladcode-simulation/references/debugging_and_programmatic_battles.md).

---

## 🛡️ Coding Standards & Security Policies

1. **Security Filtering**: Never bypass `banned_functions.json` checks when accepting user C code, and never run counted battles in the sandbox.
2. **Escaping**: Gladiator code and every other text is stored as written; escape it where it is shown (`renderTemplate` `{{key}}`, `escapeHtml`, `textContent`, mail templates fill escaped values). Never put user or server text into HTML unescaped.
3. **Access Checks**: Every API route that reads or changes a master's data uses `auth()` and checks ownership in the model (filter by the user's id); admin tools use `auth({ admin: true })`. Validate every input with `Validate` and keep SQL parameterised.
4. **Races**: Anything two requests could do at once (spending silver, joining a team, running a group battle) runs in `Mysql.withTransaction` with the rows locked first.
5. **Preserve Documentation**: Maintain existing comments, docstrings, and contracts when modifying the API, the web service or C engine source; keep the route comments accurate and regenerate `docs/api/README.md`.
6. **Branches & Commits**: Follow [`CONTRIBUTING.md`](CONTRIBUTING.md): work branches from `dev` named `<type>/<slug>`, Conventional Commits with the scopes listed there, merged into `dev` with `--no-ff`.

### Frontend Standards

Rules for `web/public/script/` (the layers are described in [GUIDE.md → Frontend layers](GUIDE.md#frontend-layers); the full contract is [`docs/frontend/`](docs/frontend/README.md)):

1. **ES modules only**: new code is a native module with named exports, loaded through the import map (`{{#module}}`), never a classic `<script>`. No jQuery, no new globals on `window` (the replay facade in `playback.js` `exposeLegacyGlobals` is the one exception and only exists for `render.js` and `render2/`).
2. **One job per folder**: page entries only wire a page together; DOM behaviour lives in `components/` classes; DOM-free application state lives in `services/` and pure DOM-free logic in `helpers/` (so it can be unit tested); markup lives in `templates/`.
3. **Network through models**: only `models/` calls the API, through `helpers/request.js` (`api.get`/`post`/`put`/`delete`). Pages, components and services call model methods, never `fetch` directly, and branch on `RequestError.code`.
4. **Escape by default**: build markup with `renderTemplate` (`{{key}}` is escaped, `{{{key}}}` is raw and only for markup the code built itself) or `textContent`; never put user or server text into `innerHTML`, dialogs or toasts unescaped.
5. **No native dialogs**: never `alert`/`confirm`/`prompt`; use `components/dialog.js` (`showDialog`, `showInput`, `showMessage`) and `components/toast.js` (`createToast`).
6. **No data in the DOM**: keep app data out of `data-*` attributes; map elements to data with a `Map`/`WeakMap` or class fields.
7. **Document what you touch**: JSDoc on exported classes and functions, matching the surrounding code.
8. **Styles from tokens**: colours, fonts, sizes, spacing, radii, shadows, durations and layers come from `public/css/tokens.css` (`var(--color-…)` roles for anything that follows the theme, content tokens for game colours), in CSS, inline styles and JavaScript alike; check pages in Arena light, Arena dark and Classic. The project `css-standards` skill has the details.
9. **Phone and accessibility**: keep 44 px touch targets at phone widths, no horizontal page scroll, safe-area insets on the fixed bar/sheet, labelled icon controls and `aria-current` on the active section; keyboard focus must stay visible and dialogs, sheets and the palette must trap and restore it. Check the board-by-board audit in [`docs/design/painel/FIDELITY.md`](docs/design/painel/FIDELITY.md).
10. **Lint and test before committing** (through Docker; the root `package.json` and `eslint.config.js` hold the tooling, `node_modules/` is gitignored):

   ```bash
   docker run --rm -v "$PWD":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && npm run lint && npm test"
   docker compose exec -T api npx vitest run
   docker compose exec -T web npm test        # page routes and old-address redirects
   docker run --rm -v "$PWD":/w -v /w/migrations/node_modules -w /w/migrations node:22-alpine sh -c "npm ci && npm test"   # migration runner
   ```

   `npm run lint` covers `web/` and `api/` and must report no errors: modules get `no-undef`, `no-var`, `no-redeclare`, `no-use-before-define` and `prefer-const`; the classic `render.js` and `floatingText.js` only get the correctness rules until they are rewritten. `npm test` runs `tests/frontend/` and `tests/render2/`; new pure helpers get a test there.

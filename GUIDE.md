# gladCode 2 — technical guide

This guide is for people who work on gladCode 2: what the system is made of, how a request and a
battle flow through it, and which folder owns which kind of code. The rules an agent must follow are in
[AGENTS.md](AGENTS.md); the commands that validate a change are in [TESTING.md](TESTING.md); the
frontend conventions that the Painel redesign implements are in [docs/frontend/](docs/frontend/README.md).

gladCode is a programming game: a master writes a gladiator's behaviour in C, Python or blocks, tests it in
the editor, sends it to ranked battles, duels, tournaments and classroom trainings, and watches every
battle in the 2D arena or the 3D coliseum.

## Implemented scope

The repository implements the game platform described in this guide: Google sign-in with a signed session
cookie, masters and their gladiators in C, Python or blocks, sandboxed editor test battles, ranked
battles, duels, tournaments, classroom trainings, potions, news, rankings and statistics, reports,
messages and friendships, the 2D replay and the 3D coliseum replay, plus the administrators' tournament
tools.

The Painel redesign (header, side menu, nine redesigned sections, component catalogue, event bus) is
**planned** and delivered by WP2–WP9 of `.orchestration/PLAN.md`. Where a document describes that target,
it says so; the code today is the current page shells and tab controllers described under
[Web service](#web-service).

## Services

Production `compose.yaml` runs four services; development (`compose.dev.yaml`) runs the same services
from source with `node --watch`.

```text
Browser ──> web: Express + Mustache      page shells, static files (web/)
   │
   └─────> api: Express REST API ───────> mysql: MySQL 8.0
                   │  writes data/runs/<dir>, then HTTP POST /:dirname
                   ▼
            runner: Express ─────────────> gladcode2-vm container (through the host's Docker)
                                              │
                                              ▼
                                 C engine (gladCodeServerMain)
                                   ├── code0.c / code0.py (gladiator 1)
                                   └── code1.c / code1.py (gladiator 2)
```

| Service | Code | Responsibility |
| :--- | :--- | :--- |
| `web` | `web/` | Renders the Mustache page shells and serves browser assets. It never receives the session and never proxies application requests. |
| `api` | `api/` | Owns the JSON endpoints, validation, authentication, authorization, game rules and persistence. It prepares battle run folders and calls the runner. |
| `mysql` | `migrations/` | Relational persistence (`gladiators`, `usuarios`, `battles`, `logs`, `items`, `tournaments`, `trainings`, `reports`, `messages`, `friends`, ...). Schema changes are numbered SQL files applied by `migrations/migrate.sh`. |
| `runner` | `runner/` | Accepts `POST /:dirname` from the API, copies the run folder into the `gladcode_tmp_run` volume and executes `docker run --rm gladcode2-vm sh socket_compile.sh`, enforcing the 30-second timeout. It drives the host Docker through the mounted socket and has no daemon of its own. |
| engine | `Payload/` | The C simulation server and its C/Python client APIs, compiled and run inside the `gladcode2-vm` image (`Setup/`). |

The browser loads page shells from `web` and talks to `api` directly (`API_URL:API_PORT`, cookies
included). `WEB_URL`/`WEB_PORT` and `API_URL`/`API_PORT` are the public URLs; `WEB_PUBLISH`/`API_PUBLISH`
are the host ports the containers listen on. Cookie requests that change data must come from the web
origin; CORS allows only that origin.

### Data flow

- **A page**: the browser requests a route from `web`; `web/app.js` renders a view; the page's ES modules
  load through the import map and call the API with `credentials: 'include'`.
- **A battle**: `api/model/battle.js` builds `data/runs/<dir>` with the `Payload/` files, each
  gladiator's prepared code (`api/helpers/gladiator-code.js`) and the setup block, then calls the runner.
  The runner copies the folder into the `gladcode_tmp_run` volume, runs the engine in the VM and reads
  `errorc.txt` and `simlog`. The API stores the log as a `logs` row plus the JSON file in `data/logs/<id>`.
- **A replay**: `/play/:hash` downloads the log through `GET /logs/:hash` with progress; `script/playback.js`
  expands the incremental trace and drives either `script/render.js` (classic Phaser) or
  `script/render2.js` (Three.js coliseum).
- **Uploads**: profile pictures are stored under `data/profpics` (a volume shared with `web`).

## Repository map

```text
gladcode2/
├── AGENTS.md                  agent rule book (execution rules, standards, workflows)
├── INDEX.md                   map of every document
├── GUIDE.md                   this guide
├── TESTING.md                 validation commands and what each covers
├── CONTRIBUTING.md            branches, commit types and scopes
├── DESIGN.md                  visual direction
├── compose.yaml               production images
├── compose.dev.yaml           source mounts and live reload on top of compose.yaml
├── api/                       REST API: route/, model/, helpers/, middleware/, scripts/, tests/
├── web/                       web service: app.js, view/ (Mustache), middleware/, helpers/, public/
│   └── public/
│       ├── css/               tokens.css, component primitives and page/feature sheets
│       ├── script/            page entries, components/, helpers/, models/, templates/
│       │   ├── profile/       section controllers of the profile (Painel) shell
│       │   ├── editor/        editor parts
│       │   └── render2/       Three.js coliseum renderer (see the render2 section)
│       └── assets/synty/      licensed Synty packs (gitignored, never committed)
├── runner/                    battle executor
├── Payload/                   C battle engine and socket API
├── migrations/                numbered SQL migrations and their runner
├── dev-tools/                 tournament CLI, database dump/restore, release news SQL
├── docs/                      API reference, design system, design boards, frontend conventions
├── tests/                     frontend, render2, migration and engine tests
├── Setup/                     the gladcode2-vm image
└── data/                      battle logs, run folders, profile pictures (gitignored)
```

## Ownership boundaries

| Area | Owns |
| :--- | :--- |
| `web/view/` | Server-rendered Mustache templates: one view per page plus the `head`, `header`, `footer` and `analytics` partials. Markup only; no business rules. |
| `web/middleware/`, `web/helpers/` | Page rendering (`res.page`, asset and module versioning, the import map) and small server helpers (URL building and legacy redirects). |
| `web/public/css/` | All styling: `tokens.css` (the only place colours, fonts, sizes and motion are defined), `css/components/` (UI primitives) and one sheet per page or feature. The contract is [docs/design-system.md](docs/design-system.md). |
| `web/public/script/` (root) | Page entry modules: they load data and wire components; they do not build reusable markup or query the API directly. |
| `web/public/script/components/` | Reusable DOM behaviour: classes on `BaseComponent` that own an element, its listeners and its states. |
| `web/public/script/helpers/` | Utility modules: HTTP transport, template rendering and escaping, dates, local storage, theme, gladiator style, sprites, replay maths. No API calls; new helpers are DOM-free and unit-tested under Node. |
| `web/public/script/models/` | The **only** modules that call the API, one class per area, through `helpers/request.js`. |
| `web/public/script/templates/` | Markup-string modules rendered with `renderTemplate`; no logic, no interpolation beyond placeholders. |
| `web/public/script/profile/` | Section controllers of the profile/Painel shell. |
| `web/public/script/services/` | **Planned (WP2):** DOM-free application state that owns data and emits app events, between the models and the sections. See [docs/frontend/conventions.md](docs/frontend/conventions.md). |
| `web/public/script/editor/`, `render2/` | The editor's parts and the Three.js renderer; both are large subsystems with their own rules (see below). |
| `api/route/` | HTTP orchestration: one router per area, `METHOD /path` doc comments, `Validate` input checks, handlers wrapped in `asyncRoute`. |
| `api/middleware/` | `auth()` (session, optional session, administrators) and the error handler. |
| `api/model/` | Persistence-facing entities and the game rules. Only models execute SQL, through `helpers/mysql.js`. |
| `api/helpers/` | Pure or infrastructure helpers: MySQL access, runner client, gladiator code preparation, battle results, e-mail, JWT, validation, uploads, platform/CSRF. |
| `runner/` | Docker execution, timeout and run-folder copying. |
| `Payload/` | The C engine: battle loop, line of sight, damage, the client API and the compile script. |
| `migrations/` | Schema changes, applied forward only. |
| `tests/` | Cross-service tests: frontend modules, render2 pure logic, migrations, engine regressions. Each service also keeps its own tests (`api/tests`, `web/tests`). |
| `.agents/skills/` | Project-specific agent guidance, indexed in `.agents/skills/README.md`. |

## Frontend layers

The frontend is native ES modules with no bundler. `web/helpers/modules.js` builds one import map over
`MODULE_DIRS` (`'', components, editor, helpers, models, profile, templates`) plus the `render2/` modules,
versioned by file modification time; every view prints it once with `{{{importMap}}}` before any module
script. Adding a new script folder means adding it to `MODULE_DIRS`.

Read [docs/frontend/](docs/frontend/README.md) for the contract. In short:

- `web/view/<page>.html` — the page shell (Mustache). Every view includes `{{> head}}` right after its
  viewport meta and loads its local styles with `{{#asset}}…{{/asset}}`.
- `web/public/script/<page>.js` — the page entry module, loaded with `{{#module}}<page>.js{{/module}}`.
  It reads server values with `TemplateVar.get()`, loads the data and mounts components.
- `web/public/script/components/` — DOM behaviour on `BaseComponent` (`on()` tracks listeners,
  `clearListeners()` and `destroy()` release them).
- `web/public/script/helpers/` — DOM-free utilities, unit-tested in `tests/frontend/` (the
  pre-existing DOM-touching helpers are the exception; see [docs/frontend/conventions.md](docs/frontend/conventions.md)).
- `web/public/script/models/` — the only API callers; `helpers/request.js` exposes `api` (JSON with
  credentials, `RequestError` with the API's `code`/`details`) and `site` (same-origin files).
- `web/public/script/services/` (**planned, WP2**) — DOM-free application state shared across sections;
  calls models and emits app events ([docs/frontend/events.md](docs/frontend/events.md)).
- `web/public/script/templates/` — markup strings for client-rendered pieces, rendered with
  `renderTemplate` (`{{key}}` escaped, `{{{key}}}` raw).
- `web/public/css/` — tokens first, primitives in `css/components/`, then feature and page sheets.

The profile (the future Painel) is one shell view (`web/view/profile.html`) with all nine sections in the
markup; `web/public/script/profile.js` mounts them and `web/public/script/profile/*.js` hold one controller
per section. The Painel redesign keeps this shape and replaces the markup and controllers section by
section; the controllers move to `sections/` as each one is rebuilt.

### Editor and gladiator creator

The editor's gladiator creator (`editor/skin-creator.js`) always shows the battle's 3D gladiator
(`editor/skin-preview-3d.js` over the DOM-free `helpers/stage-lifecycle.js`: three and the Synty models
load only once the creator is on screen, the WebGL context is released on every failure and when the page
is left, and a status line stands in when they cannot); the wardrobe rules (`helpers/skin-preview.js`) and
the card portrait (`render2/card-portrait.js` over `helpers/portrait-cache.js`) are the same in both.
`web/public/sprite/Universal-LPC-spritesheet/` stays: `render2/palette.js` samples its colours and the
Phaser fallback (`helpers/spritesheet.js`) still builds the 2D gladiators from it. Vendored libraries
(`phaser.js`, `croppie.js`) and the classic Phaser renderer (`render.js`, `floatingText.js`) stay classic
scripts.

## API service

`api/app.js` wires middleware and routers. It is built like node-aec: `route/` composes HTTP, `model/`
owns persistence and rules, `helpers/` holds the rest, `middleware/` has `auth()` and the error handler.
The generated endpoint reference is [docs/api/README.md](docs/api/README.md), built by
`api/scripts/api-docs.js` from the `METHOD /path` comments.

- **Sessions**: `POST /auth/google` issues the `app_session` HttpOnly cookie, a JWT signed with
  `JWT_SECRET` (`helpers/jwt.js`). `auth()` requires it, `auth({ optional: true })` reads it when present,
  `auth({ admin: true })` also requires an email listed in `ADMIN_EMAILS`.
- **Profile**: `GET/PUT /users/me` reads and saves the account. `PUT` takes `gladView` (`sprite|3d`, how
  gladiators are drawn, `3d` by default), nickname, language, site theme, picture and e-mail preferences.
- **Errors**: throw `CustomError(status, message, code, data)`; the error middleware answers
  `{ error, status, type, code, message, data }`. Clients branch on `code`.
- **Database**: `helpers/mysql.js` `Mysql` is the only SQL executor (`find`, `findOne`, `count`, `insert`,
  `update`, `delete`, `select` for parameterised reads, `withTransaction`, `raw` for trusted SQL
  fragments, `contains` for LIKE values). Only models call it. Lock rows with `SELECT … FOR UPDATE`
  inside `withTransaction` when two requests could race.
- **Battles**: `model/battle.js` `Battle` builds a run folder, calls the runner and stores the log
  (`model/battle-log.js`). Editor tests (`POST /battles/test`) run in the sandbox; ranked, duel,
  tournament and training battles do not. Tournament battles send `noitems`.
- **Battle results**: `helpers/battle-results.js` holds the pure rules (renown, master rewards, crashed
  gladiators, survival/placing, training scores), covered by `api/tests/unit/helpers/battle-results.test.js`
  with golden values from the old PHP code. Battles that count are judged by the engine simlog alone.
  A crashed gladiator is killed by the engine and marked `"crashed":1`; a ranked battle flags its version
  `broken` and removes it from matchmaking until it is saved again.
- **`banned_functions.json`**: forbidden C commands (`setPosition`, `setHp`, `setAp`, `lvlUp`, …), checked
  when gladiators are saved. The engine accepts them only in editor test battles (`Battle` with
  `sandbox: true`). Tournament battles use `noitems: true` (the runner appends `noitems` to
  `socket_compile.sh`, and the engine's `setSlots` drops every slot).
- **Version**: `api/version` is the engine version; gladiators saved on another one are `outdated`. Bump it
  in a release commit; `/update` (administrators) carries older gladiators forward and announces the
  release.
- **Mail**: `helpers/email.js` `sendMail(template, …)` fills `templates/mail/mail_<name>.html` and sends
  through `MAILER_*` SMTP; without `MAILER_USER` it only logs `mail_skipped`.
- **Scripts** (`api/scripts/`): `issue-session.js <userId>` (development sign-in cookie),
  `battle.js <id> <id> [--keep]` (a battle between any saved gladiators, for triage), `dev-tournament.js`,
  `remove-old-battles.js [--dry-run]` (cron) and `api-docs.js` (regenerates the reference).
- **Tests**: Vitest and supertest in `api/tests/unit/`; models are tested with a mocked `Mysql`.

## Web service

`web/app.js` declares every page with `page(route, view, clientVars)`. `middleware/render.js` adds
`res.page()`: the header, footer and analytics partials, the `{{#asset}}`/`{{#module}}` lambdas that
version files by mtime, the import map, and `{{{templateVars}}}` (the JSON the page script reads through
`helpers/template-var.js`). `view/*.html` are the pages, `public/` the static files.

- **Old addresses**: `helpers/urls.js` `legacyPageUrl` maps the old PHP addresses (with or without `.php`,
  and `/editor?g=`) to the current routes. The catch-all `/:page` redirect is registered after every page
  route, so a page that a legacy URL maps to must be registered before it.
- **Design system**: [DESIGN.md](DESIGN.md) is the direction; [docs/design-system.md](docs/design-system.md)
  is the contract. `public/css/tokens.css` holds the colours, fonts, radii, durations and layers with three
  themes (Arena light, Arena dark, Classic); every view includes the `head` partial, which loads the tokens,
  the blocking `script/theme-boot.js` and the primitives.
- **Themes**: masters choose `system`, `classic`, `arena-light` or `arena-dark` in the profile
  (`usuarios.site_theme`, `PUT /users/me` with `theme`), cached in `localStorage` `gladcode-theme` and
  applied before paint by `theme-boot.js`. `helpers/theme.js` applies it live and follows the system
  scheme while the choice is `system`.
- **Gladiator style**: `usuarios.glad_view` (`sprite|3d`, NULL for the 3D default) is cached in
  `localStorage` `gladcode-glad-view` and in the `gladview` cookie; `web/app.js` reads the cookie to render
  `<html data-glad-view>` on every page before its scripts run. `helpers/glad-view.js` is what the cards,
  the editor, the creator and the replay read.
- **`/play/:hash`**: the playback page loads `script/render2.js` and its stylesheet only when the server
  enables the 3D renderer (`ENABLE_RENDER2`), and every module comes from the import map, so browsers never
  mix cached and new modules. `script/playback.js` is the replay module (loading progress, spritesheets,
  controls, preferences, incremental simlog expansion) used by both renderers. The classic renderer and
  render2 share the replay through page globals; `playback.js` `exposeLegacyGlobals` publishes them on
  `window` in one place (`steps`, `timestep`, `pausesim`, `stepIncrement`, `hashes`, `newindex`, `uiVars`,
  `timeSlider`, `fullscreen` as accessors, plus `Playback`, `resize`, `changeCrowd`, `changeSoundIcon`,
  `getActionName`, `updateDetailedWindow`, `getSpriteThumb`, `images`); keep that list in step with what
  `render.js` and `render2/` read. The 3D renderer runs by default when WebGL2 is available; otherwise the
  classic Phaser renderer takes over (no player-facing renderer choice, query string or preference key).
- **`script/render.js`**: the classic Phaser.js 2D renderer and the replay's automatic fallback when WebGL2
  is missing or the 3D start fails; a classic (non-module) script that owns `prefs`, `game`, `music`,
  `json` and the other renderer globals, uses no jQuery and moves the timeline through
  `window.Playback.syncTimeline`.
- **Scripts**: `web/scripts/compress-functions.js` rebuilds `public/script/functions.json` and the sample
  bundles after the API reference changes.

## Runner service

`runner/app.js` is an Express server listening on port 3000 inside the compose network. It accepts
`POST /:dirname`, then `runner.js`:

1. copies `data/runs/<dirname>` (mounted at `/requests`) into the `gladcode_tmp_run` volume;
2. runs `docker run --rm gladcode2-vm sh socket_compile.sh`, appending `sandbox` only when the request
   body says `sandbox: true` and `noitems` when it says `noitems: true`;
3. enforces a 30-second timeout (`docker kill`), reads `errorc.txt` and `simlog`, and cleans up.

## C simulation engine

- `Payload/gladCodeServerMain.c` — server entrypoint: socket listener, one thread per gladiator, turn
  timeout, simlog writing.
- `Payload/gladCodeServerCore.c` — battle logic: damage, movement, turn loop, line of sight.
- `Payload/gladCodeAPI.c` / `gladCodeAPI.py` — the client-side library linked into gladiator code, turning
  API calls (`stepForward()`, `attack()`, …) into socket commands.
- `Payload/socket_compile.sh` — compiles user C (`gcc -o code0 code0.c -lm`) or Python and launches
  `gladCodeServerMain <nglad> [sandbox]`.

`tests/engine/engine_test.c` unit-tests the engine (Docker command in its header) and
`tests/engine/run.sh` runs real regression battles.

## Synty 3D assets

`web/public/assets/synty/<pack>/` holds the licensed Synty packs (gitignored; production mounts them into
the web container from the host). Before using an asset, read `docs/synty-assets/README.md` (units, scale,
pivots, material mapping, loader per pack), `docs/synty-assets/INDEX.md` and the pack's `.tsv` catalogue;
regenerate with `docs/synty-assets/build-catalog.mjs` after changing a pack. The piece viewer is
`/dev-tools/synty-viewer.html`.

## 3D replay renderer (`web/public/script/render2/`)

The invariants below are the ones that are easy to break; they were moved here from `AGENTS.md` so the agent rule book can link to this guide instead of duplicating it. Paths such as `render2/…` and `helpers/…` are under `web/public/script/`, and `res/audio/arena/` is under `web/public/`.

The 3D replay is a Three.js top-down renderer using Synty assets. The gladiator cards draw their portrait with `render2/card-portrait.js`; raise `PORTRAIT_VERSION` in `helpers/portrait-cache.js` whenever `render2/synty-outfit.js` or the pose changes how a portrait looks (the portrait cache keys on it). `renderer.js` is the frame loop and legacy facade; `fighter.js` holds movement/action/effect logic and drives the body model loaded by `synty-model.js` (`loadSynty` skins the Synty modular FBX parts from the gitignored `web/public/assets/synty/`, never commit them), dressed from the legacy LPC skin by `synty-outfit.js` (pure mapping, covered by `tests/render2/outfit.test.mjs`): every LPC item picks a Modular Heroes part (shirts, armour, legs, boots, gauntlets, shoulders, capes, hats/helmets, hair, beards, ears) whose atlas swatches are recoloured per part to the sampled sprite colours (`RECOLOR_SHADER`: eight cloth/leather/metal swatches, hair swatch, skin ratio; the atlases load with three's default `flipY`), Dungeon Realms head props (bandana, afro, pigtails, mohawk, wild and very long hair) hang on the `Head` bone, the `skeleton` body is the Dungeon Realms skeleton bound to the same rig, and weapons, bows and shields come from the Dungeon, Dungeon Realms, Goblin War Camp, Viking Realm and bow packs (`WEAPON_MODELS`, `SHIELD_MODELS`; the shield rides the left forearm and hides while shooting); only the gear the fighters wear is loaded and plays the real Synty clips (`base-locomotion` walk/run/sprint/strafe/back/idle/turn-in-place (the fighter turns at a fixed rate while standing and the 90/180 turn clip follows the angle covered), `sword-combat` attacks/block/hit/stun/death) through an `AnimationMixer` with per-frame weights and times (seek-safe): the clips drive a clean animation skeleton and each bone's world-rotation change from its T-pose is retargeted onto the hero skeleton (the two use different bone axes), weapons sit on the hand at the clips' `Prop_R/L` socket frame, the hit reaction is layered after retargeting (torso/head fully, arms only when no action uses them, legs keep the locomotion), a stunned fighter plays the stun loop with a dizzy wobble layered on top, a hit reaction blends the four directional Synty clips so the body is driven away from the blow (`HIT_SIDES`; the clips are named for where the body goes, so a blow from ahead plays `A_Hit_B`; `Fighter#hit(from)` takes the attacker, close-shot archer or the projectile's path), a fireball flies on from the orb grown between the caster's hands (`Fighter#castOrb`, eased onto the engine path like the nocked arrow) and the orb vanishes the moment it is launched (`#dizzy`: torso, neck and head circling on staggered phases, hips swaying; five star sprites (`Fighter#animateStars`) circle on a tilted golden ring placed on the head bone, burst outward and fade when the stun ends while the head shakes it off (`#shakeOff`); the onset flashes white at the head with a golden shockwave ring, sparks and an ATORDOADO label, `effects.js` `#onStun`), fighters in the poison gas get a throbbing green emissive tint like the burning red one (`Fighter#poisoned`, set by the renderer from the safe radius), burning fighters also blaze with small `fire.js` fires on their hips, chest, shoulders and head that follow the posed bones, catch in a quarter second and die down when the burn ends (`effects.js` `#updateBurning`, `BODY_FLAMES`; hidden while invisible), assassinate is a bow shot (the engine fires it as a projectile): the `assassinate` spec is the archery shot aimed a beat longer, with a red nocked and flying arrow, a blood sigil and red embers on the draw, a red flash on release and a blood spray and splatter on impact (`effects.js`), attachment bones that sit under a same-named twin in the hero FBX (cape chain, shoulder pads) are parented above the twin so capes hang from the shoulders, and the long cape's chain (`CAPE_BONES`) sways on the CPU (`SyntyModel#capeSway`, for every fighter whatever it carries: reset to rest each frame, each bone bent behind the fighter by its speed with a soft travelling flutter; the tattered cape has no chain and stays rigid) (back attachments 01-12 are capes: `cape_*` uses 03, `tattercape_*` 02), a teleport holds the fighter at the origin for a moment while both portals and a spark link light together, archery (no Synty bow clip) is solved with two-bone IK in world space (torso side-on, bow arm toward the target at eye level, draw hand from the bow to the jaw-side anchor (beside the head, never through it) and back on release, an arrow laid on the string from the nock to past the bow with the string's `bowString` bone riding in the fingers (the bow stays a skinned mesh, cloned per fighter with `SkeletonUtils`), the bow stood upright with its string side (FBX -Z) toward the archer, the string released and the nocked arrow hidden the moment the engine spawns the projectile, whose flying arrow eases from the nocked arrow's pose onto the engine path (`effects.js` `#blendLaunch`), and carried at the side with the top limb tipped forward between shots), pole weapons (`POLE_WEAPONS`: spears, trident, staff) thrust two-handed (no Synty clip holds a spear: the sword stab clip carries the body's lunge while `SyntyModel#thrustPole` puts both hands on a level shaft along the facing, drawing back on the wind-up and driving out at contact, and turns the weapon onto that line from its measured tip axis, `#poleAxis`), and spell/potion/teleport (no clip) keep the `motion.js` pose layered on the upper body;

`palette.js` maps skin tokens to colours; `arena.js`, `effects.js`, `camera-controller.js`, `hud.js`, `audio-manager.js` and `battle-state.js` cover the arena, VFX, camera (mouse: left-drag pans, right-drag or Shift-drag rotates 360°, the wheel zooms; touch (`touch-gestures.js` `TouchGestures`, pure, covered by `tests/render2/touch.test.mjs`): one finger rotates like a right drag, two fingers pan, pinch zooms toward the fingers and twist turns the overview, the finger left after a pinch stays still; a click or tap that never dragged picks the gladiator whose on-screen body is nearest (`renderer.js` `#handleTap`, `TAP_REACH`) or, on touch, shows or hides the controls; a portrait screen pulls the overview back so the combat square fits across (`PORTRAIT_FIT_*`); an inspected gladiator is framed in one of `INSPECT_MODES`: `fixed` overview, `follow` third person behind it with the wheel setting the distance, `first` through its eyes, cycled with C; `cinematic` circles the victor; a hidden ghost camera, toggled by holding C for 10 s and undocumented in the UI on purpose, flies free over every mode with WASD/arrows, Q/E down and up, Shift faster, any drag to look and Esc to land), canvas-drawn HUD (roster panel with click-to-inspect, hidden with M; below `COMPACT_WIDTH`/`COMPACT_HEIGHT` it switches to compact phone plaques (portrait, name, HP, AP, buffs) in two columns on a narrow screen, and every HUD piece keeps to the safe-area insets read through a probe (`BattleHud#insets`; `renderer.js` adds `viewport-fit=cover`, `playback-render2.css` sizes `#frame` to `100dvh` so the bar never hides under a phone toolbar), name/vitals cards, speech, floating text as sprites in a second pixel-aligned scene), sound and simlog event derivation.

Sound runs on Web Audio (`audio-manager.js` `BattleAudioManager`): every file is decoded once, its leading silence skipped and its loudness normalised on decode (`measureSound`), so `SOUNDS` levels are pure mix intent; one-shots are placed in 3D around a listener hovering over the camera's ground focus (panning turns with the camera), pick a variant (never the same twice), detune and vary in gain, cap their overlapping voices and thin out when fast-forwarding; buses for music (ducked under explosions, deaths and level-ups), effects (cut while paused) and ambience (muffled while paused) meet in a limiter, and the effects slider drives effects and ambience. Melee blows land with a flesh hit weighted by the damage or a metal clang on a raised guard, arrows thunk into bodies or into the sand and clatter when they fall off, bodies thud after death, stuns and potions (by kind, `potionSound`) play the classic sounds (`battle-state.js` emits a `stun` event on its onset), and a fighter in the poison gas coughs (a `cough` event on stepping in, then every `COUGH_INTERVAL` seconds on its own beat; CC0 recordings pitched up for women) with green puffs from the mouth. `music.js` `MusicDirector` keeps the legacy track API for `playback.js` (volume 0 to 0.1) and cross-fades from the tribal battle music to the tense climax (a duel below 40% HP or the gas closing), starting on the first gesture if autoplay was refused. `soundscape.js` is the ambience: a crowd bed and chatter that rises with excitement (random-offset cross-faded grains), soft and strong cheers on the moments that rouse the crowd, a chant for the last one standing, synthesised fire crackle at braziers, torches and burning fighters (`crackleSamples`, seeded and seamless), a gas hiss that grows as the safe circle closes and a breath of wind. New arena sounds live in `res/audio/arena/` (Kenney CC0 impacts, OpenGameArt CC0 weapon clashes and coughs, Gregor Quendel CC BY 4.0 crowd; credits in `CREDITS.md` there, keep the credit). `tests/render2/audio.test.mjs` covers the pure parts.

Every battle animation runs on the fight's clock (`gameDt`: real time times the replay speed, zero while paused): fighters, Synty clips, sparks, rings, glyphs, blasts, trails, slashes, burning flames and floating combat text; the arena ambience (braziers, crowd, gas, clouds) runs on its own clock that stops while paused and follows the replay speed up to `AMBIENCE_MAX_RATE`, and only the camera and HUD controls use real time. Paused, the scene fades to a moderate grey (`renderer.js` `#renderGrey`: rendered off screen and desaturated on a full-screen pass only while paused or fading, the HUD drawn after in colour). `playback.js` `startTimer` clears any running timer and reads the shared `steps` (a timer started during loading used to pin the replay at its first frame). Timing: each shared-timer frame starts a short interpolation segment from the fighters' current pose; seeks and paused stepping snap. The engine writes its last frames at one simtime and the killing blow can come in a later one, so `renderer.update` skips a repeated frame only when no gladiator's hp, action or level changed (`battle-state.js` `isSameMoment`; the roster plaque also redraws on the alive flag, not only the rounded hp). The last one standing celebrates (`Fighter#setVictor`, crowned by the renderer when exactly one of several gladiators is alive, uncrowned by a rewind): `VICTORY_DELAY` after the final death and then every `VICTORY_CYCLE` it turns to salute a side of the stands (the imperial box first, `VICTORY_SALUTES`), twirls its sword (`A_Idle_Flourish01_Sword`; archers skip it) and raises its weapon high while pumping the other fist, chest out and looking up (`SyntyModel#celebrate`, world-space arm IK in arm lengths), and the crowd rises and cheers each round (`renderer.js` `#cheerVictor`); its buffs and debuffs wear off as it starts (`Fighter#buffs` is empty while celebrating, so flames douse, stars burst, the barrier and invisibility fade). As the celebration begins the camera films the victor in a slow circle, centred on the body and close enough that it fills the laurel ring (height measured from the head bone) (`BattleCameraController#cinematic`, a drag hands it back), golden laurels with the name and master on a ribbon frame it for a few seconds (`PlaybackControls#showVictory`, the overhead cards make way) and the gas clears outward from the safe circle (`#clearGas`); a battle with no survivor shows EMPATE (`battleEnded`, called by playback.js at the last frame instead of the classic victory modal). Actions are paced by the engine (`motion.js` `engineTiming`/`warpedTime`): the engine reports an action id on one step, resolves it after `0.5/as` (attacks) or `0.5/cs` (abilities) and reports "waiting" (9) for the rest of the cycle, so the animation clock is warped to put `contact` on that resolve step (slow fighters hold guard before the wind-up, fast ones shorten it) and to finish the follow-through within the cycle; "waiting" never cancels a running action, each new report restarts it, a block lowers after its cycle, and damage only flinches a victim when it arrives at an attacker's contact (burn/poison ticks just show their number). A fighter hit mid-swing only rocks its torso. Gait phase follows travelled distance, and swings run on a game clock (replay speed scaled, frozen while paused) with damage effects delayed to the swing's contact time. `palette.js` samples the real skin sprite colours (`renderer.prepare()`); Effects use the Synty particle textures (`effects.js` `FX_TEXTURES`: sparkle flares, the block barrier in `fighter.js` (an energy dome around the fighter: fresnel rim, the hexagon texture tiled as a drifting lattice, the barrier strongest ahead of the fighter and fading to a faint minimum at the back, its ground ring an arc round the front only; a ripple from the front when a blow lands, a glowing ground ring), portal vortex and ritual circles for teleport, bubbles for potions). Teleports hold the fighter ~0.5 s while ritual circles light source and target together; speed smoothing (0.3 s) turns walk-stop-walk into a slower continuous walk.

`hud.js` composes the whole HUD on canvas from the Synty `fantasy-warrior-hud` sprites (`ART`: 9-sliced gold frames, 3-sliced crystal bars tinted by multiply so bevels keep their light, gem level badge, octagon portrait ring, icons on their underlays; plain shapes stand in while loading or without the pack) with Cinzel titles: roster plaques (team-coloured 3D head shot rendered once by `portrait.js` and converted to sRGB, flat canvas face as fallback; HP/AP/XP gauges, attributes, active buffs), overhead cards that lift apart when they overlap, parchment speech/breakpoint bubbles and gradient combat text; the 3D replay has no DOM controls: `hud-controls.js` `PlaybackControls` draws the control bar (timeline scrubber, settings, fullscreen, step back/forward that always pause first, play/pause, speed −/+ through 0.1× to 10× with a coloured rate and pips, inspect camera mode, sound, share link, shortcuts), a top badge (PAUSADO, or the rate when not 1×) and toasts, the FPS counter (F), the shortcuts window (H) and the inspect window (opens minimized; HP/AP, stats, buffs, items, last commands) on the HUD scene from the same Synty sprites and Font Awesome glyphs, owns the 3D keyboard shortcuts (render.js steps aside), and drives playback through `window.Playback` (playback.js: `setPaused`, `step`, `setSpeed`, `seek`, `toggleSound`, ...); only the settings window is still DOM, and `playback-render2.css` hides the classic bar, FPS and details elements; leaving the browser window or hiding the page (`visibilitychange`, a phone switching apps) pauses, clicks inside never do; the control bar has a one-row `wide` and a two-row `compact` layout (`BAR_LAYOUTS`, larger targets, picked by width), follows the last kind of press (`BattleHud#touch`: on touch no hover tips, pressed buttons light, a taller scrub grip, the bar fades after `CHROME_IDLE_SECONDS` while playing, the share button opens the native share sheet, the shortcuts window shows the gestures), leaves out fullscreen where the browser cannot (iPhone), and the badge, toasts and FPS drop below a roster that reaches across the top; fireball impacts set off a particle explosion (`blast.js`: white flash and a short point light, low-poly fire shards thrown out that slow, rise and cool from white to soot, a dark rolling smoke column, sparks and grit under gravity; four draw calls) and leave scorch marks; an arrow that hits a gladiator (the nearest one, not the archer, within `ARROW_HIT_REACH` of where the engine dropped it) (drawn at `ARROW_SCALE` 0.72, like the nocked one) glides along its line to where it meets the posed body (`SyntyModel#bodyHit`: a raycast on the skinned body meshes, bounds refreshed per call, returning the point and the bone that skins the struck triangle), sinks its whole head in (`ARROW_SINK`) and is bound to that bone so it follows the animation, then after ~2 s drops off, falls flat on the sand and fades (`#stickArrow`); an arrow that misses is planted in the sand where the engine dropped it, tip down at a slant along its flight, quivers and fades after `ARROW_PLANT_SECONDS` (`#plantArrow`); at point-blank range the engine resolves an arrow within one step so no frame holds it, and a hit on a gladiator that an archer within `CLOSE_SHOT_REACH` is facing with a drawn, unreleased bow (`Fighter#shotPending`) looses an arrow from the bow into the body (`#closeShooter`, `#closeShot`); melee blows leave a cut over a bruise where the blow meets the body, bound to the struck bone, for ~2 s (`Fighter#wound`); a charge that connects turns into a quick sword swing whose contact the blow waits for (`Fighter#chargeStrike`), since the engine deals the charge damage on arrival without reporting an attack; sparks, smoke, rings and floor glyphs (ritual circle, ground crack) are pooled billboards/planes textured with `special-effects/Textures` (canvas stand-ins if the pack is missing). The floor relief is seeded (`arena.js`: `terrainHeight()` and `wetness()` share one noise field, fighters follow the relief; the floor shows plain sand until the Synty terrain loads). `synty-floor.js` re-dresses that floor with the Meadow Forest pack (`assets/synty/meadow-forest`, gitignored): a splat shader on a Lambert material blends its terrain textures and normal maps (packed sand base, cracked dirt, pebbles, churned mud in the `wetness` dips, gravel against the podium wall) by a baked RGBA mask, each layer sampled at two rotated scales against tiling, plus a few instanced rocks between the curb and the wall; the plain sand stays if the pack is missing.

`arena.js` `applySynty()` adds the coliseum from `synty-coliseum.js`, built from Ancient Empire pieces loaded by `synty-arena.js` (FBX in cm with authored pivots kept, materials mapped by their FBX names in `MATERIAL_TEXTURES`, multi-material groups merged, everything instanced): `Amphitheatre_End` strips and paired 45° `Amphitheatre` wedges (pivot = circle centre) form a rounded-square bowl lifted on a stucco podium wall (a second copy underneath closes the hollow), east/west gates built like a real amphitheatre's (a dungeon-pack stone round arch in the podium wall, a portcullis, a short dark tunnel under the stands that run on over it, wall torches with small flames; `dungeon:` entries in `PIECES` load the dungeon pack in metres on its atlas), an imperial box on the north stands (marble stair up to a dais over the treads, throne with a red runner between two couches, four fluted columns, architrave and pediment, back wall, purple banners, incense burners; the leader sits on `SyntyColiseum#throne`, his guards on `royal` posts, and `HONOUR_BOX` keeps spectators out), the stands pulled in to `STANDS` 8.75 so the podium wall stands 2.5 m from the curb (gates take three strips: the arch plus wall fillers), eight smaller braziers on the sand in the corner bends (`#braziers`, `BRAZIER_*`: below the front rows' line of sight, clear of the wall and of the combat square), outer gate arches where the roads reach the outer wall, a marble column-and-beam portico crowns the rim, a stone curb marks the 25 m combat square, with lions, statues, banners and weapon racks; the sand floor extends to the podium (`PODIUM`). Beyond the walls `synty-landscape.js` (layout in `landscape-layout.js`, pure and seeded: `landHeight`, `roadDistance`, `footprintDistance`, `planLandscape`; covered by `tests/render2/landscape.test.mjs`) lays out the countryside, loaded after the coliseum and optional: a polar terrain mesh level round the building and rising into hills toward the horizon, its Meadow Forest grass, dry grass and dirt blended by a baked mix while the paved plaza and the cobbled roads (east-west through the gates, north-south past the honour box, winding once in the hills) are traced exactly in the fragment shader (`ROAD_GLSL` must stay in step with `roadOffset`), cypress avenues and a cypress ring round the plaza, fields of straw and crop rows with fences, orchards and wooded hills (only the light tree models past 260 m), carts and a well, farmsteads and a Roman hill town with its temple to the north assembled from Ancient Empire modular pieces (`housePieces`: stucco and window walls on the 2.5 m grid with a door in front, a wall course below ground, `Roof_Base_Peak` tiles turned so the ridge runs along the house, stucco tinted per house through instance colour (`STUCCO_TINTS`); `templePieces`: podium, peristyle, cella, entablature and tiled roof; building textures mapped by FBX material name in `BUILDING_TEXTURES`), POLYGON Mini Fantasy background ranges kept low round the horizon (`MOUNTAINS`), and Synty cloud rings drifting high round the horizon; Ancient Empire pieces load through `synty-arena.js` `loadSyntyKit(THREE, pieces, extraTextures)` (`dungeon:` and `mini:` prefixes for the dungeon and Mini Fantasy packs; placements may carry a `color` tint). `sky.js` is the daylight dome (zenith blue to the `HAZE` horizon, sun disc and glow where the sun light shines from) and the scene fog fades the far hills into the same haze (`FOG_NEAR`/`FOG_FAR`). `renderer.js` `setDebugView({ position, target })` pins the camera anywhere for automated checks, and `getDebugSnapshot().render` reports the scene's draw calls and triangles. `tests/render2/coliseum.test.mjs` keeps the layout off the combat square.

The crowd (`synty-crowd.js`, layout in `crowd-layout.js`, loaded after the coliseum and optional) uses the Ancient Empire characters dressed with random hair/beards/helmets/laurels: each type is retargeted from the Synty clips (idle, jump, walk, sheathed-sword idle) with procedural sitting legs and arm IK (clap, fist, wave, pump, arms up), CPU-skinned and baked into a half-float vertex animation texture, then drawn as instanced meshes whose shader reads the frame (`crowdClip`: row, frames, phase, rate). Every build places a fresh random crowd of up to `MAX_SPECTATORS` (800 of the ~4,900 seats; clusters of friends, the front rows filling first and the honour side favoured, heights varied by ±7%), each spectator turning up to `LOOK_LIMIT` off its bench facing to follow the middle of the living fighters (`SyntyCrowd#setFocus`, fed every frame by the renderer), guards only on the structure (gate tops from `SyntyColiseum#posts`, the free front tread, the walkway corners, the honour box), patrols on the front tread and the walkway, benches stopping short of each strip's staircase aisle, motion switches cross-faded in the shader (`crowdFrom`/`crowdSwitch`), and the leader in the honour box; `react()` stands spectators up on deaths, heavy blows and level-ups (a share of `0.05 + 0.65 * intensity²`, so a death raises most of them and a blow only the keenest), the settings crowd slider sets the density, and the gas plane is scaled to the podium; the gas starts exactly at the engine's safe radius (distance from the arena centre, `poison`) with a bright rim on that circle, and `gas.js` adds billowing low-poly poison clouds over the poisoned ground, born only outside the safe radius by their own size and dissolving as they drift toward it. `tests/render2/crowd.test.mjs` covers the layout.

Coliseum materials dither out (screen-door discard in `synty-arena.js` `seeThrough`) wherever they stand between the camera and the combat square or right in front of the lens, and the camera pitch stops above the stands. Fires (braziers, gate torches in sconces on the wall face, incense) are `fire.js`: instanced camera-facing particles (`particles.js` `ParticleLayer`, shared with blasts and gas; its `seeThrough` option fades fires that stand between the camera and the combat square) in three draw calls, low-poly flame shards from the particle pack that rise, taper and cool from yellow to red, a breathing glow, smoke and embers; `noise.js` holds the shared seeded noise.

Performance: `quality.js` picks a graphics tier per device (`high`/`medium`/`low`: resolution cap, MSAA, crowd share, scenery, floor bake size; phones and small machines start lower; the player can override it in the settings window, stored per device in `localStorage`), and `renderer.js` adapts every 0.7 s: when frames run long it first lowers resolution to 1× if the GPU is the bottleneck, then sheds detail (crowd thinned to 35%, then the scenery hidden via `Arena#setScenery`), then goes below 1×; it decides by the share of the frame its own main-thread work takes (`frame-profiler.js`; the GPU timer query is reported but not trusted, it is emulated on macOS), ignores windows with loading hitches and sheds nothing in the first 12 s.

One-time work never lands in the fight: the loading screen stays up until the arena is complete (`Arena#ready`: crowd, floor bake and countryside, at most `WARM_UP_TIMEOUT_MS`), then `#warmUp` compiles every shader in parallel (`compileAsync`, pooled effects shown for it via `BattleEffects#setPoolsVisible`) and draws a frame so every texture is uploaded before `#reveal`; large textures load through `textures.js` `loadTexture` (decoded and flipped into an `ImageBitmap` off the main thread, so the upload is a copy; the Ancient Empire atlases are shared between the coliseum and countryside kits, flagged `userData.shared`, never disposed by a kit, released by `disposeSharedTextures`).

Keep the per-frame cost down: the arena floor's terrain splat is baked once into an albedo and a normal map (`synty-floor.js` `bakedMaterial`; the live 20-texture splat was most of the GPU time on Retina screens), the sky draws last at the far plane, static groups are frozen (`freeze` in `arena.js`, `matrixWorldAutoUpdate = false`), the crowd follows the fight at 10 Hz, and Web Audio parameters move through `audio-param.js` `glide` (skips unchanged targets; automation calls every frame were a fifth of the main thread) with the listener at 20 Hz and ambience levels at 10 Hz. `getDebugSnapshot()` reports `timings` (per-section CPU ms, tier, resolution, shed state) and `render` (draw calls, triangles); `setDebugPixelRatio(ratio)` pins the resolution, `setDebugHud(false)` drops the HUD pass for clean captures (how the front page clip `image/home/arena-3d.mp4` and the fighter stills beside it were filmed from a real replay) and `setDebugVisible(name, visible)` hides a named scene part (`synty-crowd`, `synty-landscape`, `synty-scenery`, `synty-coliseum`, `arena-floor`, `fires`, `sky`, ...) to measure what it costs.

Materials that flip `transparent` at runtime (invisibility) must set `needsUpdate`, since three compiles an OPAQUE variant.

Weapons map per family (`palette.js` `MELEE_KINDS`/`BOW_KINDS`; weapon-pack `oversize_8..27` are five materials in four sizes) to swing specs (`MELEE_STYLES` in `motion.js`) and, per exact token, to Synty models (`synty-outfit.js` `meleeModel`/`bowModel`/`shieldModel`); combat guard stances, strafing and back-pedal gaits live in `motion.js`/`fighter.js`.

`creator-stage.js` `CreatorStage` is the gladiator creator's turntable: one renderer for the creator's lifetime, the battle's own `Fighter` built through `synty-model.js` `SyntyLibrary` (which keeps what it loaded and fetches only what a new outfit adds; `loadSynty` is one `prepare` of it), pure `creator-view.js` (turn, zoom, and a framing that keeps the gladiator and its ring inside the band the creator's controls leave free, `viewInsets`) and `creator-motion.js` (each creator animation as the battle action that does it: walk in place, fireball cast, the weapon's melee swing, bow shot), covered by `tests/render2/creator.test.mjs`; `SyntyModel#dispose` also releases the skeletons (bone textures) the model made, and `tests/render2/synty-library.test.mjs` runs the real library and model on the `three` dev dependency with the FBX and image loads stubbed (`fixtures/synty-fbx.mjs`). Unit tests live in `tests/render2/`.

## Configuration

Every setting comes from the environment (`.env`, passed through `compose.yaml`); there are no config
files. `.env.example` lists them: `NODE_ENV`, `MYSQL_DATABASE`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PORT`,
`RUNNER_PORT`, `ENABLE_RENDER2`, `MAINTENANCE`, `MAILER_*`, `WEB_URL`/`WEB_PORT`, `API_URL`/`API_PORT`,
`WEB_PUBLISH`/`API_PUBLISH`, `JWT_SECRET` (at least 32 random characters in production),
`SESSION_TTL_DAYS`, `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `TRUST_PROXY`, `RUNNER_CONCURRENCY`. The compose
file also passes `PROFPICS_DIR`, `LOGS_DIR`, `RUNS_DIR`, `PAYLOAD_DIR` and `RUNNER_URL` to the API (and
`PROFPICS_DIR` to the web service) with their container paths as defaults.

`data/` on the host keeps `logs/`, `runs/` and `profpics/`; `dev-tools/dump_restore.sh` dumps and restores
the development database.

## Documentation map

Start at [INDEX.md](INDEX.md). The agent rule book is [AGENTS.md](AGENTS.md), the validation commands are
in [TESTING.md](TESTING.md), the design direction and contract are [DESIGN.md](DESIGN.md) and
[docs/design-system.md](docs/design-system.md), the Painel target is [docs/design/painel/](docs/design/painel/README.md)
and the frontend conventions are [docs/frontend/](docs/frontend/README.md).

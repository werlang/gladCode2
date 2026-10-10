# AI Agent & Developer Guidelines (`AGENTS.md`)

This document serves as the authoritative guide for AI coding agents (Antigravity, Gemini, GitHub Copilot) and developers modifying or extending the **gladCode 2** repository.

---

## ⛔ CRITICAL EXECUTION RULES

> [!CAUTION]
> **NO LOCAL PYTHON OR NODE ON HOST ENVIRONMENT**
> The host machine does **not** have Python or Node.js installed natively.
> - **NEVER** run commands like `npm run dev`, `node server.js`, `python3 script.py`, or `pip install` directly on the host shell.
> - **ALWAYS** execute Node, Python, C compilation, database operations, or shell scripts via **Docker** / **Docker Compose** containers:
>   - Web & Dev Tools: `docker compose exec apache bash`
>   - Node WebSocket / Runner: `docker compose exec runner bash`
>   - MySQL: `docker compose exec mysql mysql -u root -p`
>   - Container control: `docker compose up -d`, `docker compose restart <service>`

---

## 🏛️ System Architecture

gladCode 2 is structured into four primary components coordinated by Docker Compose:

```
[Apache/PHP Frontend] ──> [MySQL 8.0 Database] <── [Node.js WebSocket Server]
       │
       ▼ (HTTP POST /:dirname)
[Runner Express Service] ──> [Docker-in-Docker Container (gladcode2-vm)]
                                   │
                                   ▼
                       [C Engine (gladCodeServerMain)]
                                ├── code0.c (Gladiator 1)
                                └── code1.c (Gladiator 2)
```

---

## 📂 Subsystem Breakdown & Key Files

### 1. PHP Frontend (`public_html/`)
- **`connection.php`**: Database singleton loading credentials from `config.json`. Exposes `runQuery($sql, $data = null)`. Uses PDO with strict error mode.
- **`back_simulation.php`**: Main simulation orchestrator (750+ lines). Handles setup of temporary run folders (`public_html/runs/{hash}/`), security function checks, file copying, invoking the Runner API, and returning JSON responses.
- **`back_tournament.php` / `back_train.php`**: Handlers for tournaments and practice sessions.
- **`playback.php` / `script/playback.js`**: `playback.php` versions every `script/render2/*.js` module through the import map (`?v=` file mtime), so browsers never mix cached and new modules (the server sends no cache headers); Shared replay entrypoint, controls, preferences, and incremental simlog expansion used by both battle renderers.
- **`script/render.js`**: Classic Phaser.js 2D battle renderer.
- **`script/render2.js` / `script/render2/`**: Selectable Three.js top-down 3D renderer, Synty by default (`?models=procedural` gives the asset-free primitive rig). `renderer.js` is the frame loop and legacy facade; `fighter.js` holds movement/action/effect logic and delegates the body to a swappable model module chosen by `models.js` (`?models=synty|procedural`, or localStorage `gladcode.render2.models`; default `synty`, falls back to `procedural` if loading fails): `procedural-model.js` builds the primitive-mesh rig, `synty-model.js` skins the Synty modular FBX parts (from the gitignored `public_html/assets/synty/`, never commit them) and plays the real Synty clips (`base-locomotion` walk/run/sprint/strafe/back/idle/turn-in-place (the fighter turns at a fixed rate while standing and the 90/180 turn clip follows the angle covered), `sword-combat` attacks/block/hit/stun/death) through an `AnimationMixer` with per-frame weights and times (seek-safe): the clips drive a clean animation skeleton and each bone's world-rotation change from its T-pose is retargeted onto the hero skeleton (the two use different bone axes), weapons sit on the hand at the clips' `Prop_R/L` socket frame, the hit reaction is layered after retargeting (torso/head fully, arms only when no action uses them, legs keep the locomotion), a teleport holds the fighter at the origin for a moment while both portals and a spark link light together, archery (no Synty bow clip) is solved with two-bone IK in world space (torso side-on, bow arm toward the target at eye level, draw hand from the bow to the jaw-side anchor (beside the head, never through it) and back on release, an arrow laid on the string from the nock to past the bow with the string's `bowString` bone riding in the fingers (the bow stays a skinned mesh, cloned per fighter with `SkeletonUtils`), the bow stood upright with its string side (FBX -Z) toward the archer, the string released and the nocked arrow hidden the moment the engine spawns the projectile, whose flying arrow eases from the nocked arrow's pose onto the engine path (`effects.js` `#blendLaunch`), and carried at the side with the top limb tipped forward between shots), and spell/potion/teleport (no clip) keep the `motion.js` pose layered on the upper body; the procedural model poses everything from `motion.js` (pure pose math: gait, keyframed actions, foot grounding) (pure pose math: gait, keyframed actions, foot grounding); `palette.js` maps skin tokens to colours; `arena.js`, `effects.js`, `camera-controller.js`, `hud.js`, `audio-manager.js` and `battle-state.js` cover the arena, VFX, camera (left-drag pans, right-drag or Shift-drag or Q/E rotates 360°), canvas-drawn HUD (roster panel with click-to-follow that delegates to the hidden `.ui-glad` DOM, name/vitals cards, speech, floating text as sprites in a second pixel-aligned scene), sound and simlog event derivation. Timing: each shared-timer frame starts a short interpolation segment from the fighters' current pose; seeks and paused stepping snap. Actions are paced by the engine (`motion.js` `engineTiming`/`warpedTime`): the engine reports an action id on one step, resolves it after `0.5/as` (attacks) or `0.5/cs` (abilities) and reports "waiting" (9) for the rest of the cycle, so the animation clock is warped to put `contact` on that resolve step (slow fighters hold guard before the wind-up, fast ones shorten it) and to finish the follow-through within the cycle; "waiting" never cancels a running action, each new report restarts it, a block lowers after its cycle, and damage only flinches a victim when it arrives at an attacker's contact (burn/poison ticks just show their number). A fighter hit mid-swing only rocks its torso. Gait phase follows travelled distance, and swings run on a game clock (replay speed scaled, frozen while paused) with damage effects delayed to the swing's contact time. `palette.js` samples the real skin sprite colours (`renderer.prepare()`); Effects use the Synty particle textures (`effects.js` `FX_TEXTURES`: sparkle flares, flame wisps over the fireball blast, hexagon block shield in `fighter.js`, portal vortex and ritual circles for teleport, bubbles for potions). Teleports hold the fighter ~0.5 s while ritual circles light source and target together; speed smoothing (0.3 s) turns walk-stop-walk into a slower continuous walk. `hud.js` composes the whole HUD on canvas from the Synty `fantasy-warrior-hud` sprites (`ART`: 9-sliced gold frames, 3-sliced crystal bars tinted by multiply so bevels keep their light, gem level badge, octagon portrait ring, icons on their underlays; plain shapes stand in while loading or without the pack) with Cinzel titles: roster plaques (team-coloured 3D head shot rendered once by `portrait.js` and converted to sRGB, flat canvas face as procedural fallback; HP/AP/XP gauges, attributes, active buffs), overhead cards that lift apart when they overlap, parchment speech/breakpoint bubbles and gradient combat text; `playback-render2.css` frames the control bar and details window with the same sprites, and the renderer refreshes the details window each frame; fireball impacts spawn a pooled 3D blast (`effects.js`); sparks, smoke, rings and floor glyphs (ritual circle, ground crack) are pooled billboards/planes textured with `special-effects/Textures` (canvas stand-ins if the pack is missing). The floor is fully procedural and seeded (`arena.js`: noise-driven soil, mud, debris, bump/gloss maps; `terrainHeight()` and `wetness()` share one field, fighters follow the relief). With the Synty set, `synty-floor.js` re-dresses that floor with the Meadow Forest pack (`assets/synty/meadow-forest`, gitignored): a splat shader on a Lambert material blends its terrain textures and normal maps (packed sand base, cracked dirt, pebbles, churned mud in the `wetness` dips, gravel against the podium wall) by a baked RGBA mask, each layer sampled at two rotated scales against tiling, plus a few instanced rocks between the curb and the wall; the procedural soil stays if the pack is missing. When Synty models are active, `arena.js` `applySynty()` hides the whole procedural enclosure and adds the coliseum from `synty-coliseum.js`, built only from Ancient Empire pieces loaded by `synty-arena.js` (FBX in cm with authored pivots kept, materials mapped by their FBX names in `MATERIAL_TEXTURES`, multi-material groups merged, everything instanced): `Amphitheatre_End` strips and paired 45° `Amphitheatre` wedges (pivot = circle centre) form a rounded-square bowl lifted on a stucco podium wall (a second copy underneath closes the hollow), east/west gates built like a real amphitheatre's (a dungeon-pack stone round arch in the podium wall, a portcullis, a short dark tunnel under the stands that run on over it, wall torches with small flames; `dungeon:` entries in `PIECES` load the dungeon pack in metres on its atlas), an imperial box on the north stands (marble stair up to a dais over the treads, throne with a red runner between two couches, four fluted columns, architrave and pediment, back wall, purple banners, incense burners; the leader sits on `SyntyColiseum#throne`, his guards on `royal` posts, and `HONOUR_BOX` keeps spectators out), the stands pulled in to `STANDS` 8.75 so the podium wall stands 2.5 m from the curb (gates take three strips: the arch plus wall fillers), braziers on the podium cap at the corners, a marble column-and-beam portico crowns the rim, a stone curb marks the 25 m combat square, with golden braziers, lions, statues, banners and weapon racks; the sand floor extends to the podium (`PODIUM`). `tests/render2/coliseum.test.mjs` keeps the layout off the combat square. The crowd (`synty-crowd.js`, layout in `crowd-layout.js`, loaded after the coliseum and optional) uses the Ancient Empire characters dressed with random hair/beards/helmets/laurels: each type is retargeted from the Synty clips (idle, jump, walk, sheathed-sword idle) with procedural sitting legs and arm IK (clap, fist, wave, pump, arms up), CPU-skinned and baked into a half-float vertex animation texture, then drawn as instanced meshes whose shader reads the frame (`crowdClip`: row, frames, phase, rate). Every build places a fresh random crowd (clusters of friends, denser low and on the honour side), guards only on the structure (gate tops from `SyntyColiseum#posts`, the free front tread, the walkway corners, the honour box), patrols on the front tread and the walkway, benches stopping short of each strip's staircase aisle, motion switches cross-faded in the shader (`crowdFrom`/`crowdSwitch`), and the leader in the honour box; `react()` stands spectators up on deaths, heavy blows and level-ups, the settings crowd slider sets the density, and the gas plane is scaled to the podium when the coliseum is shown; the gas starts exactly at the engine's safe radius (distance from the arena centre, `poison`) with a bright rim on that circle. `tests/render2/crowd.test.mjs` covers the layout. Coliseum materials dither out (screen-door discard in `synty-arena.js` `seeThrough`) wherever they stand between the camera and the combat square or right in front of the lens, and the camera pitch stops above the stands. Fires (braziers, gate torches, incense) are `fire.js`: instanced camera-facing particles in three draw calls, low-poly flame shards from the particle pack that rise, taper and cool from yellow to red, a breathing glow, smoke and embers. `enclosure.js` is the procedural fallback (seeded stone walls, battlements, braziers, banners and instanced crowd); `noise.js` holds the shared seeded noise. `renderer.js` adapts the pixel ratio to keep frames near 60 fps and skips MSAA on dense displays. Materials that flip `transparent` at runtime (invisibility) must set `needsUpdate`, since three compiles an OPAQUE variant. Weapons map per family (`palette.js` `MELEE_KINDS`/`BOW_KINDS`) to distinct meshes and swing specs (`MELEE_STYLES` in `motion.js`); combat guard stances, strafing and back-pedal gaits live in `motion.js`/`fighter.js`. Unit tests live in `tests/render2/`.
- **`banned_functions.json`**: Security policy listing forbidden C function names (`setPosition`, `setHp`, `setAp`, `lvlUp`, `mudaPosicao`, `mudaPv`, `mudaPh`, `sobeNivel`).
- **`dev-tools/`**: Complete suite for database backup/restore (`dump_restore.sh`) and tournament resetting (`tournament.sh`, `index.html`).

### 2. Runner Service (`runner/`)
- **`app.js`**: Express web server listening on port 3000 inside Docker network. Accepts `POST /:dirname`.
- **`runner.js`**: Docker execution manager. Copies temp folder from `/phppayload` to `/runs`, executes `docker run --rm gladcode2-vm sh socket_compile.sh`, enforces 30-second timeout, reads `errorc.txt` / `simlog`, and cleans up workspaces.

### 3. C Simulation Engine (`payload/`)
- **`gladCodeServerMain.c`**: Server entrypoint. Creates socket listener, spawns threads per gladiator, tracks turn timeout, and writes `simlog`.
- **`gladCodeServerCore.c`**: Battle logic, damage calculation, movement, turn loop, line-of-sight calculation.
- **`gladCodeAPI.c` / `gladCodeAPI.py`**: Client-side library linked into gladiator code, converting API calls (`stepForward()`, `attack()`) into TCP socket commands to `gladCodeServerMain`.
- **`socket_compile.sh`**: Compilation shell script executed inside `gladcode2-vm`. Compiles user C files (`gcc -o code0 code0.c -lm`) or Python scripts, and launches `gladCodeServerMain`.

### 4. WebSocket Notification Server (`node/`)
- **`server.js`**: Socket.IO server for live notifications, chat, and tournament updates. Shares MySQL session authentication with PHP.

---

## 🗄️ Database & Configuration Standards

### Config Alignment
`public_html/config.json` and `node/config.json` **MUST** remain in sync so PHP and Node share session states and database access:

```json
{
    "mysql": {
        "host": "mysql",
        "port": "3306",
        "user": "root",
        "password": "root_password",
        "database": "gladcode"
    }
}
```

### Database Access Pattern (PHP)
Always use parameterized `runQuery()` helper from `connection.php`:

```php
include_once "connection.php";

// Prepared query (Recommended)
$stmt = runQuery("SELECT * FROM gladiators WHERE master = :user", [':user' => $username]);
$gladiators = $stmt->fetchAll();

// Direct query
$result = runQuery("SELECT id, name FROM tournament WHERE state = 1");
```

---

## 🛠️ Developer & Agent Workflows

### 1. Launching the Local Stack
```bash
docker compose up -d
```

### 2. Resetting or Backing Up Database
```bash
# Enter apache container or execute via dev-tools directory
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./dump_restore.sh dump"
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./dump_restore.sh restore"
```

### 3. Managing Tournaments via CLI
```bash
# List test tournaments
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh list"

# Reset specific tournament by ID
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh reset 12"

# Reset real production tournament
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh reset-real 45"
```

### 4. Direct Simulation Debugging
To debug simulation binary behavior directly inside the container environment:

```bash
docker compose exec apache bash
cd /var/www/html/runs
mkdir test_run && cp /app/payload/* test_run/
cd test_run

# Write sample code0.c and code1.c
cat << 'EOF' > code0.c
#include "gladCodeAPI.h"
int main() {
    while(1) { stepForward(); }
    return 0;
}
EOF

# Execute compiler and engine for 1 gladiator
sh socket_compile.sh 1

# Check output logs
cat errorc.txt
cat simlog
```

---

## 🔍 Common Issues & Diagnostics

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **"CLIENT TIMEOUT"** | Gladiator code stuck in infinite loop without calling API functions or socket stalled | Verify gladiator code contains valid loop calling `gladCodeAPI` actions |
| **Empty `simlog`** | GCC compilation failed for gladiator code or C server | Inspect `errorc.txt` in the temporary run directory under `public_html/runs/{hash}/` |
| **"AUTH_REQUIRED"** | Missing or expired PHP session | Log in via `index.php` or ensure `config.json` session database credentials are valid |
| **Container Timeout** | Simulation took longer than 30s | Runner kills container via `docker kill {dirname}`. Check for blocking calls or high turn counts |

---

## 🛡️ Coding Standards & Security Policies

1. **Security Filtering**: Never bypass `banned_functions.json` checks when accepting user C code.
2. **HTML Escaping**: Always sanitize code input using `htmlspecialchars($code)` before database persistence, and `htmlspecialchars_decode()` before writing to run files.
3. **Session Guards**: All `back_*.php` endpoints must check `isset($_SESSION['user'])`.
4. **Preserve Documentation**: Maintain existing comments, docstrings, and contracts when modifying PHP backends or C engine source.

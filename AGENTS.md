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
- **`connection.php`**: Database singleton loading credentials from env (`MYSQL_*`) with fallback to `config/config.json` outside the web root (mounted at `/var/www/private/config.json`). Exposes `runQuery($sql, $data = null)`. Uses PDO with strict error mode.
- **`back_simulation.php`**: Main simulation orchestrator (750+ lines). Handles setup of temporary run folders (`public_html/runs/{hash}/`), security function checks, file copying, invoking the Runner API, and returning JSON responses.
- **`back_tournament.php` / `back_train.php`**: Handlers for tournaments and practice sessions.
- **`playback.php` / `script/playback.js`**: `playback.php` versions every `script/render2/*.js` module through the import map (`?v=` file mtime), so browsers never mix cached and new modules (the server sends no cache headers); Shared replay entrypoint, controls, preferences, and incremental simlog expansion used by both battle renderers.
- **`script/render.js`**: Classic Phaser.js 2D battle renderer.
- **`script/render2.js` / `script/render2/`**: Selectable Three.js top-down 3D renderer using Synty assets. `renderer.js` is the frame loop and legacy facade; `fighter.js` holds movement/action/effect logic and drives the body model loaded by `synty-model.js` (`loadSynty` skins the Synty modular FBX parts from the gitignored `public_html/assets/synty/`, never commit them), dressed from the legacy LPC skin by `synty-outfit.js` (pure mapping, covered by `tests/render2/outfit.test.mjs`): every LPC item picks a Modular Heroes part (shirts, armour, legs, boots, gauntlets, shoulders, capes, hats/helmets, hair, beards, ears) whose atlas swatches are recoloured per part to the sampled sprite colours (`RECOLOR_SHADER`: eight cloth/leather/metal swatches, hair swatch, skin ratio; the atlases load with three's default `flipY`), Dungeon Realms head props (bandana, afro, pigtails, mohawk, wild and very long hair) hang on the `Head` bone, the `skeleton` body is the Dungeon Realms skeleton bound to the same rig, and weapons, bows and shields come from the Dungeon, Dungeon Realms, Goblin War Camp, Viking Realm and bow packs (`WEAPON_MODELS`, `SHIELD_MODELS`; the shield rides the left forearm and hides while shooting); only the gear the fighters wear is loaded and plays the real Synty clips (`base-locomotion` walk/run/sprint/strafe/back/idle/turn-in-place (the fighter turns at a fixed rate while standing and the 90/180 turn clip follows the angle covered), `sword-combat` attacks/block/hit/stun/death) through an `AnimationMixer` with per-frame weights and times (seek-safe): the clips drive a clean animation skeleton and each bone's world-rotation change from its T-pose is retargeted onto the hero skeleton (the two use different bone axes), weapons sit on the hand at the clips' `Prop_R/L` socket frame, the hit reaction is layered after retargeting (torso/head fully, arms only when no action uses them, legs keep the locomotion), a stunned fighter plays the stun loop with a dizzy wobble layered on top (`#dizzy`: torso, neck and head circling on staggered phases, hips swaying; stars overhead), fighters in the poison gas get a throbbing green emissive tint like the burning red one (`Fighter#poisoned`, set by the renderer from the safe radius), assassinate is a bow shot (the engine fires it as a projectile): the `assassinate` spec is the archery shot aimed a beat longer, with a red nocked and flying arrow, a blood sigil and red embers on the draw, a red flash on release and a blood spray and splatter on impact (`effects.js`), attachment bones that sit under a same-named twin in the hero FBX (cape chain, shoulder pads) are parented above the twin so capes hang from the shoulders (back attachments 01-12 are capes: `cape_*` uses 03, `tattercape_*` 02), a teleport holds the fighter at the origin for a moment while both portals and a spark link light together, archery (no Synty bow clip) is solved with two-bone IK in world space (torso side-on, bow arm toward the target at eye level, draw hand from the bow to the jaw-side anchor (beside the head, never through it) and back on release, an arrow laid on the string from the nock to past the bow with the string's `bowString` bone riding in the fingers (the bow stays a skinned mesh, cloned per fighter with `SkeletonUtils`), the bow stood upright with its string side (FBX -Z) toward the archer, the string released and the nocked arrow hidden the moment the engine spawns the projectile, whose flying arrow eases from the nocked arrow's pose onto the engine path (`effects.js` `#blendLaunch`), and carried at the side with the top limb tipped forward between shots), and spell/potion/teleport (no clip) keep the `motion.js` pose layered on the upper body; `palette.js` maps skin tokens to colours; `arena.js`, `effects.js`, `camera-controller.js`, `hud.js`, `audio-manager.js` and `battle-state.js` cover the arena, VFX, camera (left-drag pans, right-drag or Shift-drag or Q/E rotates 360°), canvas-drawn HUD (roster panel with click-to-follow that delegates to the hidden `.ui-glad` DOM, name/vitals cards, speech, floating text as sprites in a second pixel-aligned scene), sound and simlog event derivation. Sound runs on Web Audio (`audio-manager.js` `BattleAudioManager`): every file is decoded once, its leading silence skipped and its loudness normalised on decode (`measureSound`), so `SOUNDS` levels are pure mix intent; one-shots are placed in 3D around a listener hovering over the camera's ground focus (panning turns with the camera), pick a variant (never the same twice), detune and vary in gain, cap their overlapping voices and thin out when fast-forwarding; buses for music (ducked under explosions, deaths and level-ups), effects (cut while paused) and ambience (muffled while paused) meet in a limiter, and the effects slider drives effects and ambience. Melee blows land with a flesh hit weighted by the damage or a metal clang on a raised guard, arrows thunk into bodies or into the sand and clatter when they fall off, bows creak on the draw, bodies thud after death, stuns and potions (by kind, `potionSound`) play the classic sounds (`battle-state.js` emits a `stun` event on its onset). `music.js` `MusicDirector` keeps the legacy track API for `playback.js` (volume 0 to 0.1) and cross-fades from the tribal battle music to the tense climax (a duel below 40% HP or the gas closing), starting on the first gesture if autoplay was refused. `soundscape.js` is the ambience: a crowd bed and chatter that rises with excitement (random-offset cross-faded grains), soft and strong cheers on the moments that rouse the crowd, a chant for the last one standing, synthesised fire crackle at braziers, torches and burning fighters (`crackleSamples`, seeded and seamless), a gas hiss that grows as the safe circle closes and a breath of wind. New arena sounds live in `res/audio/arena/` (Kenney CC0 impacts, Gregor Quendel CC BY 4.0 crowd; credits in `CREDITS.md` there, keep the credit). `tests/render2/audio.test.mjs` covers the pure parts. Timing: each shared-timer frame starts a short interpolation segment from the fighters' current pose; seeks and paused stepping snap. Actions are paced by the engine (`motion.js` `engineTiming`/`warpedTime`): the engine reports an action id on one step, resolves it after `0.5/as` (attacks) or `0.5/cs` (abilities) and reports "waiting" (9) for the rest of the cycle, so the animation clock is warped to put `contact` on that resolve step (slow fighters hold guard before the wind-up, fast ones shorten it) and to finish the follow-through within the cycle; "waiting" never cancels a running action, each new report restarts it, a block lowers after its cycle, and damage only flinches a victim when it arrives at an attacker's contact (burn/poison ticks just show their number). A fighter hit mid-swing only rocks its torso. Gait phase follows travelled distance, and swings run on a game clock (replay speed scaled, frozen while paused) with damage effects delayed to the swing's contact time. `palette.js` samples the real skin sprite colours (`renderer.prepare()`); Effects use the Synty particle textures (`effects.js` `FX_TEXTURES`: sparkle flares, the block barrier in `fighter.js` (an energy dome around the fighter: fresnel rim, the hexagon texture tiled as a drifting lattice, the barrier strongest ahead of the fighter and fading to a faint minimum at the back, its ground ring an arc round the front only; a ripple from the front when a blow lands, a glowing ground ring), portal vortex and ritual circles for teleport, bubbles for potions). Teleports hold the fighter ~0.5 s while ritual circles light source and target together; speed smoothing (0.3 s) turns walk-stop-walk into a slower continuous walk. `hud.js` composes the whole HUD on canvas from the Synty `fantasy-warrior-hud` sprites (`ART`: 9-sliced gold frames, 3-sliced crystal bars tinted by multiply so bevels keep their light, gem level badge, octagon portrait ring, icons on their underlays; plain shapes stand in while loading or without the pack) with Cinzel titles: roster plaques (team-coloured 3D head shot rendered once by `portrait.js` and converted to sRGB, flat canvas face as fallback; HP/AP/XP gauges, attributes, active buffs), overhead cards that lift apart when they overlap, parchment speech/breakpoint bubbles and gradient combat text; `playback-render2.css` frames the control bar and details window with the same sprites, and the renderer refreshes the details window each frame; fireball impacts set off a particle explosion (`blast.js`: white flash and a short point light, low-poly fire shards thrown out that slow, rise and cool from white to soot, a dark rolling smoke column, sparks and grit under gravity; four draw calls) and leave scorch marks; an arrow that hits a gladiator (the nearest one, not the archer, within `ARROW_HIT_REACH` of where the engine dropped it) (drawn at `ARROW_SCALE` 0.72, like the nocked one) glides along its line to where it meets the posed body (`SyntyModel#bodyHit`: a raycast on the skinned body meshes, bounds refreshed per call, returning the point and the bone that skins the struck triangle), sinks its tip in and is bound to that bone so it follows the animation, then after ~2 s drops off, falls flat on the sand and fades (`#stickArrow`); melee blows leave a cut over a bruise where the blow meets the body, bound to the struck bone, for ~2 s (`Fighter#wound`); a charge that connects turns into a quick sword swing whose contact the blow waits for (`Fighter#chargeStrike`), since the engine deals the charge damage on arrival without reporting an attack; sparks, smoke, rings and floor glyphs (ritual circle, ground crack) are pooled billboards/planes textured with `special-effects/Textures` (canvas stand-ins if the pack is missing). The floor is procedural and seeded (`arena.js`: noise-driven soil, mud, debris, bump/gloss maps; `terrainHeight()` and `wetness()` share one field, fighters follow the relief). `synty-floor.js` re-dresses that floor with the Meadow Forest pack (`assets/synty/meadow-forest`, gitignored): a splat shader on a Lambert material blends its terrain textures and normal maps (packed sand base, cracked dirt, pebbles, churned mud in the `wetness` dips, gravel against the podium wall) by a baked RGBA mask, each layer sampled at two rotated scales against tiling, plus a few instanced rocks between the curb and the wall; the base soil stays if the pack is missing. `arena.js` `applySynty()` adds the coliseum from `synty-coliseum.js`, built from Ancient Empire pieces loaded by `synty-arena.js` (FBX in cm with authored pivots kept, materials mapped by their FBX names in `MATERIAL_TEXTURES`, multi-material groups merged, everything instanced): `Amphitheatre_End` strips and paired 45° `Amphitheatre` wedges (pivot = circle centre) form a rounded-square bowl lifted on a stucco podium wall (a second copy underneath closes the hollow), east/west gates built like a real amphitheatre's (a dungeon-pack stone round arch in the podium wall, a portcullis, a short dark tunnel under the stands that run on over it, wall torches with small flames; `dungeon:` entries in `PIECES` load the dungeon pack in metres on its atlas), an imperial box on the north stands (marble stair up to a dais over the treads, throne with a red runner between two couches, four fluted columns, architrave and pediment, back wall, purple banners, incense burners; the leader sits on `SyntyColiseum#throne`, his guards on `royal` posts, and `HONOUR_BOX` keeps spectators out), the stands pulled in to `STANDS` 8.75 so the podium wall stands 2.5 m from the curb (gates take three strips: the arch plus wall fillers), braziers on the podium cap at the corners, a marble column-and-beam portico crowns the rim, a stone curb marks the 25 m combat square, with golden braziers, lions, statues, banners and weapon racks; the sand floor extends to the podium (`PODIUM`). `tests/render2/coliseum.test.mjs` keeps the layout off the combat square. The crowd (`synty-crowd.js`, layout in `crowd-layout.js`, loaded after the coliseum and optional) uses the Ancient Empire characters dressed with random hair/beards/helmets/laurels: each type is retargeted from the Synty clips (idle, jump, walk, sheathed-sword idle) with procedural sitting legs and arm IK (clap, fist, wave, pump, arms up), CPU-skinned and baked into a half-float vertex animation texture, then drawn as instanced meshes whose shader reads the frame (`crowdClip`: row, frames, phase, rate). Every build places a fresh random crowd (clusters of friends, denser low and on the honour side), guards only on the structure (gate tops from `SyntyColiseum#posts`, the free front tread, the walkway corners, the honour box), patrols on the front tread and the walkway, benches stopping short of each strip's staircase aisle, motion switches cross-faded in the shader (`crowdFrom`/`crowdSwitch`), and the leader in the honour box; `react()` stands spectators up on deaths, heavy blows and level-ups, the settings crowd slider sets the density, and the gas plane is scaled to the podium; the gas starts exactly at the engine's safe radius (distance from the arena centre, `poison`) with a bright rim on that circle, and `gas.js` adds billowing low-poly poison clouds over the poisoned ground, born only outside the safe radius by their own size and dissolving as they drift toward it. `tests/render2/crowd.test.mjs` covers the layout. Coliseum materials dither out (screen-door discard in `synty-arena.js` `seeThrough`) wherever they stand between the camera and the combat square or right in front of the lens, and the camera pitch stops above the stands. Fires (braziers, gate torches in sconces on the wall face, incense) are `fire.js`: instanced camera-facing particles (`particles.js` `ParticleLayer`, shared with blasts and gas; its `seeThrough` option fades fires that stand between the camera and the combat square) in three draw calls, low-poly flame shards from the particle pack that rise, taper and cool from yellow to red, a breathing glow, smoke and embers; `noise.js` holds the shared seeded noise. `renderer.js` adapts the pixel ratio to keep frames near 60 fps and skips MSAA on dense displays. Materials that flip `transparent` at runtime (invisibility) must set `needsUpdate`, since three compiles an OPAQUE variant. Weapons map per family (`palette.js` `MELEE_KINDS`/`BOW_KINDS`; weapon-pack `oversize_8..27` are five materials in four sizes) to swing specs (`MELEE_STYLES` in `motion.js`) and, per exact token, to Synty models (`synty-outfit.js` `meleeModel`/`bowModel`/`shieldModel`); combat guard stances, strafing and back-pedal gaits live in `motion.js`/`fighter.js`. Unit tests live in `tests/render2/`.
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
`config/config.json` (mounted read-only at `/var/www/private/config.json`, outside the web DocumentRoot) is the canonical PHP secret store; `node/config.json` is the legacy Node fallback. They **MUST** remain in sync so PHP and Node share session states and database access. Environment variables (`MYSQL_*`, `MAILER_*` from `.env` / `compose.yaml`) take precedence over both files. Never create `public_html/config.json` — it is web-accessible; if one exists, move it with `mv public_html/config.json config/config.json` (a deprecated fallback read + `.htaccess` deny remain only for migration):

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
| **"AUTH_REQUIRED"** | Missing or expired PHP session | Log in via `index.php` or ensure `config/config.json` / env session database credentials are valid |
| **Container Timeout** | Simulation took longer than 30s | Runner kills container via `docker kill {dirname}`. Check for blocking calls or high turn counts |

---

## 🛡️ Coding Standards & Security Policies

1. **Security Filtering**: Never bypass `banned_functions.json` checks when accepting user C code.
2. **HTML Escaping**: Always sanitize code input using `htmlspecialchars($code)` before database persistence, and `htmlspecialchars_decode()` before writing to run files.
3. **Session Guards**: All `back_*.php` endpoints must check `isset($_SESSION['user'])`.
4. **Preserve Documentation**: Maintain existing comments, docstrings, and contracts when modifying PHP backends or C engine source.

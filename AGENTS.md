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
- **`playback.php` / `script/playback.js`**: Shared replay entrypoint, controls, preferences, and incremental simlog expansion used by both battle renderers.
- **`script/render.js`**: Classic Phaser.js 2D battle renderer.
- **`script/render2.js` / `script/render2/`**: Selectable Three.js top-down 3D renderer, fully procedural (no external model or animation assets). `renderer.js` is the frame loop and legacy facade; `fighter.js` builds the primitive-mesh rig and applies poses from `motion.js` (pure pose math: gait, keyframed actions, foot grounding); `palette.js` maps skin tokens to colours; `arena.js`, `effects.js`, `camera-controller.js`, `hud.js`, `audio-manager.js` and `battle-state.js` cover the arena, VFX, camera (left-drag pans, right-drag or Shift-drag or Q/E rotates 360°), canvas-drawn HUD (roster panel with click-to-follow that delegates to the hidden `.ui-glad` DOM, name/vitals cards, speech, floating text as sprites in a second pixel-aligned scene), sound and simlog event derivation. Timing: each shared-timer frame starts a short interpolation segment from the fighters' current pose; seeks and paused stepping snap. Gait phase follows travelled distance, and swings run on a game clock (replay speed scaled, frozen while paused) with damage effects delayed to the swing's contact time. `palette.js` samples the real skin sprite colours (`renderer.prepare()`); `hud.js` draws the roster on canvas (portrait, XP ring, HP/AP, attributes, buff icons); fireball impacts spawn a pooled 3D blast (`effects.js`). The floor is fully procedural and seeded (`arena.js`: noise-driven soil, mud, debris, bump/gloss maps; `terrainHeight()` and `wetness()` share one field, fighters follow the relief). `enclosure.js` builds the seeded stone walls, battlements, braziers, banners and instanced crowd; `noise.js` holds the shared seeded noise. `renderer.js` adapts the pixel ratio to keep frames near 60 fps and skips MSAA on dense displays. Materials that flip `transparent` at runtime (invisibility) must set `needsUpdate`, since three compiles an OPAQUE variant. Weapons map per family (`palette.js` `MELEE_KINDS`/`BOW_KINDS`) to distinct meshes and swing specs (`MELEE_STYLES` in `motion.js`); combat guard stances, strafing and back-pedal gaits live in `motion.js`/`fighter.js`. Unit tests live in `tests/render2/`.
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

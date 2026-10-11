# gladCode 2

gladCode is a web-based programming game and arena where players code AI gladiators in C or Python to battle autonomously. The platform features selectable Phaser.js 2D and Three.js top-down 3D battle replays, visual block-based programming (Blockly), raw C/Python editing (ACE Editor), tournament systems, and live WebSocket notifications.

---

## 📐 Architecture Overview

gladCode 2 runs as a microservices architecture managed via **Docker Compose**:

```mermaid
flowchart TD
    User([User Browser]) -->|HTTP / PHP Pages| Apache[Apache / PHP 8 Frontend\npublic_html:80]
    User -->|WebSockets| Node[Node.js WebSocket Server\nnode:3000]
    Apache -->|MySQL Driver| DB[(MySQL 8.0 Database\nmysql:3306)]
    Node -->|MySQL Driver| DB
    Apache -->|POST /:dirname| Runner[Runner Express API\nrunner:3000]
    Runner -->|Spawn Container| VM[gladcode2-vm Container\npswerlang/gladcode2-vm]
    VM -->|Compile & Run| Payload[C Simulation Engine\npayload/gladCodeServerMain]
    Payload -->|Socket IPC| GladiatorCodes[User Gladiator Codes\ncode0.c, code1.c...]
    Payload -->|Generates| SimLog[simlog JSON]
    SimLog -->|Expand incremental frames| Playback[Shared Playback State\nscript/render2/battle-state.js]
    Playback -->|Classic 2D| Phaser[Phaser.js Renderer\nscript/render.js]
    Playback -->|Coliseum 3D| Three[Three.js Renderer\nscript/render2.js]
```

---

## 🛠️ Microservices Breakdown

| Service | Location | Tech Stack | Role & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Apache / PHP Frontend** | `public_html/` | PHP 8, Apache, jQuery, Phaser.js, Three.js | Web UI, user auth, gladiator management, tournament routing, simulation invocation, and selectable battle replay rendering |
| **Runner Service** | `runner/` | Node.js (ESM), Express, Docker CLI | Docker-in-Docker executor. Receives battle requests, runs containerized simulations |
| **WebSocket Server** | `node/` | Node.js, Express, Socket.IO | Real-time chat, live notification delivery, tournament updates |
| **Simulation Engine** | `payload/` | C (GCC, pthreads, Sockets) | Multi-threaded arena server executing turn-by-turn combat between gladiator scripts |
| **Database** | `database-2025.*.sql` | MySQL 8.0 | Stores user accounts, gladiators, tournament schedules, battle logs, and stats |

---

## ⚡ Quick Start & Development Environment

> [!NOTE]
> **No Local Node/Python Requirement**: Node.js and Python are not required on the host machine. All services, scripts, and compilers run inside Docker containers.

### Prerequisites
- [Docker Desktop](https://www.docker.com/) (or Docker Engine + Docker Compose plugin)

### 1. Environment Configuration

Copy environment template files:

```bash
cp .env.example .env
cp config/config.json.example config/config.json
cp node/config.json.example node/config.json
```

> `config/config.json` lives **outside** the web root and is mounted into
> Apache at `/var/www/private/config.json` (see `compose.yaml`). Never put
> secrets in `public_html/` — `public_html/config.json` is deprecated, still
> read as a last-resort fallback, and blocked by `.htaccess`. If you have one,
> move it: `mv public_html/config.json config/config.json`.

Ensure MySQL credentials in `.env`, `config/config.json`, and `node/config.json` match:

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

### 2. Launching Services

Start all containers in detached mode:

```bash
docker compose up -d
```

Service endpoints:
- **Web Frontend**: [http://localhost:80](http://localhost:80)
- **Dev Tools Suite**: [http://localhost:80/dev-tools/](http://localhost:80/dev-tools/)
- **Runner API**: Internal only (`http://runner:3000`)
- **MySQL**: `localhost:3306`

---

## 🗄️ Database Management & Dev Tools

gladCode 2 includes a dev-tools suite in `public_html/dev-tools/`:

### Database Backup & Restore

```bash
cd public_html/dev-tools

# Dump current MySQL database to dump_gladcode.sql
./dump_restore.sh dump

# Restore database from dump_gladcode.sql
./dump_restore.sh restore
```

### Tournament CLI Management

```bash
cd public_html/dev-tools

# List test tournaments
./tournament.sh list

# Reset specific tournament by ID
./tournament.sh reset 12

# List real production tournaments (with pagination)
./tournament.sh list-real 1 10

# Reset real production tournament
./tournament.sh reset-real 45
```

---

## ⚔️ How Gladiator Battles Work

1. **Code Creation**: Users write C or Python gladiator algorithms in `editor.php` using either visual blocks or text editing.
2. **Security Verification**: Before compilation, user code is checked against `public_html/banned_functions.json` to prevent unauthorized memory/game state modification.
3. **Execution Request**: `public_html/back_simulation.php` prepares a temporary run folder under `public_html/runs/{hash}/` with `payload/` files and user scripts (`code0.c`, `code1.c`, etc.), then sends an HTTP POST to `http://runner:3000/{hash}`.
4. **Container Isolation**: Runner spawns `gladcode2-vm` container with restricted CPU (`--cpu-quota=50000`) and a 30-second execution deadline.
5. **Simulation Execution**: `socket_compile.sh` compiles gladiator code, launches `gladCodeServerMain`, and manages socket IPC between gladiators and the C game engine.
6. **Log Replay**: The simulation writes an incremental JSON execution trace (`simlog`). `script/playback.js` expands it into complete frames, then the saved battle setting selects either the classic Phaser renderer (`script/render.js`) or the top-down Three.js renderer (`script/render2.js`). The 3D renderer is fully procedural: each gladiator is a primitive-mesh rig coloured from its persisted skin, walking with a distance-driven gait and playing keyframed melee, ranged, spell, block and charge actions timed on the replay clock (pausing freezes them; replay speed scales them). Both renderers use the same 100 ms simulation cadence and authoritative arena coordinates.

---

## 📁 Repository Structure

```
gladcode2/
├── .github/                 # GitHub workflows & Copilot instructions
├── Dockerfile-apache        # PHP 8 + Apache + Docker CLI container definition
├── Dockerfile-dind          # Docker-in-Docker container definition for runner
├── compose.yaml             # Docker Compose microservices specification
├── database-2025.*.sql      # Database initialization SQL dumps
├── node/                    # Node.js Socket.IO WebSocket server
├── payload/                 # C battle simulation engine & socket API source
├── public_html/             # Apache web root (PHP backends, JS, CSS, dev-tools)
│   ├── assets/              # Runtime 3D character source, palette atlases, and weapon models
│   ├── back_simulation.php  # Simulation orchestrator
│   ├── banned_functions.json# Security function filter
│   ├── dev-tools/           # Tournament & DB management CLI/Web suite
│   ├── runs/                # Temporary simulation workspace directory
│   └── script/              # Playback UI plus Phaser and Three.js renderers
│       └── render2/         # Modular Three.js arena, entities, effects, audio, camera, and state helpers
└── runner/                  # Express Docker execution service
```

---

## 🛡️ Security & Constraints

- User code runs in unprivileged Docker containers (`gladcode2-vm`).
- CPU execution capped at 50% single core per battle.
- 30-second hard wall-clock timeout enforced by `runner/runner.js`.
- Forbidden functions (`setPosition`, `setHp`, `setAp`, `lvlUp`, etc.) blocked during compilation.

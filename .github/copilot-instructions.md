# gladCode Development & Copilot Guide

This guide provides instructions and architectural context for GitHub Copilot and developers working on **gladCode 2**.

---

## ⛔ CRITICAL ENVIRONMENT RULE

> [!CAUTION]
> **NO LOCAL NODE.JS OR PYTHON ON HOST MACHINE**
> The host machine does NOT have Node.js or Python installed natively.
> - **DO NOT** execute `node`, `npm`, `python`, `python3`, or `gcc` directly on the host shell.
> - **ALWAYS** use Docker Compose containers for all commands, scripts, compilation, and service control:
>   - PHP / Apache / Dev Tools: `docker compose exec apache <command>`
>   - Runner Service: `docker compose exec runner <command>`
>   - Full environment control: `docker compose up -d`, `docker compose down`

---

## 🏛️ Architecture Overview

gladCode is a web-based programming game where users code AI gladiators in C or Python that battle autonomously in an arena. The application uses a microservices architecture managed via **Docker Compose**:

- **Apache/PHP 8 Frontend (`public_html/`)**: Web UI, user management, gladiator creation, tournament routing, and database operations.
- **Node.js WebSocket Server (`node/`)**: Real-time notifications, live chat, and tournament updates via Socket.IO.
- **Runner Service (`runner/`)**: Express API & Docker-in-Docker service executing user code in isolated containers (`gladcode2-vm`).
- **C Simulation Engine (`payload/`)**: Multi-threaded server executing combat between gladiators via TCP sockets.

---

## 🔑 Key Workflows

### 1. Starting the Development Environment

```bash
docker compose up -d
```

Services:
- **Apache (PHP)**: `http://localhost:80`
- **Dev Tools Suite**: `http://localhost:80/dev-tools/`
- **Runner API**: `http://runner:3000` (internal Docker network)
- **MySQL Database**: `localhost:3306`
- **Node WebSocket**: auto-started with runner stack

### 2. Database Management (`public_html/dev-tools/`)

Use the dump/restore script inside the Apache container for database backups:

```bash
# Dump database to public_html/dev-tools/dump_gladcode.sql
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./dump_restore.sh dump"

# Restore database from dump_gladcode.sql
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./dump_restore.sh restore"
```

Credentials are read automatically from `config.json` / `.env`.

### 3. Tournament Testing Suite (`public_html/dev-tools/`)

```bash
# Web Interface
open http://localhost/dev-tools/index.html

# CLI Tournament Commands (run inside apache container)
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh list"
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh create"
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh reset 12"
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh list-real 1 10"
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh reset-real 45"
```

---

## ⚔️ How Battles Work (Critical Flow)

1. User writes C or Python code in `editor.php` using visual blocks (Blockly) or text (ACE editor).
2. Code is validated against `banned_functions.json` and saved to the `gladiators` table with attributes (STR/AGI/INT) and skin customization.
3. Match is initiated via `back_match.php` or `back_simulation.php`:
   - Creates temporary run directory in `public_html/runs/{hash}/`.
   - Copies payload files (`gladCodeServerMain.c`, `gladCodeServerCore.c`, `gladCodeAPI.c`, `socket_compile.sh`, user codes as `code0.c`, `code1.c`, etc.).
   - Sends HTTP POST request to Runner service at `http://runner:3000/{hash}`.
4. Runner service (`runner/app.js` & `runner.js`) executes Docker container:
   - Spawns `pswerlang/gladcode2-vm` container running `socket_compile.sh`.
   - Compiles user C files (`gcc -o code0 code0.c -lm`) or executes Python files (`python3 code0.py`).
   - Launches `gladCodeServerMain`, creating TCP sockets for each gladiator thread.
   - User gladiators communicate with game engine via `gladCodeAPI.c` / `gladCodeAPI.py`.
5. Simulation produces a `simlog` JSON file containing turn-by-turn combat data.
6. Frontend (`script/render.js`) parses `simlog` and replays 2D animated combat in Phaser.js.

### Socket IPC Architecture

`User Code (code0.c)` → `gladCodeAPI.c` (client) → `Socket IPC` → `gladCodeServerMain.c` (server) → `gladCodeServerCore.c` (game logic)

---

## 📐 Project Conventions

### PHP Backend Structure
- All API endpoints follow `back_*.php` naming convention and return JSON/text (no direct HTML rendering).
- `connection.php` provides the PDO database connection singleton. Use `runQuery($sql, $params)` for queries.
- Authentication must be checked on all endpoints via `$_SESSION['user']`.
- Sessions are shared between PHP and Node.js via MySQL session store.

### Database Access Example
```php
include_once "connection.php";
$stmt = runQuery("SELECT * FROM gladiators WHERE master = :master", [':master' => $user]);
while ($row = $stmt->fetch()) {
    // Process gladiator record
}
```

### Security & Banned Functions
User code compilation enforces security policies defined in `public_html/banned_functions.json`:
- Blocked C/Python functions: `setPosition`, `setHp`, `setAp`, `lvlUp`, `mudaPosicao`, `mudaPv`, `mudaPh`, `sobeNivel`.
- Docker containers run with CPU quota (`--cpu-quota=50000`) and a 30-second hard wall-clock timeout.

---

## 🔍 Debugging & Verification

### Inspecting Simulation Logs
If a simulation fails or returns an empty `simlog`:
1. Check `errorc.txt` in the active run directory (`public_html/runs/{hash}/errorc.txt`).
2. Verify GCC compilation output or Python tracebacks.
3. Check for "CLIENT TIMEOUT" errors caused by infinite loops lacking API yielding.

---

## 📁 Key Files Reference

- **`payload/gladCodeAPI.c` / `.py`**: Gladiator client API functions (movement, attack, spells).
- **`payload/gladCodeServerMain.c`**: Multi-threaded C socket server for battles.
- **`payload/socket_compile.sh`**: Compilation script inside `gladcode2-vm`.
- **`public_html/back_simulation.php`**: Primary battle orchestrator.
- **`runner/runner.js`**: Docker container lifecycle manager.
- **`public_html/script/render.js`**: Client-side Phaser.js visualization engine.
- **`public_html/dev-tools/`**: Web and CLI tools for database and tournament management.

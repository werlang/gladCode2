# gladCode Development Guide

## Architecture Overview

gladCode is a web-based programming game where users create AI gladiators that battle autonomously in an arena. The system uses a microservices architecture:

- **Apache/PHP Frontend** (`public_html/`) - Main web interface, user management, database operations
- **Node.js WebSocket Server** (`node/`) - Real-time notifications, chat, tournament/training updates
- **Runner Service** (`runner/`) - Docker-in-Docker service that executes user code in isolated containers
- **C Simulation Engine** (`payload/`) - Multi-threaded server that runs battles between gladiators

## Key Workflows

### Starting the Development Environment

```bash
docker compose up -d
```

Services:
- Apache (PHP): http://localhost:80
- Runner API: http://localhost:3000 (internal only)
- MySQL: localhost:3306
- Node WebSocket: auto-started with runner

### How Battles Work (Critical Flow)

1. User writes C or Python code in editor (`editor.php`) using visual blocks (Blockly) or text (ACE editor)
2. Code saved to `gladiators` table with user attributes (STR/AGI/INT), skin customization
3. Match initiated via `back_match.php` or `back_simulation.php`:
   - Creates temp directory in `public_html/runs/{hash}/`
   - Copies payload files (`gladCodeServerMain.c`, user codes as `code0.c`, `code1.c`, etc.)
   - PHP calls Runner service at `http://runner:3000/{dirname}`
4. Runner service (`runner/app.js`) executes Docker container:
   - Runs `socket_compile.sh` which compiles all codes and launches simulation
   - `gladCodeServerMain.c` creates socket server, spawns thread per gladiator
   - Each gladiator's code communicates via sockets using `gladCodeAPI.c` functions
5. Simulation produces `simlog` JSON file with turn-by-turn data
6. Frontend (`script/render.js`) uses Phaser.js to replay battle from log

### Critical Communication Pattern

User C code → `gladCodeAPI.c` (client) → socket → `gladCodeServerMain.c` (server) → `gladCodeServerCore.c` (game logic)

Example: `stepForward()` in user code sends socket message "stepForward", server processes movement, returns new position.

## Project Conventions

### PHP Backend Structure

- `back_*.php` - API endpoints for frontend (no direct HTML output, return JSON/text)
- `connection.php` - PDO database connection singleton, use `runQuery($sql)` helper
- All endpoints check `$_SESSION['user']` for authentication
- Session managed by both PHP and Node.js (shared MySQL session store)

### Database Access

```php
include_once "connection.php";
$sql = "SELECT * FROM gladiators WHERE master = '$user'";
$result = runQuery($sql); // Returns PDOStatement
$row = $result->fetch(); // Single row
while($row = $result->fetch()) { } // Multiple rows
```

### Code Language Detection

User code can be C or Python. Detect via file pattern in `back_simulation.php`:

```php
function getLanguage($code){
    if (preg_match('/#include/', $code)) return 'c';
    return 'python';
}
```

Payload supports both: `code0.c` compiled with gcc, `code0.py` run with python3 (see `socket_compile.sh`)

### Configuration Files

- `public_html/config.json` (from `.example`) - MySQL credentials, mailer settings
- `node/config.json` - Same MySQL config for Node WebSocket server
- Both MUST match for session sharing to work
- `.env` file for docker-compose MySQL environment variables

### Frontend JavaScript Modules

- Use ES6 imports for new code (see `script/runSim.js`, `script/google-login.js`)
- Older code uses jQuery globals (being gradually refactored)
- Simulation runner: `new Simulation({glads: [...], terminal: true}).run()` returns Promise

### Docker Isolation

User code runs in `gladcode2-vm` container (built from `pswerlang/gladcode2-vm` image) with:
- CPU limits: `--cpu-period=100000 --cpu-quota=50000` (50% of one core)
- 30-second timeout enforced by Runner service
- Shared volume `gladcode_tmp_run` for code access
- Container auto-killed on timeout via `docker kill ${dirname}`

## Testing & Debugging

### Local Simulation Testing

Access PHP container:
```bash
docker compose exec apache bash
cd /var/www/html/runs
```

Manual simulation (bypass PHP):
```bash
mkdir test && cp /app/payload/* test/
cd test
# Create code0.c with your gladiator code
./socket_compile.sh 1  # Number of gladiators
cat simlog  # JSON battle log
```

### Common Issues

**"CLIENT TIMEOUT" error**: Gladiator code not calling simulation functions properly or stuck in infinite loop without yielding to server

**"timed out" error**: Specific gladiator exceeded time limit (detected by server tracking per-gladiator execution time)

**Empty simlog**: Compilation error, check `errorc.txt` in run directory

## Security Patterns

- User code runs in isolated Docker containers (no host access)
- `banned_functions.json` lists C functions blocked during compilation
- SQL uses PDO with exception handling (see `connection.php`)
- Escape HTML in user inputs: `htmlspecialchars($code)` before DB, `htmlspecialchars_decode()` before execution
- Session validation required for all `back_*.php` endpoints

## Real-time Updates

Node server (`node/server.js`) handles WebSocket events:

```javascript
// PHP triggers notification
$.post('back_node_message.php', {
    type: 'profile notification',
    user: [userId1, userId2]
});

// Broadcasts via Socket.IO room
io.to(`user-${userId}`).emit('profile notification', true);
```

Common rooms: `user-{id}`, `chat-room-{id}`, `tournament-{id}`, `training-{id}`

## Key Files Reference

- `payload/gladCodeAPI.c` - User-facing C API functions (attack, move, cast spells)
- `payload/gladCodeGlobals.c` - Shared state between server threads (gladiator structs, arena size)
- `public_html/back_simulation.php` - Main orchestrator for battle execution (759 lines)
- `runner/runner.js` - Docker container manager for code execution
- `public_html/script/render.js` - Phaser.js battle visualization engine
- `node/server.js` - WebSocket server for live notifications (318 lines)

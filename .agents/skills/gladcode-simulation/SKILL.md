---
name: gladcode-simulation
description: Comprehensive guide and procedural workflow for building, running, testing, debugging, and maintaining gladCode battle simulations, C/Python payload APIs, runner services, dev tools, and database state. Make sure to use this skill whenever working on gladCode battle logic, gladiator C/Python code compilation, gladCode API functions, runner service, simlog JSON traces, tournament dev-tools, or debugging simulation timeouts and errors.
---

# gladCode Battle Simulation Skill

This skill provides step-by-step procedures and reference specifications for working with the **gladCode 2** battle simulation pipeline, C/Python gladiator code runtime, Express Runner microservice, Phaser.js visualizer, and dev-tools database utilities.

---

## ⚡ Host Environment Constraint

> [!IMPORTANT]
> **No Local Node.js or Python**: Node.js and Python are not installed directly on the host shell. Always execute commands, run containerized scripts, or perform database operations via **Docker Compose**:
> - Execute inside PHP environment: `docker compose exec apache <command>`
> - Execute inside Runner environment: `docker compose exec runner <command>`
> - Execute MySQL commands: `docker compose exec mysql mysql -u root -p`

---

## 📚 Detailed References

For specialized component specifications, consult these reference guides:

- 📜 **[C & Python Gladiator API Reference](references/c_api_reference.md)**: Documentation of `gladCodeAPI.c` and `gladCodeAPI.py` functions, arguments, return values, and TCP socket messaging protocols.
- ⚙️ **[Battle Flow & Execution Architecture](references/battle_flow.md)**: Deep dive into `back_simulation.php`, Runner API, container VM isolation, `socket_compile.sh`, `simlog` format, and Phaser.js visualization.
- 🗄️ **[Dev Tools & Tournament Management](references/dev_tools.md)**: Complete guide to `public_html/dev-tools/`, `tournament.sh`, and `dump_restore.sh`.
- ⚖️ **[Balance Patch Workflow](references/balance_patch.md)**: End-to-end procedure for rebalances — tuning payload values, verifying the server compile, syncing `manual.php` + function JSONs + regenerated bundle, bumping `version`, and publishing the news post.

---

## 🔄 Standard Workflows

### Workflow 1: Debugging a Failed Simulation or Empty `simlog`

1. **Locate the Temporary Run Directory**:
   Simulation runs create temporary folders in `public_html/runs/{hash}/`.
2. **Inspect Compiler & Runtime Error Log**:
   Read `public_html/runs/{hash}/errorc.txt`.
   - If `errorc.txt` contains GCC error messages (e.g. `undefined reference`, `syntax error`), the gladiator C code failed to compile.
   - If `errorc.txt` contains Python tracebacks, the gladiator Python script had a runtime exception.
3. **Check for Timeout or Infinite Loop**:
   - If `errorc.txt` is empty but `simlog` is missing or truncated, check if the gladiator script was stuck in an infinite loop without yielding to the C server engine (`gladCodeServerMain`).
   - Hard timeouts (30 seconds) trigger container termination via `docker kill {dirname}` in `runner/runner.js`.
4. **Verify Banned Function Violations**:
   Ensure user code does not invoke forbidden functions listed in `public_html/banned_functions.json` (`setPosition`, `setHp`, `setAp`, `lvlUp`, `mudaPosicao`, `mudaPv`, `mudaPh`, `sobeNivel`).

---

### Workflow 2: Running a Manual Local Simulation

To isolate and test battle payload binaries without going through the web UI:

```bash
# Enter apache container
docker compose exec apache bash

# Navigate to runs directory and create isolated test directory
cd /var/www/html/runs
mkdir debug_battle && cp /app/payload/* debug_battle/
cd debug_battle

# Create sample gladiator code (code0.c)
cat << 'EOF' > code0.c
#include "gladCodeAPI.h"

int main() {
    while (1) {
        stepForward();
    }
    return 0;
}
EOF

# Create opponent code (code1.c)
cat << 'EOF' > code1.c
#include "gladCodeAPI.h"

int main() {
    while (1) {
        turnRight();
    }
    return 0;
}
EOF

# Execute compiler and engine for 2 gladiators
sh socket_compile.sh 2

# Inspect resulting simlog JSON
cat simlog
```

---

### Workflow 3: Backing Up and Restoring Database

```bash
# Backup database to public_html/dev-tools/dump_gladcode.sql
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./dump_restore.sh dump"

# Restore database from dump_gladcode.sql
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./dump_restore.sh restore"
```

---

### Workflow 4: Managing Tournaments via CLI

```bash
# List test tournaments
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh list"

# Reset test tournament #5
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh reset 5"

# List production tournaments (page 1, limit 10)
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh list-real 1 10"

# Reset production tournament #42
docker compose exec apache bash -c "cd /var/www/html/dev-tools && ./tournament.sh reset-real 42"
```

### Workflow 5: Shipping a Balance Patch

Rebalances follow a fixed five-step flow — full procedure, commands, and
pre-commit checklist in [Balance Patch Workflow](references/balance_patch.md):

1. Tune values in `payload/gladCodeGlobals.c` (`abilitycost`) and
   `payload/gladCodeServerAPI.c` (watch two-spot values like teleport range).
2. Prove the server compiles and runs (`gcc` line from `socket_compile.sh`
   plus an end-to-end sim with `while(1)` bots). No image rebuild needed.
3. Sync `public_html/manual.php`, `public_html/script/functions/*.json`,
   regenerate `script/functions.json` via `compress_functions.php`, bump
   `public_html/version`.
4. Add the patch-notes `INSERT` under `public_html/dev-tools/` and apply it
   to the production `news` table.
5. Check off TODO.MD and commit (simulation, docs, news/skill slices).

---

## 🛡️ Best Practices & Quality Expectations

- **Sanitization**: When storing or retrieving gladiator source code, ensure string escaping (`htmlspecialchars`) is handled properly.
- **Session Protection**: All PHP endpoints modifying database state must check `$_SESSION['user']`.
- **Config Synchronization**: Ensure `public_html/config.json` and `node/config.json` remain identical in credentials and host settings.

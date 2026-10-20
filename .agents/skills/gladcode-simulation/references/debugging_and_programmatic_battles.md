# Navigating the Codebase, Calling Battles Programmatically & Battle Debugging

This reference provides developers and AI agents with complete procedures for navigating the gladCode 2 repository, invoking battles programmatically via HTTP APIs and container CLIs, and isolating, diagnosing, and fixing battle-related failures.

---

## 🗺️ 1. Navigating the gladCode 2 Codebase

gladCode 2 is a hybrid PHP 8 + Node.js + C containerized simulation platform.

### Subsystem Directory Map

```
gladcode2/
├── public_html/             # PHP Web application & REST endpoints
│   ├── connection.php       # Database PDO connection manager (reads .env / config.json)
│   ├── back_match.php       # Ranked matchmaking service (draws opponents by MMR)
│   ├── back_simulation.php  # Main simulation orchestrator (assembles payload, talks to runner)
│   ├── back_glad.php        # Gladiator CRUD API
│   ├── runs/                # Temporary workspaces created per battle run: {hash}/
│   ├── script/              # Frontend Javascript (Phaser.js render.js, runSim.js, editor.js)
│   ├── banned_functions.json# Blocked C functions policy
│   ├── version              # Current production version file (e.g. 2.9.3)
│   └── dev-tools/           # DB backup/restore (dump_restore.sh) and tournament reset CLI
├── runner/                  # Express microservice inside Docker network (port 3000)
│   ├── app.js               # POST /:dirname endpoint receiving battle execution requests
│   └── runner.js            # Docker-in-Docker manager (runs gladcode2-vm, monitors errorc.txt & simlog)
├── Payload/                 # C battle simulation engine & API bindings
│   ├── gladCodeServerMain.c # Entrypoint socket server, spawns threads per gladiator
│   ├── gladCodeServerCore.c # Physics, line-of-sight, turn loop, damage mechanics
│   ├── gladCodeAPI.c / .py  # Gladiator client SDKs (compiled into gladiator binaries)
│   └── socket_compile.sh    # GCC and Python invocation script executed inside gladcode2-vm
├── migrations/              # Versioned MySQL migration scripts (001_..., 002_...)
└── node/                    # Socket.IO notification and chat server
```

### Core Database Entities

| Table | Role | Key Columns |
| :--- | :--- | :--- |
| `usuarios` | User accounts | `id`, `apelido` (nickname), `lvl`, `xp`, `silver`, `ativo` (last activity timestamp) |
| `gladiators` | Gladiator entities | `cod`, `master` (`usuarios.id`), `name`, `vstr`, `vagi`, `vint`, `code`, `mmr`, `version` |
| `logs` | Simulation execution traces | `id`, `time`, `version`, `hash` (16-char token), `origin` (`ranked`, `duel`, `editor`) |
| `reports` | Match outcomes per gladiator | `id`, `log` (`logs.id`), `gladiator` (`gladiators.cod`), `reward` (MMR delta), `started` |
| `duels` | 1v1 challenges | `id`, `user1`, `user2`, `gladiator1`, `gladiator2`, `log` |
| `groups` / `teams` | Tournaments & brackets | Match groupings, participant links, and bracket progress |

### Session & Authentication Architecture
- PHP sessions are persisted as files under `/tmp/sess_{PHPSESSID}` in the `apache` container.
- Authenticated requests must pass the `PHPSESSID` cookie.
- Inside PHP scripts, `$_SESSION['user']` holds the integer user ID (`usuarios.id`).

---

## ⚔️ 2. Programmatically Calling Battles

### Flow A: Calling a Ranked Matchmaking Battle

Ranked battles require an authenticated session and follow a strict two-step handshake.

#### Step 1: Request Match Candidates (`back_match.php`)
```bash
curl -s -b "PHPSESSID=<SESSION_ID>" \
  -d "action=MATCH&id=<GLADIATOR_COD>" \
  http://localhost/back_match.php
```
**What happens under the hood:**
1. Checks that gladiator `version` matches `public_html/version`.
2. Queries the 10 closest opponents with the current version:
   ```sql
   SELECT g.cod FROM gladiators g
   WHERE g.master != :user AND g.version = :version
   ORDER BY ABS((SELECT count(*) FROM gladiators g2 WHERE g2.mmr < g.mmr) - (SELECT count(*) FROM gladiators WHERE mmr < :mymmr))
   LIMIT 10;
   ```
3. Randomly selects 4 opponents from the 10 candidates.
4. Stores the array of 5 gladiator IDs (4 opponents + user's gladiator) in `$_SESSION['match']`.
5. Returns JSON array with the 4 opponent profiles.

#### Step 2: Trigger Simulation Execution (`back_simulation.php`)
```bash
curl -s -b "PHPSESSID=<SESSION_ID>" \
  -d 'args={"ranked":true,"origin":"ranked"}' \
  http://localhost/back_simulation.php
```
**What happens under the hood:**
1. Consumes `$_SESSION['match']` and clears it.
2. Validates gladiator attribute sums (`STR + AGI + INT == 50`).
3. Creates temporary run directory `runs/{hash}/` and populates payload files.
4. Invokes the Runner service via HTTP: `POST http://runner:3000/{hash}`.
5. Runner launches `gladcode2-vm` container executing `socket_compile.sh`.
6. On success:
   - Evaluates death order (`death_times()`).
   - Calculates MMR changes (`calcReward()`) and updates gladiators.
   - Awards XP and Silver to the initiating user (`usuarios`).
   - Writes record to `logs` and `reports`.
   - Returns: `{"simulation":"<16_CHAR_HASH>","error":"","output":""}`.

---

### Flow B: Direct Custom / Sandbox Battle

To simulate battles directly between arbitrary gladiators without affecting MMR or rankings:

```bash
# Battle between specific gladiator IDs (by database 'cod')
curl -s -d 'args={"glads":[913, 864]}' http://localhost/back_simulation.php

# Battle with custom raw code
curl -s -d 'args={"glads":[{"name":"Glad1","user":"Alice","code":"...","skin":"[]","vstr":10,"vagi":14,"vint":9}, {"name":"Glad2","user":"Bob","code":"...","skin":"[]","vstr":14,"vagi":10,"vint":9}]}' http://localhost/back_simulation.php
```

---

### Flow C: Direct Simulation via Container CLI (No Web Server)

To test the C server and user gladiator code in isolation:

```bash
docker compose exec apache bash
cd /var/www/html/runs
mkdir test_run && cp /app/payload/* test_run/
cd test_run

# Prepare gladiator code
cat << 'EOF' > code0.c
#include "gladCodeCore.c"
setup(){ setName("GladA@UserA"); setSTR(10); setAGI(14); setINT(9); setSlots("0,0,0,0"); }
loop(){ stepForward(); }
EOF

cat << 'EOF' > code1.c
#include "gladCodeCore.c"
setup(){ setName("GladB@UserB"); setSTR(14); setAGI(10); setINT(9); setSlots("0,0,0,0"); }
loop(){ turnRight(); }
EOF

# Run compilation & engine
sh socket_compile.sh 2

# Inspect results
cat errorc.txt
cat simlog
```

---

## 🔍 3. Investigating & Diagnosing Battle-Related Bugs

### Error Diagnostic Matrix

| Symptom / Response | Root Cause | Diagnosis Step | Solution |
| :--- | :--- | :--- | :--- |
| **HTTP 500 / Empty response** | PHP Fatal Exception (e.g. `DivisionByZeroError`) | Check `docker logs gladcode2-apache-1 --tail 50` | Guard against division by zero in `calcReward()` (`$avgmmr == 0` or `$rewardWeighted[0] == 0`) |
| **`"error": "Traceback..."`** | Python runtime exception in gladiator code | Inspect `error` JSON field or `errorc.txt` in run directory | Fix gladiator script syntax/scope bug (e.g. uninitialized global variable like `volta`) |
| **`"error": "codeX.c:... error:"`** | GCC compilation error in gladiator code | Inspect `error` JSON field or `errorc.txt` | Fix C syntax error, missing semicolon, or invalid function signature |
| **`"error": "INVALID_ATTR"`** | Attribute sum is not 50 points | Inspect `vstr`, `vagi`, `vint` in `gladiators` table | Ensure `calcAttrValue(STR) + calcAttrValue(AGI) + calcAttrValue(INT) == 50` |
| **`"output": "CLIENT TIMEOUT"`** | Gladiator code stuck in loop without yielding | Run gladiator isolated; check for infinite while loop missing API action call | Ensure loop calls action functions (`stepForward`, `turn`, `attack`) |
| **30-second Runner Timeout** | Process hung or engine deadlock | Check `docker logs gladcode2-runner-1` | Runner executes `docker kill {hash}` after 30s. Check socket communication and gladiator loop |

---

### Step-by-Step Matchmaking Bug Hunt (Candidate Pool Triage)

When ranked matchmaking fails for a specific gladiator:

1. **Identify the candidate opponents for the user's MMR**:
   ```sql
   SET @id = <GLAD_COD>;
   SET @user = <USER_ID>;
   SET @version = '2.9.3';
   SELECT g.cod, g.name, u.apelido, g.mmr FROM gladiators g
   JOIN usuarios u ON g.master = u.id
   WHERE g.master != @user AND g.version = @version
   ORDER BY ABS((SELECT count(*) FROM gladiators g2 WHERE g2.mmr < g.mmr) - (SELECT count(*) FROM gladiators WHERE mmr < (SELECT mmr FROM gladiators WHERE cod = @id AND master = @user)))
   LIMIT 10;
   ```

2. **Run Pairwise Isolation Battles**:
   Test the user's gladiator one-on-one against each candidate opponent:
   ```bash
   for opponent in <OPPONENT_IDS>; do
     res=$(curl -s -d "args={\"glads\":[<USER_GLAD>, $opponent]}" http://localhost/back_simulation.php)
     echo "VS $opponent: $res"
   done
   ```
   If a specific opponent triggers an error, that gladiator's code contains a compilation or runtime defect poisoning the pool.

3. **Verify Post-Battle Reward Computations**:
   Ensure `calcReward()` executes without division by zero when all combatants have 0 MMR or when battle results tie:
   ```bash
   docker compose exec apache php tests/calcReward.test.php
   ```

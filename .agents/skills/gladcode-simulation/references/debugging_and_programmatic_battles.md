# Navigating the Codebase, Calling Battles Programmatically & Battle Debugging

This reference provides developers and AI agents with complete procedures for navigating the gladCode 2 repository, invoking battles programmatically through the API and the container CLIs, and isolating, diagnosing, and fixing battle-related failures.

---

## 🗺️ 1. Navigating the gladCode 2 Codebase

gladCode 2 is a Node.js (web, api, runner) + C containerized simulation platform.

### Subsystem Directory Map

```
gladcode2/
├── api/                     # REST API (Express)
│   ├── route/               # One router per area; each route documented (docs/api/README.md)
│   ├── model/               # Rules and SQL: battle.js (runs battles), ranked-battle.js, duel.js,
│   │                        #   tournament(-round).js, training(-round).js, gladiator.js, ...
│   ├── helpers/             # mysql.js, battle-results.js, gladiator-code.js, runner.js, jwt.js, ...
│   ├── scripts/             # issue-session.js, battle.js, dev-tournament.js, remove-old-battles.js
│   ├── banned_functions.json# Blocked C functions policy
│   └── version              # Current engine version (e.g. 2.10.0)
├── web/                     # Page shells (view/) and the frontend (public/script/, Phaser render.js, Three.js render2/)
├── runner/                  # Express microservice inside Docker network (port 3000)
│   ├── app.js               # POST /:dirname endpoint receiving battle execution requests
│   └── runner.js            # Docker manager (runs gladcode2-vm through the host Docker, monitors errorc.txt & simlog)
├── Payload/                 # C battle simulation engine & API bindings
│   ├── gladCodeServerMain.c # Entrypoint socket server, spawns threads per gladiator
│   ├── gladCodeServerCore.c # Physics, line-of-sight, turn loop, damage mechanics
│   ├── gladCodeAPI.c / .py  # Gladiator client SDKs (compiled into gladiator binaries)
│   └── socket_compile.sh    # GCC and Python invocation script executed inside gladcode2-vm
├── data/                    # runs/ (battle folders, removed after each run), logs/ (simlogs), profpics/
├── migrations/              # Versioned MySQL migration scripts (001_..., 002_...)
└── dev-tools/               # Tournament CLI, dump/restore, news SQL
```

### Core Database Entities

| Table | Role | Key Columns |
| :--- | :--- | :--- |
| `usuarios` | User accounts | `id`, `apelido` (nickname), `lvl`, `xp`, `silver`, `ativo` (last activity timestamp) |
| `gladiators` | Gladiator entities | `cod`, `master` (`usuarios.id`), `name`, `vstr`, `vagi`, `vint`, `code`, `mmr`, `version` |
| `logs` | Simulation execution traces | `id`, `time`, `version`, `hash` (16-char token), `origin` (`ranked`, `duel`, `editor`, `tourn`, `train`), `expired` |
| `reports` | Match outcomes per gladiator | `id`, `log` (`logs.id`), `gladiator` (`gladiators.cod`), `reward` (MMR delta), `started` |
| `duels` | 1v1 challenges | `id`, `user1`, `user2`, `gladiator1`, `gladiator2`, `log` |
| `groups` / `teams` | Tournaments & brackets | Match groupings, participant links, and bracket progress |
| `training_groups` / `gladiator_training` | Trainings | Rounds, groups, scores and survival times |

### Session & Authentication Architecture
- `POST /auth/google` sets the `app_session` HttpOnly cookie, a JWT signed with `JWT_SECRET` holding the user id.
- Locally, skip Google: `docker compose exec -T api node scripts/issue-session.js <userId>` prints a token to send as `Cookie: app_session=<token>`.
- Requests that change data with the cookie must carry an `Origin` of `WEB_URL:WEB_PORT` (for example `-H "Origin: http://localhost:8085"`).

---

## ⚔️ 2. Programmatically Calling Battles

```bash
TOKEN=$(docker compose exec -T api node scripts/issue-session.js <USER_ID> | tail -1)
api() { curl -s -X "$1" -H "Origin: http://localhost:8085" -H "Cookie: app_session=$TOKEN" -H "Content-Type: application/json" ${3:+-d "$3"} "http://localhost:8086/$2"; }
```

### Flow A: A Ranked Battle

Ranked battles follow a two-step handshake (`api/model/ranked-battle.js`).

#### Step 1: Matchmaking
```bash
api POST battles/ranked/match '{"gladiator":<GLADIATOR_COD>}'
```
**What happens under the hood:**
1. Checks that the gladiator is the master's and its `version` matches `api/version` (`GLADIATOR_OUTDATED` otherwise).
2. Takes the 10 gladiators of other masters on the current version closest in rank and draws 4:
   ```sql
   SELECT g.cod FROM gladiators g WHERE g.master != ? AND g.version = ?
   ORDER BY ABS((SELECT COUNT(*) FROM gladiators g2 WHERE g2.mmr < g.mmr) - (SELECT COUNT(*) FROM gladiators WHERE mmr < ?))
   LIMIT 10
   ```
3. Stores the match in `ranked_matches` (10 minutes) and answers the opponents and `match`, its id. The battle claims the row under a lock, so each match is fought once (`MATCH_INVALID` afterwards).

#### Step 2: The Battle
```bash
api POST battles/ranked '{"match":"<MATCH_TOKEN>"}'
```
**What happens under the hood:**
1. Verifies the token belongs to the caller (`MATCH_INVALID` otherwise).
2. Runs the battle (`Battle`, origin `ranked`, not sandboxed): a run folder in `data/runs/<dir>/`, then `POST http://runner:3000/<dir>`.
3. On success, in one transaction:
   - Places the gladiators by death order (`deathOrder()`), computes renown (`calcReward()`) and updates their `mmr`.
   - Flags gladiators the engine marked `"crashed":1` as `version = 'broken'`.
   - Awards XP and silver to the master (`masterRewards()`), writes `reports` and battle stats.
4. Answers `{ hash, error, summary }`.

### Flow B: Editor Test Battle (sandbox)

```bash
api POST battles/test '{"gladiator":{"source":"<full code with setup()>"},"opponents":[{"sample":"Archie"},{"id":<OWN_GLADIATOR>}]}'
```
Opponents are samples (`Archie`, `War Maker`, ...) or the caller's own gladiators. The battle runs in the sandbox (`setHp`, `setPosition`, ... allowed) and answers `{ hash, error }`.

### Flow C: Any Gladiators, Outside the Game Modes (shell)

```bash
docker compose exec -T api node scripts/battle.js 913 864          # outcome only
docker compose exec -T api node scripts/battle.js 913 864 --keep   # stores the log: open /play/<hash>
```
No renown, silver, report or ranking change, no sandbox. Use it to triage gladiators of other masters.

### Flow D: Direct Simulation via Container CLI (No Services)

To test the C server and gladiator code in isolation, build the folder like `Battle` does:

```bash
mkdir -p data/runs/test_run && cp Payload/* data/runs/test_run/

cat << 'EOF' > data/runs/test_run/code0.c
#include "gladCodeCore.c"
setup(){ setName("GladA@UserA"); setSTR(10); setAGI(14); setINT(9); setSlots("0,0,0,0"); }
loop(){ stepForward(); }
EOF

cat << 'EOF' > data/runs/test_run/code1.c
#include "gladCodeCore.c"
setup(){ setName("GladB@UserB"); setSTR(14); setAGI(10); setINT(9); setSlots("0,0,0,0"); }
loop(){ turnRight(); }
EOF

docker run --rm -v "$PWD/data/runs/test_run":/usercode -w /usercode gladcode2-vm sh socket_compile.sh   # [sandbox] [noitems]
cat data/runs/test_run/errorc.txt data/runs/test_run/simlog
rm -rf data/runs/test_run
```

---

## 🔍 3. Investigating & Diagnosing Battle-Related Bugs

### Error Diagnostic Matrix

| Symptom / Response | Root Cause | Diagnosis Step | Solution |
| :--- | :--- | :--- | :--- |
| **HTTP 500 `SQL_ERROR` / unexpected error** | A bug in a model or a query | `docker compose logs api --tail 50` (requests are logged as JSON with their status) | Fix the model; add a Vitest case |
| **`"error": "Traceback..."`** (editor / sandbox runs only) | Python runtime exception in gladiator code | Inspect the `error` field, or run Flow D and read `errorc.txt` | Fix gladiator script syntax/scope bug (e.g. uninitialized global variable like `volta`) |
| **`"error": "codeX.c:... error:"`** | GCC compilation error in gladiator code | Inspect the `error` field | Fix C syntax error, missing semicolon, or invalid function signature |
| **`"error": "INVALID_ATTR"`** | Attribute costs do not add up to 50 points | Inspect `vstr`, `vagi`, `vint` in `gladiators` table | Ensure `attributeCost(STR) + attributeCost(AGI) + attributeCost(INT) == 50` (`api/helpers/gladiator-code.js`) |
| **`"error": "NO_OUTPUT"` / empty `simlog`** | A C gladiator binary never appeared (compile failure, the server prints `CLIENT TIMEOUT` to its own stdout, not to the response), a Python gladiator wrote to stderr before connecting (`PYTHON ERROR`), or the `gladcode2-vm` image is missing (`docker build -t gladcode2-vm Setup`) | Run the battle via Flow D and read `errorc.txt`; `docker image ls gladcode2-vm` | Fix the compile error; saved gladiators already passed a clean test battle |
| **Gladiator dies instantly, `"crashed":1` in `simlog`** | Its client process died mid-battle (Python exception, C segfault); the engine kills it as soon as the socket closes | Re-run it in the editor to see the traceback in `errorc.txt` | Fix the runtime error. Tournament, ranked, duel and training battles still keep the log; ranked battles also flag it `version = 'broken'` |
| **Gladiator stuck in a loop without API calls** | The engine turn timeout sets its hp to 0 and prints `Gladiator X timed out` | Run gladiator isolated; check for infinite while loop missing API action call | Ensure loop calls action functions (`stepForward`, `turn`, `attack`) |
| **30-second Runner Timeout** | Process hung or engine deadlock | `docker compose logs runner` | Runner executes `docker kill {dir}` after 30s. Check socket communication and gladiator loop |

---

### Step-by-Step Matchmaking Bug Hunt (Candidate Pool Triage)

When ranked matchmaking fails for a specific gladiator:

1. **Identify the candidate opponents for the gladiator's MMR**:
   ```sql
   SET @id = <GLAD_COD>;
   SET @user = <USER_ID>;
   SET @version = '2.10.0';
   SELECT g.cod, g.name, u.apelido, g.mmr FROM gladiators g
   JOIN usuarios u ON g.master = u.id
   WHERE g.master != @user AND g.version = @version
   ORDER BY ABS((SELECT count(*) FROM gladiators g2 WHERE g2.mmr < g.mmr) - (SELECT count(*) FROM gladiators WHERE mmr < (SELECT mmr FROM gladiators WHERE cod = @id AND master = @user)))
   LIMIT 10;
   ```

2. **Run Pairwise Isolation Battles** (Flow C):
   ```bash
   for opponent in <OPPONENT_IDS>; do
     echo "VS $opponent: $(docker compose exec -T api node scripts/battle.js <USER_GLAD> $opponent | tr -d '\n ')"
   done
   ```
   If a specific opponent triggers an error, that gladiator's code contains a compilation or runtime defect. Ranked battles flag gladiators that crash at runtime as `version = 'broken'`, which removes them from this pool until their owner saves them again.

3. **Verify Post-Battle Reward Computations**:
   `calcReward()` and the crash detection live in `api/helpers/battle-results.js`; their tests hold golden values from the old PHP implementation and a real crashed engine log:
   ```bash
   docker compose exec -T api npx vitest run tests/unit/helpers/battle-results.test.js
   ```

4. **Engine Crash Regression Battles**:
   After changing `Payload/` engine code, run real battles in `gladcode2-vm` (healthy, first-turn and mid-battle crashes in C and Python, forged stderr, `speak()` JSON injection). Each must produce a valid simlog flagging exactly the crashed gladiators:
   ```bash
   bash tests/engine/run.sh
   ```

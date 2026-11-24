---
name: gladcode-simulation
description: Comprehensive guide and procedural workflow for building, running, testing, debugging, and maintaining gladCode battle simulations, C/Python/JavaScript payload APIs, the API's battle runner, the runner service, dev tools, and database state. Make sure to use this skill whenever working on gladCode battle logic, gladiator C/Python/JavaScript code compilation, gladCode API functions, runner service, simlog JSON traces, tournament dev-tools, or debugging simulation timeouts and errors.
---

# gladCode Battle Simulation Skill

This skill provides step-by-step procedures and reference specifications for working with the **gladCode 2** battle simulation pipeline: the API's `Battle` model, the Express runner service, the C engine and its C/Python/JavaScript gladiator runtime, the replay renderers, and the dev tools.

---

## ⚡ Host Environment Constraint

> [!IMPORTANT]
> **No Local Node.js or Python**: Node.js and Python are not installed directly on the host shell. Always execute commands, run containerized scripts, or perform database operations via **Docker**:
> - API: `docker compose exec api <command>` (tests: `docker compose exec -T api npx vitest run`)
> - Runner: `docker compose exec runner <command>`
> - Engine: `docker run --rm -v <run folder>:/usercode -w /usercode gladcode2-vm sh socket_compile.sh`
> - MySQL: `docker compose exec mysql mysql -u root -p`

---

## 📚 Detailed References

For specialized component specifications, consult these reference guides:

- 📜 **[Gladiator API Reference (C, Python, JavaScript)](references/c_api_reference.md)**: Every function in `gladCodeAPI.c`, `gladCodeAPI.py` and `gladCodeAPI.js`, the TCP socket protocol and how each client converts answers, the JavaScript client (`gladCodeCore.js`) and the steps to add a language.
- ⚙️ **[Battle Flow & Execution Architecture](references/battle_flow.md)**: The API's `Battle` model, the runner, container VM isolation, `socket_compile.sh`, the `simlog` format, and the replay.
- 🔬 **[Debugging & Programmatic Battles](references/debugging_and_programmatic_battles.md)**: Calling test, ranked and duel battles through the API with curl, and diagnostic procedures for battle bugs.
- 🗄️ **[Dev Tools & Tournament Management](references/dev_tools.md)**: The `/dev-tools` page, `dev-tools/tournament.sh` and `dev-tools/dump_restore.sh`.
- ⚖️ **[Balance Patch Workflow](references/balance_patch.md)**: End-to-end procedure for rebalances — tuning payload values, verifying the server compile, syncing the manual + function JSONs + regenerated bundle, bumping `api/version`, and publishing the news post.
- 🗃️ **[Database Migrations](references/database_migrations.md)**: Versioned MySQL flow (`migrations/`, `db:migrate`, deploy hook) ported from node-aec.

---

## 🔄 Standard Workflows

### Workflow 1: Debugging a Failed Simulation or Empty `simlog`

1. **Read the battle's error**: battle endpoints answer `{ hash, error }`; with no log, an editor test battle's `error` carries the compiler output (GCC errors, Python tracebacks, JavaScript errors) or an engine code (`INVALID_ATTR`, ...); battles that count (ranked, duel, tournament, training, `scripts/battle.js`) answer only `NO_OUTPUT` and log the output in the API logs as `battle_without_log` (`docker compose logs api`), since it quotes every gladiator's code. Saving a gladiator that fails its test battle answers `GLADIATOR_TEST_FAILED` with the output in `data.error`.
2. **Reproduce by hand** (Workflow 2): the API removes run folders when the runner answers, so rebuild the folder and run the engine directly to read `errorc.txt` and `simlog`.
3. **Check for Timeout or Infinite Loop**:
   - If `errorc.txt` is empty but `simlog` is missing or truncated, check if the gladiator script was stuck in an infinite loop without yielding to the C server engine (`gladCodeServerMain`).
   - Hard timeouts (30 seconds) trigger container termination via `docker kill {dirname}` in `runner/runner.js`.
4. **Verify Banned Function Violations**:
   Ensure user code does not invoke forbidden functions listed in `api/banned_functions.json` (`setPosition`, `setHp`, `setAp`, `lvlUp`, `mudaPosicao`, `mudaPv`, `mudaPh`, `sobeNivel`). They only work in editor test battles (`sandbox`).
5. **Crashes in counted battles** are read from the simlog (`"crashed":1`, `crashedGladiators()` in `api/helpers/battle-results.js`), never from `errorc.txt`, which gladiators can write to.

---

### Workflow 2: Running a Manual Local Simulation

To isolate and test battle payload binaries without going through the API (same file layout `api/model/battle.js` builds; `tests/engine/run.sh` does this for its regression battles):

```bash
mkdir -p data/runs/debug_battle && cp Payload/* data/runs/debug_battle/

# Gladiator 0 (C): the setup the API generates, then the user's loop
cat << 'EOF' > data/runs/debug_battle/code0.c
#include "gladCodeCore.c"
setup(){ setName("Walker@nick0"); setSTR(10); setAGI(14); setINT(9); setSlots("0,0,0,0"); }
loop(){ stepForward(); }
EOF

# Gladiator 1 (C)
cat << 'EOF' > data/runs/debug_battle/code1.c
#include "gladCodeCore.c"
setup(){ setName("Turner@nick1"); setSTR(10); setAGI(14); setINT(9); setSlots("0,0,0,0"); }
loop(){ turnRight(); }
EOF

# Compile every codeN file and run the engine (add "sandbox" or "noitems" like the runner does)
docker run --rm -v "$PWD/data/runs/debug_battle":/usercode -w /usercode gladcode2-vm sh socket_compile.sh

cat data/runs/debug_battle/errorc.txt data/runs/debug_battle/simlog
rm -rf data/runs/debug_battle
```

---

### Workflow 3: Backing Up and Restoring Database

```bash
dev-tools/dump_restore.sh dump      # writes dev-tools/dump_gladcode.sql (gitignored)
dev-tools/dump_restore.sh restore
```

---

### Workflow 4: Managing Tournaments via CLI

```bash
dev-tools/tournament.sh list            # test tournaments
dev-tools/tournament.sh reset 5 1       # tournament 5 (id or hash) back to round 1
dev-tools/tournament.sh list-real 1 10  # production tournaments (page 1, limit 10)
dev-tools/tournament.sh reset 42 3      # works for real tournaments too
```

### Workflow 5: Shipping a Balance Patch

Rebalances follow a fixed five-step flow — full procedure, commands, and
pre-commit checklist in [Balance Patch Workflow](references/balance_patch.md):

1. Tune values in `Payload/gladCodeGlobals.c` (`abilitycost`) and
   `Payload/gladCodeServerAPI.c` (watch two-spot values like teleport range).
2. Prove the server compiles and runs (`gcc` line from `socket_compile.sh`
   plus an end-to-end sim with `while(1)` bots). No image rebuild needed.
3. Sync `web/view/manual.html`, `web/public/script/functions/*.json`,
   regenerate the bundles with `web/scripts/compress-functions.js`, bump
   `api/version`.
4. Add the patch-notes `INSERT` under `dev-tools/news/` and apply it
   to the production `news` table.
5. Check off TODO.MD and commit (simulation, docs, news/skill slices).

---

## 🛡️ Best Practices & Quality Expectations

- **Code storage**: Gladiator source is stored as written; escape it where it is displayed, never before saving.
- **Access checks**: API routes that touch a master's data use `auth()` and the models filter by the user's id; admin tools use `auth({ admin: true })`.
- **Battles that count** (ranked, duel, tournament, training) never run in the sandbox; tournaments run with `noitems`.
- **Configuration** comes from `.env` only; never commit secrets.

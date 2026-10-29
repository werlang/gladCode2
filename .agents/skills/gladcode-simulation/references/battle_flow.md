# Battle Simulation Execution Flow & Architecture

This reference describes the step-by-step lifecycle of a gladiator battle simulation in gladCode 2, from user interaction in the web browser down to the C game engine and the selectable Phaser.js or Three.js visualization.

---

## 🔁 Complete Battle Lifecycle

```
[Browser Client]
   │  1. Asks the API for a battle (POST /battles/test, /battles/ranked, /duels/:id/battle,
   │     /tournament-rounds/:hash/groups/:group/battle, /training-rounds/:hash/advance)
   ▼
[API: model/battle.js Battle]
   │  2. Creates data/runs/{dir}/ (gladiator code checked against banned_functions.json when saved)
   │  3. Copies Payload/ files & each gladiator's code (code0.c, code1.py, ...)
   │  4. HTTP POST to http://runner:3000/{dir} with { sandbox?, noitems? }
   ▼
[Runner Express Service]
   │  5. Copies /requests/{dir} (data/runs on the host) to the gladcode_tmp_run volume
   │  6. Spawns Docker VM: gladcode2-vm
   ▼
[Docker VM (gladcode2-vm)]
   │  7. Executes socket_compile.sh
   │  8. Compiles gladiators: gcc -o code0 code0.c -lm
   │  9. Launches gladCodeServerMain with gladiator count
   ▼
[C Engine (gladCodeServerMain)]
   │ 10. Opens TCP sockets, binds threads per gladiator
   │ 11. Executes turn loop, updates stats, writes simlog JSON
   ▼
[Runner & API Response]
   │ 12. Runner reads simlog JSON or errorc.txt and answers the API
   │ 13. API stores the log (logs row + data/logs/{id}), applies the battle's rules
   │     (helpers/battle-results.js) and answers { hash, error }
   ▼
[Shared Playback State (script/playback.js + script/render2/battle-state.js)]
   │ 14. Expands incremental patches into complete 100 ms frames
   ▼
[Selected Renderer]
   ├── Classic 2D: Phaser.js (script/render.js)
   └── Coliseum 3D: Three.js (script/render2.js)
```

---

## 📁 Temporary Run Workspace (`data/runs/{dir}/`)

When a simulation starts, the API's `Battle` (`api/model/battle.js`) allocates a unique directory, removed once the runner answers, containing:

| File | Source / Role | Description |
| :--- | :--- | :--- |
| `code0.c` / `code0.py` | User Gladiator 1 | Source code for first combatant. |
| `code1.c` / `code1.py` | User Gladiator 2 | Source code for second combatant. |
| `gladCodeServerMain.c` | `Payload/` | Multi-threaded C socket server. |
| `gladCodeServerCore.c` | `Payload/` | Core battle mechanics & spatial engine. |
| `gladCodeAPI.c` / `.h` | `Payload/` | Client socket library. |
| `socket_compile.sh` | `Payload/` | Compilation script for VM. |
| `errorc.txt` | Engine Generated | Compiler error log output. |
| `simlog` | Engine Generated | Battle execution log (JSON trace). |

---

## 🐳 Runner Microservice & Docker Execution

The Runner service (`runner/app.js` and `runner/runner.js`) manages execution inside isolated containers:

- **Express Port**: 3000
- **Container Image**: `gladcode2-vm` (`docker build -t gladcode2-vm Setup`)
- **Docker Command**:
  ```bash
  docker run --rm --name {hash} \
    -v gladcode_tmp_run:/usercode \
    -w /usercode/{hash} \
    --cpu-period=100000 \
    --cpu-quota=50000 \
    gladcode2-vm sh socket_compile.sh [sandbox] [noitems]
  ```
- **Execution Limits**:
  - CPU quota set to 50,000 (50% of single CPU core).
  - Hard timeout: 30 seconds. On expiry, `runner.js` issues `docker kill {hash}` and cleans up run directories.

---

## 📜 `simlog` JSON Trace Format

The simulation produces a JSON array whose first entry is complete and whose later entries contain only changed fields. `projectiles` is a complete current-frame list rather than an inherited patch. An inactive gladiator may be emitted as `[]`, which means that fighter's previous state is retained.

```json
[
  {
    "simtime": 0.1,
    "poison": 17.68,
    "glads": [
      {
        "id": 0,
        "x": 10.5,
        "y": 15.2,
        "head": 90,
        "hp": 100,
        "maxhp": 100,
        "ap": 50,
        "maxap": 50,
        "action": 8,
        "message": "For Honor!",
        "buffs": {
          "burn": { "value": 0, "timeleft": 0 },
          "movement": { "value": 0, "timeleft": 0 },
          "resist": { "value": 0, "timeleft": 0 },
          "invisible": { "value": 0, "timeleft": 0 },
          "stun": { "value": 0, "timeleft": 0 }
        }
      },
      {
        "id": 1,
        "x": 20.0,
        "y": 8.5,
        "head": 270,
        "hp": 120,
        "maxhp": 120,
        "ap": 40,
        "maxap": 40,
        "action": 10,
        "message": "",
        "buffs": {
          "burn": { "value": 0, "timeleft": 0 },
          "movement": { "value": 0, "timeleft": 0 },
          "resist": { "value": 0, "timeleft": 0 },
          "invisible": { "value": 0, "timeleft": 0 },
          "stun": { "value": 0, "timeleft": 0 }
        }
      }
    ],
    "projectiles": []
  },
  {
    "simtime": 0.2,
    "glads": [
      { "x": 10.7 },
      []
    ],
    "projectiles": [
      { "id": 7, "owner": 0, "type": 0, "x": 11.1, "y": 15.2, "head": 90 }
    ]
  }
]
```

`script/render2/battle-state.js` applies the legacy recursive merge semantics without mutating the source log. The selected renderer then reads the same complete frame data for positions, headings, poison radius, projectiles, health and ability points, buffs, messages, breakpoints, effects, and audio.

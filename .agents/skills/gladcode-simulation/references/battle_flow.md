# Battle Simulation Execution Flow & Architecture

This reference describes the step-by-step lifecycle of a gladiator battle simulation in gladCode 2, from user interaction in the web browser down to the C game engine and Phaser.js visualization.

---

## 🔁 Complete Battle Lifecycle

```
[Browser Client]
   │  1. Triggers Match/Test Battle (POST to back_simulation.php)
   ▼
[Apache PHP Engine]
   │  2. Creates /public_html/runs/{hash}/
   │  3. Copies payload C files & user code (code0.c, code1.c)
   │  4. Validates banned_functions.json
   │  5. HTTP POST to http://runner:3000/{hash}
   ▼
[Runner Express Service]
   │  6. Copies /phppayload/{hash} to /runs/{hash}
   │  7. Spawns Docker VM: gladcode2-vm
   ▼
[Docker VM (gladcode2-vm)]
   │  8. Executes socket_compile.sh
   │  9. Compiles gladiators: gcc -o code0 code0.c -lm
   │ 10. Launches gladCodeServerMain with gladiator count
   ▼
[C Engine (gladCodeServerMain)]
   │ 11. Opens TCP sockets, binds threads per gladiator
   │ 12. Executes turn loop, updates stats, writes simlog JSON
   ▼
[Runner & PHP Response]
   │ 13. Reads simlog JSON or errorc.txt
   │ 14. Returns JSON payload to browser
   ▼
[Phaser.js Visualizer (script/render.js)]
   │ 15. Replays turn-by-turn combat animation
```

---

## 📁 Temporary Run Workspace (`public_html/runs/{hash}/`)

When a simulation starts, `back_simulation.php` allocates a unique hash directory containing:

| File | Source / Role | Description |
| :--- | :--- | :--- |
| `code0.c` / `code0.py` | User Gladiator 1 | Source code for first combatant. |
| `code1.c` / `code1.py` | User Gladiator 2 | Source code for second combatant. |
| `gladCodeServerMain.c` | `payload/` | Multi-threaded C socket server. |
| `gladCodeServerCore.c` | `payload/` | Core battle mechanics & spatial engine. |
| `gladCodeAPI.c` / `.h` | `payload/` | Client socket library. |
| `socket_compile.sh` | `payload/` | Compilation script for VM. |
| `errorc.txt` | Engine Generated | Compiler error log output. |
| `simlog` | Engine Generated | Battle execution log (JSON trace). |

---

## 🐳 Runner Microservice & Docker Execution

The Runner service (`runner/app.js` and `runner/runner.js`) manages execution inside isolated containers:

- **Express Port**: 3000
- **Container Image**: `gladcode2-vm` (built from `pswerlang/gladcode2-vm`)
- **Docker Command**:
  ```bash
  docker run --rm --name {hash} \
    -v gladcode_tmp_run:/usercode \
    -w /usercode/{hash} \
    --cpu-period=100000 \
    --cpu-quota=50000 \
    gladcode2-vm sh socket_compile.sh
  ```
- **Execution Limits**:
  - CPU quota set to 50,000 (50% of single CPU core).
  - Hard timeout: 30 seconds. On expiry, `runner.js` issues `docker kill {hash}` and cleans up run directories.

---

## 📜 `simlog` JSON Trace Format

The simulation produces a JSON array representation of turn-by-turn battle events:

```json
[
  {
    "turn": 1,
    "time": 0.1,
    "gladiators": [
      {
        "id": 0,
        "x": 10.5,
        "y": 15.2,
        "head": 90,
        "hp": 100,
        "ap": 50,
        "action": "walk",
        "speak": "For Honor!"
      },
      {
        "id": 1,
        "x": 25.0,
        "y": 15.2,
        "head": 270,
        "hp": 95,
        "ap": 45,
        "action": "attackMelee",
        "damageTaken": 5
      }
    ]
  }
]
```

Client frontend `script/render.js` reads this JSON structure, initializing Phaser.js sprites, health bars, chat bubbles, hit animations, and sound effects.

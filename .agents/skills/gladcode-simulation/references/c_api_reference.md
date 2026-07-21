# gladCode Gladiator API Reference

This reference documents the client-side API functions available to user gladiator code in **C** (`gladCodeAPI.c`) and **Python** (`gladCodeAPI.py`).

---

## 🛰️ Architecture & Socket IPC Protocol

All user functions operate via synchronous TCP socket messages sent to `gladCodeServerMain`. The client sends a command string formatted like:

```
<command_name> [arg1] [arg2] ...
```

The server processes the movement/attack turn, updates the arena simulation state, and returns a response string (float execution time, boolean success flag, or queried value).

---

## 🏃 Movement & Orientation

| C Function | Python Equivalent | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `float stepForward()` | `stepForward()` | `float` | Move 1 unit forward. Returns action execution time. |
| `float stepBack()` | `stepBack()` | `float` | Move 1 unit backward. Returns action execution time. |
| `float stepLeft()` | `stepLeft()` | `float` | Strafe 1 unit left. Returns action execution time. |
| `float stepRight()` | `stepRight()` | `float` | Strafe 1 unit right. Returns action execution time. |
| `float turnLeft(float ang)` | `turnLeft(ang)` | `float` | Turn left by `ang` degrees. |
| `float turnRight(float ang)` | `turnRight(ang)` | `float` | Turn right by `ang` degrees. |
| `int turnTo(float x, float y)` | `turnTo(x, y)` | `int` | Rotate body facing towards grid coordinate `(x, y)`. |
| `int turnToTarget()` | `turnToTarget()` | `int` | Rotate body directly facing the currently locked target. |
| `int turnToAngle(float ang)` | `turnToAngle(ang)` | `int` | Rotate body directly to absolute arena angle `ang`. |

---

## ⚔️ Combat & Abilities

| C Function | Python Equivalent | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `int attackMelee()` | `attackMelee()` | `int` | Execute basic melee attack. |
| `int attackRanged()` | `attackRanged()` | `int` | Execute basic ranged projectile attack. |
| `int castSpell(int spellId)` | `castSpell(spellId)` | `int` | Cast spell by numerical ID (`FIREBALL`, `HEAL`, `TELEPORT`, etc.). |
| `int speak(char* text)` | `speak(text)` | `int` | Display chat bubble above gladiator sprite in visualization. |

---

## 📊 State & Attribute Queries

| C Function | Return Type | Description |
| :--- | :--- | :--- |
| `float getHp()` | `float` | Get current health points. |
| `float getHpMax()` | `float` | Get maximum health points. |
| `float getAp()` | `float` | Get current action/ability points. |
| `float getApMax()` | `float` | Get maximum action points. |
| `float getX()` | `float` | Get current X grid coordinate. |
| `float getY()` | `float` | Get current Y grid coordinate. |
| `float getHead()` | `float` | Get current facing angle in degrees (0–360). |
| `int getSTR()` | `int` | Get Strength stat. |
| `int getAGI()` | `int` | Get Agility stat. |
| `int getINT()` | `int` | Get Intelligence stat. |
| `float getSimTime()` | `float` | Get current simulation elapsed time in seconds. |

---

## 🎯 Perception & Targeting

| C Function | Return Type | Description |
| :--- | :--- | :--- |
| `int getEnemiesCount()` | `int` | Count visible enemies in sight range. |
| `float getTargetX()` | `float` | Get target's current X position. |
| `float getTargetY()` | `float` | Get target's current Y position. |
| `float getTargetDistance()` | `float` | Get distance to locked target. |
| `float getTargetHead()` | `float` | Get angle to locked target. |
| `float getTargetHp()` | `float` | Get locked target's remaining HP. |

---

## 🚫 Security Restrictions & Banned Functions

User code runs through security screening before compilation. Calling forbidden functions will result in simulation refusal:

```json
{
    "functions": [
        "setPosition", "setHp", "setAp", "lvlUp",
        "mudaPosicao", "mudaPv", "mudaPh", "sobeNivel"
    ]
}
```

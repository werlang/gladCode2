# Dev Tools & Tournament Administration Guide

This reference documents the tournament testing tools, database utilities, and administration scripts. The tournament tools live in the API (`api/model/dev-tournament.js`), shared by a web page and a CLI; `dev-tools/README.md` has the summary.

---

## 🧰 Dev Tools Architecture

```
api/model/dev-tournament.js   # Test tournaments, reset to a round, export / import
api/route/admin.js            # /admin/tournaments/... (auth({ admin: true }), ADMIN_EMAILS)
api/scripts/dev-tournament.js # The same operations from the shell (no sign-in)
web/view/dev-tools.html       # /dev-tools page (script/dev-tools.js, models/dev-tools.js)
dev-tools/
├── tournament.sh             # CLI wrapper: docker compose exec -T api node scripts/dev-tournament.js
├── dump_restore.sh           # Database backup & restore through the mysql service
├── dump_gladcode.sql         # Database dump (gitignored)
└── news/news-<version>.sql   # Release notes to insert into the news table
```

Test tournaments are marked `[DEV-TEST]` in their description; only they can be deleted.

---

## 🗄️ Database Backup & Restore (`dump_restore.sh`)

Reads the credentials from `.env` and runs `mysqldump` / `mysql` in the `mysql` service. Run it from the host:

```bash
dev-tools/dump_restore.sh dump      # dev-tools/dump_gladcode.sql
dev-tools/dump_restore.sh restore
```

---

## 🏆 Tournament CLI Management (`tournament.sh`)

| Command | Usage | Description |
| :--- | :--- | :--- |
| `list` | `dev-tools/tournament.sh list` | Test tournaments with teams, gladiators, round and hash. |
| `create` | `dev-tools/tournament.sh create [name] [teams] [maxtime] [manager_email]` | Public test tournament of random full teams (three gladiators each, never the manager's); the manager defaults to the first `ADMIN_EMAILS` account. Not started. |
| `list-real` | `dev-tools/tournament.sh list-real [page] [limit]` | Real tournaments, newest first (default: page 1, 10 per page). |
| `reset` | `dev-tools/tournament.sh reset <id\|hash> <round>` | Takes a started tournament (test or real) back to the start of a round: later rounds and the battle logs from that round on are deleted, gladiators killed from that round on come back, the round's choices are cleared and its choosing time restarts. `reset-real` is an alias. |
| `cleanup` | `dev-tools/tournament.sh cleanup <id>` | Deletes a test tournament with its teams, rounds and battle logs (real ones are refused). Logs another tournament still shows are kept. |
| `cleanup-all` | `dev-tools/tournament.sh cleanup-all` | Deletes every test tournament (asks for `YES_DELETE_ALL`). |
| `export` | `dev-tools/tournament.sh export <id\|hash> [file]` | Writes the tournament, teams, rounds, gladiators and battle logs (file contents included) to JSON; users only by id and nick. |
| `import` | `dev-tools/tournament.sh import <file> [id]` | Creates a tournament from an export, or replaces tournament `<id>`'s teams, rounds and logs. Missing gladiators are created with their ids, logs already present (same hash) are reused, a taken hash gets a new one. Managers and masters must exist. |

---

## 🌐 Web Cockpit (`/dev-tools`)

Open `http://localhost:<WEB_PUBLISH>/dev-tools` signed in with an account listed in `ADMIN_EMAILS` (anyone else is sent home).

- **Test Tournaments**: bootstrap, reset a round, view, export and delete.
- **Production**: paginated real tournaments with reset (typed confirmation) and export.
- **Export & Import**: download an export by id or hash; import a file as a new tournament or over an existing one.

---

## 📊 Database Schema Reference

Key tables involved in tournament management:

- **`tournament`**: `id`, `name`, `password` (empty for public), `description`, `manager`, `maxteams`, `flex`, `maxtime` (round time, `TIME`), `hash` (empty until started).
- **`teams`**: `id`, `tournament`, `name`, `password` (the team's join word), `modified`.
- **`gladiator_teams`**: `team`, `gladiator`, `visible` (teammates may read the code), `dead` (round it died in, 0 when alive).
- **`groups`**: `id`, `round`, `log` (`logs.id` once fought), `deadline` (end of the choosing time, `DATETIME` without fractions), `locked` (a battle is running).
- **`group_teams`**: `groupid`, `team`, `gladiator` (the team's pick for the round), `lasttime` (survival time, winners + 1000).

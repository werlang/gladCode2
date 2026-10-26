# Dev tools

Tools for testing tournaments and handling the database during development. The tournament tools
run on the API (`api/model/dev-tournament.js`), so the page and the shell share one implementation.

| What | Where |
| --- | --- |
| Tournament cockpit (web) | `/dev-tools` on the web service, e.g. `http://localhost:8085/dev-tools` |
| Tournament CLI | `dev-tools/tournament.sh` (runs `api/scripts/dev-tournament.js` in the `api` container) |
| Admin API | `/admin/tournaments/...` (`api/route/admin.js`) |
| Database dump and restore | `dev-tools/dump_restore.sh` |
| Release notes to publish as news | `dev-tools/news/news-<version>.sql` |
| Synty piece viewer | `web/public/dev-tools/synty-viewer.html` (see `docs/synty-assets/README.md`) |

## Access

The page and the admin API answer only to accounts whose email is in `ADMIN_EMAILS` (`.env`); sign
in on the site first. The CLI needs no sign-in: it runs inside the `api` container.

## Tournament tools

- **Test tournaments** carry `[DEV-TEST]` in their description. They are public, flexible and filled
  with random full teams (three gladiators each, never the manager's). Only they can be deleted,
  with their teams, rounds and battle logs.
- **Reset** takes a started tournament (test or real, by id or hash) back to the start of a round:
  later rounds and the battle logs from that round on are deleted, the gladiators killed from that
  round on come back, the round's choices are cleared and its choosing time starts again.
- **Export** writes a tournament with its teams, rounds, gladiators and battle logs (file contents
  included) to JSON. Users are listed by id and nick only.
- **Import** creates a new tournament from an export, or replaces the teams, rounds and logs of an
  existing one (`update`). Gladiators missing locally are created with their ids; logs already here
  (same hash) are reused. Managers and masters must exist in the database.

```bash
dev-tools/tournament.sh create "Speed Trial" 8 00:10:00
dev-tools/tournament.sh list
dev-tools/tournament.sh reset 129 2          # or the tournament's hash
dev-tools/tournament.sh export 129 cup.json
dev-tools/tournament.sh import cup.json      # new tournament
dev-tools/tournament.sh import cup.json 129  # replace tournament 129
dev-tools/tournament.sh cleanup 129
dev-tools/tournament.sh help
```

## Database

```bash
dev-tools/dump_restore.sh dump      # writes dev-tools/dump_gladcode.sql (gitignored)
dev-tools/dump_restore.sh restore
```

## News

```bash
docker compose exec -T mysql mysql -u root -p --default-character-set=utf8mb4 gladcode < dev-tools/news/news-2.10.0.sql
```

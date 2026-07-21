# Dev Tools & Tournament Administration Guide

This reference documents the tournament testing suite, database utilities, and administration scripts located in `public_html/dev-tools/`.

---

## 🧰 Dev Tools Architecture

The `dev-tools` ecosystem allows developers and administrators to manage tournaments, test combat matches, reset tournament rounds, and backup/restore database state without raw SQL queries.

```
public_html/dev-tools/
├── index.html                  # Web GUI management dashboard
├── index.js                    # Client-side JavaScript for GUI
├── tournament.sh               # Primary CLI management script
├── dump_restore.sh             # Database backup & restore script
├── dump_gladcode.sql           # Database dump file
├── list_tournaments.php        # API: List test tournaments
├── list_real_tournaments.php   # API: List production tournaments (paginated)
├── reset_tournament.php        # API: Reset test or real tournament state
├── cleanup_tournament.php      # API: Delete tournament records
└── bootstrap_tournament.php    # API: Seed test tournament data
```

---

## 🗄️ Database Backup & Restore (`dump_restore.sh`)

The `dump_restore.sh` script automatically extracts database credentials from `public_html/config.json` or `.env`.

> [!IMPORTANT]
> Always execute scripts from inside the `apache` Docker container.

### Commands

```bash
# Enter Apache container
docker compose exec apache bash
cd /var/www/html/dev-tools

# Dump current database state to dump_gladcode.sql
./dump_restore.sh dump

# Restore database state from dump_gladcode.sql
./dump_restore.sh restore
```

---

## 🏆 Tournament CLI Management (`tournament.sh`)

`tournament.sh` provides CLI administration for both test environments and production tournament data.

### Test Tournament Commands

| Command | Usage | Description |
| :--- | :--- | :--- |
| `list` | `./tournament.sh list` | List all test tournaments with their status. |
| `create` | `./tournament.sh create` | Bootstrap a new test tournament with sample gladiators. |
| `reset` | `./tournament.sh reset <id>` | Reset matches and scores for test tournament `<id>`. |
| `cleanup` | `./tournament.sh cleanup <id>` | Delete test tournament `<id>` and associated records. |

### Production / Real Tournament Commands

| Command | Usage | Description |
| :--- | :--- | :--- |
| `list-real` | `./tournament.sh list-real [page] [limit]` | List production tournaments with pagination support (default: page 1, 10 per page). |
| `reset-real` | `./tournament.sh reset-real <id>` | Reset a production tournament by ID, clearing match results. |
| `export` | `./tournament.sh export <id>` | Export tournament data to JSON format. |
| `import` | `./tournament.sh import <file>` | Import tournament data from JSON file. |

---

## 🌐 Web Dashboard Interface (`index.html`)

Access the visual web dashboard by navigating to:
**[http://localhost:80/dev-tools/index.html](http://localhost:80/dev-tools/index.html)**

Key Features:
- **Tournament Overview**: Filter by test vs real tournaments with real-time status badges.
- **Paginated Listing**: Handle hundreds of tournaments seamlessly with pagination controls.
- **One-Click Resets**: Interactively reset tournament brackets or re-run rounds.
- **SQL Backup Status**: View last database dump timestamp and trigger restores.

---

## 📊 Database Schema Reference

Key tables involved in tournament management:

- **`tournament`**: Tournament metadata (`id`, `name`, `type`, `state`, `created_at`).
- **`tournament_run`**: Specific round executions (`id`, `tournament_id`, `run_number`, `status`).
- **`tourn_matches`**: Individual battle match records between gladiators (`id`, `tournament_id`, `glad1_id`, `glad2_id`, `winner_id`, `simlog_path`).
- **`gladiators`**: Gladiator algorithms (`id`, `master`, `name`, `code`, `hp`, `ap`, `str`, `agi`, `int`).

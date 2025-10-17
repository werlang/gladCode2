# Tournament Dev Tools

> **Purpose**: Tools for creating, managing, and testing tournaments during development without affecting production data.

## 📁 What's Here

```
dev-tools/
├── index.html                    # Web UI - START HERE
├── dump_restore.sh              # Database backup/restore
├── tournament.sh                # CLI tool for all operations
│
├── API Endpoints (used by UI/CLI):
│   ├── bootstrap_tournament.php   # Create test tournament
│   ├── list_tournaments.php       # List test tournaments
│   ├── list_real_tournaments.php  # List production tournaments (paginated)
│   ├── reset_tournament.php       # Reset tournament to specific round
│   ├── cleanup_tournament.php     # Delete specific test tournament
│   └── cleanup_all.php            # Delete ALL test tournaments
│
└── tokens/                        # Auto-generated cleanup tokens (gitignored)
```

## 🚀 Quick Start

### 1. Open Web Interface (Recommended)
```bash
open http://localhost/dev-tools/index.html
```
Or use CLI: `./tournament.sh web`

### 2. Create Test Tournament
- Fill form (or use defaults)
- Click "Create Tournament"
- **Save the cleanup token shown!** You need it to delete/reset the tournament

### 3. Work With Tournament
- Use regular tournament interface: http://localhost/tournament.php
- Your test tournament appears alongside real ones

### 4. Clean Up When Done
- Use the token from step 2: `./tournament.sh cleanup <token>`
- Or delete all test tournaments: `./tournament.sh cleanup-all`

## 🛠️ Tools Reference

### Web Interface (`index.html`)
Full-featured GUI with:
- Create test tournaments
- List & paginate production tournaments
- Reset tournaments to any round
- Delete test tournaments
- View cleanup tokens

**Best for**: Visual workflow, exploring features

### CLI Tool (`tournament.sh`)

```bash
# Create tournament
./tournament.sh create "My Test" 8 00:10:00
#                       name    teams  time-limit

# List tournaments
./tournament.sh list              # Test tournaments
./tournament.sh list-real 1 20    # Production (page 1, 20 per page)

# Reset tournament
./tournament.sh reset <token> 3   # Reset to round 3

# Delete tournament
./tournament.sh cleanup <token>   # Delete specific
./tournament.sh cleanup-all       # Delete ALL (requires confirmation)

# Help
./tournament.sh help
```

**Best for**: Automation, scripts, quick commands

### Database Tools (`dump_restore.sh`)

```bash
# Backup database
./dump_restore.sh dump

# Restore database
./dump_restore.sh restore
```

Reads credentials from `../../.env` automatically.
Creates `dump_gladcode.sql` in current directory.

**Best for**: Before/after risky operations, sharing test data

## 🔑 Understanding Tokens

**What**: 16-character hex string (e.g., `a1b2c3d4e5f6g7h8`)

**Purpose**: Identifies test tournaments for deletion/reset

**Storage**: `tokens/` directory (auto-created, gitignored)

**When created**: Every time you create a test tournament

**Why needed**: Prevents accidental deletion of production tournaments

### Token vs Hash
- **Token** (16 chars): Test tournaments only, for safe operations
- **Hash** (longer): Production tournaments, used with `reset-real`

## 📊 Test vs Production Tournaments

| Feature | Test Tournaments | Production Tournaments |
|---------|-----------------|------------------------|
| Created by | `bootstrap_tournament.php` | Users via web interface |
| Listed in | `list_tournaments.php` | `list_real_tournaments.php` |
| Deletable | ✅ Yes (with token) | ❌ No (data integrity) |
| Resettable | ✅ Yes (with token) | ✅ Yes (with hash, careful!) |
| Paginated | ❌ No (few items) | ✅ Yes (61+ tournaments) |

## 🎯 Common Workflows

### Testing Tournament Features
1. Create test tournament: `./tournament.sh create`
2. Save token from response
3. Test your feature
4. Reset if needed: `./tournament.sh reset <token> 1`
5. Cleanup: `./tournament.sh cleanup <token>`

### Resetting Production Tournament (Careful!)
1. List tournaments: `./tournament.sh list-real 1 50`
2. Find tournament hash in response
3. Reset: Use web UI or call `reset_tournament.php?hash=<hash>&round=<round>`
4. Verify rounds were deleted in database

### Database Snapshot for Testing
```bash
# Before risky changes
./dump_restore.sh dump

# Test your changes...

# If something breaks
./dump_restore.sh restore
```

## ⚠️ Important Notes

### Security
- All tools require Docker environment running
- No authentication checks (dev environment only!)
- **Never expose `/dev-tools/` in production**
- `.htaccess` blocks token directory from web access

### Performance
- Test tournaments use real database tables
- Large tournaments (50+ teams) may slow down UI
- Pagination added for production tournament lists (10 per page default)

### Data Integrity
- Test tournaments mix with production data
- Always use tokens for test tournament operations
- Production tournaments cannot be deleted (only reset)
- Resetting deletes ALL rounds after specified round number

## 🐛 Troubleshooting

### "Token not found"
- Token expired or typo
- Check `tokens/` directory for valid tokens
- Recreate tournament if token lost

### "Tournament not found"
- Tournament already deleted
- Check with `./tournament.sh list`

### Empty tournament list
- No tournaments created yet
- Or listing wrong type (test vs production)

### Database backup fails
- Check Docker containers running: `docker compose ps`
- Verify `.env` file exists with correct password
- Check disk space

## 📝 File Purposes

| File | Purpose | When to Use |
|------|---------|-------------|
| `bootstrap_tournament.php` | Creates test tournament with random teams | Creating test data |
| `list_tournaments.php` | Lists test tournaments | Finding tokens, checking state |
| `list_real_tournaments.php` | Lists production tournaments (paginated) | Finding hashes, verifying data |
| `reset_tournament.php` | Deletes rounds after specified number | Retesting tournament progression |
| `cleanup_tournament.php` | Deletes test tournament completely | Removing test data |
| `cleanup_all.php` | Deletes ALL test tournaments | Fresh start |

## �� Integration

These tools interact with:
- Main tournament system (`tournament.php`, `back_tournament.php`)
- Database tables: `tournament`, `teams`, `tournament_rounds`, etc.
- Node.js WebSocket for live updates
- Runner service for battle execution

Changes here affect the entire tournament system - test carefully!

---

**Last Updated**: October 2025
**Maintained by**: Development Team
**Questions?**: Check code comments or ask team

# Tournament Dev Tools

> **Purpose**: Tools for creating, managing, and testing tournaments during development without affecting production data.

## � Security First!

**IMPORTANT:** Dev-tools are now protected by admin authentication. Before using any tools:

1. **Configure admin access** (first time only):
   ```bash
   ./setup_admin.sh
   ```
   
2. **Login to gladCode** with your admin email before accessing dev-tools

3. **Only admins can access** - all endpoints check authentication automatically

See [Security](#-security) section below for details.

## �📁 What's Here

```
dev-tools/
├── index.html                    # Web UI - START HERE
├── setup_admin.sh               # Configure admin access (run this first!)
├── dump_restore.sh              # Database backup/restore
├── tournament.sh                # CLI tool for all operations
│
├── Security:
│   ├── auth.php                   # Admin authentication (edit to add admins)
│   └── .htaccess                  # Apache security rules
│
├── API Endpoints (used by UI/CLI):
│   ├── bootstrap_tournament.php   # Create test tournament
│   ├── list_tournaments.php       # List test tournaments
│   ├── list_real_tournaments.php  # List production tournaments (paginated)
│   ├── reset_tournament.php       # Reset tournament to specific round
│   ├── cleanup_tournament.php     # Delete specific test tournament
│   ├── cleanup_all.php            # Delete ALL test tournaments
│   ├── export_tournament.php      # Export tournament to JSON
│   └── import_tournament.php      # Import tournament from JSON
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

# Export tournament
./tournament.sh export 129                        # By ID (auto-named file)
./tournament.sh export 129 my_export.json         # By ID (custom filename)
./tournament.sh export a32eb447a2497e72           # By hash
./tournament.sh export a1b2c3d4e5f6g7h8           # By token

# Import tournament
./tournament.sh import tournament_export.json     # Create new tournament
./tournament.sh import tournament_export.json 129 # Update tournament 129

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
- 🔒 **Admin-only access**: All endpoints require admin authentication
- 🔑 **Setup required**: Run `./setup_admin.sh` to configure your admin email
- 👤 **Must be logged in**: Session authentication checks your email against admin list
- 🚫 **Multiple layers**: `.htaccess` + PHP authentication + session validation
- 📁 **Protected files**: `auth.php`, `dump_*.sql`, and `.env` blocked by `.htaccess`
- 🌐 **Production safety**: Even if exposed, only admins can use tools
- 🔐 **Add more admins**: Edit `auth.php` line 21 to add admin emails

**How it works:**
1. Every PHP file includes `auth.php` at the top
2. `auth.php` checks if user is logged in via `$_SESSION['user']`
3. Queries database to get user's email
4. Compares email against hardcoded admin list
5. Returns 403 Forbidden if not admin

**To add more admins:**
```php
// Edit auth.php line 21
$ADMIN_EMAILS = [
    'admin@gladcode.com',
    'your-email@example.com',
    'another-admin@example.com',  // Add more here
];
```

### Performance
- Test tournaments use real database tables
- Large tournaments (50+ teams) may slow down UI
- Pagination added for production tournament lists (10 per page default)

### Data Integrity
- Test tournaments mix with production data
- Always use tokens for test tournament operations
- Production tournaments cannot be deleted (only reset)
- Resetting deletes ALL rounds after specified round number

## � Export & Import

Export and import complete tournament data for backup, migration, or testing.

### Export Tournament

**Via Web UI:**
1. Click "📥 Export" button on any tournament card
2. Or use the Export Tournament form (by ID, hash, or token)
3. Download saves as `tournament_<id>_export_<timestamp>.json`

**Via CLI:**
```bash
# Export by ID
./tournament.sh export 129

# Export with custom filename
./tournament.sh export 129 backup.json

# Export by hash
./tournament.sh export a32eb447a2497e72

# Export by token (test tournaments)
./tournament.sh export a1b2c3d4e5f6g7h8
```

**What's exported:**
- Tournament settings (name, maxteams, maxtime, etc.)
- All teams and their metadata
- Gladiators in each team (code, stats, skin)
- Groups (tournament rounds/brackets)
- Team assignments to groups
- Battle logs (simulation data)
- Match results

### Import Tournament

**Via Web UI:**
1. Go to "📥 Import Tournament" section
2. Select JSON export file
3. Choose mode:
   - **CREATE**: Makes new tournament with new ID
   - **UPDATE**: Replaces data in existing tournament
4. If UPDATE mode, enter tournament ID to update
5. Click "Import Tournament"

**Via CLI:**
```bash
# Create new tournament
./tournament.sh import tournament_export.json

# Update existing tournament 129
./tournament.sh import tournament_export.json 129
```

**Import Modes:**

1. **CREATE Mode** (no tournament_id):
   - Creates new tournament with new auto-increment ID
   - All teams, gladiators, groups get new IDs
   - Safe for copying tournaments between servers
   - Gladiators reused if they already exist (matched by `cod`)

2. **UPDATE Mode** (with tournament_id):
   - Updates existing tournament
   - **DELETES** all existing teams, groups, logs for that tournament
   - Imports fresh data from export
   - Useful for:
     - Restoring tournament from backup
     - Overwriting test data
     - Syncing tournament state between dev/prod

**⚠️ UPDATE Mode Warning:**
- Deletes ALL existing tournament data (teams, gladiators, groups, logs)
- Cannot be undone!
- Always export current state before updating
- Requires confirmation in CLI

**ID Mapping:**
Export contains old IDs, import creates new ones. The import script:
- Maps old team IDs → new team IDs (using password as natural key)
- Maps old group IDs → new group IDs (preserves round order)
- Maps old log IDs → new log IDs (using hash)
- Reuses existing gladiators by `cod` (natural key)

**Use Cases:**
- **Backup**: Export production tournament before changes
- **Migration**: Move tournament from dev to prod server
- **Testing**: Import production tournament to dev for testing
- **Rollback**: Export before update, import if needed
- **Cloning**: Export + CREATE import to duplicate tournament

## �🐛 Troubleshooting

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

### Export shows error
- Tournament ID/hash not found
- Check ID with `./tournament.sh list` or `./tournament.sh list-real`
- Token might be invalid for test tournaments

### Import fails
- Invalid JSON format (must be from export_tournament.php)
- Tournament ID doesn't exist (UPDATE mode)
- Missing required fields in JSON
- Check file permissions

### Import creates duplicate gladiators
- Shouldn't happen - import reuses existing gladiators by `cod`
- If it does, check that gladiator `cod` values match exactly

## 📝 File Purposes

| File | Purpose | When to Use |
|------|---------|-------------|
| `bootstrap_tournament.php` | Creates test tournament with random teams | Creating test data |
| `list_tournaments.php` | Lists test tournaments | Finding tokens, checking state |
| `list_real_tournaments.php` | Lists production tournaments (paginated) | Finding hashes, verifying data |
| `reset_tournament.php` | Deletes rounds after specified number | Retesting tournament progression |
| `cleanup_tournament.php` | Deletes test tournament completely | Removing test data |
| `cleanup_all.php` | Deletes ALL test tournaments | Fresh start |
| `export_tournament.php` | Exports tournament to JSON | Backup, migration, testing |
| `import_tournament.php` | Imports tournament from JSON | Restore, clone, sync between servers |

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

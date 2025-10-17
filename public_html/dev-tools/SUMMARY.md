# Dev Tools Summary

## What Was Created

A complete system for bootstrapping and managing fake tournaments for development/testing:

### Files Created

```
dev-tools/
├── index.html                    # 🌐 Web interface (main entry point)
├── bootstrap_tournament.php      # 🚀 Creates test tournaments
├── cleanup_tournament.php        # 🗑️  Deletes specific tournament
├── cleanup_all.php              # ⚠️  Deletes all test tournaments
├── list_tournaments.php         # 📋 Lists all test tournaments
├── tournament.sh                # 🖥️  CLI helper script
├── README.md                    # 📖 Full documentation
├── QUICK_REFERENCE.md          # ⚡ Quick commands & tips
└── tokens/                      # 🔑 Cleanup token storage
    ├── .gitignore              # Git ignore for tokens
    └── *.json                  # Token data (auto-generated)
```

## Features

✅ **Web Interface** - Beautiful, interactive UI for all operations  
✅ **CLI Tools** - Command-line scripts for automation  
✅ **Safe Deletion** - Only deletes tournaments marked with `[DEV-TEST]`  
✅ **Token System** - Secure cleanup using unique tokens  
✅ **Random Teams** - Automatically generates teams from existing users/gladiators  
✅ **Batch Operations** - Clean up all test tournaments at once  
✅ **Status Tracking** - Shows started/not started, team counts, etc.  
✅ **Real Integration** - Works with actual gladCode interface  
✅ **Foreign Key Safety** - Respects database constraints during deletion  
✅ **Log Cleanup** - Removes battle log files from filesystem  

## Quick Start

### Option 1: Web Interface (Recommended)

1. Open browser: `http://localhost/dev-tools/`
2. Fill in tournament details
3. Click "Create Tournament"
4. Save the token shown in results
5. Test your tournament via gladCode
6. Click "Cleanup" button when done

### Option 2: CLI

```bash
# From project root
./dev-tools/tournament.sh create "My Test" 8
# Returns token

# When done:
./dev-tools/tournament.sh cleanup <token>
```

### Option 3: Direct API

```bash
# Create
curl "http://localhost/dev-tools/bootstrap_tournament.php?name=Test&teams=8"

# List
curl "http://localhost/dev-tools/list_tournaments.php"

# Cleanup
curl "http://localhost/dev-tools/cleanup_tournament.php?token=<token>"
```

## How It Works

### Creation Flow

1. **Validate Input** - Check name, team count, time format
2. **Find Manager** - Get user to manage tournament
3. **Create Tournament** - Insert into `tournament` table with `[DEV-TEST]` marker
4. **Generate Teams** - Create N teams in `teams` table
5. **Assign Gladiators** - Randomly select 3 gladiators per team from different users
6. **Link Gladiators** - Create entries in `gladiator_teams` table
7. **Generate Token** - Create unique cleanup token
8. **Save Token** - Store token→tournament mapping in JSON file
9. **Return Result** - JSON response with all details

### Cleanup Flow

1. **Validate Token** - Check if token exists
2. **Load Tournament** - Get tournament ID from token
3. **Verify Safety** - Ensure `[DEV-TEST]` marker exists
4. **Find Teams** - Get all teams for tournament
5. **Find Groups** - Get all tournament rounds
6. **Delete Logs** - Remove battle log files
7. **Delete group_teams** - Remove group participants
8. **Delete groups** - Remove rounds
9. **Delete gladiator_teams** - Remove team associations
10. **Delete teams** - Remove teams
11. **Delete tournament** - Remove tournament entry
12. **Delete Token** - Remove token file
13. **Return Stats** - Show what was deleted

## Database Tables Affected

| Table | Action | Description |
|-------|--------|-------------|
| `tournament` | CREATE/DELETE | Main tournament entry |
| `teams` | CREATE/DELETE | Teams in tournament |
| `gladiator_teams` | CREATE/DELETE | Links gladiators to teams |
| `groups` | DELETE | Tournament rounds (created when started) |
| `group_teams` | DELETE | Links teams to rounds |
| `usuarios` | READ | To find manager and gladiator owners |
| `gladiators` | READ | To assign to teams |

**Note:** Only `gladiator_teams` associations are deleted, never the actual gladiators or users.

## Safety Mechanisms

1. **Marker Check** - Only tournaments with `[DEV-TEST]` can be deleted
2. **Token Validation** - Invalid tokens are rejected
3. **Existence Check** - Verifies tournament exists before deletion
4. **Foreign Keys** - Deletes in correct order (children before parents)
5. **Error Handling** - Try-catch blocks prevent partial deletions
6. **Confirmation** - Bulk cleanup requires explicit confirmation
7. **Isolation** - Test tournaments don't affect production data
8. **No Gladiator Deletion** - Original gladiators are preserved

## Integration with gladCode

Created tournaments are **fully functional**:

- ✅ Appear in tournament list (`tournament.php`)
- ✅ Users can join teams
- ✅ Manager can configure settings
- ✅ Tournament can be started
- ✅ Battles execute normally via runner
- ✅ Results show in UI
- ✅ Chat rooms work
- ✅ Notifications send
- ✅ All features work normally

The **only difference**: marked with `[DEV-TEST]` for safe cleanup.

## Best Practices

### DO:
- ✅ Use web interface for ease
- ✅ Save cleanup tokens
- ✅ Test with small tournaments first (4-8 teams)
- ✅ Cleanup after testing
- ✅ Use descriptive names
- ✅ Check logs if something fails

### DON'T:
- ❌ Delete tokens manually (orphans tournaments)
- ❌ Create 50-team tournaments for quick tests
- ❌ Forget to cleanup (clutters database)
- ❌ Use same name twice (will fail)
- ❌ Manually edit `[DEV-TEST]` marker
- ❌ Delete tournaments via SQL directly

## Example Scenarios

### Testing Tournament Flow
```bash
# Create small tournament
./dev-tools/tournament.sh create "Flow Test" 4

# Use gladCode to:
# - Join teams
# - Start tournament
# - Run battles
# - View results

# Cleanup
./dev-tools/tournament.sh cleanup <token>
```

### Testing Large Tournaments
```bash
# Create 32-team tournament
curl "localhost/dev-tools/bootstrap_tournament.php?name=LargeScale&teams=32"

# Test performance, UI, etc.

# Cleanup via web
# Visit: localhost/dev-tools/ → Click cleanup
```

### Multiple Test Tournaments
```bash
# Create several for different scenarios
curl "localhost/dev-tools/bootstrap_tournament.php?name=Fast&teams=4&maxtime=00:03:00"
curl "localhost/dev-tools/bootstrap_tournament.php?name=Medium&teams=8"
curl "localhost/dev-tools/bootstrap_tournament.php?name=Large&teams=16"

# List all
curl "localhost/dev-tools/list_tournaments.php"

# Cleanup individually or all at once
./dev-tools/tournament.sh cleanup-all
```

## Maintenance

### Adding Features

To add new features to bootstrap:

1. Edit `bootstrap_tournament.php`
2. Add new parameters to form in `index.html`
3. Update documentation in `README.md`
4. Update quick reference

### Token Management

Tokens are stored in `dev-tools/tokens/`:
- One JSON file per tournament
- Contains tournament ID and metadata
- Auto-deleted on cleanup
- .gitignore excludes from version control

### Troubleshooting

Check logs:
```bash
# Apache logs
docker compose logs apache

# PHP errors
docker compose exec apache tail -f /var/log/apache2/error.log

# List token files
ls -la dev-tools/tokens/
```

## Future Enhancements

Possible additions:
- Pre-populate with specific gladiator codes
- Template tournaments (save/load configurations)
- Scheduled cleanup (auto-delete after N days)
- Battle auto-runner (automatically run rounds)
- Statistics tracking (test performance metrics)
- Export/import tournament data
- Mock user accounts for testing

## Support

For issues:
1. Check `README.md` for full documentation
2. Check `QUICK_REFERENCE.md` for common commands
3. Review error messages (JSON responses include details)
4. Check Apache/PHP logs
5. Verify Docker containers are running

## Summary

You now have a complete, production-ready system for:
- 🚀 Creating test tournaments with one command
- 🧪 Testing tournament features safely
- 🗑️ Cleaning up test data completely
- 📊 Monitoring test tournaments
- 🔒 Protecting production data

**Access:** `http://localhost/dev-tools/`

**Happy Testing! 🎮**

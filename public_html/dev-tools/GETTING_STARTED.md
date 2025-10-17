# 🎮 Tournament Dev Tools - Complete System

## 📦 What's Included

A complete suite of tools for creating, managing, and cleaning up test tournaments in gladCode.

### File Structure

```
dev-tools/
├── 🌐 index.html                   # Web interface (START HERE!)
├── 🚀 bootstrap_tournament.php     # Creates test tournaments
├── 🗑️  cleanup_tournament.php       # Deletes specific tournament
├── ⚠️  cleanup_all.php              # Deletes all test tournaments
├── 📋 list_tournaments.php         # Lists all test tournaments
├── 🖥️  tournament.sh                # CLI helper script
├── 🧪 test.sh                      # Tests all components
│
├── 📚 Documentation
│   ├── README.md                   # Full documentation
│   ├── QUICK_REFERENCE.md          # Quick commands
│   └── SUMMARY.md                  # This file
│
└── 🔑 tokens/                      # Cleanup tokens (auto-generated)
    ├── .htaccess                   # Blocks web access
    ├── .gitignore                  # Ignores token files
    └── *.json                      # Token data files
```

## 🚀 Getting Started (3 Steps)

### Step 1: Start Docker
```bash
docker compose up -d
```

### Step 2: Open Web Interface
Visit: **http://localhost/dev-tools/index.html**

### Step 3: Create Tournament
- Fill in the form (or use defaults)
- Click "Create Tournament"
- Save the cleanup token shown
- Start testing!

**That's it!** Your test tournament is ready.

## 🎯 Main Features

### 1. Web Interface (Recommended)
- Beautiful, responsive design
- Real-time tournament list
- One-click creation and cleanup
- Visual feedback and confirmations
- Mobile-friendly

**Access:** http://localhost/dev-tools/index.html

### 2. CLI Tools
```bash
# Create tournament
./dev-tools/tournament.sh create "My Test" 8

# List all
./dev-tools/tournament.sh list

# Cleanup
./dev-tools/tournament.sh cleanup <token>

# Help
./dev-tools/tournament.sh help
```

### 3. API Endpoints
```bash
# Create
curl "localhost/dev-tools/bootstrap_tournament.php?name=Test&teams=8"

# List
curl "localhost/dev-tools/list_tournaments.php" | jq

# Cleanup
curl "localhost/dev-tools/cleanup_tournament.php?token=TOKEN"
```

## ⚙️ Configuration Options

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `name` | "Test Tournament {date}" | Any string | Tournament name (must be unique) |
| `teams` | 8 | 2-50 | Number of teams (3 gladiators each) |
| `maxtime` | 00:10:00 | 00:00:01+ | Max time per round (HH:MM:SS) |
| `manager` | First user | Any email | Tournament manager email |

## 🔒 Safety Features

✅ **Marker System** - Only `[DEV-TEST]` tournaments can be deleted  
✅ **Token Validation** - Unique tokens prevent accidental deletion  
✅ **Existence Checks** - Verifies data before deletion  
✅ **Foreign Keys** - Respects database constraints  
✅ **Error Handling** - Rollback on failures  
✅ **Confirmation Dialogs** - Web UI requires confirmation  
✅ **Isolated Cleanup** - Never deletes real gladiators or users  
✅ **Protected Directory** - Tokens folder blocked from web access  

## 📊 What Gets Created

When you create a tournament:

1. **1 Tournament** entry with `[DEV-TEST]` marker
2. **N Teams** (specified by `teams` parameter)
3. **N × 3 Gladiators** randomly selected from database
4. **N × 3 Associations** linking gladiators to teams
5. **1 Cleanup Token** for safe removal
6. **1 JSON File** storing token→tournament mapping

**Note:** Uses existing gladiators - doesn't create new ones

## 🗑️ What Gets Deleted

When you cleanup a tournament:

1. ✅ Tournament entry
2. ✅ All teams
3. ✅ All gladiator-team associations
4. ✅ All groups (rounds)
5. ✅ All group-team entries
6. ✅ All battle log files
7. ✅ Cleanup token file

**Protected:** ❌ Users, ❌ Gladiators, ❌ Other tournaments

## 🎓 Usage Examples

### Quick Test (Web UI)
1. Go to http://localhost/dev-tools/
2. Click "Create Tournament" (use defaults)
3. Copy token from result
4. Test via gladCode interface
5. Click "Cleanup" button when done

### Large Tournament (CLI)
```bash
# Create 32-team tournament
./dev-tools/tournament.sh create "Epic Battle" 32 00:05:00

# Tournament appears in gladCode
# Test features, run battles, etc.

# Cleanup when done
./dev-tools/tournament.sh cleanup <token>
```

### Multiple Tournaments (API)
```bash
# Create several for different tests
curl "localhost/dev-tools/bootstrap_tournament.php?name=Fast&teams=4&maxtime=00:03:00"
curl "localhost/dev-tools/bootstrap_tournament.php?name=Medium&teams=8"
curl "localhost/dev-tools/bootstrap_tournament.php?name=Large&teams=16"

# List all
curl "localhost/dev-tools/list_tournaments.php" | jq '.tournaments[].name'

# Cleanup all at once
curl "localhost/dev-tools/cleanup_all.php?confirm=YES_DELETE_ALL"
```

### Scripted Testing
```bash
#!/bin/bash
# test-flow.sh

# Create tournament
TOKEN=$(curl -s "localhost/dev-tools/bootstrap_tournament.php?teams=4" | jq -r '.cleanup_token')
echo "Created tournament with token: $TOKEN"

# Run your tests here...
# ...

# Cleanup
curl "localhost/dev-tools/cleanup_tournament.php?token=$TOKEN"
echo "Cleaned up tournament"
```

## 🧪 Testing Workflow

```
┌─────────────────────────────────────────────────────┐
│ 1. CREATE TOURNAMENT                                │
│    → bootstrap_tournament.php                       │
│    → Returns token: a1b2c3d4e5f6g7h8               │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 2. USE GLADCODE INTERFACE                           │
│    → Join teams                                     │
│    → Configure settings                             │
│    → Start tournament                               │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 3. RUN BATTLES                                      │
│    → Battles execute via runner                     │
│    → Multiple rounds progress                       │
│    → View results in UI                            │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 4. CLEANUP                                          │
│    → cleanup_tournament.php?token=...               │
│    → All data removed safely                        │
└─────────────────────────────────────────────────────┘
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Apache not running"** | `docker compose up -d` |
| **Web UI 404** | Check Apache: `docker compose logs apache` |
| **"No users found"** | Create user account via registration |
| **"Not enough gladiators"** | Reduce teams or create more gladiators |
| **"Name exists"** | Use different name or cleanup old one |
| **"Invalid token"** | Check `dev-tools/tokens/` directory |
| **PHP errors** | Check logs: `docker compose exec apache tail -f /var/log/apache2/error.log` |
| **Permission denied** | `chmod +x dev-tools/*.sh` |

## 📝 Best Practices

### ✅ DO:
- Use web interface for ease of use
- Save cleanup tokens (shown only once)
- Test with small tournaments first (4-8 teams)
- Cleanup after each test session
- Use descriptive tournament names
- Check error messages (they're detailed)

### ❌ DON'T:
- Don't delete token files manually
- Don't create 50-team tournaments for quick tests
- Don't forget to cleanup (clutters database)
- Don't reuse tournament names
- Don't manually edit `[DEV-TEST]` marker
- Don't delete via SQL (use scripts)

## 🔧 Advanced Usage

### Custom Manager
```bash
# Use specific user as manager
curl "localhost/dev-tools/bootstrap_tournament.php?name=Test&manager=admin@example.com"
```

### Quick Rounds
```bash
# Create with 3-minute rounds for fast testing
curl "localhost/dev-tools/bootstrap_tournament.php?name=Quick&teams=4&maxtime=00:03:00"
```

### Batch Cleanup
```bash
# Delete all test tournaments at once
./dev-tools/tournament.sh cleanup-all
# Type "YES" to confirm
```

### Integration Testing
```php
<?php
// test.php - Automated test script

// Create tournament
$response = file_get_contents('http://localhost/dev-tools/bootstrap_tournament.php?name=AutoTest&teams=4');
$data = json_decode($response, true);
$token = $data['cleanup_token'];

// Run your tests...
// ...

// Cleanup
file_get_contents("http://localhost/dev-tools/cleanup_tournament.php?token=$token");
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Full documentation with all details |
| **QUICK_REFERENCE.md** | Quick commands and tips |
| **SUMMARY.md** | Overview and architecture |

## 🎉 Success Indicators

After creation, you should see:
- ✅ Tournament in gladCode tournament list
- ✅ Teams visible in tournament details
- ✅ Gladiators assigned to teams
- ✅ Manager can access tournament settings
- ✅ Users can join teams
- ✅ Tournament can be started

After cleanup, you should see:
- ✅ Tournament removed from list
- ✅ No orphaned teams or associations
- ✅ Log files deleted
- ✅ Token file removed
- ✅ No errors in database

## 🆘 Getting Help

1. **Check documentation:**
   - README.md for full details
   - QUICK_REFERENCE.md for commands
   - SUMMARY.md for overview

2. **Run tests:**
   ```bash
   ./dev-tools/test.sh
   ```

3. **Check logs:**
   ```bash
   docker compose logs apache
   ```

4. **Verify setup:**
   - Docker running: `docker compose ps`
   - Apache accessible: `curl localhost`
   - PHP working: `curl localhost/dev-tools/list_tournaments.php`

## 🎬 Quick Demo

```bash
# Start services
docker compose up -d

# Open web interface
open http://localhost/dev-tools/

# OR use CLI
./dev-tools/tournament.sh create "Demo" 6

# View in gladCode
open http://localhost/tournament.php

# Cleanup
./dev-tools/tournament.sh list
./dev-tools/tournament.sh cleanup <token>
```

## 📦 Dependencies

- ✅ PHP 7.4+ (included in Apache container)
- ✅ MySQL/MariaDB (from docker-compose)
- ✅ PDO extension (included)
- ✅ JSON extension (included)
- ✅ gladCode database schema
- ✅ Existing users and gladiators

## 🌟 Summary

You now have a **production-ready** system for:

- 🚀 **Creating** test tournaments instantly
- 🎮 **Testing** tournament features safely
- 🧪 **Running** battle simulations
- 📊 **Monitoring** tournament status
- 🗑️ **Cleaning up** test data completely
- 🔒 **Protecting** production data

**Start here:** http://localhost/dev-tools/

**Have fun testing! 🎉**

---

*Created: 2025-10-17*  
*Version: 1.0*  
*Status: Production Ready ✅*

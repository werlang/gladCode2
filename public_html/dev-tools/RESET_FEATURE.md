# 🔄 New Feature: Reset Tournament to Round

## What's New

You can now **reset a tournament to a specific round** for testing purposes! This is incredibly useful when:
- Testing specific rounds without replaying the entire tournament
- Fixing gladiator code bugs and retrying from a certain point
- Testing different strategies at different tournament stages
- Debugging issues that occur in later rounds

## 🎯 How It Works

The reset feature:
1. **Deletes** all rounds after the target round
2. **Resets** the target round to its initial state (no selections, no battles)
3. **Revives** gladiators that died in or after the target round
4. **Cleans up** all battle logs
5. **Allows** you to continue from the reset point

## 🌐 Using the Web Interface (Easiest)

1. Visit: **http://localhost/dev-tools/index.html**
2. Find your started tournament
3. Click **"🔄 Reset Round"** button
4. Enter the round number to reset to
5. Confirm the reset
6. Click **"View Tournament"** to continue from that round

### Screenshot Flow:
```
[Tournament List]
├── Test Tournament [Started ✓]
│   ├── 🔄 Reset Round  ← Click this
│   ├── 👁️ View Tournament
│   └── 🗑️ Cleanup
↓
[Reset Dialog]
├── Reset to Round: [3]
├── ⚠️ Warning message
├── [Cancel] [Reset]
↓
[Success]
└── Tournament reset to round 3!
```

## 🖥️ Using the CLI

```bash
# Reset tournament to round 3
./public_html/dev-tools/tournament.sh reset <token> 3

# Example with actual token
./public_html/dev-tools/tournament.sh reset a1b2c3d4e5f6g7h8 3
```

## 🔧 Using the API

```bash
# Reset to round 3
curl "http://localhost/dev-tools/reset_tournament.php?token=<token>&round=3"

# With jq for pretty output
curl -s "http://localhost/dev-tools/reset_tournament.php?token=<token>&round=3" | jq
```

## 📋 Complete Example Workflow

```bash
# 1. Create tournament
$ curl -s "http://localhost/dev-tools/bootstrap_tournament.php?name=MyTest&teams=8" | jq '.cleanup_token'
"a1b2c3d4e5f6g7h8"

# 2. Start tournament via gladCode interface
# - Join teams
# - Start tournament
# - Play through rounds 1, 2, 3, 4, 5

# 3. Found a bug affecting round 3? Reset to round 3!
$ curl -s "http://localhost/dev-tools/reset_tournament.php?token=a1b2c3d4e5f6g7h8&round=3" | jq '.status, .message'
"SUCCESS"
"Tournament 'MyTest' reset to round 3!"

# 4. Fix your gladiator code

# 5. Continue tournament from round 3 via gladCode
# Rounds 4 and 5 were deleted, round 3 is fresh

# 6. Cleanup when done
$ curl -s "http://localhost/dev-tools/cleanup_tournament.php?token=a1b2c3d4e5f6g7h8"
```

## 🎓 Real-World Use Cases

### Use Case 1: Bug in Round 5
```bash
# Tournament progressed to round 7
# Bug discovered that started in round 5
# Reset to round 5, fix bug, continue

./public_html/dev-tools/tournament.sh reset <token> 5
# Fix gladiator code
# Resume tournament from round 5
```

### Use Case 2: Testing Different Strategies
```bash
# Play through with strategy A (rounds 1-6)
# Reset to round 4
./public_html/dev-tools/tournament.sh reset <token> 4
# Try strategy B from round 4
# Compare results
```

### Use Case 3: Tournament Reset to Start
```bash
# Start completely over while keeping same tournament/teams
./public_html/dev-tools/tournament.sh reset <token> 1
# Round 1 is now fresh, all gladiators alive
```

## 📊 What Gets Reset

### Deleted:
- ✅ All rounds after target round
- ✅ Groups (tournament brackets) for those rounds
- ✅ Group-team associations
- ✅ Battle log files
- ✅ Gladiator death records for those rounds

### Reset in Target Round:
- ✅ Gladiator selections (set to null)
- ✅ Battle results (cleared)
- ✅ Group locks (unlocked)
- ✅ Last survival times (cleared)
- ✅ Gladiator deaths (revived)

### Preserved:
- ❌ Tournament configuration
- ❌ Teams
- ❌ Team compositions
- ❌ Rounds before target

## 🔒 Safety Features

1. **Test-Only**: Only works on `[DEV-TEST]` marked tournaments
2. **Token Required**: Needs valid cleanup token
3. **Validation**: Checks if round exists before resetting
4. **Started Check**: Only works on started tournaments
5. **Confirmation**: Web UI requires explicit confirmation
6. **No Data Loss**: Original gladiators/users never affected

## ⚠️ Important Notes

- **Irreversible**: Reset cannot be undone (but you can reset again)
- **Started Only**: Tournament must be started (have a hash) to reset
- **Round Must Exist**: Cannot reset to round 10 if max round is 5
- **Round 1 = Start**: Resetting to round 1 = fresh tournament
- **Logs Deleted**: All battle logs for reset rounds are removed

## 🆚 Reset vs Cleanup

| Feature | Reset | Cleanup |
|---------|-------|---------|
| **Purpose** | Continue testing from earlier point | Delete everything |
| **Teams** | Preserved | Deleted |
| **Gladiators** | Revived | Associations deleted |
| **Tournament** | Preserved | Deleted |
| **Use Case** | Retry/retest rounds | Done testing, remove all |

## 📝 Response Format

### Success Response
```json
{
  "status": "SUCCESS",
  "message": "Tournament 'MyTest' reset to round 3!",
  "tournament_name": "MyTest",
  "tournament_id": 123,
  "tournament_hash": "abc123def456",
  "target_round": 3,
  "current_max_round": 7,
  "stats": {
    "logs_deleted": 12,
    "group_teams_deleted": 24,
    "groups_deleted": 8,
    "gladiator_teams_revived": 6,
    "rounds_removed": 4
  },
  "summary": [
    "Removed 4 round(s) after round 3",
    "Deleted 8 group(s)",
    "Deleted 24 group-team entries",
    "Deleted 12 battle log files",
    "Revived 6 gladiator(s)",
    "Reset round 3 to initial state"
  ],
  "tournament_url": "http://localhost/tournament.php?hash=abc123def456",
  "round_url": "http://localhost/tourn/abc123def456/3"
}
```

### Error Response
```json
{
  "status": "ERROR",
  "message": "Target round 10 does not exist. Current max round is 7"
}
```

## 🎨 UI Updates

The web interface now shows:
- **"Reset Round" button** for started tournaments
- **Modal dialog** for entering target round
- **Warning message** about what will be deleted
- **Success message** with option to view tournament
- **Real-time status** updates

## 🚀 Quick Commands Reference

```bash
# Web interface (easiest)
open http://localhost/dev-tools/index.html

# CLI reset
./public_html/dev-tools/tournament.sh reset <token> <round>

# API reset
curl "http://localhost/dev-tools/reset_tournament.php?token=<token>&round=<round>"

# Check current state
curl "http://localhost/dev-tools/list_tournaments.php" | jq

# View tournament
curl "http://localhost/tournament.php?hash=<hash>"
```

## 📚 Updated Files

- ✅ `public_html/dev-tools/reset_tournament.php` - New reset endpoint
- ✅ `public_html/dev-tools/index.html` - Added reset button and dialog
- ✅ `public_html/dev-tools/tournament.sh` - Added reset command
- ✅ `public_html/dev-tools/README.md` - Updated documentation
- ✅ `public_html/dev-tools/RESET_FEATURE.md` - This file

## 🎉 Summary

The **Reset Tournament** feature is now live and ready to use! It's perfect for iterative testing and debugging tournament flows without having to:
- Create new tournaments
- Wait through earlier rounds
- Lose your test setup

Just reset to the round you want and continue testing! 🚀

---

**Access the feature:** http://localhost/dev-tools/index.html

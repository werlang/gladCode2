# Development Tools

Scripts for testing and development purposes.

## Quick Start

**Web Interface (Recommended):**
```
http://localhost/dev-tools/index.html
```

The web interface provides an easy way to:
- Create test tournaments with custom settings
- View all test tournaments
- Clean up tournaments with one click
- See real-time status of tournaments

## Fake Tournament Management

### Creating a Fake Tournament

**Via Web Interface:**
Visit `http://localhost/dev-tools/` and use the creation form.

**Via API/CLI:**

```bash
# From docker host
docker compose exec apache php /var/www/html/dev-tools/bootstrap_tournament.php

# Or access via browser
http://localhost/dev-tools/bootstrap_tournament.php
```

This will:
1. Create a tournament with a specified name
2. Generate random teams from existing users/gladiators (3 gladiators per team)
3. Automatically assign gladiators from different users for variety
4. Return tournament details including a cleanup token
5. Mark the tournament with `[DEV-TEST]` for safe cleanup

**Query Parameters:**
- `name` - Tournament name (default: "Test Tournament {timestamp}")
- `teams` - Number of teams (default: 8, min: 2, max: 50)
- `manager` - Manager email (default: first user found in database)
- `maxtime` - Max time per round in HH:MM:SS format (default: "00:10:00")

**Examples:**
```bash
# Create tournament with 16 teams
http://localhost/dev-tools/bootstrap_tournament.php?name=BigTest&teams=16

# Create quick tournament with 5-minute rounds
http://localhost/dev-tools/bootstrap_tournament.php?name=QuickTest&teams=4&maxtime=00:05:00

# Create tournament with specific manager
http://localhost/dev-tools/bootstrap_tournament.php?name=MyTournament&manager=admin@example.com
```

**Response Format:**
```json
{
  "status": "SUCCESS",
  "tournament_id": 123,
  "tournament_name": "Test Tournament",
  "manager": "admin",
  "teams": [...],
  "total_teams": 8,
  "total_gladiators": 24,
  "cleanup_token": "a1b2c3d4e5f6g7h8",
  "cleanup_command": "php dev-tools/cleanup_tournament.php a1b2c3d4e5f6g7h8",
  "cleanup_url": "http://localhost/dev-tools/cleanup_tournament.php?token=a1b2c3d4e5f6g7h8",
  "instructions": [...]
}
```

### Cleaning Up a Fake Tournament

After you're done testing, cleanup all artifacts using the token provided during creation.

**Via Web Interface:**
Visit `http://localhost/dev-tools/index.html` and click the "Cleanup" button next to the tournament.

**Via API/CLI:**

```bash
# From docker host
docker compose exec apache php /var/www/html/dev-tools/cleanup_tournament.php <token>

# Or access via browser
http://localhost/dev-tools/cleanup_tournament.php?token=<token>
```

### Resetting a Tournament to a Specific Round

**NEW!** You can now reset a tournament to a specific round for testing. This is useful when you want to:
- Re-test a specific round without running the entire tournament again
- Fix gladiator code and retry from a certain point
- Test different strategies at different stages

**Via Web Interface:**
1. Visit `http://localhost/dev-tools/index.html`
2. Click "Reset Round" button next to a started tournament
3. Enter the target round number
4. Confirm the reset

**Via CLI:**
```bash
# Reset tournament to round 3
./public_html/dev-tools/tournament.sh reset <token> 3
```

**Via API:**
```bash
curl "http://localhost/dev-tools/reset_tournament.php?token=<token>&round=3"
```

**What happens when you reset:**
- All rounds after the target round are deleted
- The target round is reset to its initial state (no gladiator selections, no battles)
- Gladiators that died in or after the target round are revived
- All battle logs are deleted
- You can continue the tournament from the reset point

**Example workflow:**
```bash
# Create tournament and play through rounds 1-5
curl "http://localhost/dev-tools/bootstrap_tournament.php?name=Test&teams=4"
# ... play rounds 1-5 ...

# Oops, found a bug in round 3. Reset to round 3 to test fix
curl "http://localhost/dev-tools/reset_tournament.php?token=<token>&round=3"

# Now you can replay from round 3 with your fix
```

**What gets deleted:**
1. Battle log files (from `public_html/logs/`)
2. `group_teams` entries (tournament round participants)
3. `groups` entries (tournament rounds)
4. `gladiator_teams` entries (gladiator-to-team associations)
5. `teams` entries
6. The tournament itself
7. The cleanup token file

**Safety checks:**
- Only tournaments with `[DEV-TEST]` marker can be deleted
- Invalid tokens are rejected
- Original gladiators and users are never deleted
- Transaction-safe deletion order (respects foreign keys)

### List All Test Tournaments

**Via Web Interface:**
Visit `http://localhost/dev-tools/` - the list auto-refreshes.

**Via API/CLI:**

```bash
# From docker host
docker compose exec apache php /var/www/html/dev-tools/list_tournaments.php

# Or access via browser
http://localhost/dev-tools/list_tournaments.php
```

**Response includes:**
- Tournament ID and name
- Manager name
- Team count (current/max)
- Gladiator count
- Creation date
- Started status (has battles been run?)
- Tournament hash (if started)
- Cleanup token and URL

### Bulk Cleanup (USE WITH CAUTION!)

Delete ALL test tournaments at once:

```bash
# Via browser (requires confirmation)
http://localhost/dev-tools/cleanup_all.php?confirm=YES_DELETE_ALL

# From docker host
docker compose exec apache php /var/www/html/dev-tools/cleanup_all.php confirm=YES_DELETE_ALL
```

**⚠️ Warning:** This deletes ALL tournaments with the `[DEV-TEST]` marker. Use only when you want to reset your testing environment completely.

## File Structure

```
dev-tools/
├── index.html                 # Web interface (recommended)
├── bootstrap_tournament.php   # Create test tournament
├── cleanup_tournament.php     # Delete specific tournament
├── cleanup_all.php           # Delete all test tournaments
├── list_tournaments.php      # List all test tournaments
├── tokens/                   # Cleanup tokens (auto-generated)
│   ├── .gitignore           # Ignore token files
│   └── *.json               # Token data files
└── README.md                 # This file
```

## Workflow Example

1. **Create tournament:**
   ```bash
   # Visit http://localhost/dev-tools/
   # Fill form: Name="My Test", Teams=8
   # Click "Create Tournament"
   # Note the cleanup token: a1b2c3d4e5f6g7h8
   ```

2. **Use tournament:**
   ```bash
   # Navigate to gladCode interface
   # Join teams, run battles, test features
   # Tournament will show up in tournament list
   ```

3. **Start tournament:**
   ```bash
   # As manager, start the tournament via gladCode interface
   # Battles will run through multiple rounds
   # Check results in tournament page
   ```

4. **Cleanup:**
   ```bash
   # Visit http://localhost/dev-tools/
   # Click "Cleanup" button next to your tournament
   # Confirm deletion
   # All data is removed safely
   ```

## Safety Notes

- ✅ All test tournaments have `[DEV-TEST]` marker in description
- ✅ Only marked tournaments can be cleaned up via these scripts
- ✅ Original gladiators and users are NEVER deleted (only team associations)
- ✅ Battle logs are properly removed from filesystem
- ✅ Foreign key constraints are respected during deletion
- ✅ Token system prevents accidental deletion of wrong tournaments
- ✅ Web interface provides visual feedback and confirmation dialogs
- ⚠️ Manual database edits bypass all safety checks - use scripts only

## Troubleshooting

**"No manager user found"**
- Database is empty or no users exist
- Solution: Create at least one user via registration

**"Not enough gladiators"**
- Not enough gladiators in database for requested teams
- Each team needs 3 gladiators
- Solution: Reduce team count or create more gladiators

**"Tournament name already exists"**
- Tournament with that name already exists
- Solution: Use a different name or cleanup old tournament

**"Invalid or expired token"**
- Token file was deleted or corrupted
- Solution: Use list_tournaments.php to find correct token

**"Tournament is not marked as dev-test"**
- Trying to delete a real tournament
- Solution: Only cleanup scripts can delete marked tournaments

**Web interface not loading**
- Apache not running or PHP errors
- Solution: Check `docker compose logs apache`

## Integration with gladCode

These tools work seamlessly with the gladCode interface:

1. **Created tournaments appear in tournament list** (`tournament.php`)
2. **Users can join teams** using standard interface
3. **Tournament manager can start tournament** when ready
4. **Battles execute normally** through the runner service
5. **Results are visible** in tournament rounds view
6. **Cleanup removes everything** without affecting other tournaments

The only difference: test tournaments have `[DEV-TEST]` in description and can be safely removed.

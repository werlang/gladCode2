<?php
/**
 * Import Tournament Data from JSON
 * 
 * This endpoint imports tournament data from a JSON file exported by export_tournament.php
 * Supports both CREATE (new tournament) and UPDATE (replace existing data) modes.
 * 
 * Parameters:
 *   - file: JSON file upload (required)
 *   - mode: 'create' or 'update' (default: create)
 *   - tournament_id: Required if mode=update
 * 
 * Response: JSON with import status and summary
 */

// Require admin authentication
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('max_execution_time', 300); // 5 minutes for large imports

// Change to parent directory to find config.json
chdir(__DIR__ . '/..');
require_once('connection.php');

try {
    // Check if file was uploaded
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("No file uploaded or upload error");
    }

    // Read and parse JSON
    $jsonContent = file_get_contents($_FILES['file']['tmp_name']);
    $data = json_decode($jsonContent, true);
    
    if (!$data) {
        throw new Exception("Invalid JSON file");
    }

    if (!isset($data['tournaments']) || empty($data['tournaments'])) {
        throw new Exception("Invalid export format: missing tournament data");
    }

    // Get mode and tournament ID
    $mode = $_POST['mode'] ?? 'create';
    $tournamentId = isset($_POST['tournament_id']) ? (int)$_POST['tournament_id'] : null;

    if ($mode === 'update' && !$tournamentId) {
        throw new Exception("tournament_id required for update mode");
    }

    // Helper function to convert ISO datetime to MySQL format
    function convertDateTime($isoDate) {
        if (!$isoDate) return null;
        $date = new DateTime($isoDate);
        return $date->format('Y-m-d H:i:s');
    }

    // Start transaction
    global $conn;
    $conn->beginTransaction();

    $summary = [];
    $idMaps = [
        'teams' => [],
        'gladiators' => [],
        'groups' => [],
        'logs' => [],
    ];

    try {
        $tournament = $data['tournaments'][0];
        $newTournamentId = null;

        if ($mode === 'update') {
            // Update existing tournament
            $sql = "UPDATE tournament 
                    SET hash = ?, name = ?, password = ?, description = ?, 
                        creation = ?, maxteams = ?, flex = ?, manager = ?, maxtime = ?
                    WHERE id = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $tournament['hash'],
                $tournament['name'],
                $tournament['password'],
                $tournament['description'],
                convertDateTime($tournament['creation']),
                $tournament['maxteams'],
                $tournament['flex'],
                $tournament['manager'],
                $tournament['maxtime'],
                $tournamentId
            ]);

            $newTournamentId = $tournamentId;
            $summary[] = "Tournament $newTournamentId updated";

            // Delete existing related data (in correct order for FK constraints)
            
            // Delete group_teams
            $conn->exec("DELETE gt FROM group_teams gt 
                        JOIN teams t ON gt.team = t.id 
                        WHERE t.tournament = $tournamentId");
            
            // Delete orphaned groups
            $conn->exec("DELETE g FROM `groups` g 
                        WHERE g.id NOT IN (SELECT DISTINCT groupid FROM group_teams WHERE groupid IS NOT NULL)");
            
            // Delete gladiator_teams
            $conn->exec("DELETE gt FROM gladiator_teams gt 
                        JOIN teams t ON gt.team = t.id 
                        WHERE t.tournament = $tournamentId");
            
            // Delete teams
            $conn->exec("DELETE FROM teams WHERE tournament = $tournamentId");
            
            $summary[] = "Existing teams and links deleted";

        } else {
            // Create new tournament
            $sql = "INSERT INTO tournament (hash, name, password, description, creation, maxteams, flex, manager, maxtime)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $tournament['hash'],
                $tournament['name'],
                $tournament['password'],
                $tournament['description'],
                convertDateTime($tournament['creation']),
                $tournament['maxteams'],
                $tournament['flex'],
                $tournament['manager'],
                $tournament['maxtime']
            ]);

            $newTournamentId = $conn->lastInsertId();
            $summary[] = "Tournament created with ID: $newTournamentId";
        }

        // Import teams
        foreach ($data['teams'] as $team) {
            $sql = "INSERT INTO teams (tournament, name, password, modified)
                    VALUES (?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $newTournamentId,
                $team['name'],
                $team['password'],
                convertDateTime($team['modified'] ?? null)
            ]);

            $newTeamId = $conn->lastInsertId();
            $idMaps['teams'][$team['id']] = $newTeamId;
        }
        $summary[] = "Imported " . count($data['teams']) . " teams";

        // Import gladiators (reuse existing or create new)
        foreach ($data['gladiators'] as $glad) {
            // Check if gladiator exists
            $sql = "SELECT cod FROM gladiators WHERE cod = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$glad['cod']]);
            $existing = $stmt->fetch();

            if (!$existing) {
                $sql = "INSERT INTO gladiators (cod, master, name, vstr, vagi, vint, lvl, xp, skin, code, blocks, mmr, version)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    $glad['cod'],
                    $glad['master'],
                    $glad['name'],
                    $glad['vstr'],
                    $glad['vagi'],
                    $glad['vint'],
                    $glad['lvl'],
                    $glad['xp'],
                    $glad['skin'],
                    $glad['code'],
                    $glad['blocks'],
                    $glad['mmr'],
                    $glad['version'],
                ]);
            }

            $idMaps['gladiators'][$glad['cod']] = $glad['cod'];
        }
        $summary[] = "Processed " . count($data['gladiators']) . " gladiators";

        // Import gladiator_teams
        foreach ($data['gladiator_teams'] as $gt) {
            if (!isset($idMaps['teams'][$gt['team']])) continue;
            
            $sql = "INSERT INTO gladiator_teams (team, gladiator, visible, dead)
                    VALUES (?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $idMaps['teams'][$gt['team']],
                $gt['gladiator'],
                $gt['visible'] ?? 1,
                $gt['dead'] ?? 0
            ]);
        }
        $summary[] = "Created " . count($data['gladiator_teams']) . " gladiator-team links";

        // Import logs
        $savedLogFiles = 0;
        foreach ($data['logs'] as $log) {
            $sql = "INSERT INTO logs (hash, time, version, origin)
                    VALUES (?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $log['hash'],
                convertDateTime($log['creation'] ?? $log['time'] ?? null),
                $log['version'] ?? null,
                $log['origin'] ?? null
            ]);

            $newLogId = $conn->lastInsertId();
            $idMaps['logs'][$log['id']] = $newLogId;
            
            // Save log file content if present
            if (isset($log['file_content']) && $log['file_content'] !== null) {
                $logFilePath = __DIR__ . '/../logs/' . $newLogId;
                if (file_put_contents($logFilePath, $log['file_content']) !== false) {
                    $savedLogFiles++;
                }
            }
        }
        $summary[] = "Imported " . count($data['logs']) . " logs";
        if ($savedLogFiles > 0) {
            $summary[] = "Saved " . $savedLogFiles . " log files";
        }

        // Import groups
        foreach ($data['groups'] as $group) {
            $logId = isset($idMaps['logs'][$group['log']]) ? $idMaps['logs'][$group['log']] : null;
            
            $sql = "INSERT INTO `groups` (round, log, deadline, locked)
                    VALUES (?, ?, ?, ?)";

            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $group['round'],
                $logId,
                convertDateTime($group['deadline'] ?? null),
                $group['locked'] ?? null
            ]);

            $newGroupId = $conn->lastInsertId();
            $idMaps['groups'][$group['id']] = $newGroupId;
        }
        $summary[] = "Created " . count($data['groups']) . " groups";

        // Import group_teams
        foreach ($data['group_teams'] as $gt) {
            if (!isset($idMaps['groups'][$gt['groupid']]) || !isset($idMaps['teams'][$gt['team']])) {
                continue;
            }

            // Get first gladiator from this team for the gladiator column
            $gladiatorId = null;
            foreach ($data['gladiator_teams'] as $gladt) {
                if ($gladt['team'] == $gt['team']) {
                    $gladiatorId = $gladt['gladiator'];
                    break;
                }
            }

            $sql = "INSERT INTO group_teams (groupid, team, gladiator, lasttime)
                    VALUES (?, ?, ?, ?)";

            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $idMaps['groups'][$gt['groupid']],
                $idMaps['teams'][$gt['team']],
                $gladiatorId,
                $gt['lasttime'] ?? null
            ]);
        }
        $summary[] = "Created " . count($data['group_teams']) . " group-team links";

        // Commit transaction
        $conn->commit();

        echo json_encode([
            'status' => 'SUCCESS',
            'message' => 'Tournament imported successfully',
            'mode' => $mode,
            'tournament_id' => $newTournamentId,
            'tournament_name' => $tournament['name'],
            'summary' => $summary,
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'ERROR',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}

<?php
/**
 * Export Tournament Data to JSON
 * 
 * This endpoint exports complete tournament data to a downloadable JSON file.
 * Works with both test and production tournaments.
 * 
 * Parameters:
 *   - hash: Tournament hash (for production tournaments)
 *   - token: Tournament cleanup token (for test tournaments)
 *   - id: Tournament ID (direct ID lookup)
 * 
 * Response: JSON file download with complete tournament data
 */

header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Change to parent directory to find config.json
chdir(__DIR__ . '/..');
require_once('connection.php');

try {
    // Determine tournament ID from parameters
    $tournamentId = null;
    $tournamentHash = null;
    
    if (isset($_GET['id'])) {
        $tournamentId = (int)$_GET['id'];
    } elseif (isset($_GET['hash'])) {
        $tournamentHash = $_GET['hash'];
        $sql = "SELECT id FROM tournament WHERE hash = '$tournamentHash'";
        $result = runQuery($sql);
        $row = $result->fetch();
        if (!$row) {
            throw new Exception("Tournament not found with hash: $tournamentHash");
        }
        $tournamentId = $row['id'];
    } elseif (isset($_GET['token'])) {
        // Look up tournament ID from cleanup token
        $token = $_GET['token'];
        $tokenFile = __DIR__ . "/tokens/$token.json";
        
        if (!file_exists($tokenFile)) {
            throw new Exception("Invalid token: $token");
        }
        
        $tokenData = json_decode(file_get_contents($tokenFile), true);
        $tournamentId = $tokenData['tournament_id'];
    } else {
        throw new Exception("Missing parameter: id, hash, or token required");
    }

    // Fetch tournament data
    $sql = "SELECT * FROM tournament WHERE id = $tournamentId";
    $result = runQuery($sql);
    $tournament = $result->fetch(PDO::FETCH_ASSOC);
    
    if (!$tournament) {
        throw new Exception("Tournament not found: $tournamentId");
    }

    // Fetch teams
    $sql = "SELECT * FROM teams WHERE tournament = $tournamentId";
    $result = runQuery($sql);
    $teams = $result->fetchAll(PDO::FETCH_ASSOC);
    $teamIds = array_map(fn($t) => $t['id'], $teams);

    // Fetch gladiator_teams
    $gladiatorTeams = [];
    if (!empty($teamIds)) {
        $teamIdsStr = implode(',', $teamIds);
        $sql = "SELECT * FROM gladiator_teams WHERE team IN ($teamIdsStr)";
        $result = runQuery($sql);
        $gladiatorTeams = $result->fetchAll(PDO::FETCH_ASSOC);
    }

    // Fetch group_teams
    $groupTeams = [];
    if (!empty($teamIds)) {
        $teamIdsStr = implode(',', $teamIds);
        $sql = "SELECT * FROM group_teams WHERE team IN ($teamIdsStr)";
        $result = runQuery($sql);
        $groupTeams = $result->fetchAll(PDO::FETCH_ASSOC);
    }

    // Fetch groups
    $groups = [];
    $groupIds = array_unique(array_map(fn($gt) => $gt['groupid'], $groupTeams));
    if (!empty($groupIds)) {
        $groupIdsStr = implode(',', $groupIds);
        $sql = "SELECT * FROM `groups` WHERE id IN ($groupIdsStr)";
        $result = runQuery($sql);
        $groups = $result->fetchAll(PDO::FETCH_ASSOC);
    }

    // Fetch gladiators
    $gladiators = [];
    $gladiatorIds = array_filter(array_map(fn($gt) => $gt['gladiator'], $gladiatorTeams));
    if (!empty($gladiatorIds)) {
        $gladiatorIds = array_unique($gladiatorIds);
        $gladIdsStr = implode(',', array_map(fn($id) => "'$id'", $gladiatorIds));
        $sql = "SELECT * FROM gladiators WHERE cod IN ($gladIdsStr)";
        $result = runQuery($sql);
        $gladiators = $result->fetchAll(PDO::FETCH_ASSOC);
    }

    // Fetch logs
    $logs = [];
    $logIds = array_filter(array_map(fn($g) => $g['log'], $groups));
    if (!empty($logIds)) {
        $logIds = array_unique($logIds);
        $logIdsStr = implode(',', $logIds);
        $sql = "SELECT * FROM logs WHERE id IN ($logIdsStr)";
        $result = runQuery($sql);
        $logs = $result->fetchAll(PDO::FETCH_ASSOC);
        
        // Read log file contents and add to log records
        foreach ($logs as &$log) {
            $logFile = __DIR__ . '/../logs/' . $log['id'];
            if (file_exists($logFile)) {
                $log['file_content'] = file_get_contents($logFile);
            } else {
                $log['file_content'] = null;
            }
        }
        unset($log); // Break reference
    }

    // Fetch matches (from tournment table)
    $matches = [];
    if ($tournament['hash']) {
        $hash = $tournament['hash'];
        $sql = "SELECT * FROM tournment WHERE hash = '$hash' ORDER BY cod";
        $result = runQuery($sql);
        $matches = $result->fetchAll(PDO::FETCH_ASSOC);
    }

    // Fetch users (manager and gladiator masters)
    $userIds = [];
    if ($tournament['manager']) {
        $userIds[] = $tournament['manager'];
    }
    foreach ($gladiators as $glad) {
        if ($glad['master']) {
            $userIds[] = $glad['master'];
        }
    }
    
    $users = [];
    if (!empty($userIds)) {
        $userIds = array_unique($userIds);
        $userIdsStr = implode(',', array_map(fn($id) => "'$id'", $userIds));
        $sql = "SELECT * FROM usuarios WHERE id IN ($userIdsStr)";
        $result = runQuery($sql);
        $users = $result->fetchAll(PDO::FETCH_ASSOC);
    }

    // Build export data
    $exportData = [
        'export_info' => [
            'version' => '1.0',
            'exported_at' => date('Y-m-d H:i:s'),
            'tournament_id' => $tournamentId,
            'tournament_name' => $tournament['name'],
            'tournament_hash' => $tournament['hash'],
        ],
        'tournaments' => [$tournament],
        'teams' => $teams,
        'gladiator_teams' => $gladiatorTeams,
        'group_teams' => $groupTeams,
        'groups' => $groups,
        'gladiators' => $gladiators,
        'logs' => $logs,
        'matches' => $matches,
        'users' => $users,
    ];

    // Set download headers
    $filename = 'tournament_' . $tournamentId . '_export_' . date('Ymd_His') . '.json';
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');

    // Output JSON
    echo json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'ERROR',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}

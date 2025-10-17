<?php
/**
 * Reset Tournament to Specific Round
 * 
 * Resets a tournament to a specific round by deleting all rounds after it
 * and resetting the state of the target round
 * 
 * Supports both test tournaments (via token) and real tournaments (via hash or ID)
 */

// Change to parent directory for includes
chdir(__DIR__ . '/..');
include_once "connection.php";

$token = $_GET['token'] ?? $_POST['token'] ?? null;
$hash = $_GET['hash'] ?? $_POST['hash'] ?? null;
$tournid = $_GET['tournid'] ?? $_POST['tournid'] ?? null;
$target_round = $_GET['round'] ?? $_POST['round'] ?? null;

// Must provide either token, hash, or tournament ID
if (!$token && !$hash && !$tournid) {
    die(json_encode([
        'status' => 'ERROR',
        'message' => 'No tournament identifier provided. Usage: reset_tournament.php?token=<token>&round=<round_number> OR reset_tournament.php?hash=<hash>&round=<round_number> OR reset_tournament.php?tournid=<id>&round=<round_number>'
    ]));
}

if (!$target_round || !is_numeric($target_round) || $target_round < 1) {
    die(json_encode([
        'status' => 'ERROR',
        'message' => 'Invalid round number. Must be a positive integer.'
    ]));
}

$output = [];
$is_test_tournament = false;

try {
    // Get tournament ID based on provided identifier
    if ($token) {
        // Token-based (test tournaments)
        $token_file = __DIR__ . "/tokens/{$token}.json";
        
        if (!file_exists($token_file)) {
            throw new Exception("Invalid or expired token: {$token}");
        }

        $token_data = json_decode(file_get_contents($token_file), true);
        $tournid = $token_data['tournament_id'];
        $is_test_tournament = true;
    } elseif ($hash) {
        // Hash-based (real tournaments)
        $sql = "SELECT id FROM tournament WHERE hash = :hash";
        $stmt = $conn->prepare($sql);
        $stmt->execute(['hash' => $hash]);
        $result = $stmt->fetch();
        
        if (!$result) {
            throw new Exception("Tournament not found with hash: {$hash}");
        }
        
        $tournid = $result['id'];
    }
    // else $tournid is already set from GET/POST parameter

    // Verify tournament exists
    $sql = "SELECT id, name, description, hash FROM tournament WHERE id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['id' => $tournid]);
    $tournament = $stmt->fetch();

    if (!$tournament) {
        throw new Exception("Tournament not found (ID: {$tournid})");
    }

    // Check if it's a test tournament
    if (strpos($tournament['description'], '[DEV-TEST]') !== false) {
        $is_test_tournament = true;
    }

    if (empty($tournament['hash'])) {
        throw new Exception("Tournament has not been started yet. Cannot reset rounds.");
    }

    $output['tournament_name'] = $tournament['name'];
    $output['tournament_id'] = $tournid;
    $output['tournament_hash'] = $tournament['hash'];
    $output['target_round'] = $target_round;

    // Get all teams for this tournament
    $sql = "SELECT id FROM teams WHERE tournament = :tournament";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['tournament' => $tournid]);
    $teams = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($teams) == 0) {
        throw new Exception("No teams found in tournament");
    }

    $teams_str = implode(',', $teams);

    // Get current max round
    $sql = "SELECT MAX(gr.round) as maxround 
            FROM `groups` gr 
            INNER JOIN group_teams grt ON grt.groupid = gr.id 
            WHERE grt.team IN ({$teams_str})";
    $result = runQuery($sql);
    $row = $result->fetch();
    $current_max_round = $row['maxround'] ?? 0;

    if ($target_round > $current_max_round) {
        throw new Exception("Target round {$target_round} does not exist. Current max round is {$current_max_round}");
    }

    $output['current_max_round'] = $current_max_round;

    // Start reset process
    $stats = [
        'logs_deleted' => 0,
        'group_teams_deleted' => 0,
        'groups_deleted' => 0,
        'gladiator_teams_revived' => 0,
        'rounds_removed' => $current_max_round - $target_round
    ];

    // Get all groups for rounds AFTER target round
    $sql = "SELECT DISTINCT gr.id, gr.log 
            FROM `groups` gr 
            INNER JOIN group_teams grt ON grt.groupid = gr.id 
            WHERE grt.team IN ({$teams_str}) AND gr.round > :target_round";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['target_round' => $target_round]);
    $groups_to_delete = [];
    $logs_to_delete = [];
    
    while ($row = $stmt->fetch()) {
        $groups_to_delete[] = $row['id'];
        if ($row['log']) {
            $logs_to_delete[] = $row['log'];
        }
    }

    // Delete battle log files for rounds after target
    foreach ($logs_to_delete as $log) {
        $log_path = __DIR__ . "/../logs/{$log}";
        if (file_exists($log_path)) {
            unlink($log_path);
            $stats['logs_deleted']++;
        }
    }

    // Delete group_teams for rounds after target
    if (count($groups_to_delete) > 0) {
        $groups_str = implode(',', $groups_to_delete);
        
        $sql = "DELETE FROM group_teams WHERE groupid IN ({$groups_str})";
        $result = runQuery($sql);
        $stats['group_teams_deleted'] = $result->rowCount();

        // Delete groups for rounds after target
        $sql = "DELETE FROM `groups` WHERE id IN ({$groups_str})";
        $result = runQuery($sql);
        $stats['groups_deleted'] = $result->rowCount();
    }

    // Revive gladiators that died in rounds after target
    $sql = "UPDATE gladiator_teams SET dead = 0 
            WHERE team IN ({$teams_str}) AND dead > :target_round";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['target_round' => $target_round]);
    $stats['gladiator_teams_revived'] = $stmt->rowCount();

    // Reset the target round itself (clear logs, unlock groups, clear gladiator selections)
    $sql = "SELECT DISTINCT gr.id, gr.log 
            FROM `groups` gr 
            INNER JOIN group_teams grt ON grt.groupid = gr.id 
            WHERE grt.team IN ({$teams_str}) AND gr.round = :target_round";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['target_round' => $target_round]);
    $target_groups = [];
    $target_logs = [];
    
    while ($row = $stmt->fetch()) {
        $target_groups[] = $row['id'];
        if ($row['log']) {
            $target_logs[] = $row['log'];
        }
    }

    // Delete logs for target round
    foreach ($target_logs as $log) {
        $log_path = __DIR__ . "/../logs/{$log}";
        if (file_exists($log_path)) {
            unlink($log_path);
            $stats['logs_deleted']++;
        }
    }

    // Reset target round groups (unlock and clear logs)
    if (count($target_groups) > 0) {
        $target_groups_str = implode(',', $target_groups);
        
        $sql = "UPDATE `groups` SET log = NULL, locked = NULL WHERE id IN ({$target_groups_str})";
        $result = runQuery($sql);

        // Clear gladiator selections and lasttime for target round
        $sql = "UPDATE group_teams SET gladiator = NULL, lasttime = NULL WHERE groupid IN ({$target_groups_str})";
        $result = runQuery($sql);
    }

    // Revive gladiators that died in target round
    $sql = "UPDATE gladiator_teams SET dead = 0 
            WHERE team IN ({$teams_str}) AND dead = :target_round";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['target_round' => $target_round]);
    $stats['gladiator_teams_revived'] += $stmt->rowCount();

    $output['status'] = 'SUCCESS';
    $output['message'] = "Tournament '{$tournament['name']}' reset to round {$target_round}!";
    $output['tournament_type'] = $is_test_tournament ? 'test' : 'production';
    $output['stats'] = $stats;
    $output['summary'] = [
        "Removed {$stats['rounds_removed']} round(s) after round {$target_round}",
        "Deleted {$stats['groups_deleted']} group(s)",
        "Deleted {$stats['group_teams_deleted']} group-team entries",
        "Deleted {$stats['logs_deleted']} battle log files",
        "Revived {$stats['gladiator_teams_revived']} gladiator(s)",
        "Reset round {$target_round} to initial state"
    ];
    $output['tournament_url'] = "http://localhost/tournament.php?hash={$tournament['hash']}";
    $output['round_url'] = "http://localhost/tourn/{$tournament['hash']}/{$target_round}";

} catch (Exception $e) {
    $output['status'] = 'ERROR';
    $output['message'] = $e->getMessage();
}

// Pretty print JSON
header('Content-Type: application/json');
echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

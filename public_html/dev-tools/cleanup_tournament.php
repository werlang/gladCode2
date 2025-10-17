<?php
/**
 * Cleanup Fake Tournament
 * 
 * Removes a test tournament and all its artifacts using the cleanup token
 */

// Require admin authentication
require_once __DIR__ . '/auth.php';

$token = $_GET['token'] ?? $_SERVER['argv'][1] ?? null;

if (!$token) {
    die(json_encode([
        'status' => 'ERROR',
        'message' => 'No token provided. Usage: cleanup_tournament.php?token=<token>'
    ]));
}

$output = [];

try {
    // Load token data
    $token_file = __DIR__ . "/tokens/{$token}.json";
    
    if (!file_exists($token_file)) {
        throw new Exception("Invalid or expired token: {$token}");
    }

    $token_data = json_decode(file_get_contents($token_file), true);
    $tournid = $token_data['tournament_id'];

    // Verify tournament exists and has dev-test marker
    $sql = "SELECT id, name, description, hash FROM tournament WHERE id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['id' => $tournid]);
    $tournament = $stmt->fetch();

    if (!$tournament) {
        throw new Exception("Tournament not found (ID: {$tournid})");
    }

    if (strpos($tournament['description'], '[DEV-TEST]') === false) {
        throw new Exception("Tournament is not marked as dev-test. Refusing to delete for safety.");
    }

    $output['tournament_name'] = $tournament['name'];
    $output['tournament_id'] = $tournid;

    // Start cleanup process
    $stats = [
        'logs_deleted' => 0,
        'group_teams_deleted' => 0,
        'groups_deleted' => 0,
        'gladiator_teams_deleted' => 0,
        'teams_deleted' => 0,
        'tournament_deleted' => 0
    ];

    // Get all teams for this tournament
    $sql = "SELECT id FROM teams WHERE tournament = :tournament";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['tournament' => $tournid]);
    $teams = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($teams) > 0) {
        $teams_str = implode(',', $teams);

        // Get all groups associated with these teams
        $sql = "SELECT DISTINCT gr.id, gr.log 
                FROM `groups` gr 
                INNER JOIN group_teams grt ON grt.groupid = gr.id 
                WHERE grt.team IN ({$teams_str})";
        $groups_result = runQuery($sql);
        $groups = [];
        $log_files = [];
        
        while ($row = $groups_result->fetch()) {
            $groups[] = $row['id'];
            if ($row['log']) {
                $log_files[] = $row['log'];
            }
        }

        // Delete battle log files
        foreach ($log_files as $log) {
            $log_path = __DIR__ . "/../logs/{$log}";
            if (file_exists($log_path)) {
                unlink($log_path);
                $stats['logs_deleted']++;
            }
        }

        // Delete group_teams entries
        if (count($groups) > 0) {
            $groups_str = implode(',', $groups);
            $sql = "DELETE FROM group_teams WHERE groupid IN ({$groups_str})";
            $result = runQuery($sql);
            $stats['group_teams_deleted'] = $result->rowCount();

            // Delete groups
            $sql = "DELETE FROM `groups` WHERE id IN ({$groups_str})";
            $result = runQuery($sql);
            $stats['groups_deleted'] = $result->rowCount();
        }

        // Delete gladiator_teams entries
        $sql = "DELETE FROM gladiator_teams WHERE team IN ({$teams_str})";
        $result = runQuery($sql);
        $stats['gladiator_teams_deleted'] = $result->rowCount();

        // Delete teams
        $sql = "DELETE FROM teams WHERE tournament = :tournament";
        $stmt = $conn->prepare($sql);
        $stmt->execute(['tournament' => $tournid]);
        $stats['teams_deleted'] = $stmt->rowCount();
    }

    // Delete the tournament itself
    $sql = "DELETE FROM tournament WHERE id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['id' => $tournid]);
    $stats['tournament_deleted'] = $stmt->rowCount();

    // Delete the token file
    unlink($token_file);

    $output['status'] = 'SUCCESS';
    $output['message'] = "Tournament '{$tournament['name']}' cleaned up successfully!";
    $output['stats'] = $stats;
    $output['summary'] = [
        "Deleted {$stats['teams_deleted']} teams",
        "Deleted {$stats['gladiator_teams_deleted']} gladiator-team associations",
        "Deleted {$stats['groups_deleted']} groups",
        "Deleted {$stats['group_teams_deleted']} group-team entries",
        "Deleted {$stats['logs_deleted']} battle log files",
        "Deleted 1 tournament"
    ];

} catch (Exception $e) {
    $output['status'] = 'ERROR';
    $output['message'] = $e->getMessage();
}

// Pretty print JSON
header('Content-Type: application/json');
echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

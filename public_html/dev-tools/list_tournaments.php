<?php
/**
 * List Test Tournaments
 * 
 * Shows all tournaments created by bootstrap script
 */

// Change to parent directory for includes
chdir(__DIR__ . '/..');
include_once "connection.php";

$output = [];

try {
    // Get all tournaments with [DEV-TEST] marker
    $sql = "SELECT t.id, t.name, t.description, t.creation, t.hash, t.maxteams,
                   (SELECT COUNT(*) FROM teams te WHERE te.tournament = t.id) as team_count,
                   (SELECT COUNT(*) FROM teams te 
                    INNER JOIN gladiator_teams gt ON gt.team = te.id 
                    WHERE te.tournament = t.id) as gladiator_count,
                   u.apelido as manager_name
            FROM tournament t
            INNER JOIN usuarios u ON u.id = t.manager
            WHERE t.description LIKE '%[DEV-TEST]%'
            ORDER BY t.creation DESC";
    
    $result = runQuery($sql);
    $tournaments = [];

    while ($row = $result->fetch()) {
        $tourn = [
            'id' => $row['id'],
            'name' => $row['name'],
            'manager' => $row['manager_name'],
            'created_at' => $row['creation'],
            'teams' => $row['team_count'],
            'gladiators' => $row['gladiator_count'],
            'max_teams' => $row['maxteams'],
            'started' => !empty($row['hash']),
            'hash' => $row['hash'],
            'cleanup_token' => null,
            'cleanup_url' => null
        ];

        // Try to find corresponding token file
        $token_dir = __DIR__ . "/tokens";
        if (is_dir($token_dir)) {
            $token_files = glob($token_dir . "/*.json");
            foreach ($token_files as $file) {
                $data = json_decode(file_get_contents($file), true);
                if ($data['tournament_id'] == $row['id']) {
                    $tourn['cleanup_token'] = $data['token'];
                    $tourn['cleanup_url'] = "http://localhost/dev-tools/cleanup_tournament.php?token={$data['token']}";
                    break;
                }
            }
        }

        $tournaments[] = $tourn;
    }

    $output['status'] = 'SUCCESS';
    $output['count'] = count($tournaments);
    $output['tournaments'] = $tournaments;

    if (count($tournaments) == 0) {
        $output['message'] = "No test tournaments found";
    } else {
        $output['message'] = "Found " . count($tournaments) . " test tournament(s)";
    }

} catch (Exception $e) {
    $output['status'] = 'ERROR';
    $output['message'] = $e->getMessage();
}

// Pretty print JSON
header('Content-Type: application/json');
echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

<?php
/**
 * Cleanup ALL Test Tournaments
 * 
 * Removes all tournaments marked with [DEV-TEST]
 * USE WITH CAUTION!
 */

// Change to parent directory for includes
chdir(__DIR__ . '/..');
include_once "connection.php";

$confirm = $_GET['confirm'] ?? $_POST['confirm'] ?? null;

if ($confirm !== 'YES_DELETE_ALL') {
    die(json_encode([
        'status' => 'ERROR',
        'message' => 'Safety check failed. To confirm deletion of ALL test tournaments, add ?confirm=YES_DELETE_ALL to the URL',
        'warning' => 'This will delete ALL tournaments marked with [DEV-TEST]'
    ]));
}

$output = [];

try {
    // Get all test tournaments
    $sql = "SELECT id, name, description FROM tournament WHERE description LIKE '%[DEV-TEST]%'";
    $result = runQuery($sql);
    $tournaments = $result->fetchAll();

    if (count($tournaments) == 0) {
        $output['status'] = 'SUCCESS';
        $output['message'] = 'No test tournaments found';
        $output['deleted'] = [];
    } else {
        $deleted = [];
        $errors = [];

        foreach ($tournaments as $tournament) {
            try {
                $tournid = $tournament['id'];
                $name = $tournament['name'];

                // Get teams
                $sql = "SELECT id FROM teams WHERE tournament = :tournament";
                $stmt = $conn->prepare($sql);
                $stmt->execute(['tournament' => $tournid]);
                $teams = $stmt->fetchAll(PDO::FETCH_COLUMN);

                $stats = [
                    'logs_deleted' => 0,
                    'group_teams_deleted' => 0,
                    'groups_deleted' => 0,
                    'gladiator_teams_deleted' => 0,
                    'teams_deleted' => 0
                ];

                if (count($teams) > 0) {
                    $teams_str = implode(',', $teams);

                    // Get groups and logs
                    $sql = "SELECT DISTINCT gr.id, gr.log 
                            FROM `groups` gr 
                            INNER JOIN group_teams grt ON grt.groupid = gr.id 
                            WHERE grt.team IN ({$teams_str})";
                    $groups_result = runQuery($sql);
                    $groups = [];
                    
                    while ($row = $groups_result->fetch()) {
                        $groups[] = $row['id'];
                        if ($row['log']) {
                            $log_path = __DIR__ . "/../logs/{$row['log']}";
                            if (file_exists($log_path)) {
                                unlink($log_path);
                                $stats['logs_deleted']++;
                            }
                        }
                    }

                    // Delete in correct order (foreign keys)
                    if (count($groups) > 0) {
                        $groups_str = implode(',', $groups);
                        
                        $sql = "DELETE FROM group_teams WHERE groupid IN ({$groups_str})";
                        $result = runQuery($sql);
                        $stats['group_teams_deleted'] = $result->rowCount();

                        $sql = "DELETE FROM `groups` WHERE id IN ({$groups_str})";
                        $result = runQuery($sql);
                        $stats['groups_deleted'] = $result->rowCount();
                    }

                    $sql = "DELETE FROM gladiator_teams WHERE team IN ({$teams_str})";
                    $result = runQuery($sql);
                    $stats['gladiator_teams_deleted'] = $result->rowCount();

                    $sql = "DELETE FROM teams WHERE tournament = :tournament";
                    $stmt = $conn->prepare($sql);
                    $stmt->execute(['tournament' => $tournid]);
                    $stats['teams_deleted'] = $stmt->rowCount();
                }

                // Delete tournament
                $sql = "DELETE FROM tournament WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute(['id' => $tournid]);

                $deleted[] = [
                    'id' => $tournid,
                    'name' => $name,
                    'stats' => $stats
                ];

            } catch (Exception $e) {
                $errors[] = [
                    'tournament' => $tournament['name'],
                    'error' => $e->getMessage()
                ];
            }
        }

        // Clean up all token files
        $token_dir = __DIR__ . "/tokens";
        if (is_dir($token_dir)) {
            $token_files = glob($token_dir . "/*.json");
            foreach ($token_files as $file) {
                unlink($file);
            }
        }

        $output['status'] = 'SUCCESS';
        $output['message'] = "Deleted " . count($deleted) . " test tournament(s)";
        $output['deleted'] = $deleted;
        
        if (count($errors) > 0) {
            $output['errors'] = $errors;
            $output['message'] .= " with " . count($errors) . " error(s)";
        }
    }

} catch (Exception $e) {
    $output['status'] = 'ERROR';
    $output['message'] = $e->getMessage();
}

// Pretty print JSON
header('Content-Type: application/json');
echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

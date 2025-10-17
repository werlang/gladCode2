<?php
/**
 * List Real (Production) Tournaments
 * 
 * Lists all non-test tournaments in the system
 * Useful for finding tournaments to reset via dev-tools
 */

chdir(__DIR__ . '/..');
include_once "connection.php";

header('Content-Type: application/json');

try {
    // Pagination parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 10;
    $offset = ($page - 1) * $limit;
    
    // Get total count
    $count_sql = "SELECT COUNT(*) as total
                  FROM tournament t
                  WHERE t.description NOT LIKE '%[DEV-TEST]%'";
    $count_result = runQuery($count_sql);
    $count_row = $count_result->fetch();
    $total = $count_row['total'];
    $total_pages = ceil($total / $limit);
    
    // Get all tournaments that are NOT test tournaments
    $sql = "SELECT t.id, t.name, t.description, t.creation, t.hash, t.maxteams,
                   (SELECT COUNT(*) FROM teams te WHERE te.tournament = t.id) as team_count,
                   (SELECT COUNT(*) FROM teams te 
                    INNER JOIN gladiator_teams gt ON gt.team = te.id 
                    WHERE te.tournament = t.id) as gladiator_count,
                   u.apelido as manager_name
            FROM tournament t
            INNER JOIN usuarios u ON u.id = t.manager
            WHERE t.description NOT LIKE '%[DEV-TEST]%'
            ORDER BY t.creation DESC
            LIMIT :limit OFFSET :offset";
    
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $tournaments = [];
    
    while ($row = $stmt->fetch()) {
        // Get max round separately
        $tournid = $row['id'];
        $max_round_sql = "SELECT MAX(round) FROM `groups` 
                          INNER JOIN group_teams ON group_teams.groupid = `groups`.id 
                          INNER JOIN teams ON teams.id = group_teams.team 
                          WHERE teams.tournament = :tournid";
        $round_stmt = $conn->prepare($max_round_sql);
        $round_stmt->execute(['tournid' => $tournid]);
        $max_round_data = $round_stmt->fetch();
        $max_round = $max_round_data ? $max_round_data['MAX(round)'] : 0;
        
        $tournaments[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'description' => $row['description'],
            'manager' => $row['manager_name'],
            'creation' => $row['creation'],
            'hash' => $row['hash'],
            'started' => !empty($row['hash']),
            'team_count' => $row['team_count'],
            'max_teams' => $row['maxteams'],
            'gladiator_count' => $row['gladiator_count'],
            'max_round' => $max_round,
            'reset_url' => !empty($row['hash']) 
                ? "reset_tournament.php?hash={$row['hash']}&round=1" 
                : null,
            'tournament_url' => !empty($row['hash'])
                ? "http://localhost/tourn/{$row['hash']}/0"
                : null
        ];
    }
    
    echo json_encode([
        'status' => 'SUCCESS',
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => $total_pages,
            'has_prev' => $page > 1,
            'has_next' => $page < $total_pages
        ],
        'count' => count($tournaments),
        'tournaments' => $tournaments
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'ERROR',
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}

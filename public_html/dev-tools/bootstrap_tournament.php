<?php
/**
 * Bootstrap Fake Tournament
 * 
 * Creates a test tournament with random teams from existing users/gladiators
 * Returns a cleanup token for later removal
 */

// Require admin authentication
require_once __DIR__ . '/auth.php';

// Configuration
$config = [
    'name' => $_GET['name'] ?? "Test Tournament " . date('Y-m-d H:i:s'),
    'teams' => isset($_GET['teams']) ? max(2, min(50, intval($_GET['teams']))) : 8,
    'manager_email' => $_GET['manager'] ?? null,
    'maxtime' => $_GET['maxtime'] ?? '00:10:00',
    'password' => '', // Empty for public tournament
    'flex' => 1, // Allow flexible team composition
];

// Validate maxtime format
if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $config['maxtime'])) {
    die(json_encode(['error' => 'Invalid maxtime format. Use HH:MM:SS']));
}

$output = [];

try {
    // Get manager user
    if ($config['manager_email']) {
        $sql = "SELECT id, apelido FROM usuarios WHERE email = :email LIMIT 1";
        $stmt = $conn->prepare($sql);
        $stmt->execute(['email' => $config['manager_email']]);
        $manager = $stmt->fetch();
    } else {
        // Get first user found
        $sql = "SELECT id, apelido FROM usuarios ORDER BY id ASC LIMIT 1";
        $manager = runQuery($sql)->fetch();
    }

    if (!$manager) {
        throw new Exception("No manager user found");
    }

    $output['manager'] = $manager['apelido'];

    // Check if tournament name already exists
    $sql = "SELECT id FROM tournament WHERE name = :name";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['name' => $config['name']]);
    if ($stmt->rowCount() > 0) {
        throw new Exception("Tournament name already exists: " . $config['name']);
    }

    // Create tournament with special marker in description
    $description = "[DEV-TEST] Created by bootstrap script at " . date('Y-m-d H:i:s');
    $sql = "INSERT INTO tournament (manager, name, password, description, creation, hash, maxteams, flex, maxtime) 
            VALUES (:manager, :name, :password, :description, NOW(), '', :maxteams, :flex, TIME(:maxtime))";
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        'manager' => $manager['id'],
        'name' => $config['name'],
        'password' => $config['password'],
        'description' => $description,
        'maxteams' => $config['teams'],
        'flex' => $config['flex'],
        'maxtime' => $config['maxtime']
    ]);
    
    $tournid = $conn->lastInsertId();
    $output['tournament_id'] = $tournid;
    $output['tournament_name'] = $config['name'];

    // Get random gladiators from different users (3 per team)
    $needed_glads = $config['teams'] * 3;
    
    // Get gladiators grouped by master, picking one from each user
    $sql = "SELECT g.cod, g.name, g.master, u.apelido 
            FROM gladiators g 
            INNER JOIN usuarios u ON u.id = g.master
            WHERE g.master != :manager
            ORDER BY RAND()";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['manager' => $manager['id']]);
    $result = $stmt;
    
    $glads_by_user = [];
    while ($row = $result->fetch()) {
        $user_id = $row['master'];
        if (!isset($glads_by_user[$user_id])) {
            $glads_by_user[$user_id] = [];
        }
        $glads_by_user[$user_id][] = $row;
    }

    // Flatten and shuffle to get random gladiators
    $all_glads = [];
    foreach ($glads_by_user as $user_glads) {
        $all_glads = array_merge($all_glads, $user_glads);
    }
    shuffle($all_glads);

    if (count($all_glads) < $needed_glads) {
        throw new Exception("Not enough gladiators. Need $needed_glads, found " . count($all_glads));
    }

    // Take only what we need
    $selected_glads = array_slice($all_glads, 0, $needed_glads);

    // Create teams and assign gladiators
    $teams = [];
    for ($i = 0; $i < $config['teams']; $i++) {
        $team_name = "Team " . chr(65 + $i); // Team A, Team B, etc.
        
        $sql = "INSERT INTO teams (name, password, tournament, modified) 
                VALUES (:name, 'test', :tournament, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            'name' => $team_name,
            'tournament' => $tournid
        ]);
        
        $teamid = $conn->lastInsertId();
        $teams[] = [
            'id' => $teamid,
            'name' => $team_name,
            'gladiators' => []
        ];

        // Assign 3 gladiators to this team
        for ($j = 0; $j < 3; $j++) {
            $glad_index = ($i * 3) + $j;
            $glad = $selected_glads[$glad_index];
            
            $sql = "INSERT INTO gladiator_teams (gladiator, team, visible) 
                    VALUES (:gladiator, :team, 1)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                'gladiator' => $glad['cod'],
                'team' => $teamid
            ]);

            $teams[$i]['gladiators'][] = [
                'name' => $glad['name'],
                'master' => $glad['apelido']
            ];
        }
    }

    $output['teams'] = $teams;
    $output['total_teams'] = count($teams);
    $output['total_gladiators'] = count($selected_glads);

    // Generate cleanup token
    $token = substr(md5($tournid . $config['name'] . microtime(true)), 0, 16);
    
    // Store token in a special table or file for later cleanup
    // For simplicity, we'll encode it in a way that can be decoded
    $output['cleanup_token'] = $token;
    $output['cleanup_command'] = "php dev-tools/cleanup_tournament.php {$token}";
    $output['cleanup_url'] = "http://localhost/dev-tools/cleanup_tournament.php?token={$token}";
    
    // Save token mapping
    $token_file = __DIR__ . "/tokens/{$token}.json";
    @mkdir(__DIR__ . "/tokens", 0755, true);
    file_put_contents($token_file, json_encode([
        'tournament_id' => $tournid,
        'tournament_name' => $config['name'],
        'created_at' => date('Y-m-d H:i:s'),
        'token' => $token
    ]));

    $output['status'] = 'SUCCESS';
    $output['message'] = "Tournament '{$config['name']}' created successfully!";
    $output['instructions'] = [
        "1. Tournament is ready for testing",
        "2. Access it via the gladCode interface",
        "3. When done, cleanup with: " . $output['cleanup_command'],
        "4. Or visit: " . $output['cleanup_url']
    ];

} catch (Exception $e) {
    $output['status'] = 'ERROR';
    $output['message'] = $e->getMessage();
}

// Pretty print JSON
header('Content-Type: application/json');
echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

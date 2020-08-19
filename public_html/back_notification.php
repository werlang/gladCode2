<?php
    session_start();
    include_once "connection.php";
    $user = $_SESSION['user'];
    $output = array();
    $action = $_POST['action'];

    if ($action == "GET"){
        //user info
        $sql = "SELECT lvl, xp, silver FROM usuarios WHERE id = '$user'";
        $result = runQuery($sql);

        $row = $result->fetch_assoc();
        $lvl = $row['lvl'];
        $xp = $row['xp'];
        
        $output['user'] = array();
        $output['user']['lvl'] = $lvl;
        $output['user']['xp'] = $xp;
        $output['user']['silver'] = $row['silver'];
        
        //set active time
        $sql = "UPDATE usuarios SET ativo = now() WHERE id = '$user'";
        $result = runQuery($sql);

        //message
        // $sql = "SELECT u.id FROM messages m INNER JOIN usuarios u ON u.id = m.sender WHERE receiver = '$user' AND isread = '0'";
        $lasttime = "SELECT max(cm.time) FROM chat_messages cm WHERE cm.room = cr.id AND cm.sender != $user";
        $sql = "SELECT cr.id FROM chat_rooms cr INNER JOIN chat_users cu ON cr.id = cu.room WHERE cr.direct = 1 AND cu.user = $user AND cu.visited < ($lasttime)";
        $result = runQuery($sql);
        
        $output['messages'] = $result->num_rows;
        
        //pending friend requests
        $sql = "SELECT u.id FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario1 WHERE usuario2 = '$user' AND pendente = 1";
        $result = runQuery($sql);
        
        $output['friends'] = $result->num_rows;
        
        //gladiators remaining
        $sql = "SELECT master FROM gladiators WHERE master = '$user'";
        $result = runQuery($sql);

        $nglads = $result->num_rows;

        //calc max glads according to master lvl
        $initglad = 1;
        $gladinterval = 10;
        $maxglads = 6;
        $limit = min($maxglads, $initglad + floor($lvl/$gladinterval));
        
        $output['glads'] = array();
        $output['glads']['remaining'] = $limit - $nglads;

        //gladiators in need of update
        $version = file_get_contents("version");

        $sql = "SELECT master FROM gladiators WHERE master = '$user' AND version != '$version'";
        $result = runQuery($sql);
        
        $output['glads']['obsolete'] = $result->num_rows;
        
        //reports
        $output['reports'] = array();
        $sql = "SELECT r.id FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user') AND isread = '0'";
        $result = runQuery($sql);
        $output['reports']['ranked'] = $result->num_rows;

        $sql = "SELECT d.id FROM duels d WHERE d.isread = 0 AND d.log IS NOT NULL AND (d.user1 = $user OR d.user2 = $user)";
        $result = runQuery($sql);
        $output['reports']['duel'] = $result->num_rows;

        //duels
        $sql = "SELECT d.id FROM duels d WHERE d.log IS NULL AND d.user2 = '$user'";
        $result = runQuery($sql);
        $output['duels'] = $result->num_rows;
        
        //news
        $sql = "SELECT id FROM news WHERE time > (SELECT read_news FROM usuarios WHERE id = $user)";
        $result = runQuery($sql);
        $output['news'] = $result->num_rows;

        $output['status'] = "SUCCESS";
    }
    elseif ($action == "SUMMARY"){
        $hash = mysql_escape_string($_POST['hash']);

        $sql = "SELECT count(*) AS nbattles, TIME_TO_SEC(TIMEDIFF(min(l.time), now(3) - INTERVAL 1 DAY)) AS nextbattle FROM reports r INNER JOIN gladiators g ON r.gladiator = g.cod INNER JOIN logs l ON l.id = r.log WHERE g.master = $user AND l.time > now() - INTERVAL 1 DAY AND r.bonus = '1'";
        $result = runQuery($sql);
        $row = $result->fetch_assoc();
        $output['battles'] = array(
            'total' => $row['nbattles'],
            'next' => $row['nextbattle']
        );

        $sql = "SELECT u.lvl, u.xp, u.silver, g.mmr, g.name, g.skin, g.vstr, g.vint, g.vagi, g.cod AS 'id' FROM usuarios u INNER JOIN gladiators g ON g.master = u.id INNER JOIN reports r ON r.gladiator = g.cod INNER JOIN logs l ON l.id = r.log WHERE u.id = $user AND l.hash = '$hash'";
        $result = runQuery($sql);
        $row = $result->fetch_assoc();

        $output['lvl'] = $row['lvl'];
        $output['xp'] = $row['xp'];
        $output['silver'] = $row['silver'];
        $output['glad'] = array(
            'id' => $row['id'],
            'name' => $row['name'],
            'skin' => $row['skin'],
            'vstr' => $row['vstr'],
            'vagi' => $row['vagi'],
            'vint' => $row['vint'],
            'mmr' => $row['mmr']
        );
        $output['status'] = "SUCCESS";
    }

    echo json_encode($output);
?>
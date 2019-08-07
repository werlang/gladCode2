<?php
	session_start();
    include_once "connection.php";
    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();

    if ($action == "GET"){
        $hash = mysql_escape_string($_POST['hash']);

        $sql = "SELECT te.id AS teamid, u.apelido FROM usuarios u INNER JOIN gladiators g ON g.master = u.email INNER JOIN gladiator_teams gt ON gt.gladiator = g.cod INNER JOIN teams te ON te.id = gt.team INNER JOIN tournament t ON t.id = te.tournament WHERE g.master = '$user' AND t.hash = '$hash'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        
        $myteam = '';
		$nrows = $result->num_rows;
		if ($nrows > 0){
            $row = $result->fetch_assoc();
            $myteam = $row['teamid'];
            $output['nick'] = $row['apelido'];
        }

        $alive = "SELECT count(*) FROM gladiator_teams gt INNER JOIN teams te2 ON te2.id = gt.team WHERE gt.dead = '0' AND te.id = te2.id";
        $round = "SELECT max(g.round) FROM groups g INNER JOIN group_teams gt ON gt.groupid = g.id INNER JOIN teams te2 ON te2.id = gt.team WHERE te2.tournament = t.id";
        $sql = "SELECT rt.glad AS ready, te.id AS teamid, ($round) AS tround, t.name AS tname, t.description, te.name, rt.groupid, ($alive) AS alive, rt.lasttime FROM tournament t INNER JOIN teams te ON t.id = te.tournament INNER JOIN group_teams rt ON rt.team = te.id INNER JOIN groups g ON g.id = rt.groupid WHERE t.hash = '$hash' ORDER BY rt.groupid";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

		$nrows = $result->num_rows;
		if ($nrows > 0){
            $output['teams'] = array();
            $output['tournament'] = array();
            while ($row = $result->fetch_assoc()){
                if (count($output['tournament']) == 0){
                    $output['tournament']['name'] = $row['tname'];
                    $output['tournament']['description'] = $row['description'];
                    $output['tournament']['round'] = $row['tround'];
                }

                $team = array();
                $team['id'] = $row['teamid'];
                $team['name'] = $row['name'];
                $team['alive'] = $row['alive'];
                $team['lasttime'] = $row['lasttime'];
                $team['group'] = $row['groupid'];

                if ($row['teamid'] == $myteam)
                    $team['myteam'] = true;

                if ($row['ready'] != null)
                    $team['ready'] = true;

                array_push($output['teams'], $team);
            }

            $output['status'] = "SUCCESS";
        }
        else
            $output['status'] = "NOTFOUND";

    }
    elseif ($action == "GLADS"){
        $hash = mysql_escape_string($_POST['hash']);
        $version = file_get_contents("version");

        $myteams = "SELECT te.id FROM teams te INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE g.master = '$user'";
        $sql = "SELECT g.cod AS id, g.name, g.skin, g.code, u.apelido AS user, g.vstr, g.vagi, g.vint, g.version, gt.dead, gt.visible FROM tournament t INNER JOIN teams te ON te.tournament = t.id INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator INNER JOIN usuarios u ON u.email = g.master WHERE t.hash = '$hash' AND te.id IN ($myteams)";

        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;
		if ($nrows > 0){
            $output['glads'] = array();

            while ($row = $result->fetch_assoc()){
                $glad = $row;
                
                if ($row['version'] != $version)
                    $glad['oldversion'] = true;
                
                if ($row['visible'] == '1')
                    $glad['code'] = htmlspecialchars($row['code']);
                else
                    unset($glad['code']);

                if ($row['dead'] == '1')
                    $glad['dead'] = true;
                else
                    $glad['dead'] = false;

                array_push($output['glads'], $glad);
            }

            $output['status'] = "SUCCESS";
        }
        else
            $output['status'] = "NOTFOUND";
    }
    elseif ($action == "CHOOSE"){
        $gladid = mysql_escape_string($_POST['id']);
        $hash = mysql_escape_string($_POST['hash']);

        $myteams = "SELECT te.id FROM teams te INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE g.master = '$user'";
        $sql = "SELECT gt.dead, gt.id AS gtid, te.id AS teamid FROM tournament t INNER JOIN teams te ON te.tournament = t.id INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator INNER JOIN usuarios u ON u.email = g.master WHERE t.hash = '$hash' AND te.id IN ($myteams) AND g.cod = '$gladid'";

        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows > 0){
            $row = $result->fetch_assoc();
            
            if ($row['dead'] == '1')
                $output['status'] = "DEAD";
            else{
                $teamid = $row['teamid'];
                $gtid = $row['gtid'];
                
                $round = "SELECT max(g.round) FROM groups g INNER JOIN group_teams gt ON gt.groupid = g.id INNER JOIN teams te ON te.id = gt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '26ad70b9e35fb920'";
                $sql = "SELECT g.id FROM groups g INNER JOIN group_teams gt ON gt.groupid = g.id WHERE g.round = ($round) AND gt.team = '$teamid'";

                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $row = $result->fetch_assoc();
                $groupid = $row['id'];

                $sql = "UPDATE group_teams SET glad = '$gtid' WHERE groupid = '$groupid' AND team = '$teamid'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                $output['status'] = "SUCCESS";
            }
        }
        else
            $output['status'] = "NOTFOUND";
    }
    elseif ($action == "REFRESH"){
        $hash = mysql_escape_string($_POST['hash']);

        $alive = "SELECT count(*) FROM gladiator_teams gt INNER JOIN teams te2 ON te2.id = gt.team WHERE gt.dead = '0' AND te.id = te2.id";
        $sql = "SELECT rt.glad AS ready, te.id AS teamid, te.name, ($alive) AS alive, rt.lasttime FROM tournament t INNER JOIN teams te ON t.id = te.tournament INNER JOIN group_teams rt ON rt.team = te.id WHERE t.hash = '$hash'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

        $output['teams'] = array();

        while ($row = $result->fetch_assoc()){
            if ($row['ready'] == null)
                $row['ready'] = false;
            else
                $row['ready'] = true;

            $output['teams'][$row['teamid']] = $row;
        }

        $output['groups'] = array();

        $remaining = "SELECT count(*) FROM group_teams gt2 INNER JOIN teams te ON te.id = gt2.team INNER JOIN tournament t ON t.id = te.tournament WHERE gt2.glad IS null AND t.hash = '$hash' AND gt2.groupid = gt.groupid";
        $sql = "SELECT gt.groupid AS id, count(*) AS total, ($remaining) AS rem FROM group_teams gt INNER JOIN teams te ON te.id = gt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash' GROUP BY gt.groupid";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

        while ($row = $result->fetch_assoc()){
            $groupid = $row['id'];
            $output['groups'][$groupid] = array();
            $output['groups'][$groupid]['total'] = $row['total'];
            $output['groups'][$groupid]['remaining'] = $row['rem'];

            if ($row['rem'] > 0)
                $output['groups'][$groupid]['status'] = "WAIT";
            else{
                $sql = "SELECT log, locked FROM groups WHERE id = '$groupid'";
                if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $row2 = $result2->fetch_assoc();

                if ($row2['log'] == null){
                    if ($row2['locked'] == '0'){
                        $sql = "UPDATE groups SET locked = '1' WHERE id = '$groupid'";
                        if(!$result3 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                        $output['groups'][$groupid]['status'] = "RUN";
                    }
                    else
                        $output['groups'][$groupid]['status'] = "LOCK";
                }
                else{
                    $output['groups'][$groupid]['status'] = "DONE";
                    $output['groups'][$groupid]['hash'] = $row2['log'];
                }

            }

        }
        
        $output['status'] = "SUCCESS";
    }

    echo json_encode($output);

?>


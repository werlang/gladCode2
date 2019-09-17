<?php
	session_start();
    include_once "connection.php";
    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();
    date_default_timezone_set('America/Sao_Paulo');

    if ($action == "GET"){
        $hash = mysql_escape_string($_POST['hash']);
        $round = mysql_escape_string($_POST['round']);

        //check maxround
        $sql = "SELECT max(gr.round) AS maxround FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();
        $maxround = $row['maxround'];

        if ($round == '0'){
            //find those teams not dead
            $gladsalive = "SELECT count(*) FROM gladiator_teams glt INNER JOIN teams te2 ON glt.team = te2.id INNER JOIN group_teams grt ON te2.id = grt.team INNER JOIN tournament t ON t.id = te2.tournament INNER JOIN groups gr ON gr.id = grt.groupid WHERE t.hash = '$hash' AND glt.dead = '0' AND te2.id = te.id AND gr.round = $maxround";
            $sql = "SELECT te.id FROM teams te WHERE ($gladsalive) > 0";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nteams = $result->num_rows;

            if ($nteams > 1){
                $output['status'] = "REDIRECT";
                $output['round'] = $maxround;
            }
            else{
                //get the final ranking order
                $sql = "SELECT te.id, te.name AS team, t.name AS tournament FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash' AND te.id NOT IN (SELECT grt2.team FROM groups gr2 INNER JOIN group_teams grt2 ON grt2.groupid = gr2.id WHERE gr2.round > gr.round) ORDER BY gr.round DESC, grt.lasttime DESC";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                $rank = array();
                while ($row = $result->fetch_assoc()){
                    array_push($rank, $row['team']);

                    if (!isset($output['tournament']))
                        $output['tournament'] = $row['tournament'];
                }

                $output['maxround'] = $maxround;
                $output['ranking'] = $rank;
                $output['status'] = "END";
            }
        }
        else{
            //get info about my team
            $sql = "SELECT te.id AS teamid, u.apelido FROM usuarios u INNER JOIN gladiators g ON g.master = u.email INNER JOIN gladiator_teams gt ON gt.gladiator = g.cod INNER JOIN teams te ON te.id = gt.team INNER JOIN tournament t ON t.id = te.tournament WHERE g.master = '$user' AND t.hash = '$hash'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            
            $myteam = '';
            $nrows = $result->num_rows;
            if ($nrows > 0){
                $row = $result->fetch_assoc();
                $myteam = $row['teamid'];
                $output['nick'] = $row['apelido'];
            }
    
            //get info from tournament, lasttime and dead
            $alive = "SELECT count(*) FROM group_teams grt INNER JOIN groups gr ON gr.id = grt.groupid INNER JOIN teams te2 ON te2.id = grt.team INNER JOIN gladiator_teams glt ON te2.id = glt.team WHERE (glt.dead = '0' OR glt.dead >= '$round') AND gr.round = '$round' AND te.id = te2.id";
            $sql = "SELECT grt.gladiator AS ready, te.id AS teamid, t.name AS tname, t.description, te.name, grt.groupid, ($alive) AS alive, grt.lasttime, gr.locked, gr.deadline FROM tournament t INNER JOIN teams te ON t.id = te.tournament INNER JOIN group_teams grt ON grt.team = te.id INNER JOIN groups gr ON gr.id = grt.groupid WHERE t.hash = '$hash' AND gr.round = '$round' ORDER BY grt.groupid, grt.lasttime DESC";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

            $nrows = $result->num_rows;
            if ($nrows > 0){
                $output['teams'] = array();
                $output['tournament'] = array();
                while ($row = $result->fetch_assoc()){
                    if (count($output['tournament']) == 0){
                        $output['tournament']['name'] = $row['tname'];
                        $output['tournament']['description'] = $row['description'];
                        $output['tournament']['round'] = $round;
                        $output['tournament']['deadline'] = $row['deadline'];
                    }
    
                    $team = array();
                    $team['id'] = $row['teamid'];
                    $team['name'] = $row['name'];
                    $team['alive'] = $row['alive'];
                    $team['lasttime'] = $row['lasttime'];
                    $team['group'] = $row['groupid'];
    
                    if ($row['teamid'] == $myteam){
                        $team['myteam'] = true;
                        $output['locked'] = is_locked($row['locked']);
                    }
    
                    if ($row['ready'] != null)
                        $team['ready'] = true;
    
                    array_push($output['teams'], $team);
                }
    
                $output['status'] = "SUCCESS";
            }
            else{
                $output['status'] = "NOTFOUND";
            }
        }

    }
    elseif ($action == "GLADS"){
        $hash = mysql_escape_string($_POST['hash']);
        $version = file_get_contents("version");
        $round = mysql_escape_string($_POST['round']);

        //see if group which I belong is locked
        $myteams = "SELECT te.id FROM teams te INNER JOIN gladiator_teams glt ON glt.team = te.id INNER JOIN gladiators g ON g.cod = glt.gladiator WHERE g.master = '$user'";

        $sql = "SELECT gr.locked FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash' AND te.id IN ($myteams) AND gr.round = '$round'";

        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;
        $locked = false;
        if ($nrows > 0){
            $row = $result->fetch_assoc();
            $locked = is_locked($row['locked']);
        }
        if (!$locked){
            //get info from glads into my team from this tournament
            $sql = "SELECT g.cod AS id, g.name, g.skin, g.code, u.apelido AS user, g.vstr, g.vagi, g.vint, g.version, glt.dead, glt.visible FROM tournament t INNER JOIN teams te ON te.tournament = t.id INNER JOIN gladiator_teams glt ON glt.team = te.id INNER JOIN group_teams grt ON grt.team = te.id INNER JOIN gladiators g ON g.cod = glt.gladiator INNER JOIN usuarios u ON u.email = g.master INNER JOIN groups gr ON gr.id = grt.groupid WHERE t.hash = '$hash' AND te.id IN ($myteams) AND gr.round = '$round'";

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

                    if ($row['dead'] < $round && $row['dead'] != 0)
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
        else
            $output['status'] = "LOCK";
    }
    elseif ($action == "CHOOSE"){
        $gladid = mysql_escape_string($_POST['id']);
        $hash = mysql_escape_string($_POST['hash']);
        $version = file_get_contents("version");

        //check if this glad is in my team
        $myteams = "SELECT te.id FROM teams te INNER JOIN gladiator_teams glt ON glt.team = te.id INNER JOIN gladiators g ON g.cod = glt.gladiator WHERE g.master = '$user'";
        $sql = "SELECT glt.dead, g.cod AS gladid, te.id AS teamid, g.version FROM tournament t INNER JOIN teams te ON te.tournament = t.id INNER JOIN gladiator_teams glt ON glt.team = te.id INNER JOIN group_teams grt ON grt.team = te.id INNER JOIN gladiators g ON g.cod = glt.gladiator WHERE t.hash = '$hash' AND te.id IN ($myteams) AND g.cod = '$gladid'";

        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows > 0){
            $row = $result->fetch_assoc();
            
            if ($row['dead'] != 0 && $row['dead'] < $round)
                $output['status'] = "DEAD";
            elseif ($row['version'] != $version)
                $output['status'] = "OLD";
            else{
                $teamid = $row['teamid'];
                $gladid = $row['gladid'];
                
                //get groupid having my teams in the latest round
                $roundsql = "SELECT max(gr.round) FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash'";
                $sql = "SELECT gr.id FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id WHERE gr.round = ($roundsql) AND grt.team = '$teamid'";

                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $row = $result->fetch_assoc();
                $groupid = $row['id'];

                $sql = "UPDATE group_teams SET gladiator = '$gladid' WHERE groupid = '$groupid' AND team = '$teamid'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                $output['status'] = "SUCCESS";
            }
        }
        else
            $output['status'] = "NOTFOUND";
    }
    elseif ($action == "REFRESH"){
        $hash = mysql_escape_string($_POST['hash']);
        $round = mysql_escape_string($_POST['round']);

        //check if there is any battle left to be done
        $sql = "SELECT gr.deadline FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE gr.log IS NULL AND t.hash = '$hash' AND gr.round = '$round'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;
        
        $timeup = false;
        if ($nrows == 0)
            $nextround = true;
        else{
            //check of time is up for a new round
            $row = $result->fetch_assoc();
            $deadline = (new DateTime($row['deadline']))->getTimestamp();
            $now = (new DateTime())->getTimestamp();

            if ($now > $deadline)
                $timeup = true;
        }

        //check how many alive and lasttime for each team in the tournament
        $alive = "SELECT count(*) FROM group_teams grt INNER JOIN teams te2 ON te2.id = grt.team INNER JOIN gladiator_teams glt ON glt.team = te2.id INNER JOIN groups gr ON gr.id = grt.groupid WHERE (glt.dead = '0' OR glt.dead > '$round') AND gr.round = '$round' AND te.id = te2.id";
        $sql = "SELECT grt.gladiator AS ready, te.id AS teamid, te.name, ($alive) AS alive, grt.lasttime FROM tournament t INNER JOIN teams te ON t.id = te.tournament INNER JOIN group_teams grt ON grt.team = te.id INNER JOIN groups gr ON gr.id = grt.groupid WHERE t.hash = '$hash' AND gr.round = '$round'";
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
        //check the groups that remain to choose a glad for the current round
        $remaining = "SELECT count(*) FROM group_teams gt2 INNER JOIN teams te ON te.id = gt2.team INNER JOIN tournament t ON t.id = te.tournament WHERE gt2.gladiator IS NULL AND t.hash = '$hash' AND gt2.groupid = grt.groupid";
        $sql = "SELECT grt.groupid AS id, count(*) AS total, ($remaining) AS rem FROM group_teams grt INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash' GROUP BY grt.groupid";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

        while ($row = $result->fetch_assoc()){
            $groupid = $row['id'];
            $output['groups'][$groupid] = array();
            $output['groups'][$groupid]['total'] = $row['total'];
            $output['groups'][$groupid]['remaining'] = $row['rem'];

            if ($row['rem'] > 0 && !$timeup)
                $output['groups'][$groupid]['status'] = "WAIT";
            else{
                if ($timeup){
                    //select a random glad from each participating group's team
                    $sql = "SELECT gl.gladiator, gl.id FROM (SELECT glt.gladiator, te.id AS team, grt.id FROM gladiator_teams glt INNER JOIN teams te ON glt.team = te.id INNER JOIN group_teams grt ON grt.team = te.id WHERE grt.groupid = '$groupid' AND glt.dead = '0' AND grt.gladiator IS NULL ORDER BY rand()) AS gl INNER JOIN teams te ON te.id = gl.team GROUP BY te.id";
                    if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    
                    //time's up, so select randomly one glad for each group remaining
                    while($row2 = $result2->fetch_assoc()){
                        $glad = $row2['gladiator'];
                        $id = $row2['id'];
                        $sql = "UPDATE group_teams SET gladiator = '$glad' WHERE id = '$id'";
                        if(!$result3 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                    }
                }

                $sql = "SELECT l.hash, gr.locked FROM groups gr INNER JOIN logs l ON l.id = gr.log WHERE gr.id = '$groupid'";
                if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $row2 = $result2->fetch_assoc();

                if ($row2['hash'] == null){
                    if (!is_locked($row2['locked'])){
                        $sql = "UPDATE groups SET locked = now() WHERE id = '$groupid'";
                        if(!$result3 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                        if (!isset($_SESSION['tourn-group']))
                            $_SESSION['tourn-group'] = array();
                        $_SESSION['tourn-group'][$groupid] = md5("tourn-group-$groupid-id");
                        $output['groups'][$groupid]['status'] = "RUN";
                    }
                    else
                        $output['groups'][$groupid]['status'] = "LOCK";
                }
                else{
                    $output['groups'][$groupid]['status'] = "DONE";
                    $output['groups'][$groupid]['hash'] = $row2['hash'];
                }

            }

        }
        
        if ($nextround){
            //find those teams not dead
            $gladsalive = "SELECT count(*) FROM gladiator_teams glt INNER JOIN teams te2 ON glt.team = te2.id INNER JOIN group_teams grt ON te2.id = grt.team INNER JOIN tournament t ON t.id = te2.tournament INNER JOIN groups gr ON gr.id = grt.groupid WHERE t.hash = '$hash' AND glt.dead = '0' AND te2.id = te.id AND gr.round = $round";
            $sql = "SELECT te.id FROM teams te WHERE ($gladsalive) > 0";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nteams = $result->num_rows;

            //check maxround
            $sql = "SELECT max(gr.round) AS maxround FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $row = $result->fetch_assoc();
            $maxround = $row['maxround'];

            if ($nteams > 1 || $round < $maxround){
                $output['status'] = "NEXT";
            }
            else{
                $output['status'] = "END";
            }
        }
        else
            $output['status'] = "SUCCESS";       
    }
    elseif ($action == "UPDATE"){
        $hash = mysql_escape_string($_POST['hash']);

        //max round number found
        $sql = "SELECT max(gr.round) AS maxround, t.maxtime FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();
        $maxround = $row['maxround'];
        $maxtime = $row['maxtime'];

        //get id from groups on the last round
        $sql = "SELECT DISTINCT gr.log FROM groups gr INNER JOIN group_teams grt ON grt.groupid = gr.id INNER JOIN teams te ON te.id = grt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash' AND gr.round = $maxround";
        if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

        $teams_total = array();
        while ($row2 = $result2->fetch_assoc()){
            $logid = $row2['log'];

            if ($logid != null){

                $log = get_battle(file_get_contents("logs/$logid"));

                //get glad id and death times in each log
                $teams = array();
                foreach( array_reverse($log) as $step){
                    foreach($step['glads'] as $i => $glad){
                        if (count($teams) < count($step['glads'])){
                            $name = preg_replace('/#/', " ", $glad['name']);
                            $nick = preg_replace('/#/', " ", $glad['user']);
                            
                            $sql = "SELECT g.cod, glt.team FROM gladiators g INNER JOIN usuarios u ON u.email = g.master INNER JOIN gladiator_teams glt ON glt.gladiator = g.cod INNER JOIN teams te ON te.id = glt.team INNER JOIN tournament t ON t.id = te.tournament WHERE t.hash = '$hash' AND g.name = '$name' AND u.apelido = '$nick'";                            
                            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                            $row = $result->fetch_assoc();

                            $teams[$i] = array();
                            $teams[$i]['glad'] = $row['cod'];
                            $teams[$i]['team'] = $row['team'];
                            $teams[$i]['time'] = 0;

                            if ($glad['hp'] > 0){
                                $teams[$i]['winner'] = true;
                                $teams[$i]['time'] = 1000 + $step['simtime'];
                            }
                        }
                        if ($teams[$i]['time'] == 0 && $glad['hp'] > 0){
                            $teams[$i]['time'] = $step['simtime'];
                            $teams[$i]['hp'] = $glad['hp'];
                        }
                    }
                    $count = 0;
                    foreach ($teams as $team){
                        if ($team['time'] == 0)
                            $count++;
                    }
                    if ($count == 0)
                        break;

                }

                usort($teams, 'death_sort');

                $map = array();
                $round = null;
                //get info from grt, glt about the battle with specific logid
                $sql = "SELECT grt.id AS grt, grt.gladiator, gr.round, glt.id AS glt FROM group_teams grt INNER JOIN groups gr ON gr.id = grt.groupid INNER JOIN gladiators g ON g.cod = grt.gladiator INNER JOIN gladiator_teams glt ON glt.gladiator = g.cod INNER JOIN teams te ON te.id = glt.team INNER JOIN tournament t ON t.id = te.tournament WHERE gr.log = $logid AND t.hash = '$hash'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                while ($row = $result->fetch_assoc()){
                    $map[$row['gladiator']] = array('grt' => $row['grt'], 'glt' => $row['glt']);
                    if (!$round)
                        $round = $row['round'];
                }

                //update lasttime and deaths
                foreach ($teams as $i => $team){
                    $grt = $map[$team['glad']]['grt'];
                    $lasttime = $team['time'];
                    $sql = "UPDATE group_teams SET lasttime = '$lasttime' WHERE id = $grt";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                    if (!isset($team['winner'])){
                        $glt = $map[$team['glad']]['glt'];
                        $sql = "UPDATE gladiator_teams SET dead = '$round' WHERE id = $glt";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    }

                    array_push($teams_total, $team);
                }

            }
        }

        //how many battles left to be done
        $sql = "SELECT gr.log FROM tournament t INNER JOIN teams te ON te.tournament = t.id INNER JOIN group_teams grt ON grt.team = te.id INNER JOIN groups gr ON gr.id = grt.groupid WHERE t.hash = '$hash' AND gr.log IS NULL";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        $output['status'] = "SUCCESS";

        if ($nrows == 0){
            $teams = $teams_total;

            //find those teams not dead
            $gladsalive = "SELECT count(*) FROM gladiator_teams glt INNER JOIN teams te2 ON glt.team = te2.id INNER JOIN group_teams grt ON te2.id = grt.team INNER JOIN tournament t ON t.id = te2.tournament INNER JOIN groups gr ON gr.id = grt.groupid WHERE t.hash = '$hash' AND glt.dead = '0' AND te2.id = te.id AND gr.round = '$maxround'";
            $sql = "SELECT te.id FROM teams te WHERE ($gladsalive) > 0";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nteams = $result->num_rows;

            if ($nteams > 1){
                $aliveteams = array();
                while ($row = $result->fetch_assoc()){
                    array_push($aliveteams, $row['id']);
                }

                //place tag dead in those dead and reorder to put dead in the end
                foreach ($teams as $i => $team){
                    if (!in_array($team['team'], $aliveteams))
                        $teams[$i]['dead'] = true;
                }
                usort($teams, 'death_sort');
                
                //create new groups
                $ngroups = ceil($nteams / 5);
                $newround = $maxround + 1;

                $remteams = $nteams;
                $teami = 0;
                for ($i=0 ; $i<$ngroups ; $i++){
                    $sql = "INSERT INTO groups(round, deadline) VALUES ('$newround', ADDTIME(now(), TIME('$maxtime')))";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    $group = $conn->insert_id;

                    //fill remaining teams into those groups
                    $remgroups = $ngroups - $i;
                    $teamsgroup = ceil($remteams / $remgroups);
                    for ($j=0 ; $j<$teamsgroup ; $j++){
                        $teamid = $teams[$teami]['team'];
                        $sql = "INSERT INTO group_teams (team, groupid) VALUES ('$teamid', '$group')";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                        $teami++;
                    }
                    $remteams = $remteams - $teamsgroup;
                }

                $output['status'] = "NEXT";
            }
            else{
                $output['status'] = "END";
            }
        }
        

    }

    echo json_encode($output);

    function get_battle($log){
        $log = json_decode($log, true);
        $merged = array();
        $battle = array();

        foreach($log as $step){
            $merged = array_merge_recursive_distinct($merged, $step);
            array_push($battle, $merged);
        }

        return $battle;
    }

    function array_merge_recursive_distinct ( array &$array1, array &$array2 ){
        $merged = $array1;

        foreach ( $array2 as $key => &$value ){
            if ( is_array ( $value ) && isset ( $merged [$key] ) && is_array ( $merged [$key] ) )
                $merged [$key] = array_merge_recursive_distinct ( $merged [$key], $value );            
            else
                $merged [$key] = $value;
        }
        return $merged;
    }

    function death_sort($a,$b) {
        if (isset($b['winner']) && !isset($a['winner']))
            return 1;
        elseif (isset($a['winner']) && !isset($b['winner']))
            return -1;
        elseif (isset($b['dead']) && !isset($a['dead']))
            return -1;
        elseif (isset($a['dead']) && !isset($b['dead']))
            return 1;
        else{
            $c = $b['time'] - $a['time'];
            if ($c == 0)
                return $b['hp'] - $a['hp'];
            else
                return $c;
        }
    }
    
    function is_locked ($t){
        if ($t == null || $t == 'null')
            return false;

        $locked = new DateTime($t);
        $now = new DateTime();
        $diff = $now->getTimestamp() - $locked->getTimestamp();
        if ($diff < 10)
            return true;
        else
            return false;
    }
?>


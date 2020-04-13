<?php
    session_start();
    date_default_timezone_set('America/Sao_Paulo');
    include_once "connection.php";
    include("back_node_message.php");

    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();

    if ($action == "GET"){
        $hash = mysql_escape_string($_POST['hash']);
        $round = mysql_escape_string($_POST['round']);

        $sql = "SELECT t.id, t.name, t.description, t.maxtime, t.hash, t.hash_valid AS expire, now(3) AS 'now', t.manager FROM training t WHERE hash = '$hash'";
        $result = runQuery($sql);
        $row = $result->fetch_assoc();
        
        $trainid = $row['id'];
        $output['name'] = $row['name'];
        $output['description'] = $row['description'];
        $output['maxtime'] = $row['maxtime'];
        $output['hash'] = $row['hash'];
        $output['now'] = $row['now'];

        if ($row['manager'] == $user)
            $output['manager'] = true;

        $sql = "SELECT gt.id, u.apelido AS master, g.name AS gladiator, g.cod AS gladid, tg.id AS 'group', tg.round, u.id AS user, tg.deadline FROM gladiator_training gt INNER JOIN training_groups tg ON tg.id = gt.groupid INNER JOIN gladiators g ON gt.gladiator = g.cod INNER JOIN usuarios u ON u.id = g.master WHERE gt.training = $trainid AND tg.round = $round ORDER BY gt.groupid";
        $result = runQuery($sql);
        
        $groups = array();
        while($row = $result->fetch_assoc()){
            if (!isset($output['round'])){
                $output['round'] = $row['round'];
                $output['deadline'] = $row['deadline'];
            }

            $team = array();
            $team['master'] = $row['master'];
            $team['gladiator'] = $row['gladiator'];

            if ($row['user'] == $user)
                $team['myteam'] = true;

            $gid = $row['group'];
            $tid = $row['id'];
            $gladid = $row['gladid'];

            // get summed score
            $sql = "SELECT sum(score) AS score FROM gladiator_training WHERE gladiator = $gladid AND training = $trainid";
            $result2 = runQuery($sql);
            $row = $result2->fetch_assoc();
            $team['score'] = $row['score'];

            if (!isset($groups[$gid]))
                $groups[$gid] = array();
            $groups[$gid][$tid] = $team;            
        }

        $output['groups'] = $groups;
        $output['status'] = "SUCCESS";
    }
    elseif ($action == "DEADLINE"){
        $hash = mysql_escape_string($_POST['hash']);
        $time = mysql_escape_string($_POST['time']);
        $round = mysql_escape_string($_POST['round']);

        $sql = "SELECT manager, id FROM training WHERE hash = '$hash'";
        $result = runQuery($sql);
        $nrows = $result->num_rows;

        if ($nrows == 0)
            $output['status'] = "NOTFOUND";
        else{
            $row = $result->fetch_assoc();
            if ($row['manager'] != $user)
                $output['status'] = "NOTALLOWED";
            else{
                $trainid = $row['id'];

                $sql = "SELECT tg.id FROM training_groups tg INNER JOIN gladiator_training gt ON gt.groupid = tg.id WHERE gt.training = $trainid AND tg.round = $round";
                $result = runQuery($sql);
                $groups = array();
                while ($row = $result->fetch_assoc())
                    array_push($groups, $row['id']);
                $groups = implode(",", $groups);
                
                $sql = "UPDATE training_groups SET deadline = now(3) + INTERVAL $time MINUTE WHERE id IN ($groups)";
                $result = runQuery($sql);

                $group = explode(",",$groups)[0];
                $sql = "SELECT deadline FROM training_groups WHERE id = $group";
                $result = runQuery($sql);
                $row = $result->fetch_assoc();

                $output['deadline'] = $row['deadline'];
                $output['status'] = "SUCCESS";

                send_node_message(array('training refresh' => array(
                    'hash' => $hash
                )));

            }
        }
    }
    elseif ($action == "REFRESH"){
        $hash = mysql_escape_string($_POST['hash']);
        $round = mysql_escape_string($_POST['round']);

        $sql = "SELECT id FROM training WHERE hash = '$hash'";
        $result = runQuery($sql);
        $nrows = $result->num_rows;

        if ($nrows == 0)
            $output['status'] = "NOTFOUND";
        else{
            $row = $result->fetch_assoc();
            $trainid = $row['id'];

            $sql = "SELECT gt.score, gt.id, tg.deadline, now(3) AS 'now', tg.id AS 'group', tg.locked, l.hash AS 'log', l.id AS 'logid' FROM gladiator_training gt INNER JOIN training_groups tg ON tg.id = gt.groupid LEFT JOIN logs l ON l.id = tg.log  WHERE gt.training = $trainid AND tg.round = $round";
            $result = runQuery($sql);

            $hasLog = false;
            $groups = array();
            while ($row = $result->fetch_assoc()){
                if (!isset($output['now'])){
                    $now = $row['now'];
                    $deadline = $row['deadline'];
                }
                $id = $row['id'];
                $gid = $row['group'];

                if (!isset($groups[$gid]))
                    $groups[$gid] = array();
                if (!isset($groups[$gid][$id]))
                    $groups[$gid][$id] = array();

                if (!is_null($row['locked']))
                    $groups[$gid]['locked'] = true;

                if (!is_null($row['log'])){
                    $groups[$gid]['log'] = $row['log'];
                    // put battle info into groups
                    $groups[$gid] = getScores($groups[$gid], $row['logid'], $trainid);
                }
            }

            $output['groups'] = $groups;
            $output['deadline'] = $deadline;
            $output['now'] = $now;

            if (is_null($deadline))
                $output['status'] = "WAIT";
            else{
                // check if need to run again
                foreach($groups as $gid => $group){
                    $tolerance = 7;
                    $sql = "SELECT log FROM training_groups WHERE locked + INTERVAL $tolerance SECOND < now(3) AND id = $gid";
                    $result = runQuery($sql);
                    $nrows = $result->num_rows;
                    if ($nrows > 0){
                        $row = $result->fetch_assoc();
                        if (is_null($row['log'])){
                            unset($groups[$gid]['locked']);
                        }
                        if (isset($_SESSION['train-run']) && $_SESSION['train-run'] == md5("train-$gid-id"))
                            unset($_SESSION['train-run']);
                    }
                }

                if (isset($_SESSION['train-run'])){
                    $output['status'] = "LOCK";
                }
                else{
                    // time is up
                    $deadline = (new DateTime($deadline))->getTimestamp();
                    $now = (new DateTime($now))->getTimestamp();
                    if ($now >= $deadline){
                        foreach($groups as $gid => $group){
                            if (!isset($group['locked'])){
                                $_SESSION['train-run'] = md5("train-$gid-id");
                                $chosen = $gid;
                                break;
                            }
                        }
                        if(!isset($chosen)){
                            $output['status'] = "DONE";
                        }
                        else{
                            $sql = "UPDATE training_groups SET locked = now(3) WHERE id = $chosen";
                            $result = runQuery($sql);
                            
                            $output['run'] = $chosen;
                            $output['status'] = "RUN";
                        }
                    }
                    else
                        $output['status'] = "SUCCESS";
                }
            }
        }
    }

    echo json_encode($output);

    function getScores($group, $logid, $trainid){
        $ids = array_keys($group);
        $retrieve = true;
        foreach ($ids as $id){
            if (is_int($id)){
                $sql = "SELECT score, lasttime FROM gladiator_training WHERE id = $id";
                $result = runQuery($sql);
                $row = $result->fetch_assoc();
                if ($row['lasttime'] != 0){
                    $group[$id]['score'] = $row['score'];
                    $group[$id]['time'] = $row['lasttime'];
                    $retrieve = false;
                }            
            }
        }

        if ($retrieve){
            $log = get_battle(file_get_contents("logs/$logid"));

            //get glad id and death times in each log
            $teams = array();
            foreach( array_reverse($log) as $step){
                foreach($step['glads'] as $i => $glad){
                    if (count($teams) < count($step['glads'])){
                        $name = preg_replace('/#/', " ", $glad['name']);
                        $nick = preg_replace('/#/', " ", $glad['user']);
                        
                        // find point in time when every glad was killed
                        $sql = "SELECT gt.id FROM gladiators g INNER JOIN usuarios u ON u.id = g.master INNER JOIN gladiator_training gt ON gt.gladiator = g.cod WHERE gt.training = $trainid AND g.name = '$name' AND u.apelido = '$nick'";                            
                        $result = runQuery($sql);
                        $row = $result->fetch_assoc();

                        $teams[$i] = array();
                        $teams[$i]['id'] = $row['id'];;
                        $teams[$i]['time'] = 0;

                        if ($glad['hp'] > 0){
                            $teams[$i]['winner'] = true;
                            $teams[$i]['time'] = $step['simtime'];
                        }
                    }
                    if ($teams[$i]['time'] == 0 && $glad['hp'] > 0){
                        $teams[$i]['time'] = $step['simtime'];
                        $teams[$i]['hp'] = $glad['hp'];
                    }
                }
                // when all glads are alive, break
                $count = 0;
                foreach ($teams as $team){
                    if ($team['time'] == 0)
                        $count++;
                }
                if ($count == 0)
                    break;

            }

            usort($teams, 'death_sort');

            $rewards = calcReward($teams);

            foreach($teams as $i => $team){
                $id = $team['id'];
                $group[$id]['time'] = $team['time'];
                $group[$id]['score'] = $rewards[$i];
                if (isset($team['winner']))
                    $group[$id]['winner'] = $team['winner'];

                $score = $rewards[$i];
                $time = $team['time'];
                $sql = "UPDATE gladiator_training SET score = $score, lasttime = $time WHERE id = $id";
                $result = runQuery($sql);
            }
        }

        return $group;
    }

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

    function calcReward($glads){
        $maxReward = 10;
        $timeWeight = 1.5;
        $winWeight = 1;
        $nglad = count($glads);
        
        $rewards = array();
        // calc time between the last and first to die
        $timeDiff = $glads[1]['time'] - $glads[$nglad-1]['time'];
        
        foreach($glads as $i => $glad){
            $diff = $glad['time'] - $glads[$nglad-1]['time'];
            if ($timeDiff == 0)
                $timeNorm = 1;
            else
                $timeNorm = $diff/$timeDiff;

            $win = 0;
            if ($glads[$i]['winner']){
                $win = 1;
                $timeNorm = 1;
            }
            $rewards[$i] = ($timeNorm * $timeWeight) + ($win * $winWeight);
            if (!isset($topRawReward))
                $topRawReward = $rewards[0];
            $rewards[$i] = $rewards[$i] / $topRawReward * $maxReward;
        }

        return $rewards;
    }
?>
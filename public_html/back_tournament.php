<?php
    session_start();
    date_default_timezone_set('America/Sao_Paulo');
    include_once "connection.php";
    $user = $_SESSION['user'];
    $action = $_POST['action'];

    if ($action == "CREATE"){
        $name = mysql_escape_string($_POST['name']);
        $pass = mysql_escape_string($_POST['pass']);
        $desc = mysql_escape_string($_POST['desc']);
        $maxteams = mysql_escape_string($_POST['maxteams']);
        $maxtime = mysql_escape_string($_POST['maxtime']);
        $flex = mysql_escape_string($_POST['flex']);
        if ($flex == "true")
            $flex = 1;
        else
            $flex = 0;

        if ($maxteams < 2)
            $maxteams = 2;
        if ($maxteams > 50)
            $maxteams = 50;

        $maxtime = implode(":", explode("h", $maxtime));
        $maxtime = implode("", explode(" ", $maxtime));
        $maxtime = implode("", explode("m", $maxtime));
        
        if ($maxtime[strlen($maxtime)-1] == ':')
            $maxtime .= "00";
        elseif (count(explode(":", $maxtime)) == 1 )
        	$maxtime = "00:". $maxtime;

        $sql = "SELECT * FROM tournament WHERE name = '$name'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0){
            $sql = "INSERT INTO tournament (manager, name, password, description, creation, hash, maxteams, flex, maxtime) VALUES ('$user', '$name', '$pass', '$desc', now(), '', '$maxteams', '$flex', GREATEST(TIME('00:03'), TIME('$maxtime')));";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            echo $hash;
        }
        else
            echo "EXISTS";

    }
    else if ($action == "LIST"){
        $output = array();
        $moffset = mysql_escape_string($_POST['moffset']);
        $ooffset = mysql_escape_string($_POST['ooffset']);
        $limit = 10;

        if ($moffset < 0)
            $moffset = 0;
        if ($ooffset < 0)
            $ooffset = 0;

        //how many open 
        $sql = "SELECT t.id FROM tournament t WHERE t.password = '' AND (SELECT count(*) FROM teams te WHERE te.tournament = t.id) < t.maxteams AND hash = ''";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nopen = $result->num_rows;

        if ($ooffset >= $nopen)
            $ooffset -= $limit;

        //show open tournaments not started and not filled
        $sql = "SELECT * FROM tournament t WHERE t.password = '' AND (SELECT count(*) FROM teams te WHERE te.tournament = t.id) < t.maxteams AND hash = '' ORDER BY t.creation DESC LIMIT $limit OFFSET $ooffset";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;
        
        $open = array();
		if ($nrows > 0){
            while ($row = $result->fetch_assoc()){
                $tournid = $row['id'];

                $sql = "SELECT * FROM teams WHERE tournament = '$tournid'";
                if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result2->num_rows;
                $row['teams'] = $nrows;

                array_push($open, $row);
            }
        }

        //how many mine
        $sql = "SELECT DISTINCT t.id AS id, t.name AS name, t.description AS description, t.maxteams AS maxteams, t.flex AS flex FROM teams te INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator RIGHT JOIN tournament t ON t.id = te.tournament WHERE (g.master = '$user' AND t.manager != '$user') OR t.manager = '$user'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nmine = $result->num_rows;

        if ($moffset >= $nmine)
            $moffset -= $limit;
        if ($moffset < 0)
            $moffset = 0;

        //show tournaments which I am the manager or I have joined
        $sql = "SELECT DISTINCT t.id AS id, t.name AS name, t.description AS description, t.maxteams AS maxteams, t.flex AS flex FROM teams te INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator RIGHT JOIN tournament t ON t.id = te.tournament WHERE (g.master = '$user' AND t.manager != '$user') OR t.manager = '$user' ORDER BY t.creation DESC LIMIT $limit OFFSET $moffset";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;
        
        $mytourn = array();
		if ($nrows > 0){
            while ($row = $result->fetch_assoc()){
                $tournid = $row['id'];

                $sql = "SELECT * FROM teams WHERE tournament = '$tournid'";
                if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result2->num_rows;
                $row['teams'] = $nrows;

                array_push($mytourn, $row);
            }
        }

        $output['pages'] = array();

        $output['pages']['mine'] = array();
        $output['pages']['mine']['offset'] = $moffset;
        $output['pages']['mine']['total'] = $nmine;

        $output['pages']['open'] = array();
        $output['pages']['open']['offset'] = $ooffset;
        $output['pages']['open']['total'] = $nopen;

        $output['open'] = $open;
        $output['mytourn'] = $mytourn;

        echo json_encode($output);
    }
    else if ($action == "JOIN"){
        $name = mysql_escape_string($_POST['name']);

        if (isset($_POST['pass']))
            $pass = mysql_escape_string($_POST['pass']);
        else{
            $sql = "SELECT password FROM tournament WHERE name = '$name' AND manager = '$user'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nrows = $result->num_rows;

            if ($nrows == 0){
                $sql = "SELECT t.password AS password FROM tournament t INNER JOIN teams te ON t.id = te.tournament INNER JOIN gladiator_teams gt ON gt.team = te.id INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE g.master = '$user' AND t.name = '$name'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            }

            $row = $result->fetch_assoc();
            $pass = $row['password'];
        }

        $sql = "SELECT * FROM tournament WHERE name = '$name' AND password = '$pass'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0)
            $output['status'] = "NOTFOUND";
        else{
            $output = array();
            $row = $result->fetch_assoc();
            $output['id'] = $row['id'];
            $output['name'] = $row['name'];
            $output['description'] = $row['description'];
            $output['pass'] = $row['password'];
            $output['hash'] = $row['hash'];
            $tournid = $row['id'];
            $output['status'] = "DONE";

        }
            
        echo json_encode($output);
    }
    elseif ($action == "LIST_TEAMS"){
        $output = array();

        if (isset($_POST['tourn'])){
            $tournid = mysql_escape_string($_POST['tourn']);
            $sql = "SELECT * FROM tournament WHERE id = '$tournid'";
        }
        else{
            $name = mysql_escape_string($_POST['name']);
            $pass = mysql_escape_string($_POST['pass']);
            $sql = "SELECT * FROM tournament WHERE name = '$name' AND password = '$pass'";
        }

        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();
        if ($row['hash'] == ''){
            $tournid = $row['id'];
            $output['maxteams'] = $row['maxteams'];

            if ($user == $row['manager'])
                $output['manager'] = true;
            else
                $output['manager'] = false;

            $output['teams'] = array();

            $joined = check_joined($tournid, $conn);
            if ($joined !== false)
                $output['joined'] = $joined;

            $sql = "SELECT id, name FROM teams WHERE tournament = '$tournid'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            while ($row = $result->fetch_assoc()){
                $team = array();
                $team['name'] = $row['name'];
                $team['id'] = $row['id'];
                $teamid = $row['id'];

                $sql = "SELECT * FROM gladiator_teams WHERE team = '$teamid'";
                if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result2->num_rows;
                $team['glads'] = $nrows;

                array_push($output['teams'], $team);
            }

            $sql = "SELECT te.id FROM teams te WHERE (SELECT count(*) FROM gladiator_teams WHERE team = te.id) < 3 AND te.tournament = '$tournid'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nrows = $result->num_rows;
            
            if ($nrows == 0)
                $output['filled'] = true;
            else
                $output['filled'] = false;

            $output['status'] = "SUCCESS";
        }
        else{
            $output['status'] = "STARTED";
            $output['hash'] = $row['hash'];
        }

        echo json_encode($output);
    }
    elseif ($action == "TEAM_CREATE"){
        $name = mysql_escape_string($_POST['name']);
        $tname = mysql_escape_string($_POST['tname']);
        $tpass = mysql_escape_string($_POST['tpass']);
        $glad = mysql_escape_string($_POST['glad']);
        $showcode = mysql_escape_string($_POST['showcode']);
        $tourn = "";

        $sql = "SELECT id, hash FROM tournament WHERE name = '$tname' AND password = '$tpass'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0)
            echo "NOTFOUND";
        else{
            $row = $result->fetch_assoc();
            $tourn = $row['id'];

            if ($row['hash'] != ''){
                echo "STARTED";
            }
            elseif (check_joined($tourn, $conn) !== false)
                echo "ALREADYIN";
            else{
                $sql = "SELECT t.maxteams AS maxteams FROM tournament t INNER JOIN teams te ON te.tournament = t.id WHERE t.id = '$tourn'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result->num_rows;
                $row = $result->fetch_assoc();
                if ($nrows > 0 && $nrows >= $row['maxteams'])
                    echo "FULL";
                else{
                    $sql = "SELECT name FROM teams WHERE name = '$name' AND tournament = $tourn";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    $nrows = $result->num_rows;
                    if ($nrows == 0){
                        $vow = "aeiouy";
                        $con = "bcdfghjklmnprstvwxz";
                        
                        $word = "";
                        for($i=0 ; $i<3 ; $i++){
                            $rv = rand(0, strlen($vow)-1);
                            $rc = rand(0, strlen($con)-1);
                            
                            $word .= $con[$rc] . $vow[$rv]; 
                        }            
            
                        $sql = "INSERT INTO teams (name, tournament, password, modified) VALUES ('$name', $tourn, '$word', now())";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                        $teamid = $conn->insert_id;
            
                        $output = array();
                        $output['word'] = $word;
                        $output['id'] = $teamid;
                        echo json_encode($output);
        
                        $sql = "SELECT cod FROM gladiators WHERE master = '$user'";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                        $nrows = $result->num_rows;
        
                        if ($nrows > 0){
                            if ($showcode == 'true')
                                $sql = "INSERT INTO gladiator_teams (gladiator, team, visible) VALUES ('$glad', '$teamid', '1')";
                            else
                                $sql = "INSERT INTO gladiator_teams (gladiator, team) VALUES ('$glad', '$teamid')";
                            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                        }
                    }
                    else
                        echo "EXISTS";
                }
            }
        }

    }
    elseif ($action == "TEAM"){
        $teamid = mysql_escape_string($_POST['id']);
        $sync = mysql_escape_string($_POST['sync']);
        $output = array();

        $sql = "SELECT modified FROM teams WHERE id = '$teamid'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();

        if ($row['modified'] != $sync){
            $output['sync'] = $row['modified'];
            $output['name'] = "";
            $output['word'] = "";
            $output['glads'] = array();

            $sql = "SELECT gt.gladiator, t.name, t.password, t.tournament, tn.flex FROM teams t INNER JOIN gladiator_teams gt ON t.id = gt.team INNER JOIN gladiators g ON g.cod = gt.gladiator INNER JOIN tournament tn ON tn.id = t.tournament WHERE gt.team = '$teamid' AND g.master = '$user'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nrows = $result->num_rows;
            if ($nrows > 0){
                $row = $result->fetch_assoc();
                $output['name'] = $row['name'];
                $output['word'] = $row['password'];
                $output['tourn'] = $row['tournament'];
                $output['flex'] = $row['flex'];
            }
            
            $sql = "SELECT cod, name, vstr, vagi, vint, skin, apelido, master FROM gladiators INNER JOIN usuarios ON email = master WHERE cod IN (SELECT gladiator FROM gladiator_teams WHERE team = '$teamid')";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

            if ($nrows == 0){
                while ($row = $result->fetch_assoc())
                    array_push($output['glads'], $row['apelido']);
            }
            else{
                while ($row = $result->fetch_assoc()){
                    if ($row['master'] == $user)
                        $row['owner'] = true;
                    array_push($output['glads'], $row);
                }
            }

            $joined = check_joined($output['tourn'], $conn);
            if ($joined !== false)
                $output['joined'] = $joined;

            $output['status'] = "DONE";
        }
        else
            $output['status'] = "SYNCED";

        echo json_encode($output);
    }
    elseif ($action == "LEAVE_TEAM"){
        $teamid = mysql_escape_string($_POST['id']);

        $output = array();
        $sql = "SELECT tournament FROM teams WHERE id = '$teamid'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0)
            $output['status'] = "NOTFOUND";
        else{
            $row = $result->fetch_assoc();
            $tournid = $row['tournament'];

            $sql = "SELECT hash FROM tournament WHERE id = $tournid";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $row = $result->fetch_assoc();
            
            if ($row['hash'] != '')
                $output['status'] = "STARTED";
            else{
                $output['tourn'] = $tournid;
    
                $sql = "SELECT gt.id AS id FROM gladiator_teams gt INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE gt.team = '$teamid' AND g.master = '$user'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        
                $ids = array();
                while ($row = $result->fetch_assoc())
                    array_push($ids, $row['id']);
                $ids = implode(",", $ids);
        
                $sql = "DELETE FROM gladiator_teams WHERE id IN ($ids)";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        
                $sql = "SELECT id FROM gladiator_teams WHERE team = '$teamid'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result->num_rows;
        
                if ($nrows == 0){
                    $sql = "DELETE FROM teams WHERE id = '$teamid'";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    $output['status'] = "REMOVED";
                }
                else{
                    $sql = "UPDATE teams SET modified = now() WHERE id = '$teamid'";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    $output['status'] = "LEFT";
                }
            }

        }

        echo json_encode($output);
    }
    elseif ($action == "JOIN_TEAM"){
        $word = mysql_escape_string($_POST['pass']);
        $team = mysql_escape_string($_POST['team']);
        $glad = mysql_escape_string($_POST['glad']);
        $showcode = mysql_escape_string($_POST['showcode']);
        $output = array();

        $sql = "SELECT tournament FROM teams WHERE id = '$team'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();

        $tourn = $row['tournament'];
        $sql = "SELECT t.id FROM gladiators g INNER JOIN gladiator_teams gt ON gt.gladiator = g.cod INNER JOIN teams te ON gt.team = te.id INNER JOIN tournament t ON te.tournament = t.id WHERE t.id = '$tourn' AND g.master = '$user'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows > 0)
            $output['status'] = "SIGNED";
        else{
            $sql = "SELECT t.id FROM tournament t WHERE t.id = '$tourn' AND t.hash = ''";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nrows = $result->num_rows;
            
            if ($nrows == 0)
                $output['status'] = "STARTED";
            else{
                $output['tourn'] = $tourn;

                $sql = "SELECT * FROM teams WHERE id = '$team' AND password = '$word'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result->num_rows;

                if ($nrows > 0){
                    $sql = "SELECT cod FROM gladiators WHERE master = '$user' AND cod = '$glad'";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    $nrows = $result->num_rows;

                    if ($nrows > 0 ){
                        if ($showcode == 'true')
                            $sql = "INSERT INTO gladiator_teams (gladiator, team, visible) VALUES ('$glad', '$team', '1')";
                        else
                            $sql = "INSERT INTO gladiator_teams (gladiator, team) VALUES ('$glad', '$team')";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                        $sql = "UPDATE teams SET modified = now() WHERE id = '$team'";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            
                        $output['status'] = "SUCCESS";
                    }
                    else
                        $output['status'] = "FAIL";

                }
                else
                    $output['status'] = "FAIL";
            }
        }

        echo json_encode($output);
    }
    elseif ($action == "ADD_GLAD"){
        $glad = mysql_escape_string($_POST['glad']);
        $showcode = mysql_escape_string($_POST['showcode']);
        $team = mysql_escape_string($_POST['team']);
        $pass = mysql_escape_string($_POST['pass']);
           
        $nglads = "SELECT count(*) FROM gladiator_teams WHERE team = '$team'";
        $signed = "SELECT count(*) FROM gladiator_teams gt INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE gt.team = '$team' AND g.master = '$user'";
        $sql = "SELECT te.password AS pass, ($nglads) AS nglads, t.flex AS flex, ($signed) AS signed, t.hash FROM gladiators g INNER JOIN gladiator_teams gt ON gt.gladiator = g.cod INNER JOIN teams te ON te.id = gt.team INNER JOIN tournament t ON t.id = te.tournament WHERE g.master = '$user' AND te.id = '$team'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        $output = array();
        if ($nrows == 0)
            $output['status'] = "NOTJOINED";
        else{
            $row = $result->fetch_assoc();
            if ($row['pass'] != $pass)
                $output['status'] = "PASSWORD";
            elseif ($row['nglads'] >= 3)
                $output['status'] = "FULL";
            elseif ($row['flex'] == '0' && $row['signed'] > 0)
                $output['status'] = "SIGNED";
            elseif ($row['hash'] != '')
                $output['status'] = "STARTED";
            else{
                $sql = "SELECT * FROM gladiator_teams WHERE gladiator = '$glad' && team = '$team'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result->num_rows;
                if ($nrows > 0)
                    $output['status'] = "SAMEGLAD";
                else{
                    $sql = "SELECT master FROM gladiators WHERE cod = '$glad'";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    $row = $result->fetch_assoc();
                    if ($row['master'] != $user)
                        $output['status'] = "PERMISSION";
                    else{
                        if ($showcode == 'true')
                            $sql = "INSERT INTO gladiator_teams(gladiator, team, visible) VALUES ('$glad','$team', '1')";
                        else
                            $sql = "INSERT INTO gladiator_teams(gladiator, team) VALUES ('$glad','$team')";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                        $sql = "UPDATE teams SET modified = now() WHERE id = '$team'";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                        $output['status'] = "DONE";
                    }
                }
            }
            
        }
        echo json_encode($output);
    }
    elseif ($action == "DELETE"){
        if (isset($_POST['tourn'])){
            $tournid = mysql_escape_string($_POST['tourn']);
            $sql = "SELECT id, manager, hash FROM tournament WHERE id = '$tournid'";
        }
        else{
            $name = mysql_escape_string($_POST['name']);
            $pass = mysql_escape_string($_POST['pass']);
            $sql = "SELECT id, manager, hash FROM tournament WHERE name = '$name' AND password = '$pass'";
        }

        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();
        $tournid = $row['id'];
        $manager = $row['manager'];

        if ($manager != $user)
            echo "PERMISSION";
        elseif ($row['hash'] != '')
            echo "STARTED";
        else{
            $sql = "SELECT id FROM teams WHERE tournament = '$tournid'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nrows = $result->num_rows;

            if ($nrows == 0){
                $sql = "DELETE FROM tournament WHERE id = '$tournid'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                echo "DELETED";
            }
            else {
                echo "NOTEMPTY";
            }
        }
    }
    elseif ($action == "REMOVE_GLAD"){
        $team = mysql_escape_string($_POST['team']);
        $glad = mysql_escape_string($_POST['glad']);

        $output = array();

        $sql = "SELECT t.hash FROM tournament t INNER JOIN teams te ON te.tournament = t.id WHERE te.id = $team";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();
        $output['teste'] = $row;
        if ($row['hash'] != '')
            $output['status'] = "STARTED";
        else{
            $sql = "SELECT * FROM gladiators g INNER JOIN gladiator_teams gt ON g.cod = gt.gladiator WHERE g.master = '$user' AND gt.team = '$team' AND gt.gladiator = '$glad'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nrows = $result->num_rows;

            if ($nrows == 0)
                $output['status'] = "NOTFOUND";
            else{
                $sql = "DELETE FROM gladiator_teams WHERE gladiator = '$glad' AND team = '$team'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                $sql = "SELECT t.id AS id FROM tournament t INNER JOIN teams te ON te.tournament = t.id WHERE te.id = '$team'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $row = $result->fetch_assoc();
                $output['tournid'] = $row['id'];

                $sql = "SELECT * FROM gladiator_teams WHERE team = '$team'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result->num_rows;
                
                if ($nrows > 0){
                    $sql = "UPDATE teams SET modified = now() WHERE id = '$team'";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    $output['status'] = "DONE";
                }
                else{
                    $sql = "DELETE FROM teams WHERE id = '$team'";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    $output['status'] = "REMOVED";
                }

            }
        }
        
        echo json_encode($output);
    }
    elseif ($action == "KICK"){
        $team = mysql_escape_string($_POST['teamname']);
        $tname = mysql_escape_string($_POST['name']);
        $tpass = mysql_escape_string($_POST['pass']);

        $output = array();

        $sql = "SELECT te.id AS id FROM teams te INNER JOIN tournament t ON t.id = te.tournament WHERE t.manager = '$user' AND t.name = '$tname' AND t.password = '$tpass' AND te.name = '$team'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0)
            $output['status'] = "NOTFOUND";
        else{
            $row = $result->fetch_assoc();
            $team = $row['id'];

            $sql = "DELETE FROM gladiator_teams WHERE team = '$team'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $sql = "DELETE FROM teams WHERE id = '$team'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            
            $output['status'] = "DONE";
        }

        echo json_encode($output);
    }
    elseif ($action == "START"){
        $tname = mysql_escape_string($_POST['name']);
        $tpass = mysql_escape_string($_POST['pass']);

        $output = array();

        $sql = "SELECT t.id AS id, t.maxtime FROM tournament t WHERE t.name = '$tname' AND t.password = '$tpass' AND t.manager = '$user' AND t.hash = ''";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;
        $row = $result->fetch_assoc();
        $tournid = $row['id'];
        $maxtime = $row['maxtime'];

        if ($nrows == 0)
            $output['status'] = "NOTFOUND";
        else{
            $sql = "SELECT id FROM teams WHERE tournament = '$tournid'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nteams = $result->num_rows;

            if ($nteams <= 1)
                $output['status'] = "FEWTEAMS";
            else{
                $teams = array();
                while($row = $result->fetch_assoc())
                    array_push($teams, $row['id']);
                shuffle($teams);

                $sql = "SELECT te.id FROM teams te WHERE (SELECT count(*) FROM gladiator_teams WHERE team = te.id) < 3 AND te.tournament = '$tournid'";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $nrows = $result->num_rows;
                
                if ($nrows > 0)
                    $output['status'] = "FEWGLADS";
                else{
                    $hash = substr(md5('tourn'.microtime()*rand()), 0,16);
                    $sql = "UPDATE tournament t SET t.hash = '$hash' WHERE t.id = '$tournid'";
                    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

                    $ngroups = ceil($nteams / 5);
                    $groups = array();
                    for ($i=0 ; $i<$ngroups ; $i++){
                        $sql = "INSERT INTO groups(round, deadline) VALUES ('1', ADDTIME(now(), TIME('$maxtime')))";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                        array_push($groups, $conn->insert_id);
                    }

                    foreach($teams as $i => $team){
                        $group = $groups[$i % $ngroups];
                        $sql = "INSERT INTO group_teams (team, groupid) VALUES ('$team', '$group')";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    }

                    $output['status'] = "DONE";
                    $output['hash'] = $hash;
                }
            }
        }

        echo json_encode($output);
    }
    function check_joined($tournid, $conn){
        $user = $_SESSION['user'];

        $sql = "SELECT t.id AS id FROM teams t INNER JOIN gladiator_teams gt ON gt.team = t.id INNER JOIN gladiators g ON g.cod = gt.gladiator WHERE t.tournament = '$tournid' AND g.master = '$user'";
        
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;
        
        if ($nrows > 0){
            $row = $result->fetch_assoc();
            return $row['id'];
        }
        else
            return false;
            
    }
?>
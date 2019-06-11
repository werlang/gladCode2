<?php
	session_start();
    include_once "connection.php";
    $user = $_SESSION['user'];
    $action = $_POST['action'];

    if ($action == "CREATE"){
        $name = mysql_escape_string($_POST['name']);
        $pass = md5(mysql_escape_string($_POST['pass']));
        $desc = mysql_escape_string($_POST['desc']);
        $hash = substr(md5('tourn'.microtime()*rand()), 0,16);
        $max = mysql_escape_string($_POST['max']);
        $allow = mysql_escape_string($_POST['allow']);
        if ($allow == "true")
            $allow = 1;
        else
            $allow = 0;

        $sql = "SELECT * FROM tournament WHERE name = '$name'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0){
            $sql = "INSERT INTO tournament (manager, name, password, description, creation, hash, maxteams, allowlessmasters) VALUES ('$user', '$name', '$pass', '$desc', now(), '$hash', '$max', '$allow');";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            echo $hash;
        }
        else
            echo "EXISTS";

    }
    else if ($action == "LIST"){
        $sql = "SELECT * FROM tournament WHERE password = md5('') ORDER BY CREATION DESC";
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

        $sql = "SELECT * FROM tournament WHERE manager = '$user' ORDER BY CREATION DESC";
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

        $output = array(
            'open' => $open,
            'mytourn' => $mytourn
        );
        echo json_encode($output);
    }
    else if ($action == "JOIN"){
        $name = mysql_escape_string($_POST['name']);
        $pass = md5(mysql_escape_string($_POST['pass']));
        $sql = "SELECT * FROM tournament WHERE name = '$name' AND password = '$pass'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0)
            echo "NOTFOUND";
        else{
            $output = array();
            $row = $result->fetch_assoc();
            $output['id'] = $row['id'];
            $output['name'] = $row['name'];
            $output['description'] = $row['description'];
            $tournid = $row['id'];

            echo json_encode($output);
        }
            
    }
    elseif ($action == "LIST_TEAMS"){
        if (isset($_POST['tourn'])){
            $tournid = mysql_escape_string($_POST['tourn']);
            $sql = "SELECT * FROM tournament WHERE id = '$tournid'";
        }
        else{
            $name = mysql_escape_string($_POST['name']);
            $pass = md5(mysql_escape_string($_POST['pass']));
            $sql = "SELECT * FROM tournament WHERE name = '$name' AND password = '$pass'";
        }

        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();
        $tournid = $row['id'];

        $output = array();
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
        echo json_encode($output);
    }
    elseif ($action == "TEAM_CREATE"){
        $name = mysql_escape_string($_POST['name']);
        $tname = mysql_escape_string($_POST['tname']);
        $tpass = md5(mysql_escape_string($_POST['tpass']));
        $glad = mysql_escape_string($_POST['glad']);
        $tourn = "";

        $sql = "SELECT id FROM tournament WHERE name = '$tname' AND password = '$tpass'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0)
            echo "NOTFOUND";
        else{
            $row = $result->fetch_assoc();
            $tourn = $row['id'];

            if (check_joined($tourn, $conn) !== false)
                echo "ALREADYIN";
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
        
                    $sql = "INSERT INTO teams (name, tournament, password) VALUES ('$name', $tourn, '$word')";
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
                        $sql = "INSERT INTO gladiator_teams (gladiator, team) VALUES ('$glad','$teamid')";
                        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                    }
                }
                else
                    echo "EXISTS";
            }
        }

    }
    elseif ($action == "TEAM"){
        $teamid = mysql_escape_string($_POST['id']);
        $output = array();
        $output['name'] = "";
        $output['word'] = "";
        $output['glads'] = array();

        $sql = "SELECT gt.gladiator, t.name, t.password, t.tournament, tn.allowlessmasters FROM teams t INNER JOIN gladiator_teams gt ON t.id = gt.team INNER JOIN gladiators g ON g.cod = gt.gladiator INNER JOIN tournament tn ON tn.id = t.tournament WHERE gt.team = '$teamid' AND g.master = '$user'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;
        if ($nrows > 0){
            $row = $result->fetch_assoc();
            $output['name'] = $row['name'];
            $output['word'] = $row['password'];
            $output['tourn'] = $row['tournament'];
            $output['allow'] = $row['allowlessmasters'];
        }
        
        $sql = "SELECT cod, name, vstr, vagi, vint, skin, apelido FROM gladiators INNER JOIN usuarios ON email = master WHERE cod IN (SELECT gladiator FROM gladiator_teams WHERE team = '$teamid')";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

        if ($nrows == 0){
            while ($row = $result->fetch_assoc())
                array_push($output['glads'], $row['apelido']);
        }
        else{
            while ($row = $result->fetch_assoc())
                array_push($output['glads'], $row);
        }

        $joined = check_joined($output['tourn'], $conn);
        if ($joined !== false)
            $output['joined'] = $joined;

        echo json_encode($output);
    }
    elseif ($action == "LEAVE_TEAM"){
        $teamid = mysql_escape_string($_POST['id']);

        $output = array();
        $sql = "SELECT tournament FROM teams WHERE id = '$teamid'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();
        $output['tourn'] = $row['tournament'];

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
        else
            $output['status'] = "LEFT";

        echo json_encode($output);
    }
    elseif ($action == "JOIN_TEAM"){
        $word = mysql_escape_string($_POST['pass']);
        $team = mysql_escape_string($_POST['team']);
        $glad = mysql_escape_string($_POST['glad']);
        $output = array();

        $sql = "SELECT tournament FROM teams WHERE id = '$team'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $row = $result->fetch_assoc();
        $output['tourn'] = $row['tournament'];

        $sql = "SELECT * FROM teams WHERE id = '$team' AND password = '$word'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows > 0){
            $sql = "SELECT cod FROM gladiators WHERE master = '$user' AND cod = '$glad'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            $nrows = $result->num_rows;

            if ($nrows > 0 ){
                $sql = "INSERT INTO gladiator_teams (gladiator, team) VALUES ('$glad', '$team')";
                if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
                $output['status'] = "SUCCESS";
            }
            else
                $output['status'] = "FAIL";

        }
        else
            $output['status'] = "FAIL";

        echo json_encode($output);
    }
    elseif ($action == "ADD_GLAD"){
        $glad = mysql_escape_string($_POST['glad']);
        $team = mysql_escape_string($_POST['team']);
        
        //verificar segurança de inserir direto teamid, e glad
        
        $sql = "SELECT * FROM gladiators WHERE master = '$user'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $nrows = $result->num_rows;

        if ($nrows == 0)
            $output['status'] = "NOTGLAD";
        else{
            $row = $result->fetch_assoc();
        }

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
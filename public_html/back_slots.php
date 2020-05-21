<?php
    session_start();
    date_default_timezone_set('America/Sao_Paulo');
    include_once "connection.php";

    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();

    $slotlvl = [5,15,25,35];

    if ($action == "ITEMS"){
        $sql = "SELECT * FROM items ORDER BY price";
        $result = runQuery($sql);

        $output['potions'] = array();
        while($row = $result->fetch_assoc()){
            $id = $row['identifier'];
            $potion = array();
            $potion['price'] = $row['price'];
            $potion['icon'] = $row['icon'];
            $potion['name'] = $row['name'];
            $potion['description'] = $row['description'];

            $output['potions'][$id] = $potion;
        }

        $output['status'] = "SUCCESS";
    }
    elseif ($action == "SLOTS"){
        $sql = "SELECT i.identifier AS 'id', i.icon, i.name, TIME_TO_SEC(TIMEDIFF(s.expire, now())) AS 'time' FROM slots s INNER JOIN items i ON i.id = s.item WHERE s.user = $user AND expire > now() ORDER BY s.expire LIMIT 4";
        $result = runQuery($sql);

        $output['slots'] = array();
        while ($row = $result->fetch_assoc()){
            array_push($output['slots'], $row);
        }

        $sql = "SELECT lvl FROM usuarios WHERE id = $user";
        $result = runQuery($sql);
        $row = $result->fetch_assoc();
        $lvl = $row['lvl'];

        $nslots = 0;
        foreach($slotlvl as $sl){
            if ($lvl >= $sl){
                $nslots++;
            }
        }

        $output['nslots'] = $nslots;
        $output['lvl'] = $lvl;
        $output['slotlvl'] = $slotlvl;
        $output['status'] = "SUCCESS";
    }
    elseif ($action == "BUY"){
        $identifier = mysql_escape_string($_POST['id']);

        $sql = "SELECT silver, lvl FROM usuarios WHERE id = $user";
        $result = runQuery($sql);
        $row = $result->fetch_assoc();

        $silver = $row['silver'];
        $lvl = $row['lvl'];

        $nslots = 0;
        foreach($slotlvl as $sl){
            if ($lvl >= $sl){
                $nslots++;
            }
        }

        $used = "SELECT count(*) FROM slots s WHERE s.user = $user AND expire > now()";
        $sql = "SELECT id, price, ($used) AS 'used_slots' FROM items WHERE identifier = '$identifier'";
        $result = runQuery($sql);
        $row = $result->fetch_assoc();

        $price = $row['price'];
        $item = $row['id'];
        $used_slots = $row['used_slots'];

        if ($used_slots >= $nslots){
            $output['status'] = "NO SLOT";
        }
        else if ($silver < $price){
            $output['status'] = "NOT ENOUGH SILVER";
        }
        else{
            $sql = "UPDATE usuarios SET silver = silver - $price WHERE id = $user";
            runQuery($sql);

            $sql = "INSERT INTO slots (user, item, expire) VALUES ($user, $item, now() + INTERVAL 1 DAY)";
            runQuery($sql);

            $output['status'] = "SUCCESS";
        }

    }

    echo json_encode($output);
?>
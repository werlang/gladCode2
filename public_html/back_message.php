<?php
    session_start();
    include_once "connection.php";
    include("back_node_message.php");
    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();

    if ($action == "USERS"){
        // direct message rooms which i participate
        $sql = "SELECT cr.id, UNIX_TIMESTAMP(cu.visited) AS visited, u.foto, u.apelido FROM chat_rooms cr INNER JOIN chat_users cu ON cu.room = cr.id INNER JOIN chat_users cu2 ON cu2.room = cr.id INNER JOIN usuarios u ON u.id = cu2.user WHERE cr.direct = 1 AND cu.user = $user AND cu2.user != $user";
        $result = runQuery($sql);
        $nrows = $result->num_rows;

        $output['total'] = $nrows;

        $limit = min(max(mysql_escape_string($_POST['limit']), 5), 50);
        $offset = min(max(mysql_escape_string($_POST['offset']), 0), max($nrows - $limit, 0));
        $output['offset'] = $offset;

        $rooms = array();
        $roomstr = array();
        while($row = $result->fetch_assoc()){
            $rooms[$row['id']] = array(
                "visited" => $row['visited'],
                "nick" => $row['apelido'],
                "picture" => $row['foto']
            );
            array_push($roomstr, $row['id']);
        }
        $roomstr = implode(",", $roomstr);

        // get last messages from each subject
        $lastmessages = "SELECT max(cm.id) FROM chat_messages cm WHERE cm.room IN ($roomstr) GROUP BY cm.room";
        $sql = "SELECT cm.room AS id, cm.message, UNIX_TIMESTAMP(cm.time) AS ts, TIMESTAMPDIFF(MINUTE, cm.time, now()) AS time FROM chat_messages cm WHERE cm.id IN ($lastmessages) ORDER BY time LIMIT $limit OFFSET $offset";
        $result = runQuery($sql);
        $nrows = $result->num_rows;;
        $output['nrows'] = $nrows;

        $output['messages'] = array();
        while($row = $result->fetch_assoc()){
            $message = array();
            $message['id'] = $row['id'];
            $message['nick'] = $rooms[$row['id']]['nick'];
            $message['picture'] = $rooms[$row['id']]['picture'];
            $message['time'] = $row['time'];
            $message['message'] = html_entity_decode($row['message']);
            $message['isread'] = $row['ts'] < $rooms[$row['id']]['visited'];
            array_push($output['messages'], $message);
        }

        echo json_encode($output);
    }
    elseif ($action == "SEND"){
        $sender = $_SESSION['user'];
        $receiver = mysql_escape_string($_POST['id']);
        $message = mysql_escape_string(htmlentities($_POST['message']));
        
        // get direct message chat room if exists
        $sql = "SELECT cr.id FROM chat_rooms cr INNER JOIN chat_users cu ON cr.id = cu.room INNER JOIN chat_users cu2 ON cr.id = cu2.room WHERE cu.user = $sender AND cu2.user = $receiver AND cr.direct = 1";
        $result = runQuery($sql);

        if ($result->num_rows > 0){
            $row = $result->fetch_assoc();
            $id = $row['id'];
        }
        else{
            // create chat room
            $sql = "INSERT INTO chat_rooms (name, description, public, direct) VALUES ('$sender-$receiver', 'Direct messages room', 0, 1)";
            $result = runQuery($sql);
            $id = $conn->insert_id;

            // insert user into new chat room
            $sql = "INSERT INTO chat_users (room, user) VALUES ($id, $sender), ($id, $receiver)";
            $result = runQuery($sql);
        }

        // get when was the last message I sent
        $sql = "SELECT TIMESTAMPDIFF(MINUTE, time, now()) AS timesince FROM chat_messages WHERE sender = $sender AND room = $id ORDER BY time DESC LIMIT 1";
        $result = runQuery($sql);

        if ($result->num_rows > 0){
            $row = $result->fetch_assoc();

            if ($row['timesince'] > 120){
                $output['mail'] = true;
            }
        }

        // send chat message
        $sql = "INSERT INTO chat_messages(room, sender, message) VALUES ($id, $sender, '$message')";
        $result = runQuery($sql);

        $output['status'] = "SUCCESS";


        echo json_encode($output);

        send_node_message(array(
            'chat notification' => array(
                'room' => $id
            )
        ));

        send_node_message(array(
            'profile notification' => array('user' => array($receiver))
        ));
    }
    elseif ($action == "NAMES"){
        $sql = "SELECT cr.name, u.apelido FROM chat_rooms cr INNER JOIN chat_users cu ON cu.room = cr.id INNER JOIN chat_users cu2 ON cu2.room = cr.id INNER JOIN usuarios u ON u.id = cu2.user WHERE direct = 1 AND cu.user = $user AND cu2.user != $user";
        $result = runQuery($sql);

        $output['rooms'] = array();
        while ($row = $result->fetch_assoc()){
            $output['rooms'][$row['name']] = $row['apelido'];
        }

        $output['status'] = "SUCCESS";
        echo json_encode($output);

    }
?>
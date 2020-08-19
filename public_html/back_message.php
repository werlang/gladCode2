<?php
    session_start();
    include_once "connection.php";
    include("back_node_message.php");
    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();

    if ($action == "GET"){
        // // messages I received
        // $sql = "SELECT count(*) AS nmessages FROM messages m INNER JOIN usuarios u ON u.id = m.sender WHERE m.receiver = '$user'";
        // $result = runQuery($sql);
        // $row = $result->fetch_assoc();
        // $nrows = $row['nmessages'];
        // $output['total'] = $nrows;

        // $limit = min(max(mysql_escape_string($_POST['limit']), 5), 50);
        // $offset = min(max(mysql_escape_string($_POST['offset']), 0), $nrows - $limit);

        // $sql = "SELECT m.cod, m.sender, u.apelido, u.foto, m.time, m.message, m.isread FROM messages m INNER JOIN usuarios u ON u.id = m.sender WHERE m.receiver = '$user' ORDER BY time DESC LIMIT $limit OFFSET $offset";
        // $result = runQuery($sql);

        // $output['messages'] = array();
        // while($row = $result->fetch_assoc()){
        //     $message = array();
        //     $message['id'] = $row['cod'];
        //     $message['sender'] = $row['sender'];
        //     $message['nick'] = $row['apelido'];
        //     $message['picture'] = $row['foto'];
        //     $message['time'] = $row['time'];
        //     $message['message'] = $row['message'];
        //     $message['isread'] = $row['isread'] == "1";
        //     array_push($output['messages'], $message);
        // }

        // echo json_encode($output);
    }
    elseif ($action == "USERS"){
        // direct message rooms which i participate
        $sql = "SELECT cr.id, UNIX_TIMESTAMP(cu.visited) AS visited, u.foto, u.apelido FROM chat_rooms cr INNER JOIN chat_users cu ON cu.room = cr.id INNER JOIN chat_users cu2 ON cu2.room = cr.id INNER JOIN usuarios u ON u.id = cu2.user WHERE cr.direct = 1 AND cu.user = $user AND cu2.user != $user";
        $result = runQuery($sql);
        $nrows = $result->num_rows;;

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

        $lastmessages = "SELECT max(cm.id) FROM chat_messages cm WHERE cm.room IN ($roomstr) GROUP BY cm.room";
        $sql = "SELECT cm.room AS id, cm.message, UNIX_TIMESTAMP(cm.time) AS ts, TIMESTAMPDIFF(MINUTE, cm.time, now()) AS time FROM chat_messages cm WHERE cm.id IN ($lastmessages) ORDER BY time LIMIT $limit OFFSET $offset";
        $result = runQuery($sql);

        $output['messages'] = array();
        while($row = $result->fetch_assoc()){
            $message = array();
            $message['id'] = $row['id'];
            $message['nick'] = $rooms[$row['id']]['nick'];
            $message['picture'] = $rooms[$row['id']]['picture'];
            $message['time'] = $row['time'];
            $message['message'] = $row['message'];
            $message['isread'] = $row['ts'] < $rooms[$row['id']]['visited'];
            array_push($output['messages'], $message);
        }

        echo json_encode($output);
    }
    elseif ($action == "MESSAGES"){
        // $friend = mysql_escape_string($_POST['user']);
        
        // $sql = "SELECT DATE_FORMAT(time, '%e %b %Y, %k:%i') AS time, message, sender FROM messages WHERE (sender = $user AND receiver = $friend) OR (sender = $friend AND receiver = $user) ORDER BY time";
        // $result = runQuery($sql);

        // $output['messages'] = array();
        // while ($row = $result->fetch_assoc()){
        //     $message = array();
        //     $message['message'] = $row['message'];
        //     $message['time'] = $row['time'];
        //     $message['sender'] = $row['sender'];
        //     $message['me'] = $row['sender'] == $user;
        //     array_push($output['messages'], $message);
        // }

        // $output['status'] = "SUCCESS";

        // echo json_encode($output);

    }
    elseif ($action == "SEND"){
        $sender = $_SESSION['user'];
        $receiver = mysql_escape_string($_POST['id']);
        $message = mysql_escape_string(htmlentities($_POST['message']));
        
        // $sql = "INSERT INTO messages (time, sender, receiver, message) VALUES (now(), '$sender', '$receiver', '$message')";
        // echo $sql;
        // $result = runQuery($sql);

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
    // elseif ($action == "READ"){
    //     $user = $_SESSION['user'];
    //     $id = mysql_escape_string($_POST['id']);
    //     $val = mysql_escape_string($_POST['value']);
    //     $sql = "UPDATE messages SET isread = '$val' WHERE cod = '$id' AND receiver = '$user'";
    //     $result = runQuery($sql);

    //     send_node_message(array(
    //         'profile notification' => array('user' => array($user))
    //     ));
    // }
    // elseif ($action == "DELETE"){
    //     $user = $_SESSION['user'];
    //     $id = mysql_escape_string($_POST['id']);
    //     $sql = "DELETE FROM messages WHERE cod = '$id' AND receiver = '$user'";
    //     $result = runQuery($sql);
    // }
    // elseif ($action == "REPLY"){
    //     $sender = $_SESSION['user'];
    //     $id = mysql_escape_string($_POST['replyid']);
    //     $message = mysql_escape_string(htmlentities($_POST['message']));
        
    //     $sql = "SELECT * FROM messages WHERE cod = '$id' AND receiver = '$sender'";
    //     $result = runQuery($sql);

    //     $row = $result->fetch_assoc();
    //     $receiver = $row['sender'];
    //     $oldmessage = $row['message'];
    //     $message = "<quote>$oldmessage</quote>$message";
        
    //     $sql = "INSERT INTO messages (time, sender, receiver, message) VALUES (now(), '$sender', '$receiver', '$message')";
    //     $result = runQuery($sql);

    //     send_node_message(array(
    //         'profile notification' => array('user' => array($receiver))
    //     ));
    // }

?>
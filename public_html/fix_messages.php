<?php
    include_once "connection.php";

    $sql = "SELECT message, sender, receiver, time FROM messages ORDER BY time";
    $result = runQuery($sql, []);

    $rooms = array();
    while ($row = $result->fetch_assoc()){
        $name = $row['sender'] ."-". $row['receiver'];
        $inverted = $row['receiver'] ."-". $row['sender'];

        if (!(isset($rooms[$name]) || isset($rooms[$inverted]))){
            $rooms[$name] = array(
                "creation" => $row['time'],
                "user1" => $row['sender'],
                "user2" => $row['receiver'],
                "messages" => array()
            );
        }

        $name = isset($rooms[$name]) ? $name : (isset($rooms[$inverted]) ? $inverted : '');

        array_push($rooms[$name]['messages'], array(
            "time" => $row['time'],
            "message" => $row['message'],
            "sender" => $row['sender']
        ));
    }

    $bigsql = array();
    foreach ($rooms as $name => $room){
        $time = $room['creation'];

        $sql = "INSERT INTO chat_rooms (name, creation, description, public, direct) VALUES ('$name', '$time', '', 0, 1)";
        $result = runQuery($sql, []);
        array_push($bigsql, $sql);

        $u1 = $room['user1'];
        $u2 = $room['user2'];
        $id = $conn->insert_id;
        $sql = "INSERT INTO chat_users (room, user, joined) VALUES ($id, $u1, '$time'), ($id, $u2, '$time')";
        $result = runQuery($sql, []);
        array_push($bigsql, $sql);

        foreach($room['messages'] as $msg){
            $msgtime = $msg['time'];
            $sender = $msg['sender'];

            $message = html_entity_decode($msg['message']);
            $message = preg_replace('/<quote>[\w\W]*<\/quote>/', '', $message);
            $message = htmlspecialchars($message);

            $sql = "INSERT INTO chat_messages (room, time, sender, message) VALUES ($id, '$msgtime', $sender, '$message')";
            $result = runQuery($sql, []);
            array_push($bigsql, $sql);
        }
    }

    echo json_encode($bigsql);
?>
<?php
    session_start();
    include_once "connection.php";
    include("back_node_message.php");
    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();

    if ($action == "GET"){
        // messages I received
        $sql = "SELECT count(*) AS nmessages FROM messages m INNER JOIN usuarios u ON u.id = m.sender WHERE m.receiver = '$user'";
        $result = runQuery($sql);
        $row = $result->fetch_assoc();
        $nrows = $row['nmessages'];
        $output['total'] = $nrows;

        $limit = min(max(mysql_escape_string($_POST['limit']), 5), 50);
        $offset = min(max(mysql_escape_string($_POST['offset']), 0), $nrows - $limit);

        $sql = "SELECT m.cod, m.sender, u.apelido, u.foto, m.time, m.message, m.isread FROM messages m INNER JOIN usuarios u ON u.id = m.sender WHERE m.receiver = '$user' ORDER BY time DESC LIMIT $limit OFFSET $offset";
        $result = runQuery($sql);

        $output['messages'] = array();
        while($row = $result->fetch_assoc()){
            $message = array();
            $message['id'] = $row['cod'];
            $message['sender'] = $row['sender'];
            $message['nick'] = $row['apelido'];
            $message['picture'] = $row['foto'];
            $message['time'] = $row['time'];
            $message['message'] = $row['message'];
            $message['isread'] = $row['isread'] == "1";
            array_push($output['messages'], $message);
        }

        echo json_encode($output);
    }
    elseif ($action == "USERS"){
        // how many users sent me messages
        $sql = "SELECT count(*) AS nusers FROM (SELECT count(*) FROM messages m WHERE m.receiver = '277' GROUP BY m.sender) AS groups";
        $result = runQuery($sql);
        $row = $result->fetch_assoc();
        $nrows = $row['nusers'];
        $output['total'] = $nrows;

        $limit = min(max(mysql_escape_string($_POST['limit']), 5), 50);
        $offset = min(max(mysql_escape_string($_POST['offset']), 0), max($nrows - $limit, 0));
        $output['offset'] = $offset;

        $sql = "SELECT u.apelido, u.foto, m.time, m.message, m.isread FROM messages m INNER JOIN usuarios u ON u.id = m.sender WHERE m.cod IN (SELECT max(m.cod) FROM messages m INNER JOIN usuarios u ON u.id = m.sender WHERE m.receiver = '$user' GROUP BY u.id) ORDER BY m.time DESC LIMIT $limit OFFSET $offset";
        $result = runQuery($sql);
        $output['nrows'] = $result->num_rows;;

        $output['messages'] = array();
        while($row = $result->fetch_assoc()){
            $message = array();
            $message['nick'] = $row['apelido'];
            $message['picture'] = $row['foto'];
            $message['time'] = $row['time'];
            $message['message'] = $row['message'];
            $message['isread'] = $row['isread'] == "1";
            array_push($output['messages'], $message);
        }

        echo json_encode($output);
    }
    elseif ($action == "SEND"){
        $sender = $_SESSION['user'];
        $receiver = mysql_escape_string($_POST['id']);
        $message = mysql_escape_string(htmlentities($_POST['message']));
        
        $sql = "INSERT INTO messages (time, sender, receiver, message) VALUES (now(), '$sender', '$receiver', '$message')";
        echo $sql;
        $result = runQuery($sql);

        send_node_message(array(
            'profile notification' => array('user' => array($receiver))
        ));
    }
    elseif ($action == "READ"){
        $user = $_SESSION['user'];
        $id = mysql_escape_string($_POST['id']);
        $val = mysql_escape_string($_POST['value']);
        $sql = "UPDATE messages SET isread = '$val' WHERE cod = '$id' AND receiver = '$user'";
        $result = runQuery($sql);

        send_node_message(array(
            'profile notification' => array('user' => array($user))
        ));
    }
    elseif ($action == "DELETE"){
        $user = $_SESSION['user'];
        $id = mysql_escape_string($_POST['id']);
        $sql = "DELETE FROM messages WHERE cod = '$id' AND receiver = '$user'";
        $result = runQuery($sql);
    }
    elseif ($action == "REPLY"){
        $sender = $_SESSION['user'];
        $id = mysql_escape_string($_POST['replyid']);
        $message = mysql_escape_string(htmlentities($_POST['message']));
        
        $sql = "SELECT * FROM messages WHERE cod = '$id' AND receiver = '$sender'";
        $result = runQuery($sql);

        $row = $result->fetch_assoc();
        $receiver = $row['sender'];
        $oldmessage = $row['message'];
        $message = "<quote>$oldmessage</quote>$message";
        
        $sql = "INSERT INTO messages (time, sender, receiver, message) VALUES (now(), '$sender', '$receiver', '$message')";
        $result = runQuery($sql);

        send_node_message(array(
            'profile notification' => array('user' => array($receiver))
        ));
    }

?>
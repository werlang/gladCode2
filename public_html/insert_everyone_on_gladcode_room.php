<?php
	session_start();
    include_once "connection.php";

    $sql = "SELECT u.id FROM usuarios u WHERE u.id NOT IN (SELECT cu.user FROM chat_rooms cr INNER JOIN chat_users cu ON cu.room = cr.id WHERE cr.name = 'gladCode')";
    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

    while ($row = $result->fetch_assoc()){
        $id = $row['id'];

        $sql = "INSERT INTO chat_users (room, user, joined) VALUES (1, '$id', now())";
        if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
    }

?>
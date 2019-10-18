<?php
	session_start();
    include_once "connection.php";

    $sql = "SELECT u.email FROM usuarios u WHERE u.email NOT IN (SELECT cu.user FROM chat_rooms cr INNER JOIN chat_users cu ON cu.room = cr.id WHERE cr.name = 'gladCode')";
    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

    while ($row = $result->fetch_assoc()){
        $email = $row['email'];

        $sql = "INSERT INTO chat_users (room, user, joined) VALUES (1, '$email', now())";
        if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
    }

?>
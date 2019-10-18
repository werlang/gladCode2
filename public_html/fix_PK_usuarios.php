<?php
	include_once "connection.php";

    $tables = array(
        "amizade" => array("usuario1", "usuario2"),
        "chat_messages" => array("sender"),
        "chat_restrictions" => array("user"),
        "chat_users" => array("user"),
        "duels" => array("user1", "user2"),
        "gladiators" => array("master"),
        "messages" => array("sender", "receiver"),
        "tournament" => array("manager")
    );

    
    //change emails to ids
    foreach( $tables as $table => $tarr){
        foreach($tarr as $field){
            $sql = "SELECT DISTINCT t.$field AS email, u.id FROM $table t INNER JOIN usuarios u ON u.email = t.$field";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: '. $sql ); }
            while ($row = $result->fetch_assoc()){
                $email = $row['email'];
                $id = $row['id'];
                $sql = "UPDATE $table SET $field = $id WHERE $field = '$email'";
                if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: '. $sql ); }
                echo $sql ."<br>";
            }
        }
    }

    //change column types
    foreach( $tables as $table => $tarr){
        foreach($tarr as $field){
            $sql = "ALTER TABLE $table CHANGE $field $field INT";
            if(!$result2 = $conn->query($sql)){ echo 'SQL: '. $sql; }
            $sql2 = "ALTER TABLE $table ADD CONSTRAINT fk_$field FOREIGN KEY ($field) REFERENCES usuarios(id);
            ";
            if(!$result2 = $conn->query($sql2)){ echo 'SQL: '. $sql; }
            echo $sql ." --- ". $sql2 ."<br>";
        }
    }
    

?>
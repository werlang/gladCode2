<?php
    $servername = "localhost";
    $username = "gladcode";
    $password = "s0r3tmhr";
    $database = "gladcode_";

    // Create connection
    $conn = new mysqli($servername, $username, $password, $database);
    mysqli_set_charset($conn,"utf8mb4");

    // Check connection
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    function runQuery($sql){
        global $conn;
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        return $result;
    }
?>
<?php
    $config = file_get_contents("config.json");
    $config = json_decode($config, true);

    $servername = $config['servername'];
    $username = $config['username'];
    $password = $config['password'];
    $database = $config['database'];

    // Create connection
    $conn = new mysqli($servername, $username, $password, $database);
    mysqli_set_charset($conn,"utf8mb4");

    // Check connection
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    function runQuery($sql){
        global $conn;
        if(!$result = $conn->query($sql)){
            $error = array(
                'status' => "SQLERROR",
                'message' => $conn->error,
                'sql' => $sql
            );
            die(json_encode($error));
        }
        return $result;
    }
?>
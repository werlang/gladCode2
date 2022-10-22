<?php
    $host = "localhost";
    $user = "gladcode";
    $password = "s0r3tmhr";
    $database = "gladcode_";

    try {
        $conn = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    }
    catch(PDOException $e) {
        die('ERROR: ' . $e->getMessage());
    }

    // Create connection
    // $conn = new mysqli($servername, $username, $password, $database);
    // mysqli_set_charset($conn,"utf8mb4");

    // Check connection
    // if ($conn->connect_error) {
    //     die("Connection failed: " . $conn->connect_error);
    // }

    function runQuery($sql, $args){
        global $conn;

        try {
            $stmt = $conn->prepare($sql);
            $stmt->execute($args);
        }
        catch(PDOException $e) {
            $error = array(
                'status' => "SQLERROR",
                'message' => $e->getMessage(),
                'sql' => $sql
            );
            die(json_encode($error));
        }

        return $stmt;


        // if(!$result = $conn->query($sql)){
        //     $error = array(
        //         'status' => "SQLERROR",
        //         'message' => $conn->error,
        //         'sql' => $sql
        //     );
        //     die(json_encode($error));
        // }
        // return $result;
    }
?>
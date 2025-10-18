<?php
    $config = json_decode(file_get_contents('config.json'), true);
    $host = $config["mysql"]["host"];
    $port = $config["mysql"]["port"];
    $user = $config["mysql"]["user"];
    $password = $config["mysql"]["password"];
    $database = $config["mysql"]["database"];

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET sql_mode='TRADITIONAL'"
    ];

    $conn = new PDO(
        "mysql:host=$host:$port;dbname=$database",
        $user,
        $password,
        $options
    );


    function runQuery($sql, $data = null){
        global $conn;
        try {
            if ($data){
                $stmt = $conn->prepare($sql);
                $stmt->execute($data);
                $result = $stmt;
            }
            else{
                $result = $conn->query($sql);
            }
            if(!$result){
                $error = array(
                    'status' => "SQLERROR",
                    'message' => $conn->error,
                    'sql' => $sql
                );
                die(json_encode($error));
            }
        }
        catch(PDOException $e){
            $error = array(
                'status' => "SQLERROR",
                'message' => $e->getMessage(),
                'sql' => $sql
            );
            die(json_encode($error));
        }
        return $result;
    }
?>
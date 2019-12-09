<?php
	session_start();
    include_once "connection.php";
    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();
    date_default_timezone_set('America/Sao_Paulo');

    if ($action == "GET"){
        //todo infinite scrolling for news page
        $page = mysql_escape_string($_POST['page']);

        $sql = "SELECT title, time, post FROM news ORDER BY time DESC LIMIT 5 OFFSET $page";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

        $output['posts'] = array();
        while ($row = $result->fetch_assoc()){
            array_push($output['posts'], $row);
        }

        $sql = "UPDATE usuarios SET read_news = now(3) WHERE id = $user";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

        $output['status'] = "SUCCESS";
    }

    echo json_encode($output);
?>
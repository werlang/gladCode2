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
    else if ($action == "POST"){
        $hash = mysql_escape_string($_POST['hash']);

        $id = "SUBSTR( md5(CONCAT(id, 'news-post-86')) , 1, 4)";
        $sql = "SELECT title, time, post FROM news WHERE $id = '$hash'";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
        $output['sql'] = $sql;
        if ($result->num_rows == 0)
            $output['status'] = "EMPTY";
        else{
            $row = $result->fetch_assoc();
            $output['post'] = array();

            $output['post']['title'] = $row['title'];
            $output['post']['time'] = $row['time'];
            $output['post']['body'] = $row['post'];

            $basetime = "SELECT time FROM news WHERE $id = '$hash'";

            $sql = "SELECT $id AS id FROM news WHERE time < ($basetime) ORDER BY time DESC LIMIT 1";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            if ($result->num_rows > 0){
                $row = $result->fetch_assoc();
                $output['prev'] = $row['id'];
            }
    
            $sql = "SELECT $id AS id FROM news WHERE time > ($basetime) ORDER BY time LIMIT 1";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
            if ($result->num_rows > 0){
                $row = $result->fetch_assoc();
                $output['next'] = $row['id'];
            }
                
            $output['status'] = "SUCCESS";
        }        
    }

    echo json_encode($output);
?>
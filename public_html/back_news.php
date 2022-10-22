<?php
	session_start();
    include_once "connection.php";
    $user = $_SESSION['user'];
    $action = $_POST['action'];
    $output = array();
    date_default_timezone_set('America/Sao_Paulo');
    $id = "SUBSTR( md5(CONCAT(id, 'news-post-86')) , 1, 4)";

    // read news from profile page
    if ($action == "READ"){
        // TODO infinite scrolling for news page
        $page = $_POST['page'];

        $sql = "SELECT $id AS id, title, time, post FROM news ORDER BY time DESC LIMIT 5 OFFSET $page";
        $result = runQuery($sql, []);

        $output['posts'] = array();
        while ($row = $result->fetch_assoc()){
            array_push($output['posts'], $row);
        }

        $sql = "UPDATE usuarios SET read_news = now(3) WHERE id = $user";
        $result = runQuery($sql, []);

        $output['status'] = "SUCCESS";
    }
    // read from post page
    else if ($action == "GET"){
        $hash = $_POST['hash'];

        $sql = "SELECT title, time, post FROM news WHERE $id = '$hash'";
        $result = runQuery($sql, []);

        if ($result->num_rows == 0)
            $output['status'] = "EMPTY";
        else{
            $row = $result->fetch_assoc();
            $output['post'] = array();

            $output['post']['title'] = $row['title'];
            $output['post']['time'] = $row['time'];
            $output['post']['body'] = $row['post'];

            $basetime = "SELECT time FROM news WHERE $id = '$hash'";

            // get previous post
            $sql = "SELECT $id AS id FROM news WHERE time < ($basetime) ORDER BY time DESC LIMIT 1";
            $result = runQuery($sql, []);
            if ($result->num_rows > 0){
                $row = $result->fetch_assoc();
                $output['prev'] = $row['id'];
            }
    
            // get next post
            $sql = "SELECT $id AS id FROM news WHERE time > ($basetime) ORDER BY time LIMIT 1";
            $result = runQuery($sql, []);
            if ($result->num_rows > 0){
                $row = $result->fetch_assoc();
                $output['next'] = $row['id'];
            }
                
            $output['status'] = "SUCCESS";
        }        
    }
    // get all news
    else if ($action == "LIST"){
        $sql = "SELECT title, time, post, $id AS id FROM news ORDER BY time DESC";
        $result = runQuery($sql, []);

        $output['posts'] = array();
        while ($row = $result->fetch_assoc()){
            $post = array();
            $post['title'] = $row['title'];
            $post['time'] = $row['time'];
            $post['body'] = $row['post'];
            $post['hash'] = $row['id'];

            array_push($output['posts'], $post);
        }        

        $output['status'] = "SUCCESS";
    }
    else if ($action == "POST"){
        $title = $_POST['title'];
        $post = $_POST['html'];
        $hash = $_POST['hash'];

        if ($hash == 'false'){
            $sql = "INSERT INTO news (title, time, post) VALUES ('$title', now(3), '$post')";
        }
        else{
            $sql = "UPDATE news SET title = '$title', time = now(3), post = '$post' WHERE $id = '$hash'";
        }
        $result = runQuery($sql, []);

        $output['status'] = "SUCCESS";
        $output['sql'] = $sql;
    }

    echo json_encode($output);
?>
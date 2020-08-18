<?php
    session_start();
    include_once "connection.php";
    $action = $_POST['action'];
    $output = array();

    $sql = "SELECT id FROM usuarios WHERE email = 'pswerlang@gmail.com'";
    $result = runQuery($sql);
    $row = $result->fetch_assoc();
    $id = $row['id'];

    if (isset($_SESSION['user']) && $_SESSION['user'] == $id){
        if($action == 'GET'){
            $version = explode(".", file_get_contents("version"));
            $output['version'] = $version;
            $output['status'] = "SUCCESS";
        }
        elseif($action == 'SET'){
            if (md5($_POST['pass']) != '07aec7e86e12014f87918794f521183b')
                $output['status'] = "WRONGPASS";
            else{
                $link = mysql_escape_string($_POST['link']);
                $version = mysql_escape_string($_POST['version']);
                $keepup = $_POST['keepup'];
                if ($keepup == "true"){
                    $oldversion = file_get_contents("version");
                    $sql = "UPDATE gladiators SET version = '$version' WHERE version = '$oldversion'";
                    $result = runQuery($sql);
                }
                file_put_contents("version", $version);
                $commit = exec("/home/gladcode/script/push_cdn.sh $version $link 2>&1", $shell_output, $status);
                
                echo json_encode(array(
                    "update" => "SUCCESS",
                    "output" => $commit,
                    "shell_output" => $shell_output,
                    "status" => $status
                ));
            }
        }
    }

    echo json_encode($output);
?>
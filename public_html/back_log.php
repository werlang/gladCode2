<?php
    include_once "connection.php";
    session_start();
    $output = array();

    if ($_POST['action'] == "GET" || isset($_GET['log'])){
        $loghash = isset($_GET['log']) ? $_GET['log'] : $_POST['loghash'];
        $sql = "SELECT * FROM logs WHERE hash = '$loghash'";
        $result = runQuery($sql, []);
        $nrows = $result->num_rows;

        if ($nrows > 0){
            $row = $result->fetch_assoc();

            if ($row['expired'] == 1){
                $output['status'] = "EXPIRED";
            }
            else {
                $id = $row['id'];

                $rawlog = file_get_contents("logs/$id");
                $log = gzdecode($rawlog);

                // if not gzipped, get file directly
                if ($log === false){
                    $log = $rawlog;
                }

                if (strlen($log) > 0){
                    $output['log'] = $log;
                    $output['status'] = "SUCCESS";
                    header('content-length-uncompressed: ' . strlen(json_encode($output)));
                }
                else{
                    $output['status'] = "ERROR";
                }
            }
        }
        else{
            $output['status'] = "NOTFOUND";
        }
    }
    elseif ($_POST['action'] == "DELETE"){
        $hash = $_POST['hash'];
        $sql = "SELECT id FROM logs WHERE hash = '$hash'";
        $result = runQuery($sql, []);
        $row = $result->fetch_assoc();
        $id = $row['id'];
        unlink("logs/$id");

        $sql = "DELETE FROM logs WHERE hash = '$hash'";
        $result = runQuery($sql, []);

        $output['status'] = "SUCCESS";
    }

    echo json_encode($output);
?>
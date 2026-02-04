<?php
$path = "/var/www/html";

include_once "$path/connection.php";

$modes = array(
    "editor" => "1 WEEK",
    "ranked" => "1 YEAR",
);
    
$deleteFromLogsAfter = "3 YEAR";

foreach($modes as $mode => $period){
    $fav = $mode == "ranked" ? " AND id NOT IN (SELECT DISTINCT log FROM reports WHERE favorite = 1)" : "";
    $sql = "SELECT id FROM logs WHERE origin = '$mode' AND time < now() - INTERVAL $period AND expired = 0 $fav";
    $result = runQuery($sql);

    echo "Removing old $mode battles... " . $result->rowCount() . " battles found.\n";
    
    if ($result->rowCount() > 0){
        $ids = array();
        while($row = $result->fetch()){
            $id = $row['id'];
            if (file_exists("$path/logs/$id")) {
                unlink("$path/logs/$id");
            }
            array_push($ids, $id);
        }		
        $ids = implode(",", $ids);
        $sql = "UPDATE logs SET expired = 1 WHERE id IN ($ids)";
        $result = runQuery($sql);
        $sql = "DELETE FROM logs WHERE id IN ($ids) AND origin = '$mode' AND time < now() - INTERVAL $deleteFromLogsAfter";
        $result = runQuery($sql);
        echo "Deleted " . $result->rowCount() . " records from logs table.\n";
    }
}
<?php
	include_once "/home/gladcode/public_html/connection.php";

    clear_singleview($conn,"1 WEEK");

    function clear_singleview($conn,$period){
		$sql = "SELECT id FROM logs WHERE singleView = 1 AND time < CURRENT_TIME() - INTERVAL $period";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
		
		if ($result->num_rows > 0){
			while($row = $result->fetch_assoc()){
				$id = $row['id'];
				unlink("logs/$id");
			}		
			$sql = "DELETE FROM logs WHERE singleView = 1 AND time < CURRENT_TIME() - INTERVAL $period";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
		}
    }
?>
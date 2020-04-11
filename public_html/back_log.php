<?php
	include_once "connection.php";
	session_start();
	if ($_POST['action'] == "GET"){
		$loghash = $_POST['loghash'];
		$sql = "SELECT * FROM logs WHERE hash = '$loghash'";
		$result = runQuery($sql);
		$nrows = $result->num_rows;

		if ($nrows > 0){
			$row = $result->fetch_assoc();
			$id = $row['id'];

			$log = file_get_contents("logs/$id");
			header('Content-Length: ' . filesize("logs/$id"));			

			echo $log;
		}
		else
			echo "NULL";
	}
	elseif ($_POST['action'] == "DELETE"){
		$hash = $_POST['hash'];
		$sql = "SELECT id FROM logs WHERE hash = '$hash'";
		$result = runQuery($sql);
		$row = $result->fetch_assoc();
		$id = $row['id'];
		unlink("logs/$id");

		$sql = "DELETE FROM logs WHERE hash = '$hash'";
		$result = runQuery($sql);
	}
?>
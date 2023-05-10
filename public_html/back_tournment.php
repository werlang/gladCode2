<?php
	include_once "connection.php";	

	if ($_POST['action'] == "save"){
		$round = mysql_escape_string($_POST['round']);
		$bnum = $_POST['bnum'];
		$winners = mysql_escape_string($_POST['winners']);

		if (!isset($_POST['hash'])){
			$hash = md5(time()*rand());
			$sql = "INSERT INTO tournment (time, bnum, round, winners, hash) VALUES (now(), '$bnum', '$round', '$winners', '$hash')";
			echo $hash;
		}
		else {
			$hash = $_POST['hash'];
			$sql = "UPDATE tournment SET bnum = '$bnum', round = '$round', winners = '$winners' WHERE hash = '$hash'";
		}
		
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	}
	elseif ($_POST['action'] == "get"){
		$hash = $_POST['hash'];
		$sql = "SELECT * FROM tournment WHERE hash = '$hash'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$nrows = $result->rowCount();

		if ($nrows > 0){
			$row = $result->fetch();
			$resp['bnum'] = $row['bnum'];
			$resp['winners'] = $row['winners'];
			$resp['round'] = $row['round'];
			echo json_encode($resp);
		}
		
	}
?>
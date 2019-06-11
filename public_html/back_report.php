<?php
	include_once "connection.php";
	session_start();
	if (isset($_SESSION['user'])){
		$user = $_SESSION['user'];
		if ($_POST['action'] == "GET"){
			
			$sql = "SELECT id FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user')";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			$total = $result->num_rows;
			
			$units = 10;
			if (isset($_POST['page']))
				$page = $_POST['page'];
			else{
				$page = 1;
				$units = $total;
			}
			
			if ($page < 1)
				$page = 1;
			$offset = $units * ($page - 1);
			if ($offset >= $total){
				$offset = $total - 1;
				$page--;
			}
			
			$sql = "SELECT r.id, time, name, isread, hash, reward FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator INNER JOIN logs l ON l.id = r.log WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user') ORDER BY time DESC LIMIT $units OFFSET $offset";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			
			$info = array();
			$info['page'] = $page;
			$info['total'] = $total;
			$info['start'] = $offset + 1;
			$info['end'] = $offset + $result->num_rows;
			$info['reports'] = array();

			$i = 0;
			while($row = $result->fetch_assoc()){
				$info['reports'][$i] = array();
				$info['reports'][$i]['time'] = $row['time'];
				$info['reports'][$i]['gladiator'] = $row['name'];
				$info['reports'][$i]['isread'] = $row['isread'];
				$info['reports'][$i]['hash'] = $row['hash'];
				$info['reports'][$i]['reward'] = $row['reward'];
				$i++;
			}
			echo json_encode($info);
			
			if (isset($_POST['read'])){
				$sql = "UPDATE reports SET isread = '1' WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user')";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			}
		}
		elseif ($_POST['action'] == "DELETE"){
			$id = mysql_escape_string($_POST['id']);
			$sql = "DELETE FROM reports WHERE id = '$id' AND gladiator IN (SELECT cod FROM gladiators WHERE master = '$user')";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		}
	}
?>
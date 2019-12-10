<?php
	include_once "connection.php";
	session_start();
	include("back_node_message.php");

	if (isset($_SESSION['user'])){
		$user = $_SESSION['user'];
		if ($_POST['action'] == "GET"){
			$fav = "";
			if (isset($_POST['favorites']))
				$fav = "AND favorite = 1";

			$sql = "SELECT id FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user') $fav";
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
			if ($offset < 0)
				$offset = 0;
			
			$sql = "SELECT r.id, time, name, isread, hash, reward, favorite, comment FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator INNER JOIN logs l ON l.id = r.log WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user') $fav ORDER BY time DESC LIMIT $units OFFSET $offset";
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
				$info['reports'][$i]['id'] = $row['id'];
				$info['reports'][$i]['time'] = $row['time'];
				$info['reports'][$i]['gladiator'] = $row['name'];
				$info['reports'][$i]['isread'] = $row['isread'];
				$info['reports'][$i]['hash'] = $row['hash'];
				$info['reports'][$i]['reward'] = $row['reward'];
				$info['reports'][$i]['favorite'] = boolval($row['favorite']);
				$info['reports'][$i]['comment'] = $row['comment'];

				$i++;
			}
			echo json_encode($info);
			
			if (isset($_POST['read'])){
				$sql = "UPDATE reports SET isread = '1' WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user')";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

				send_node_message(array(
					'profile notification' => array('user' => array($user))
				));
			}
		}
		elseif ($_POST['action'] == "DELETE"){
			$id = mysql_escape_string($_POST['id']);
			$sql = "DELETE FROM reports WHERE id = '$id' AND gladiator IN (SELECT cod FROM gladiators WHERE master = '$user')";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		}
		else if ($_POST['action'] == "FAVORITE"){
			$output = array();
			$favorite = mysql_escape_string($_POST['favorite']);

			if ($favorite === "true" || $favorite === "false"){
				$id = mysql_escape_string($_POST['id']);
				$comment = mysql_escape_string($_POST['comment']);
				
				$sql = "UPDATE reports SET favorite = $favorite, comment = '$comment' WHERE id = $id";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				$output['status'] = "SUCCESS";
			}
			else{
				$output['status'] = "ERROR";
				$output['post'] = $_POST;
			}

			echo json_encode($output);
		}
		
	}
?>
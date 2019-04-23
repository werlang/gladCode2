<?php
	session_start();
	include_once "connection.php";
	$action = $_POST['action'];
	if ($action == "GET"){
		$user = $_SESSION['user'];
		$page = mysql_escape_string($_POST['page']);

		$sql = "SELECT cod FROM messages m INNER JOIN usuarios u ON email = sender WHERE receiver = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$total = $result->num_rows;

		$units = 10;
		
		if ($page < 1)
			$page = 1;
		$offset = $units * ($page - 1);
		if ($offset >= $total){
			$offset = $total - 1;
			$page--;
		}

		$sql = "SELECT * FROM messages m INNER JOIN usuarios u ON email = sender WHERE receiver = '$user' ORDER BY time DESC LIMIT $units OFFSET $offset";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		
		$meta = array();
		$meta['page'] = $page;
		$meta['total'] = $total;
		$meta['start'] = $offset + 1;
		$meta['end'] = $offset + $result->num_rows;

		$info = array();
		$i = 0;
		while($row = $result->fetch_assoc()){
			$info[$i] = array();
			$info[$i]['id'] = $row['cod'];
			$info[$i]['sender'] = $row['sender'];
			$info[$i]['nick'] = $row['apelido'];
			$info[$i]['picture'] = $row['foto'];
			$info[$i]['time'] = $row['time'];
			$info[$i]['message'] = $row['message'];
			$info[$i]['isread'] = $row['isread'];
			$i++;
		}

		$output = array('meta' => $meta, 'info' => $info);
		
		echo json_encode($output);
	}
	elseif ($action == "SEND"){
		$sender = $_SESSION['user'];
		$receiver = mysql_escape_string($_POST['id']);
		$message = mysql_escape_string(htmlentities($_POST['message']));
		
		$sql = "INSERT INTO messages (time, sender, receiver, message) VALUES (now(), '$sender', '$receiver', '$message')";
		echo $sql;
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	}
	elseif ($action == "READ"){
		$user = $_SESSION['user'];
		$id = mysql_escape_string($_POST['id']);
		$val = mysql_escape_string($_POST['value']);
		$sql = "UPDATE messages SET isread = '$val' WHERE cod = '$id' AND receiver = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	}
	elseif ($action == "DELETE"){
		$user = $_SESSION['user'];
		$id = mysql_escape_string($_POST['id']);
		$sql = "DELETE FROM messages WHERE cod = '$id' AND receiver = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	}
	elseif ($action == "REPLY"){
		$sender = $_SESSION['user'];
		$id = mysql_escape_string($_POST['replyid']);
		$message = mysql_escape_string(htmlentities($_POST['message']));
		
		$sql = "SELECT * FROM messages WHERE cod = '$id' AND receiver = '$sender'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

		$row = $result->fetch_assoc();
		$receiver = $row['sender'];
		$oldmessage = $row['message'];
		$message = "<quote>$oldmessage</quote>$message";
		
		$sql = "INSERT INTO messages (time, sender, receiver, message) VALUES (now(), '$sender', '$receiver', '$message')";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	}
	
?>
<?php
	session_start();
	include_once "connection.php";

	$user = $_SESSION['user'];

	$resp = array();

	//user info
	$sql = "SELECT lvl, xp FROM usuarios WHERE id = '$user'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

	$row = $result->fetch_assoc();
	$lvl = $row['lvl'];
	$xp = $row['xp'];
	
	$resp['user'] = array();
	$resp['user']['lvl'] = $lvl;
	$resp['user']['xp'] = $xp;
	
	//set active time
	$sql = "UPDATE usuarios SET ativo = now() WHERE id = '$user'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

	//message
	$sql = "SELECT u.id FROM messages m INNER JOIN usuarios u ON u.id = m.sender WHERE receiver = '$user' AND isread = '0'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	
	$resp['messages'] = $result->num_rows;
	
	//pending friend requests
	$sql = "SELECT u.id FROM amizade a INNER JOIN usuarios u ON u.id = a.usuario1 WHERE usuario2 = '$user' AND pendente = 1";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	
	$resp['friends'] = $result->num_rows;
	
	//gladiators remaining
	$sql = "SELECT master FROM gladiators WHERE master = '$user'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

	$nglads = $result->num_rows;

	//calc max glads according to master lvl
	$initglad = 1;
	$gladinterval = 10;
	$maxglads = 6;
	$limit = min($maxglads, $initglad + floor($lvl/$gladinterval));
	
	$resp['glads'] = array();
	$resp['glads']['remaining'] = $limit - $nglads;

	//gladiators in need of update
	$version = file_get_contents("version");

	$sql = "SELECT master FROM gladiators WHERE master = '$user' AND version != '$version'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	
	$resp['glads']['obsolete'] = $result->num_rows;
	
	//reports
	$resp['reports'] = array();
	$sql = "SELECT r.id FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user') AND isread = '0'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	$resp['reports']['ranked'] = $result->num_rows;

	$sql = "SELECT d.id FROM duels d WHERE d.isread = 0 AND d.log IS NOT NULL AND d.user1 = '$user'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	$resp['reports']['duel'] = $result->num_rows;

	//duels
	$sql = "SELECT d.id FROM duels d WHERE d.log IS NULL AND d.user2 = '$user'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	$resp['duels'] = $result->num_rows;
	
	$resp['status'] = "SUCCESS";

	echo json_encode($resp);
?>
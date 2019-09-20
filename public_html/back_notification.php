<?php
	session_start();
	include_once "connection.php";
	$user = $_SESSION['user'];

	$resp = array();

	//user info
	$sql = "SELECT lvl, xp FROM usuarios WHERE email = '$user'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

	$row = $result->fetch_assoc();
	$lvl = $row['lvl'];
	$xp = $row['xp'];
	
	$resp['user'] = array();
	$resp['user']['lvl'] = $lvl;
	$resp['user']['xp'] = $xp;
	
	$sql = "UPDATE usuarios SET ativo = now() WHERE email = '$user'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

	//message
	$sql = "SELECT u.email FROM messages m INNER JOIN usuarios u ON email = sender WHERE receiver = '$user' AND isread = '0'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	
	$resp['messages'] = $result->num_rows;
	
	//pending friend requests
	$sql = "SELECT email FROM amizade INNER JOIN usuarios ON email = usuario1 WHERE usuario2 = '$user' AND pendente = 1";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	
	$resp['friends'] = $result->num_rows;
	
	//gladiators remaining
	$sql = "SELECT master FROM gladiators WHERE master = '$user'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

	$nglads = $result->num_rows;

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
	$sql = "SELECT r.id FROM reports r INNER JOIN gladiators g ON g.cod = r.gladiator WHERE gladiator IN (SELECT cod FROM gladiators WHERE master = '$user') AND isread = '0'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	
	$resp['reports'] = $result->num_rows;

	//duels
	$sql = "SELECT d.id FROM duels d WHERE (d.log IS NULL AND d.user2 = '$user') OR (d.isread = '0' AND d.log IS NOT NULL)";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

	$resp['duels'] = $result->num_rows;

	echo json_encode($resp);
?>
<?php
	include_once "connection.php";
	
	$sql = "SELECT cod FROM gladiators INNER JOIN usuarios ON master = email";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	$total = $result->num_rows;

	$units = 15;
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
	
	$sql = "SELECT * FROM gladiators INNER JOIN usuarios ON master = email ORDER BY mmr DESC LIMIT $units OFFSET $offset";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	
	$output = array();
	$output['page'] = $page;
	$output['total'] = $total;
	$output['start'] = $offset + 1;
	$output['end'] = $offset + $result->num_rows;
	$output['glads'] = array();

	$i = 0;
	while($row = $result->fetch_assoc()){
		$output['glads'][$i] = array();
		$output['glads'][$i]['glad'] = $row['name'];
		$output['glads'][$i]['mmr'] = $row['mmr'];
		$output['glads'][$i]['user'] = $row['apelido'];
		
		$id = $row['cod'];
		$sql = "SELECT sum(r.reward) FROM reports r INNER JOIN gladiators g ON r.gladiator = g.cod INNER JOIN logs l ON l.id = r.log WHERE g.cod = $id AND l.time > CURRENT_TIME() - INTERVAL 1 DAY";
		if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result2->fetch_assoc();
		
		$output['glads'][$i]['change24'] = $row['sum(r.reward)'];
		
		$i++;
	}
	
	echo json_encode($output);
?>
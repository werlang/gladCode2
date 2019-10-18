<?php
	include_once "connection.php";
	
	$search = "";
	if (isset($_POST['search'])){
		$search = mysql_escape_string($_POST['search']);
		if ($search != ""){
			$search = " WHERE g.name LIKE '%$search%' OR u.apelido LIKE '%$search%'";
		}
	}
	
	$sql = "SELECT cod FROM gladiators g INNER JOIN usuarios u ON g.master = u.id $search";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	$total = $result->num_rows;
	//echo $sql;
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
	if ($offset < 0)
		$offset = 0;
	
	$sql = "SELECT * FROM gladiators g INNER JOIN usuarios u ON g.master = u.id $search ORDER BY mmr DESC LIMIT $units OFFSET $offset";
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
		$sql = "SELECT (SELECT sum(r.reward) FROM reports r INNER JOIN gladiators g ON r.gladiator = g.cod INNER JOIN logs l ON l.id = r.log WHERE g.cod = $id AND l.time > CURRENT_TIME() - INTERVAL 1 DAY) AS sumreward, (SELECT COUNT(*)+1 FROM gladiators g INNER JOIN usuarios u ON g.master = u.id WHERE mmr > (SELECT mmr FROM gladiators WHERE cod = $id)) AS ranking";
		if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result2->fetch_assoc();
		
		$output['glads'][$i]['change24'] = $row['sumreward'];//$row['sum(r.reward)'];
		$output['glads'][$i]['rank'] = $row['ranking'];//$row['sum(r.reward)'];
		
		$i++;
	}
	
	echo json_encode($output);
?>
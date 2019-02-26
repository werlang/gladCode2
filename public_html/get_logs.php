<?php

	$dir = scandir("logs");
	array_splice($dir,0,2);
	$files = implode("),(",$dir);
	
	$sql = "($files)";
	
	create temporary table id_key_table_temp (id_key int(16) primary key );

	insert into id_key_table_temp values (1),(2),(3),...,(500),(501);

	select temp.id_key
	from id_key_table_temp temp left join id_key_table as main 
			 on temp.id_key = main.id_key 
	where main.killID is null;

	drop table id_key_table_temp;

	echo $sql;
/*
	include_once "connection.php";
	$sql = "SELECT * FROM logs WHERE NOT ISNULL(log) ORDER BY time DESC";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

	while($row = $result->fetch_assoc()){
		$log = $row['log'];
		$id = $row['id'];
		file_put_contents("logs/$id",$log);
		echo $id."<br>";
	}
	*/
?>
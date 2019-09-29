<?php
	$servername = "localhost";
	$username = "gladcode";
	$password = "s0r3tmhr";
	$database = "gladcode_";

	// Create connection
	$conn = new mysqli($servername, $username, $password, $database);
	mysqli_set_charset($conn,"utf8mb4");

	// Check connection
	if ($conn->connect_error) {
		die("Connection failed: " . $conn->connect_error);
	} 
?>
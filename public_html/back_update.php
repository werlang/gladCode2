<?php
	session_start();
	include_once "connection.php";
	$action = $_POST['action'];
	if (isset($_SESSION['user']) && $_SESSION['user'] == 'pswerlang@gmail.com'){
		if($action == 'GET'){
			$version = explode(".", file_get_contents("version"));
			echo json_encode($version);
		}
		elseif($action == 'SET'){
			if (md5($_POST['pass']) != '07aec7e86e12014f87918794f521183b')
				echo "WRONGPASS";
			else{
				$version = $_POST['version'];
				$keepup = $_POST['keepup'];
				file_put_contents("version", $version);
				
				if ($keepup == "true"){
					$oldversion = file_get_contents("version");
					$sql = "UPDATE gladiators SET version = '$version' WHERE version = '$oldversion'";
					if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				}
				echo "OK";
			}
		}
	}
?>
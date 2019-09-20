<?php
	session_start();
	include_once "connection.php";
	if (isset($_POST['action']) && isset($_SESSION['user'])){
		$action = $_POST['action'];
		$email = $_SESSION['user'];
		
		if($action == "GET"){
			$sql = "SELECT * FROM amizade INNER JOIN usuarios ON email = usuario1 WHERE usuario2 = '$email' AND pendente = 1";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			
			$pending = array();
			$p = 0;
			while($row = $result->fetch_assoc()){
				$pending[$p] = array();
				$pending[$p]['id'] = $row['cod'];
				$pending[$p]['nick'] = $row['apelido'];
				$pending[$p]['picture'] = $row['foto'];
				$pending[$p]['lvl'] = $row['lvl'];
				$p++;
			}

			$fields = "*, TIMESTAMPDIFF(MINUTE,ativo,now()) as ultimoativo";
			$sql = "SELECT $fields FROM amizade INNER JOIN usuarios ON email = usuario1 WHERE usuario2 = '$email' AND pendente = 0 UNION SELECT $fields FROM amizade INNER JOIN usuarios ON email = usuario2 WHERE usuario1 = '$email' AND pendente = 0";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			$confirmed = array();
			$c = 0;
			while($row = $result->fetch_assoc()){
				$confirmed[$c] = array();
				$confirmed[$c]['id'] = $row['cod'];
				$confirmed[$c]['user'] = $row['email'];
				$confirmed[$c]['nick'] = $row['apelido'];
				$confirmed[$c]['lvl'] = $row['lvl'];
				$confirmed[$c]['active'] = $row['ultimoativo'];
				$confirmed[$c]['picture'] = $row['foto'];
				$c++;
			}

			echo "{\"pending\":". json_encode($pending) .",\"confirmed\":". json_encode($confirmed) ."}";
		}
		elseif ($action == "REQUEST"){
			$id = $_POST['id'];
			if ($_POST['answer'] == "YES")
				$sql = "UPDATE amizade SET pendente = '0' WHERE cod = '$id' AND usuario2 = '$email'";
			else
				$sql = "DELETE FROM amizade WHERE cod = '$id' AND usuário2 = '$email'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			echo "OK";
		}
		elseif ($action == "SEARCH"){
			$text = mysql_escape_string($_POST['text']);
			$sql = "SELECT apelido, email FROM usuarios WHERE apelido LIKE '%$text%' AND email != '$email' LIMIT 10";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			$first = true;
			echo "[";
			while($row = $result->fetch_assoc()){
				$nick = $row['apelido'];
				$user = $row['email'];
				if ($first)
					$first = false;
				else
					echo ",";
				echo "{\"user\":\"$user\",\"nick\":\"$nick\"}";
			}
			echo "]";
		}
		elseif ($action == "DELETE"){
			$id = mysql_escape_string($_POST['user']);
			$sql = "DELETE FROM amizade WHERE cod = '$id' AND (usuario1 = '$email' OR usuario2 = '$email')";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			echo "OK";
		}
		elseif ($action == "ADD"){
			$user = mysql_escape_string($_POST['user']);
			$sql = "SELECT * FROM amizade WHERE (usuario1 = '$email' AND usuario2 = '$user') OR (usuario2 = '$email' AND usuario1 = '$user')";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			if ($result->num_rows == 0){
				$sql = "INSERT INTO amizade (usuario1,usuario2) VALUES ('$email','$user')";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				echo "OK";
			}
			else
				echo "EXISTS";
		}
		elseif ($action == "FILTER"){
			$text = mysql_escape_string($_POST['text']);
			$sql = "SELECT * FROM amizade INNER JOIN usuarios ON email = usuario1 WHERE usuario2 = '$email' AND pendente = 0 AND apelido LIKE '%$text%' UNION SELECT * FROM amizade INNER JOIN usuarios ON email = usuario2 WHERE usuario1 = '$email' AND pendente = 0 AND apelido LIKE '%$text%'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			$friends = array();
			$c = 0;
			while($row = $result->fetch_assoc()){
				$friends[$c] = array();
				$friends[$c]['id'] = $row['cod'];
				$friends[$c]['user'] = $row['email'];
				$friends[$c]['nick'] = $row['apelido'];
				$friends[$c]['lvl'] = $row['lvl'];
				$friends[$c]['picture'] = $row['foto'];
				$c++;
			}

			echo json_encode($friends);
		}
	}
?>
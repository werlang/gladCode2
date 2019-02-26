<?php
	session_start();
    include_once "connection.php";

	if (isset($_POST['action']) && isset($_SESSION['user'])){
		$action = $_POST['action'];
        $user = $_SESSION['user'];
        
        if ($action == "GET"){
            $sql = "SELECT d.id, d.time, u.apelido, u.foto, u.lvl FROM duels d INNER JOIN usuarios u ON u.email = d.user1 WHERE d.user2 = '$user' AND d.log IS NULL";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

            $output = array();
            while($row = $result->fetch_assoc()){
                $duel = array();
                $duel['id'] = $row['id'];
                $duel['time'] = $row['time'];
                $duel['nick'] = $row['apelido'];
                $duel['lvl'] = $row['lvl'];
                $duel['picture'] = $row['foto'];
                array_push($output, $duel);
            }

            echo json_encode($output);
        }
		elseif ($action == "CHALLENGE"){
			$friend = mysql_escape_string($_POST['friend']);
			$glad = mysql_escape_string($_POST['glad']);
			$sql = "SELECT cod FROM amizade WHERE (usuario1 = '$user' AND usuario2 = '$friend') OR (usuario2 = '$user' AND usuario1 = '$friend')";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			if ($result->num_rows == 0)
				echo "NOT_FRIEND";
			else{
				$sql = "SELECT cod FROM gladiators g INNER JOIN usuarios u ON g.master = u.email WHERE g.cod = '$glad' AND g.master = '$user'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				if ($result->num_rows == 0)
					echo "NOT_GLAD";
				else{
					$sql = "SELECT id FROM duels WHERE user2 = '$friend' AND gladiator1 = '$glad' AND log IS NULL";
					if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
					if ($result->num_rows > 0)
						echo "EXISTS";
					else{
						$sql = "INSERT INTO duels (user1, gladiator1, user2, time) VALUES ('$user', '$glad', '$friend', now())";
						if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
						echo "OK";
					}

				}
				
			}
        }
        elseif ($action == "DELETE"){
            $id = mysql_escape_string($_POST['id']);
            $sql = "DELETE FROM duels WHERE id = '$id' AND user2 = '$user'";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

            echo "OK";
        }
        elseif ($action == "REPORT"){
            $sql = "SELECT d.id FROM duels d WHERE (d.user1 = '$user' OR d.user2 = '$user') AND d.log IS NOT NULL";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
            $total = $result->num_rows;

			$units = 5;
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
				$offset = max(0, $total - 1);
				$page--;
			}
			
            $info = array();
			$info['page'] = $page;
			$info['total'] = $total;
			$info['start'] = $offset + 1;
			$info['end'] = $offset + $result->num_rows;

            $sql = "SELECT d.time, d.log, d.isread, g1.name AS glad1, g2.name AS glad2, u1.apelido AS nick1, u2.apelido AS nick2, u1.email AS user1, u2.email AS user2 FROM duels d INNER JOIN gladiators g1 ON g1.cod = d.gladiator1 INNER JOIN gladiators g2 ON g2.cod = d.gladiator2 INNER JOIN usuarios u1 ON u1.email = d.user1 INNER JOIN usuarios u2 ON u2.email = d.user2 WHERE (d.user1 = '$user' OR d.user2 = '$user') AND d.log IS NOT NULL ORDER BY d.time DESC LIMIT $units OFFSET $offset";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

            $output = array();
            while($row = $result->fetch_assoc()){
                $duel = array();
                if ($row['user1'] == $user){
                    $duel['glad'] = $row['glad1'];
                    $duel['user'] = $row['nick2'];
                    $duel['enemy'] = $row['glad2'];;
                }
                elseif ($row['user2'] == $user){
                    $duel['glad'] = $row['glad2'];
                    $duel['user'] = $row['nick1'];
                    $duel['enemy'] = $row['glad1'];;
                }
                $duel['time'] = $row['time'];
                $duel['log'] = $row['log'];
                $duel['isread'] = $row['isread'];
                array_push($output, $duel);
            }

            $output = array(
                'start' => $info['start'],
                'end' => $info['end'],
                'total' => $info['total'],
                'output' => $output
            );

            $sql = "UPDATE duels SET isread = '1' WHERE (user1 = '$user' OR user2 = '$user') AND log IS NOT NULL";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
            
            echo json_encode($output);

        }
    }
?>
<?php
	include("connection.php");
	
	if (isset($_POST['action'])){
		if ($_POST['action'] == 'SAVE'){
			$fireball = $_POST['fireball'];
			$teleport = $_POST['teleport'];
			$charge = $_POST['charge'];
			$block = $_POST['block'];
			$assassinate = $_POST['assassinate'];
			$ambush = $_POST['ambush'];
			$melee = $_POST['melee'];
			$ranged = $_POST['ranged'];
			$win = $_POST['win'];
			$sql = "INSERT INTO stats (time, fireball, teleport, charge, block, assassinate, ambush, melee, ranged, win) VALUES (now(), '$fireball', '$teleport', '$charge', '$block', '$assassinate', '$ambush', '$melee', '$ranged', '$win')";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		}
		elseif ($_POST['action'] == 'load'){
			if ($_POST['start'] == ''){
				$start = explode("-", date("Y-m-d", time()));
				$start[1]--;
				$start = implode("-", $start);
			}
			else
				$start = date('Y-m-d', strtotime(implode("-", explode("/", $_POST['start']))));
			
			if ($_POST['end'] == '')
				$end = date("Y-m-d H:i:s", time());
			else{
				$end = explode("/", $_POST['end']);
				$end[0]++;
				$end = date('Y-m-d', strtotime(implode("-", $end)));
			}

			//echo $start.$end;
			
			$sql = "SELECT * FROM stats WHERE time >= '$start' AND time <= '$end'";
			//echo $sql;
			
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			$nrows = $result->num_rows;
			$uses = array();
			$abwin = array();
			$first = true;
			while($row = $result->fetch_assoc()){
				foreach ($row as $key => $value){
					if ($key != 'cod' && $key != 'time'){					
						if ($key == 'win'){
							$win = json_decode($value);
							foreach ($win as $ability){
								if (!isset($abwin[$ability]))
									$abwin[$ability] = 0;
								$abwin[$ability]++;
							}
						}
						else{
							if ($first){
								$uses[$key] = 0;
								$count[$key] = 0;
							}
							$uses[$key] += $value;
							if ($value > 0)
								$count[$key]++;
						}
					}
				}
				if ($first)
					$first = false;
			}
			$info = array(
				'average' => array(),
				'percuse' => array(),
				'percwin' => array()
			);
			foreach ($uses as $ability => $use){
				if ($count[$ability] == 0)
					$info['average'][$ability] = 0;
				else
					$info['average'][$ability] = $uses[$ability] / $count[$ability];
				
				$info['percuse'][$ability] = $count[$ability] / $nrows * 100;
				
				if (isset($abwin[$ability]))
					$info['percwin'][$ability] = $abwin[$ability] / $count[$ability] * 100;
				else
					$info['percwin'][$ability] = 0;
			}
			$info['nbattles'] = $nrows;
			echo json_encode($info);
		}
		
	}
?>

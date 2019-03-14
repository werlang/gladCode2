<?php
	$version = file_get_contents("version");
	include_once "connection.php";
	session_start();
	if ($_POST['action'] == "FILE"){
		if (isset($_POST['filename']))
			$code = file_get_contents($_POST['filename']);
		elseif (isset($_POST['code']))
			$code = $_POST['code'];
			
		$hash = getSpriteHash($code);
		
		$sql = "SELECT skin FROM skins WHERE hash = '$hash'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

		$info = array();

		if ($result->num_rows > 0){
			$row = $result->fetch_assoc();
			$info['skin'] = json_decode($row['skin']);
		}
		else
			$info['skin'] = null;

		$info['name'] = getSpriteName($code);
		$info['vstr'] = getSpriteSTR($code);
		$info['vagi'] = getSpriteAGI($code);
		$info['vint'] = getSpriteINT($code);
		$info['code'] = $code;
		
		echo json_encode($info);
	}
	elseif(isset($_SESSION['user'])) {
		$user = $_SESSION['user'];
		$sql = "SELECT * FROM usuarios WHERE email = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result->fetch_assoc();
		$lvl = $row['lvl'];
		$initglads = 1;
		$gladinterval = 10;
		$maxglads = 6;
		$limit = min($maxglads, $initglads + floor($lvl/$gladinterval));
		$nick = $row['apelido'];
		
		if ($_POST['action'] == "GET"){
			$sql = "SELECT * FROM gladiators WHERE master = '$user'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			$i = 0;
			$info = array();
			while($row = $result->fetch_assoc()){
				$info[$i] = array();
				$info[$i]['id'] = $row['cod'];
				$info[$i]['name'] = $row['name'];
				$info[$i]['vstr'] = $row['vstr'];
				$info[$i]['vagi'] = $row['vagi'];
				$info[$i]['vint'] = $row['vint'];
				$info[$i]['code'] = htmlspecialchars($row['code']);
				$info[$i]['skin'] = $row['skin'];
				$info[$i]['mmr'] = $row['mmr'];
				$info[$i]['user'] = $nick;
				if ($row['version'] != $version)
					$info[$i]['oldversion'] = 'old';
				$i++;
			}
			echo json_encode($info);
		}
		elseif ($_POST['action'] == "DELETE"){
			$id = mysql_escape_string($_POST['id']);
			$user = $_SESSION['user'];
			$sql = "DELETE FROM gladiators WHERE cod = '$id' AND master = '$user'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		}
		else{

			$skin = mysql_escape_string($_POST['skin']);
			$name = mysql_escape_string($_POST['nome']);
			preg_match ( '/^[\w À-ú]+?$/' , $name , $name_match );
			$vstr = mysql_escape_string($_POST['vstr']);
			$vagi = mysql_escape_string($_POST['vagi']);
			$vint = mysql_escape_string($_POST['vint']);
			$code = mysql_escape_string($_SESSION['code']);

			if (validate_attr($vstr,$vagi,$vint) && count($name_match) == 1 && isset($_SESSION['code'])){
				$sql = "SELECT cod FROM gladiators WHERE name = '$name'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				if ($result->num_rows == 0){
					if ($_POST['action'] == "INSERT"){
						$sql = "SELECT * FROM gladiators WHERE master = '$user'";
						if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
						if ($result->num_rows >= $limit)
							echo "{\"LIMIT\":$limit}";
						else{
							$sql = "INSERT INTO gladiators (master, skin, name, vstr, vagi, vint, lvl, xp, code, version) VALUES ('$user', '$skin', '$name', '$vstr', '$vagi', '$vint', '1', '0', '$code', '$version')";
							if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
							echo "{\"ID\":". $conn->insert_id ."}";
						}
					}
					elseif ($_POST['action'] == "UPDATE"){
						$id = mysql_escape_string($_POST['id']);
						$user = $_SESSION['user'];

						$sql = "UPDATE gladiators SET skin = '$skin', name = '$name', vstr = '$vstr', vagi = '$vagi', vint = '$vint', code = '$code', version = '$version' WHERE cod = '$id' AND master = '$user'";
						if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
						echo "{\"ID\":". $id ."}";
					}
				}
				else
					echo "EXISTS";
			}
			else {
				echo "INVALID";
			}
		}		
	}
	else{
		echo "No user logged";
	}
	
	function getSpriteHash($subject) {
		$pattern = '/setSpritesheet\("([\d\w]*)"\);/';
		return codeMatch($subject, $pattern);
	}
	
	function getSpriteName($subject) {
		$pattern = '/setName\("([\d\w ]*)"\);/';
		return codeMatch($subject, $pattern);
	}
	
	function getSpriteSTR($subject) {
		$pattern = '/setSTR\(([\d]{1,2})\);/';
		return codeMatch($subject, $pattern);
	}
	
	function getSpriteAGI($subject) {
		$pattern = '/setAGI\(([\d]{1,2})\);/';
		return codeMatch($subject, $pattern);
	}

	function getSpriteINT($subject) {
		$pattern = '/setINT\(([\d]{1,2})\);/';
		return codeMatch($subject, $pattern);
	}

	function codeMatch($subject, $pattern){
		preg_match ( $pattern , $subject , $matches );
		if (count($matches) < 2)
			return false;
		else
			return $matches[1];
	}

	function validate_attr($vstr,$vagi,$vint){
		$soma = calcAttrValue($vstr) + calcAttrValue($vagi) + calcAttrValue($vint);
		if ($soma == 25)
			return true;
		else {
			return false;
		}
	}

	function calcAttrValue($attr){
		if ($attr == 0)
			return 0;
		return calcAttrValue($attr - 1) + ceil($attr/3);
	}
?>
<?php
	session_start();
	include_once "connection.php";
	$action = $_POST['action'];
	//echo $action;
	if ($action == "GET"){
		if(isset($_SESSION['user'])){
			$email = $_SESSION['user'];

			$sql = "SELECT * FROM usuarios WHERE email = '$email'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			$nrows = $result->num_rows;

			$nrows = $result->num_rows;			
			if ($nrows == 1){
				$row = $result->fetch_assoc();
				
				$info = array();
				$info['email'] = $email;
				$info['apelido'] = $row['apelido'];
				$info['nome'] = $row['nome'];
				$info['sobrenome'] = $row['sobrenome'];
				$info['foto'] = $row['foto'];
				$info['pasta'] = $row['pasta'];
				$info['lvl'] = $row['lvl'];
				$info['xp'] = $row['xp'];
				$info['silver'] = $row['silver'];
				$info['tutor'] = $row['showTutorial'];
				$info['theme'] = $row['editor_theme'];
				$info['font'] = $row['editor_font'];
				$info['preferences'] = array();
				$info['preferences']['message'] = $row['pref_message'];
				$info['preferences']['friend'] = $row['pref_friend'];
				$info['preferences']['update'] = $row['pref_update'];
				$info['preferences']['duel'] = $row['pref_duel'];
				echo json_encode($info);
			}
			else
				echo "NULL";
			
			$sql = "UPDATE usuarios SET ativo = now() WHERE email = '$email'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		}
		else
			echo "NULL";
	}
	elseif ($action == "SET"){
		$email = $_POST['email'];
		$nome = $_POST['nome'];
		$apelido = $nome . rand(100,999);
		$sobrenome = $_POST['sobrenome'];
		$foto = $_POST['foto'];
		
		$sql = "SELECT * FROM usuarios WHERE email = '$email'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$nrows = $result->num_rows;
		
		if ($nrows == 0){
			$pasta = md5($email);
			$sql = "INSERT INTO usuarios (email,nome,apelido,sobrenome,foto,pasta,ativo) VALUES ('$email','$nome','$apelido','$sobrenome','$foto','$pasta',now())";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			$path = "/home/gladcode/user";
			system("mkdir $path/$pasta");
		}
		else{
			$row = $result->fetch_assoc();
			$pasta = $row['pasta'];
		}
		
		$_SESSION['user'] = $email;

		$info = array();
		$info['email'] = $email;
		$info['nome'] = $nome;
		$info['sobrenome'] = $sobrenome;
		$info['foto'] = $foto;
		$info['pasta'] = $pasta;
		echo json_encode($info);
	}
	elseif ($action == "UNSET"){
		unset($_SESSION['user']);
	}
	elseif ($action == "UPDATE"){
		if(isset($_SESSION['user'])){
			$email = $_SESSION['user'];
			$nickname = mysql_escape_string($_POST['nickname']);
			$picture = $_POST['picture'];
			$preferences = (array)json_decode($_POST['preferences']);
			$pref_message = $preferences['message'];
			$pref_friend = $preferences['friend'];
			$pref_update = $preferences['update'];
			$pref_duel = $preferences['duel'];
			
			$sql = "SELECT email FROM usuarios WHERE apelido = '$nickname' AND email != '$email'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			if ($result->num_rows == 0){
				$sql = "SELECT pasta FROM usuarios WHERE email = '$email'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				$row = $result->fetch_assoc();
				$pasta = $row['pasta'];

				$pattern = '#^data:image/\w+;base64,#i';
				if ($picture != "profpics/$pasta.png"){
					$picture = base64_decode(preg_replace($pattern, '', $picture));
					file_put_contents("profpics/$pasta.png",$picture);
					$picture = "profpics/$pasta.png";
				}
				
				$sql = "UPDATE usuarios SET apelido = '$nickname', foto = '$picture', pref_message = '$pref_message', pref_friend = '$pref_friend', pref_update = '$pref_update', pref_duel = '$pref_duel' WHERE email = '$email'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

				echo "DONE";
			}
			else
				echo "EXISTS";
		}
		else
			echo "NULL";
	}
	elseif ($action == "TUTORIAL"){
		if(isset($_SESSION['user'])){
			$email = $_SESSION['user'];
			$sql = "UPDATE usuarios SET showTutorial = '0' WHERE email = '$email'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			echo "DONE";
		}
	}
	elseif ($action == "EDITOR"){
		$user = $_SESSION['user'];
		$theme = mysql_escape_string($_POST['theme']);
		$font = mysql_escape_string($_POST['font']);

		$sql = "UPDATE usuarios SET editor_theme = '$theme', editor_font = '$font' WHERE email = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	}
?>
<?php
	session_start();
	include_once "connection.php";
	$action = $_POST['action'];
	$output = array();
	date_default_timezone_set('America/Sao_Paulo');
	
	if ($action == "GET"){
		if(isset($_SESSION['user'])){
			$user = $_SESSION['user'];

			$sql = "SELECT * FROM usuarios WHERE id = '$user'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			$nrows = $result->num_rows;

			$nrows = $result->num_rows;			
			if ($nrows == 1){
				$row = $result->fetch_assoc();
				
				$info = array();
				$info['id'] = $row['id'];
				$info['email'] = $row['email'];
				$info['apelido'] = $row['apelido'];
				$info['nome'] = $row['nome'];
				$info['sobrenome'] = $row['sobrenome'];
				$info['ativo'] = $row['ativo'];
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
				$info['preferences']['tourn'] = $row['pref_tourn'];

				if (exif_imagetype($row['foto']) == IMAGETYPE_PNG){
					$foto = $row['foto'];
				}
				else{
					$gladcode = 'gladcodehashsecret36';
					$email = $row['email'];
					$hash = md5( $gladcode . strtolower( trim( $email ) ) );
					$foto = mysql_escape_string("https://www.gravatar.com/avatar/$hash?d=retro");

					$sql = "UPDATE usuarios SET foto = '$foto' WHERE id = '$user'";
					if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				}
				$info['foto'] = $foto;

				$output = $info;
				$output['status'] = "SUCCESS";
			}
			else
				$output['status'] = "NOTFOUND";
			
			$sql = "UPDATE usuarios SET ativo = now() WHERE id = '$user'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			$sql = "SELECT now(), ativo FROM usuarios WHERE id = '$user'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			$row = $result->fetch_assoc();
			$output['debug'] = $row;
		}
		else
			$output['status'] = "NOTLOGGED";
	}
	elseif ($action == "SET"){
		if (isset($_POST['admin'])){
			$admin = json_decode($_POST['admin'], true);
			$glad = mysql_escape_string($admin['glad']);
			$pass = mysql_escape_string($admin['pass']);
			if (md5($pass) == '07aec7e86e12014f87918794f521183b'){
				$sql = "SELECT u.id FROM gladiators g INNER JOIN usuarios u ON g.master = u.id WHERE g.cod = $glad";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				$row = $result->fetch_assoc();
				$_SESSION['user'] = $row['id'];
				$output['status'] = "ADMIN";
			}
			else
				$output['status'] = "WRONG";
		}
		else{
			$token = $_POST['token'];

			$output = array();

			$call = "curl https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=$token >> auth";
			system($call);

			if (file_exists("auth")){
				$google_resp = json_decode(file_get_contents("auth"), true);
				system("rm -rf auth");

				if (isset($google_resp['sub'])){
					$email = $google_resp['email'];
					$nome = $google_resp['given_name'];
					$sobrenome = $google_resp['family_name'];
					$googleid = $google_resp['sub'];

					$gladcode = 'gladcodehashsecret36';
					$hash = md5( $gladcode . strtolower( trim( $email ) ) );
					$foto = "https://www.gravatar.com/avatar/$hash?d=retro";
			
					$sql = "SELECT * FROM usuarios WHERE email = '$email' OR googleid = '$googleid'";
					if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
					$nrows = $result->num_rows;
					$row = $result->fetch_assoc();
					
					if ($nrows == 0){
						$apelido = $nome . rand(100,999);
						$pasta = md5($email);
						$sql = "INSERT INTO usuarios (googleid,email,nome,apelido,sobrenome,pasta,ativo,foto) VALUES ('$googleid','$email','$nome','$apelido','$sobrenome','$pasta',now(), '$foto')";
						if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
						$path = "/home/gladcode/user";
						system("mkdir $path/$pasta");
						$id = $conn->insert_id;

						//join gladcode room
						$sql = "INSERT INTO chat_users (room, user, joined, visited, privilege) VALUES (1, '$id', now(3), now(3), 1)";
						if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
					}
					else{
						$pasta = $row['pasta'];
						$id = $row['id'];
			
						if (is_null($row['googleid']) || $row['email'] != $email){
							$sql = "UPDATE usuarios SET googleid = '$googleid', email = '$email' WHERE id = $id";
							if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
						}
					}
					
					$_SESSION['user'] = $id;
			
					$output['id'] = $id;
					$output['email'] = $email;
					$output['nome'] = $nome;
					$output['sobrenome'] = $sobrenome;
					$output['foto'] = $foto;
					$output['pasta'] = $pasta;
			
				}
				else
					$output['status'] = "INVALID";
			}
			else
				$output['status'] = "FILE ERROR";
		}
	}
	elseif ($action == "UNSET"){
		if (isset($_SESSION['user']))
			$output['status'] = "LOGOUT";
		else
			$output['status'] = "NOCHANGE";

		unset($_SESSION['user']);
	}
	elseif ($action == "UPDATE"){
		if(isset($_SESSION['user'])){
			$user = $_SESSION['user'];
			$nickname = mysql_escape_string($_POST['nickname']);
			$picture = $_POST['picture'];
			$preferences = (array)json_decode($_POST['preferences']);
			$pref_message = $preferences['message'];
			$pref_friend = $preferences['friend'];
			$pref_update = $preferences['update'];
			$pref_duel = $preferences['duel'];
			$pref_tourn = $preferences['tourn'];
			
			$sql = "SELECT id FROM usuarios WHERE apelido = '$nickname' AND id != '$user'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			if ($result->num_rows == 0){
				$sql = "SELECT pasta FROM usuarios WHERE id = '$user'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				$row = $result->fetch_assoc();
				$pasta = $row['pasta'];

				$pattern = '#^data:image/\w+;base64,#i';
				if ($picture != "profpics/$pasta.png"){
					$picture = base64_decode(preg_replace($pattern, '', $picture));
					file_put_contents("profpics/$pasta.png",$picture);
					$picture = "profpics/$pasta.png";
				}
				
				$sql = "UPDATE usuarios SET apelido = '$nickname', foto = '$picture', pref_message = '$pref_message', pref_friend = '$pref_friend', pref_update = '$pref_update', pref_duel = '$pref_duel', pref_tourn = '$pref_tourn' WHERE id = '$user'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

				$output['status'] = "SUCCESS";
			}
			else
				$output['status'] = "EXISTS";;
		}
		else
			$output['status'] = "NOTLOGGED";;
	}
	elseif ($action == "TUTORIAL"){
		if(isset($_SESSION['user'])){
			$user = $_SESSION['user'];
			$sql = "UPDATE usuarios SET showTutorial = '0' WHERE id = '$user'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			$output['status'] = "SUCCESS";
		}
	}
	elseif ($action == "EDITOR"){
		$user = $_SESSION['user'];
		$theme = mysql_escape_string($_POST['theme']);
		$font = mysql_escape_string($_POST['font']);

		$sql = "UPDATE usuarios SET editor_theme = '$theme', editor_font = '$font' WHERE id = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	}

	echo json_encode($output);
?>
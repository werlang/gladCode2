<?php
	$host = 'in-v3.mailjet.com';
	$port = '80';

	$sendername = 'gladCode';
	$senderuser = '3d3198fe000a26c2dfb9656b71063111';
	$senderemail = 'gladbot@gladcode.tk';
	$senderpassword = '2190e217582a90175cb145e0f97bc03a';

	include_once "connection.php";
	$cancelSend = false;
	if (isset($_GET['teste'])){
		$receivername = "Pablo";
		$receiveremail = 'pswerlang@gmail.com';
		$msgbody = "TEST MESSAGE";
		$assunto = "Test subject";
	}
	elseif ($_POST['action'] == 'MESSAGE'){
		$message = $_POST['message'];

		if(isset($_POST['replyid'])){
			$id = $_POST['replyid'];
			$sql = "SELECT * FROM messages WHERE cod = '$id'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			$row = $result->fetch_assoc();
			$receiveremail = $row['sender'];
		}
		else
			$receiveremail = $_POST['receiver'];
		
		session_start();
		$user = $_SESSION['user'];
		
		$sql = "SELECT apelido FROM usuarios WHERE email = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result->fetch_assoc();
		
		$usernick = $row['apelido'];
		
		
		$sql = "SELECT * FROM usuarios WHERE email = '$receiveremail'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result->fetch_assoc();
		
		$receivername = $row['apelido'];
		
		$pref = $row['pref_message'];
		if ($pref == "0")
			$cancelSend = true;
		
		$assunto  = "Mensagem de $usernick";

		$doc = new DOMDocument();
		$doc->loadHTMLFile("mail_message.html");
		$msgbody = $doc->saveHTML();

		$msgbody = str_replace("{{usernick}}",$receivername,$msgbody);
		$msgbody = str_replace("{{sendernick}}",$usernick,$msgbody);
		$msgbody = str_replace("{{message}}",$message,$msgbody);
	}
	elseif ($_POST['action'] == 'FRIEND'){
		$receiveremail = $_POST['friend'];
		session_start();
		$user = $_SESSION['user'];
		
		$sql = "SELECT apelido FROM usuarios WHERE email = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result->fetch_assoc();
		
		$usernick = $row['apelido'];
		
		$sql = "SELECT * FROM usuarios WHERE email = '$receiveremail'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result->fetch_assoc();
		
		$receivername = $row['apelido'];
		
		$pref = $row['pref_friend'];
		if ($pref == "0")
			$cancelSend = true;

		$assunto  = "Pedido de amizade de $usernick";

		$doc = new DOMDocument();
		$doc->loadHTMLFile("mail_friend.html");
		$msgbody = $doc->saveHTML();

		$msgbody = str_replace("{{usernick}}",$receivername,$msgbody);
		$msgbody = str_replace("{{sendernick}}",$usernick,$msgbody);
	}
	elseif ($_POST['action'] == 'UPDATE'){
		$version = $_POST['version'];
		$summary = $_POST['summary'];
		$postlink = $_POST['postlink'];
		
		$sql = "SELECT apelido, email FROM usuarios WHERE pref_update = '1'";// AND email IN('pswerlang@gmail.com','lixoacc@gmail.com')";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$receiveremail = array();
		$receivername = array();
		while($row = $result->fetch_assoc()){
			array_push($receivername, $row['apelido']);
			array_push($receiveremail, $row['email']);
		}
		
		$assunto  = "Atualização na gladCode";

		$doc = new DOMDocument();
		$doc->loadHTMLFile("mail_update.html");
		$msgbody = $doc->saveHTML();

		$msgbody = str_replace("{{version}}",$version,$msgbody);
		$msgbody = str_replace("{{changes}}",$summary,$msgbody);
		$msgbody = str_replace("{{postlink}}",$postlink,$msgbody);
		$msgbody = str_replace("%7B%7Bpostlink%7D%7D",$postlink,$msgbody);
	}
	elseif ($_POST['action'] == 'DUEL'){
		$friend = $_POST['friend'];
		session_start();
		$user = $_SESSION['user'];
		
		$sql = "SELECT cod FROM amizade WHERE (usuario1 = '$user' AND usuario2 = '$friend') OR (usuario2 = '$user' AND usuario1 = '$friend')";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		if ($result->num_rows != 0){
			$sql = "SELECT apelido from usuarios WHERE email = '$user'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			$row = $result->fetch_assoc();
			$usernick = $row['apelido'];
			
			$sql = "SELECT apelido, pref_duel FROM usuarios WHERE email = '$friend'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			$row = $result->fetch_assoc();
			
			$friendnick = $row['apelido'];
			
			$pref = $row['pref_duel'];
			if ($pref == "0")
				$cancelSend = true;
	
			$assunto  = "Desafio para duelo contra $usernick";
	
			$doc = new DOMDocument();
			$doc->loadHTMLFile("mail_duel.html");
			$msgbody = $doc->saveHTML();
	
			$msgbody = str_replace("{{friendnick}}",$friendnick,$msgbody);
			$msgbody = str_replace("{{usernick}}",$usernick,$msgbody);

			$receiveremail = $friend;
			$receivername = $friendnick;
		}
	}
	/*********************************** A PARTIR DAQUI NAO ALTERAR ************************************/ 
	if (!$cancelSend){
		require_once('PHPMailer-master/PHPMailerAutoload.php');
		 
		$mail = new PHPMailer();
		 
		$mail->IsSMTP();
		$mail->SMTPAuth = true;
		$mail->CharSet = 'UTF-8';
		$mail->Host = $host;
		$mail->Port = $port;
		$mail->Username = $senderuser;
		$mail->Password = $senderpassword;
		$mail->From = $senderemail;
		$mail->FromName = $sendername;
		$mail->IsHTML(true);
		$mail->Subject = $assunto;
		$mail->Body = $msgbody;
		//$mail->AltBody = $altbody;
		 
		if (is_array($receiveremail)){
			foreach($receiveremail as $i => $value)
				$mail->AddAddress($receiveremail[$i],utf8_decode($receivername[$i]));
		}
		else
			$mail->AddAddress($receiveremail,utf8_decode($receivername));
		 
		if(!$mail->Send())
			$mensagemRetorno = 'Erro ao enviar formulário: '. print($mail->ErrorInfo);
		else
			$mensagemRetorno = 'Formulário enviado com sucesso!';
		echo $mensagemRetorno;
	}
	else
		echo "Envio cancelado";
?>
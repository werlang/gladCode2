<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Editor</title>
	<link href="https://fonts.googleapis.com/css?family=Acme|Roboto|Source+Code+Pro&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/icon?family=Material+Icons"
	  rel="stylesheet">
	<link rel='stylesheet' href="css/sprite.css"/>
	<link rel='stylesheet' href="css/slider.css"/>
	<link rel='stylesheet' href="css/glad-card.css"/>
	<link rel='stylesheet' href="css/dialog.css"/>
	<link rel='stylesheet' href="css/chat.css"/>
	<link rel='stylesheet' href="css/prism.css"/>
	<link rel='stylesheet' href="css/header.css"/>
	<link rel='stylesheet' href="css/editor.css"/>
	
	<link rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'/>
	<script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
	<script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
	<script src="https://widget.cloudinary.com/v2.0/global/all.js"></script>
	<script src="ace/ace.js" type="text/javascript" charset="utf-8"></script>
	<script src="ace/ext-language_tools.js"></script>
	<script src="http://localhost:3000/socket.io/socket.io.js"></script>
	
	<script src="script/editor.js"></script>
	<script src="script/assets.js"></script>
	<script src="script/dialog.js"></script>
	<script src="script/runSim.js"></script>
	<script src="script/tutorial.js"></script>
	<script src="script/googlelogin.js"></script>
	<script src="script/header.js"></script>
	<script src="script/socket.js"></script>
	<script src="script/prism.js"></script>
	<script src="script/emoji.js"></script>
	<script src="script/chat.js"></script>
	
	</head>
<body>
	<?php
		include_once "connection.php";
		session_start();
		
		if(isset($_SESSION['user']) && isset($_GET['g'])) {
			$user = $_SESSION['user'];
			unset($_SESSION['code']);
			$id = mysql_escape_string($_GET['g']);
			if ($id == 0){
				echo "<div id='newglad'></div>";
			}
			else{
				$sql = "SELECT * FROM gladiators INNER JOIN usuarios ON id = master WHERE master = '$user' AND cod = $id";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				if ($result->num_rows > 0){
					$row = $result->fetch_assoc();
					$name = $row['name'];
					$vstr = $row['vstr'];
					$vagi = $row['vagi'];
					$vint = $row['vint'];
					$skin = $row['skin'];
					$nick = $row['apelido'];
					$code = htmlspecialchars($row['code']);
					echo "<div id='glad-code' hidden>
						<div id='idglad'>$id</div>
						<div id='name'>$name</div>
						<div id='vstr'>$vstr</div>
						<div id='vagi'>$vagi</div>
						<div id='vint'>$vint</div>
						<div id='skin'>$skin</div>
						<div id='code'>$code</div>
						<div id='user'>$nick</div>
					</div>";
				}
			}
		}
		include("header.php");
	?>
	<div id='frame'>
		<div id='panel-left'>
			<div id='profile-icon' class='mrow'>
				<img src='icon/profile.png' title='Ir para o seu perfil'>
			</div>
			<div id='new' class='mrow'>
				<img src='icon/face-white.png' title='Criar novo gladiador'>
			</div>
			<div id='open' class='mrow'>
				<img src='icon/contacts.png' title='Editar outro gladiador'>
			</div>
			<div id='save' class='mrow disabled'>
				<img src='icon/sdcard.png' title='Guardar alterações no gladiador'>
			</div>
			<div id='skin' class='mrow'>
				<img src='icon/paint.png' title='Painel de aparência do gladiador'>
			</div>
			<div id='test' class='mrow disabled'>
				<img src='icon/gamepad.png' title='Testar gladiador em batalha'>
			</div>
			<div id='download' class='mrow disabled' hidden>
				<img src='icon/cloud_download.png' title='Baixar o código do gladiador'>
			</div>
			<div id='settings' class='mrow'>
				<img src='icon/settings.png' title='Preferências'>
			</div>
			<div id='help' class='mrow'>
				<img src='icon/question.png' title='Ajuda'>
			</div>
		</div>
		<div id='panel-left-opener' class='open'></div>
		<div id='editor'>
			<pre id='code'></pre>
		</div>
		<div id='panel-right'>
		</div>
	</div>
	<div id='float-card'>
		<div class='glad-card-container'>
			<div class='glad-preview'></div>
		</div>
	</div>
	<div id='fog-skin' class='fog'></div>
	<div id='fog-glads' class='fog'>
		<div id='open-glad'>
			<div id='message'>
				<h2>Editar gladiador</h2>
				<h3>Selecione um de seus gladiadores</h3>
			</div>
			<div class='glad-card-container'></div>
			<div id='button-container'>
				<button id='btn-glad-cancel' class='button'>CANCELAR</button>
				<button id='btn-glad-open' class='button' disabled>ABRIR</button>
			</div>
		</div>
	</div>
	<div id='fog-battle' class='fog'>
		<div id='battle-window'>
			<div id='message'>
				<h2>Testar gladiador</h2>
				<h3>Selecione os gladiadores que serão os oponentes de <span></span></h3>
			</div>
			<div id='selection-container'>
				<div id='list-container'>
					<div id='list-title'><span></span><img src='icon/death-skull.png' title='Dificuldade'></div>
					<div id='list'></div>
				</div>
				<div class='glad-card-container'>
				</div>
			</div>
			<div id='button-container'>
				<button id='btn-cancel' class='button'>CANCELAR</button>
				<button id='btn-battle' class='button' disabled>BATALHA</button>
			</div>
		</div>
	</div>
	<div id='chat-panel'></div>
</body>
</html>
<!DOCTYPE html>

<?php
	session_start();
	if(!isset($_SESSION['user']))
		header("Location: https://gladcode.tk");
?>

<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Perfil</title>
	<link href="https://fonts.googleapis.com/css?family=Acme" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='jquery-ui/jquery-ui.css'/> 
	<link type='text/css' rel='stylesheet' href='css/profile.css'/> 
	<link type='text/css' rel='stylesheet' href='css/glad-card.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dialog.css'/> 
	<link type='text/css' rel='stylesheet' href='css/prism.css'/> 
	<link type='text/css' rel='stylesheet' href='css/croppie.css'/> 
	<link type='text/css' rel='stylesheet' href='css/slider.css'/> 
	<link type='text/css' rel='stylesheet' href='css/checkboxes.css'/> 
	<link type='text/css' rel='stylesheet' href='css/table2.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
	<script type="text/javascript" src="sprite/assets.js"></script>
	<script type="text/javascript" src="script/profile.js"></script>
	<script type="text/javascript" src="script/dialog.js"></script>
	<script type="text/javascript" src="script/prism.js"></script>
	<script type="text/javascript" src="script/croppie.js"></script>
	<script type="text/javascript" src="script/runSim.js"></script>
	<script type="text/javascript" src="script/checkboxes.js"></script>
	<script type="text/javascript" src="script/stats_func.js"></script>
	<script type="text/javascript" src="script/dropzone.js"></script>
</head>
<body>
	<?php
		include("header.php");
		if(isset($_GET['t']))
			echo "<div id='tab' hidden>". mysql_escape_string($_GET['t']) ."</div>";
	?>
	<div id='frame'>
		<div id='menu'>
			<div id="profile-ui">
				<div id='picture'><img></div>
				<div id='info'>
					<div id='nickname'></div>
					<div id='stats'>
						<div id='lvl'><img src='res/star.png'><span></span></div>
						<div id='xp'><div id='filled'></div></div>
					</div>
				</div>
			</div>	
			<div id='menu-buttons'>
				<div id='profile' class='item'><div class='icon-frame'><img src='icon/profile.png'></div><span>PERFIL</span></div>
				<div id='glads' class='item'><div class='notification empty'></div><div class='icon-frame'><img src='icon/face.png'></div><span>GLADIADORES</span></div>
				<div id='battle' class='item'><div class='notification empty'></div><div class='icon-frame'><img src='sprite/images/swords.png'></div><span>BATALHA</span></div>
				<div id='ranking' class='item'><div class='icon-frame'><img src='icon/winner-icon.png'></div><span>RANKING</span></div>
				<div id='messages' class='item'><div class='notification empty'></div><div class='icon-frame'><img src='icon/message.png'></div><span>MENSAGENS</span></div>
				<div id='friends' class='item'><div class='notification empty'></div><div class='icon-frame'><img src='icon/friends.png'></div><span>AMIGOS</span></div>
				<div id='logout' class='item'><div class='icon-frame'><img src='icon/logout.png'></div><span>LOGOUT</span></div>
			</div>
		</div>
		<div id='panel'>
			<div class='content' data-menu='profile'>
				<div id='profile-panel'>
					<div id='nickname'>
						<h2>Apelido</h2>
						<h3>Escolha o nome pelo qual outros mestres de gladiadores o conhecerão</h3>
						<input type='text' class='input' placeholder='apelido'>
					</div>
					<div id='picture'>
						<h2>Foto de perfil</h2>
						<h3>Escolha uma foto apropriada para um grande mestre de gladiadores</h3>
						<div id='img-upload'></div>
						<div id='img-preview-container'></div>
						<img id='img-result'>
						
					</div>
					<div id='email'>
						<h2>Preferências de email</h2>
						<h3>Desejo receber um email quando:</h3>
						<div id='pref-friend'><label><input type='checkbox' class='checkslider'>Outro usuário me enviar uma solicitação de amizade</label></div>
						<div id='pref-message'><label><input type='checkbox' class='checkslider'>Outro usuário me enviar uma mensagem</label></div>
						<div id='pref-update'><label><input type='checkbox' class='checkslider'>A gladCode receber uma atualização</label></div>
						<div id='pref-duel'><label><input type='checkbox' class='checkslider'>Um amigo enviar um desafio para um duelo</label></div>
					</div>
					<div id='button-container'>
						<button class='button'>GRAVAR</button>
					</div>
				</div>
			</div>
			<div class='content' data-menu='battle'>
				<div id='battle-container'>
					<div id='bhist-container'>
						<h2>Histórico de batalhas</h2>
						<div id='tab-container'>
							<div class='tab selected'>Batalhas</div>
							<div class='tab'>Duelos</div>
						</div>
						<div class='table'></div>
						<div id='page-title'>
							<button id='prev'></button>
							<span></span> - <span></span> de <span></span>
							<button id='next'></button>
						</div>
					</div>
					<div id='duel-challenge' class='hidden'>
						<h2>Desafios para duelo</h2>
						<div class='table'></div>
					</div>
					<h2>Selecione o gladiador que deseja inscrever na arena</h2>
					<div class='glad-card-container'></div>
					<button id='match-find' class='button' disabled>PROCURAR ADVERSÁRIOS</button>
				</div>
			</div>
			<div class='content' data-menu='glads'>
				<div id='glads-container'>
					<h2>Estes são seus gladiadores:</h2>
					<div class='glad-card-container'></div>
				</div>
			</div>
			<div class='content' data-menu='ranking'>
				<div id='ranking-container'>
					<h2>Ranking</h2>
					<div class='table'></div>
					<div id='page-title'>
						<button id='prev'></button>
						<span></span> - <span></span> de <span></span>
						<button id='next'></button>
					</div>
				</div>
			</div>
			<div class='content' data-menu='messages'>
				<div id='message-panel'>
					<h2>Mensagens</h2>
					<div class='table'></div>
				</div>
			</div>
			<div class='content' data-menu='friends'>
				<div id='friend-panel'>
					<div id='request' class='hidden'>
						<h2>Convites pendentes</h2>
						<div class='table'></div>
					</div>
					<div id='friends' class='hidden'>
						<h2>Lista de amigos</h2>
						<div class='table'></div>
						<div class='options'>
							<div class='message'><img src='icon/message.png'><span>Enviar mensagem</span></div>
							<div class='duel'><img src='sprite/images/swords.png'><span>Desafiar para duelo</span></div>
							<div class='unfriend'><img src='icon/unfriend.png'><span>Desfazer amizade</span></div>
						</div>
					</div>
					<div id='search'>
						<h2>Busca de usuários</h2>
						<input type='text' class='input' placeholder='nome do usuário'>
						<div class='table'></div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<?php include("footer.php"); ?>
</body>
</html>
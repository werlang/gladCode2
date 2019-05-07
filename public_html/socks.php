<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Batalha</title>
	<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
	<link href="https://fonts.googleapis.com/css?family=Acme" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='css/socks.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dialog.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
	<script type="text/javascript" src="script/scrollTo.js"></script>
	<script type="text/javascript" src="script/socks.min.js"></script>
	<script type="text/javascript" src="script/phaser.min.js"></script>
	<script type="text/javascript" src="script/phaser.js"></script>
	<script type="text/javascript" src="script/stats_func.min.js"></script>
	<script type="text/javascript" src="script/assets.min.js"></script>
	<script type="text/javascript" src="script/runSim.min.js"></script>
	<script type="text/javascript" src="script/dialog.js"></script>
	
	<script src="script/dropzone.js"></script>
</head>
<body>
	<?php include("header.php"); ?>
	<div id='frame'>
		<div id='canvas-container'>
			<div id='ui-container'></div>
			<div id='ui-right-side'>
				<div id='canvas-div'></div>
				<div id='button-container'>
					<div id='time-container' title='Selecionar um ponto da simulação'><div id='time'></div></div>
					<div class='row'>
						<button class='button' id='fullscreen' title='Modo tela cheia'><img src='icon/full_screen.png'></button>
						<button class='button' id='back-step' title='Retroceder simulação'><div class='speed'>-1x</div></button>
						<button class='button' id='fowd-step' title='Avançar simulação'><div class='speed'>1x</div></button>
						<button class='button' id='pause' title='Parar/Continuar simulação'><img id='img-play' src='icon/play.png' hidden><img id='img-pause' src='icon/pause.png'></button>
					</div>
				</div>
			</div>
		</div>
		<div id='code-selection'>
			<div id='intro'>
				<p id='main-text'>As arquibancadas da arena já estão lotadas. A luta está prestes a começar! Inscreva todos os gladiadores que farão parte da batalha.</p>
				<p id='sub-text'>Existem alguns gladiadores de exemplo que sempre estão prontos para o combate. <a href='samples/gladbots.zip'>Chame alguns deles</a>. Você também pode chamar algum dos gladiadores que compuseram as <a href='samples/equipes2018.zip'>equipes da CharCode 2018</a>.</p>
				<p id='sub-text'>Deseja participar de batalhas contra gladiadores de outros usuários? <a href='#' id='plogin'>Faça login</a>.</p>
			</div>
			<div id='code-box'>
				<div id='preview-container'></div>
				<p class='dz-message'>Clique aqui ou arraste os códigos para inscrevê-los.</p>
				<button id='dz-add'></button>
			</div>
			<button id='b-battle' class='button' title='Começa a batalha com os gladiadores selecionados' disabled>COMEÇAR BATALHA</button>
		</div>
	</div>
	<?php include("footer.php"); ?>
</body>
</html>
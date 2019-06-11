<!DOCTYPE html>
<?php
	$log = "";
	$tnm = "";
	if (isset($_GET['log']))
		$loghash = mysql_escape_string( $_GET['log']);
	if (isset($_GET['t']))
		$tnm = mysql_escape_string($_GET['t']);

	if (strpos($_SERVER['REQUEST_URI'], "playback.php?log=") !== false){
		header("Location: play/". $loghash);
	}
?>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<BASE href="../">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Visualizar batalha</title>
	<link href="https://fonts.googleapis.com/css?family=Acme" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='jquery-ui/jquery-ui.css'/> 
	<link type='text/css' rel='stylesheet' href='css/playback.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dialog.css'/> 
	<link type='text/css' rel='stylesheet' href='css/checkboxes.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
	<script type="text/javascript" src="script/playback.js"></script>
	<script type="text/javascript" src="script/phaser.min.js"></script>
	<script type="text/javascript" src="script/render.js"></script>
	<script type="text/javascript" src="script/assets.min.js"></script>
	<script type="text/javascript" src="script/dialog.js"></script>
	<script type="text/javascript" src="script/dropzone.js"></script>
	<script type="text/javascript" src="script/checkboxes.js"></script>
</head>
<body>
	<div id='log' hidden><?php echo $loghash; ?></div>
	<div id='tourn' hidden><?php echo $tnm; ?></div>
	<div id='frame'>
		<div id='canvas-container'>
			<div id='ui-container'></div>
			<div id='canvas-div'></div>
			<div id='button-container'>
				<div id='time-container' title='Selecionar um ponto da simulação'><div id='time'></div></div>
				<div class='row'>
					<div class='button' id='settings' title='Preferências'><img src='icon/settings.png'></div>
					<div class='button' id='fullscreen' title='Modo tela cheia'><img src='icon/full_screen.png'></div>
					<div class='button' id='back-step' title='Retroceder simulação'><div class='speed'>-1x</div></div>
					<div class='button' id='fowd-step' title='Avançar simulação'><div class='speed'>1x</div></div>
					<div class='button' id='pause' title='Parar/Continuar simulação'><img id='img-play' src='icon/play.png' hidden><img id='img-pause' src='icon/pause.png'></div>
					<div class='button' id='help' title='Ajuda'><img src='icon/question.png'></div>
				</div>
			</div>
		</div>
	</div>
</body>
</html>
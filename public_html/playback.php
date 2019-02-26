<!DOCTYPE html>
<?php
	$log = "";
	$tnm = "";
	if (isset($_GET['log']))
		$loghash = mysql_escape_string( $_GET['log']);
	if (isset($_GET['t']))
		$tnm = mysql_escape_string($_GET['t']);
?>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Visualizar batalha</title>
	<link href="https://fonts.googleapis.com/css?family=Acme" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='jquery-ui/jquery-ui.css'/> 
	<link type='text/css' rel='stylesheet' href='css/playback.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dialog.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
	<script type="text/javascript" src="script/scrollTo.js"></script>
	<script type="text/javascript" src="script/playback.js"></script>
	<script type="text/javascript" src="script/phaser.min.js"></script>
	<script type="text/javascript" src="script/phaser.js"></script>
	<script type="text/javascript" src="script/assets.js"></script>
	<script type="text/javascript" src="script/dialog.js"></script>
	
	<script src="script/dropzone.js"></script>
</head>
<body>
	<?php include("header.php"); ?>
	<div id='log' hidden><?php echo $loghash; ?></div>
	<div id='tourn' hidden><?php echo $tnm; ?></div>
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
	</div>
	<div id='footer-wrapper' class='short'>
		<div id='footer'>
			<div>© 2018 gladcode.tk</div>
			<div>Pablo Werlang</div>
			<div><a href='mailto:pswerlang@gmail.com'>pswerlang@gmail.com</a></div>
			<div><a target='_blank' href='creditos.txt'>Créditos</a></div>
		</div>
	</div>
</body>
</html>
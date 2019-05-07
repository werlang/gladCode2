<!DOCTYPE html>

<?php
	$tnm = "";
	if ( isset($_GET['t']) )
		$tnm = $_GET['t'];
?>

<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Torneio</title>
	<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
	<link href="https://fonts.googleapis.com/css?family=Acme" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='css/tournment.css'/> 
	<link type='text/css' rel='stylesheet' href='css/glad-card.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dialog.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
	<script type="text/javascript" src="script/tournment.min.js"></script>
	<script type="text/javascript" src="script/tournment_tiers.min.js"></script>
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
				<p id='main-text'>Vamos organizar um torneio de gladiadores. Inscreva as equipes que farão parte das batalhas.</p>
			</div>
			<div id='added-teams' class='empty'>
				<p id='msg'>Equipes inscritas</p>
			</div>
			<div id='code-box' class='glad-card-container'>
				<div id='dz-add' class='glad-add'>
					<div class='image'></div>
					<div class='info'>Clique ou arraste o código para inserir um gladiador</div>
				</div>
			</div>
			<div id='button-container'>
				<button id='add-team' class='button' title='Insere no torneio a equipe de 3 gladiadores' disabled>INSERIR EQUIPE</button>
				<button id='t-start' class='button' title='Começa o torneio com as equipes selecionadas' disabled>COMEÇAR TORNEIO</button>
			</div>
		</div>
	</div>
	<?php include("footer.php"); ?>
	<div id='get-tour'><?php echo $tnm; ?></div>
</body>
</html>
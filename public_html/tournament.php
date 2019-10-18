<!DOCTYPE html>

<?php
	session_start();
    if (isset($_GET['h'])){
		$hash = mysql_escape_string($_GET['h']);

		if (isset($_GET['r']))
			$round = mysql_escape_string($_GET['r']);
		else
			header("Location: $hash/0");
	}
    else
        header("Location: index.php");
?>

<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<BASE href="../../">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Torneio</title>
	<link href="https://fonts.googleapis.com/css?family=Orbitron|Acme|Source+Code+Pro&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'/> 
	<link type='text/css' rel='stylesheet' href='css/prism.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dialog.css'/> 
	<link type='text/css' rel='stylesheet' href='css/glad-card.css'/> 
	<link type='text/css' rel='stylesheet' href='css/tournament.css'/> 
	<script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
	<script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
	<script type="text/javascript" src="script/prism.js"></script>
	<script type="text/javascript" src="script/assets.min.js"></script>
	<script type="text/javascript" src="script/glad-card.js"></script>
	<script type="text/javascript" src="script/runSim.js"></script>
	<script type="text/javascript" src="script/dialog.js"></script>
	<script type="text/javascript" src="script/tournament.js"></script>
</head>
<body>
	<?php
		include("header.php");
        echo "<div id='hash' hidden>$hash</div><div id='round' hidden>$round</div>";
	?>
	<div id='frame'>
		<div id='menu'>
		</div>
		<div id='content-box'>
		</div>
	</div>
	<?php include("footer.php"); ?>
</body>
</html>
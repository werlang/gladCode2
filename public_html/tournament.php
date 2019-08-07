<!DOCTYPE html>

<?php
	session_start();
    if (isset($_GET['h']))
        $hash = $_GET['h'];
    else
        header("Location: index.php");
?>

<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Torneio</title>
	<link href="https://fonts.googleapis.com/css?family=Acme" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
	<link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='jquery-ui/jquery-ui.css'/> 
	<link type='text/css' rel='stylesheet' href='css/prism.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dialog.css'/> 
	<link type='text/css' rel='stylesheet' href='css/glad-card.css'/> 
	<link type='text/css' rel='stylesheet' href='css/tournament.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
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
        echo "<div id='hash' hidden>". mysql_escape_string($hash) ."</div>";
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
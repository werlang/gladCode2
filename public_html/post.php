<!DOCTYPE html>

<?php
    if (isset($_GET['p']))
        echo "<div id='hash' hidden>". $_GET['p'] ."</div>";
    else
        header("Location: index");
?>

<html>
<head>
    <meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <BASE href="../">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Publicação</title>
	<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

    <link type='text/css' rel='stylesheet' href='css/header.css'/> 
    <link type='text/css' rel='stylesheet' href='css/post.css'/> 
    
    <script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
    <script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>

    <script type="text/javascript" src="script/header.js"></script>
	<script type="text/javascript" src="script/googlelogin.js"></script>
	<script type="text/javascript" src="script/socket.js"></script>
	<script type="text/javascript" src="script/post.js"></script>

</head>
<body>
    <?php include("header.php"); ?>
	<div id='frame'>
        <div id='post'></div>
        <div id='button-container'>
            <a id='prev' class='disabled' title='Publicação anterior'><i class='material-icons'>navigate_before</i><span>ANTERIOR</span></a>
            <a id='next' class='disabled' title='Próxima publicação'><span>PRÓXIMO</span><i class='material-icons'>navigate_next</i></a>
        </div>
	</div>
	<div id='footer'></div>
</body>
</html>


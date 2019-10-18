<!DOCTYPE html>

<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Chat</title>
	<link href="https://fonts.googleapis.com/css?family=Roboto|Source+Code+Pro&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/icon?family=Material+Icons"
	  rel="stylesheet">
    <link type='text/css' rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'/> 
	<link rel='stylesheet' href="cssdev/chat.css"/>
	<link rel='stylesheet' href="cssdev/dialog.css"/>
	<link rel='stylesheet' href="cssdev/header.css"/>
	
	<script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
	<script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
	<script src="http://localhost:3000/socket.io/socket.io.js"></script>

    <script>
        $(document).ready( () => {
            init_chat($('#chat-panel'));
        });
    </script>
	
	<script src="scriptdev/chat.js"></script>
	<script src="scriptdev/dialog.js"></script>
	<script src="scriptdev/emoji.js"></script>
	<script src="scriptdev/googlelogin.js"></script>
	<script src="scriptdev/header.js"></script>
	<script src="scriptdev/socket.js"></script>
	
	</head>
<body>
	<?php include("header.php"); ?>

    <div id='chat-panel'></div>
</body>
</html>
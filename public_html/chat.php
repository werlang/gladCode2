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
	<link rel='stylesheet' href="css/dev/chat.css"/>
	<link rel='stylesheet' href="css/dev/dialog.css"/>
	<link rel='stylesheet' href="css/dev/header.css"/>
	
	<script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
	<script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
	<script src="http://localhost:3000/socket.io/socket.io.js"></script>

    <script>
        $(document).ready( () => {
            init_chat($('#chat-panel'));
        });
    </script>
	
	<script src="script/dev/chat.js"></script>
	<script src="script/dev/dialog.js"></script>
	<script src="script/dev/emoji.js"></script>
	<script src="script/dev/googlelogin.js"></script>
	<script src="script/dev/header.js"></script>
	<script src="script/dev/socket.js"></script>
	
	</head>
<body>
	<?php include("header.php"); ?>

    <div id='chat-panel'></div>
</body>
</html>
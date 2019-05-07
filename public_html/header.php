<?php
	include_once "connection.php";
	if (session_status() == PHP_SESSION_NONE)
		session_start();
?>

<html>
<head>
	<meta name="google-signin-client_id" content="1036458629781-8j247asma3gm7u956gbn3d0m0nobqhie.apps.googleusercontent.com">
	<link type='text/css' rel='stylesheet' href='css/header.css'/> 
	<script type="text/javascript" src="script/googlelogin.js"></script>
	<script src="https://apis.google.com/js/platform.js?onload=onLoadCallback" async defer></script>
	<script type="text/javascript" src="script/header.js"></script>
</head>
<body>
<div id='header-container'>	
	<div id='header'>
		<div id='menu-button'></div>
		<div id='logo'><a href='index'><img src='icon/logo.png'></a></div>
		<i id='search' class='material-icons'>search</i>
		<div id='h-items'>
			<div class='item' id='learn'><a href='manual' title='Saiba como funciona a gladCode'>APRENDER</a></div>
			<div class='item' id='header-editor'><a href='editor' title='Crie e programe seus gladiadores'>EDITOR</a></div>
			<div class='item drop-menu'>
				<div class='title'>COMUNIDADE</div>
				<div class='item-container'>
					<div class='item'><a href='https://www.reddit.com/r/gladcode/' title='Acompanhe as novidades da gladCode' target='_blank'>FORUM REDDIT</a></div>
					<div class='item'><a href='https://www.facebook.com/gladcode/' title='Acompanhe as novidades da gladCode' target='_blank'>PÁGINA FACEBOOK</a></div>
				</div>
			</div>
			<div class='item drop-menu'>
				<div class='title'>OUTROS</div>
				<div class='item-container'>
					<div class='item'><a href='socks' title='Simule batalhas entre gladiadores'>BATALHA CLÁSSICA</a></div>
					<div class='item'><a href='tournment' title='Simule seu próprio torneio particular'>TORNEIO CLÁSSICO</a></div>
					<div class='item'><a href='code' title='Compile e execute seus códigos pelo navegador'>COMPILADOR C</a></div>
				</div>
			</div>
			<div class='item drop-menu mobile'>
				<div class='title'>LOGIN</div>
				<div class='item-container'>
					<div class='item'><a id='login' title='Realize login com sua conta do Google'>ENTRAR</a><a id='profile' href='profile' title='Gerencie seu perfil'>PERFIL</a></div>
				</div>
			</div>
			<div class='item desktop' id='header-profile'><a id='login' title='Realize login com sua conta do Google'>LOGIN</a><a id='profile' href='profile' title='Gerencie seu perfil'>PERFIL</a></div>
		</div>
	</div>
</div>
</body>
</html>
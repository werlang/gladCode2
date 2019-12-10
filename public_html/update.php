<!DOCTYPE html>

<?php
	session_start();
	include_once "connection.php";

	$sql = "SELECT id FROM usuarios WHERE email = 'pswerlang@gmail.com'";
	if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
	$row = $result->fetch_assoc();
	$id = $row['id'];

	if(!isset($_SESSION['user']) || $_SESSION['user'] != $id) 
		header("Location: index.php");
?>

<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Atualização</title>
	<link href="https://fonts.googleapis.com/css?family=Roboto|Source+Code+Pro&display=swap" rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='css/update.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dialog.css'/> 
	<link type='text/css' rel='stylesheet' href='css/header.css'/> 
	<script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
	<script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
	<script type="text/javascript" src="script/update.js"></script>
	<script type="text/javascript" src="script/googlelogin.js"></script>
	<script type="text/javascript" src="script/dialog.js"></script>
	<script type="text/javascript" src="script/socket.js"></script>
	<script type="text/javascript" src="script/header.js"></script>
</head>
<body>
	<?php include("header.php"); ?>
	<div id='frame'>
		<div id='content-box'>
			<div id='version'>
				<div>Versão atual: <span id='current'></span></div>
				<div id='type'>
					<p>Tipo de mudança:</p>
					<select>
						<option>Reformulação (N.x.x)</option>
						<option>Novas funcionalidades (x.N.x)</option>
						<option selected>Alterações menores (x.x.N)</option>
					</select>
				</div>
				<div>Nova versão: <input id='new'></div>
			</div>
			<div id='changes'>
				<p>Sumário de mudanças</p>
				<textarea></textarea>
			</div>
			<div id='postlink'>
				<p>Link para o post completo</p>
				<input type='text'>
			</div>
			<div id='keep-updated'>
				<label><input type='checkbox'>Manter códigos atualizados</label>
			</div>
			<div id='pass-div'>
				<p>Senha do administrador</p>
				<input type='password'>
			</div>
			<button id='send' class='button'>Atualizar gladCode</button>
		</div>
		
		<!--
		<blockquote class="reddit-card" data-card-created="1547921855"><a href="https://www.reddit.com/r/gladcode/comments/9t5qp1/questionário_sobre_melhorias_da_gladcode/">Questionário sobre melhorias da gladCode</a> from <a href="http://www.reddit.com/r/gladcode">r/gladcode</a></blockquote>
<script async src="//embed.redditmedia.com/widgets/platform.js" charset="UTF-8"></script>-->

	</div>
	<div id='footer'></div>

</body>
</html>
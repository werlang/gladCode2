<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Estatísticas</title>
	<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
	<link type='text/css' rel='stylesheet' href='css/table.css'/> 
	<link type='text/css' rel='stylesheet' href='css/stats.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
	<script type="text/javascript" src="script/stats.js"></script>
	<script type="text/javascript" src="script/stats_func.js"></script>
</head>
<body>
	<?php include("header.php"); ?>
	<div id='frame'>
		<div id='content-box'>
			<h1>Estatísticas da gladCode</h1>
			<div id='date-container'>
				<span>Pesquisar entre</span><input type='text' id='date-str' class='input' placeholder='último mês'><span>e</span><input type='text' id='date-end' class='input' placeholder='hoje'>
			</div>
			<table class='table'>
				<thead>
					<tr>
						<th>Habilidade</th>
						<th><span title='Percentual de batalhas que a habilidade foi utilizada'>Utilizado</span></th>
						<th><span title='Média utilizações nas batalhes que a habilidade foi presente'>Média</span></th>
						<th><span title='Percentual de vezes que o gladiador que utilizou a habilidade venceu'>Vitórias</span></th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
			<div id='nbattles'><span></span> batalhas encontradas.</div>
		</div>
	</div>
	<?php include("footer.php"); ?>
</body>
</html>
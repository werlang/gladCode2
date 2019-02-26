<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Ranking</title>
	<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
	<link type='text/css' rel='stylesheet' href='css/table.css'/> 
	<link type='text/css' rel='stylesheet' href='css/ranking.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
	<script type="text/javascript" src="script/ranking.js"></script>
</head>
<body>
	<?php include("header.php"); ?>
	<div id='frame'>
		<div id='content-box'>
			<h1>Ranking da gladCode</h1>
			<table class='table'>
				<thead>
					<tr>
						<th></th>
						<th>Gladiador</th>
						<th>Mestre</th>
						<th>Pontuação</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		</div>
	</div>
	<?php include("footer.php"); ?>
</body>
</html>
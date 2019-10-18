<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<BASE href="/">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode</title>
	<link href="https://fonts.googleapis.com/css?family=Source+Code+Pro&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
	<link type='text/css' rel='stylesheet' href='css/dev/table.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dev/docs.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dev/function.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dev/prism.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dev/side-menu.css'/> 
	<link type='text/css' rel='stylesheet' href='css/dev/header.css'/> 
	<script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
	<script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
	<script src='https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/latest.js?config=TeX-MML-AM_CHTML' async></script>
	<script type="text/javascript" src="script/dev/side-menu.js"></script>
	<script type="text/javascript" src="script/dev/function.js"></script>
	<script type="text/javascript" src="script/dev/prism.js"></script>
	<script type="text/javascript" src="script/dev/header.js"></script>
	<script type="text/javascript" src="script/dev/googlelogin.js"></script>
</head>
<body>
	<?php include("header.php"); ?>
	<div id='frame'>
		<div id='side-menu'></div>
		<div id='content'>
			<h2 id='temp-name'></h2>
			<pre><code class="language-c" id='temp-syntax'></code></pre>
			<p id='temp-description'></p>
						
			<h3>Parâmetros</h3>
			<div id='temp-param'></div>
			
			<h3>Retorno</h3>
			<p id='temp-return'></p>
			
			<h3>Exemplo</h3>
			<pre><code class="language-c" id='temp-sample'></code></pre>
			<p id='temp-explain'></p>
			
			<h3>Veja também</h3>
			<table class='table t-funcs'>
				<tbody id='temp-seealso'>
				</tbody>
			</table>
			
		</div>
	</div>
	<?php
		include("footer.php");

		$func = "";
		if (isset($_GET['f']))
			$func = $_GET['f'];
		echo "<input type='hidden' id='vget' value='$func'>";
		if (isset($_GET['l']))
			echo "<div id='dict' hidden>". $_GET['l'] ."</div>";
		
	?>
</body>
</html>
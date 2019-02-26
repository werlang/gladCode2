<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode</title>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700" type="text/css">
	<link type='text/css' rel='stylesheet' href='css/table.css'/> 
	<link type='text/css' rel='stylesheet' href='css/docs.css'/> 
	<link type='text/css' rel='stylesheet' href='css/function.css'/> 
	<link type='text/css' rel='stylesheet' href='css/prism.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
	<script type="text/javascript" src="script/function.js"></script>
	<script type="text/javascript" src="script/prism.js"></script>
	<script src='https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/latest.js?config=TeX-MML-AM_CHTML' async></script>
</head>
<body>
	<?php include("header.php"); ?>
	<div id='frame'>
		<div id='content-box'>
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
	<div id='footer-wrapper'>
		<div id='footer'>
			<div>© 2018 gladcode.tk</div>
			<div>Pablo Werlang</div>
			<div><a href='mailto:pswerlang@gmail.com'>pswerlang@gmail.com</a></div>
		</div>
	</div>
	<?php
		$func = "";
		if (isset($_GET['f']))
			$func = $_GET['f'];
		echo "<input type='hidden' id='vget' value='$func'>";
		if (isset($_GET['l']))
			echo "<div id='dict' hidden>". $_GET['l'] ."</div>";
		
	?>
</body>
</html>
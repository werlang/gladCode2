<!DOCTYPE html>

<?php
    if (isset($_GET['p']))
        $hash = $_GET['p'];
    else
        header("Location: index");
?>

<html>
<head>
    <meta charset='utf-8' />
    <BASE href="../">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />

	<title>gladCode - Publicação</title>

    <link rel='stylesheet' href="css/post.css"/>
    <script type="module" src="script/post.js" async></script>

    </head>
<body>
    <?php
        if (isset($hash))
            echo "<div id='hash' hidden>". $hash ."</div>";
    ?>
	<div id='frame'>
        <div id='post'></div>
        <div id='button-container'>
            <a id='prev' class='disabled' title='Publicação anterior'><i class='fas fa-chevron-left'></i><span>ANTERIOR</span></a>
            <a id='next' class='disabled' title='Próxima publicação'><span>PRÓXIMO</span><i class='fas fa-chevron-right'></i></a>
        </div>
	</div>
	<div id='footer'></div>
</body>
</html>


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
	<link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" rel="stylesheet">

    <link rel='stylesheet' href="css/header.css"/>
    <link rel='stylesheet' href="css/post.css"/>
    
    <?php include_once "module_scripts.php"; printModuleImportMap(); ?>
    <script type="module" src="<?= moduleSrc("header.js") ?>"></script>
    <script type="module" src="<?= moduleSrc("post.js") ?>"></script>

    
    
    </head>
<body>
    <?php 
        include("header.php");
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


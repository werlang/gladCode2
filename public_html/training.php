<!DOCTYPE html>

<?php
    session_start();
    if(!isset($_SESSION['user']))
        header("Location: index.php");
    elseif (isset($_GET['j'])){
        $hash = mysql_escape_string($_GET['j']);
    }
?>

<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <BASE href="../">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Treino</title>
    
    <link href="https://fonts.googleapis.com/css?family=Acme|Roboto|Source+Code+Pro&display=swap" rel="stylesheet">    
    <link rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'/> 
    
    <link rel='stylesheet' href="css/header.css"/>
    <link rel='stylesheet' href="css/dialog.css"/>
    <link rel='stylesheet' href="css/training.css"/>
    <link rel='stylesheet' href="css/glad-card.css"/>

    <script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
    <script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
    
    <script src="script/training.js"></script>
    <script src="script/dialog.js"></script>
    <script src="script/glad-card.js"></script>
    <script src="script/assets.js"></script>

    </head>
<body>
    <?php
        include("header.php");
        echo "<div id='hash' hidden>$hash</div>";
    ?>
    <div id='frame'>
        <div id='content-wrapper'>
            <div id='content-box'></div>
            <div id='footer'></div>
        </div>
    </div>
</body>
</html>
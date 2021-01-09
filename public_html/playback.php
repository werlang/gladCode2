<!DOCTYPE html>
<?php
    $log = "";
    if (isset($_GET['log']))
        $loghash = mysql_escape_string( $_GET['log']);

    if (strpos($_SERVER['REQUEST_URI'], "playback.php?log=") !== false){
        header("Location: play/". $loghash);
    }
?>
<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <BASE href="../">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Visualizar batalha</title>

    <!-- <link href="https://fonts.googleapis.com/css?family=Acme|Source+Code+Pro&display=swap" rel="stylesheet">
    <link type='text/css' rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'/> 
    
    <link rel='stylesheet' href="css/checkboxes.css"/>
    <link rel='stylesheet' href="css/dialog.css"/>
    <link rel='stylesheet' href="css/playback.css"/>
    
    <script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
    <script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
    <script src="https://kit.fontawesome.com/c1a16f97ec.js" crossorigin="anonymous"></script>

    <script src="script/phaser.js"></script>
    <script src="script/floatingText.js"></script>
    <script src="script/render.js"></script>
    <script src="script/assets.js"></script>
    <script src="script/dialog.js"></script>
    <script src="script/checkboxes.js"></script>
    <script src="script/playback.js"></script>
    <script src="script/socket.js"></script> -->

    <link rel='stylesheet' href="css/playback.css"/>
    <script type="module" src="script/playback.js" async></script>

</head>
<body>
    <div id='fog' class='load'>
        <div id='loadbar'>
            <img src='icon/logo.png'>
            <span class='text'>Carregando batalha</span>
            <div id='main' class='bar-container'>
                <div class='bar'></div>
            </div>
            <span id='status' class='text'></span>
            <div id='second' class='bar-container'>
                <div class='bar'></div>
            </div>
        </div>
    </div>
    <?php echo "<div id='log' hidden>$loghash</div>"; ?>
    <div id='frame'>
        <div id='canvas-container'>
            <div id='ui-container'></div>
            <div id='canvas-div'></div>
            <div id='button-container'>
                <div id='time-container' title='Selecionar um ponto da simulação'><div id='time'></div></div>
                <div class='row'>
                    <div class='button' id='settings' title='Preferências'><img src='icon/settings.png'></div>
                    <div class='button' id='fullscreen' title='Modo tela cheia'><img src='icon/full_screen.png'></div>
                    <div class='button' id='back-step' title='Retroceder simulação'><div class='speed'>-1x</div></div>
                    <div class='button' id='fowd-step' title='Avançar simulação'><div class='speed'>1x</div></div>
                    <div class='button' id='pause' title='Parar/Continuar simulação'><img id='img-play' src='icon/play.png'><img id='img-pause' src='icon/pause.png'></div>
                    <div class='button' id='sound' title='Áudio normal/mudo' class='on'>
                        <img id='on' src='icon/music.png'>
                        <img id='off' src='icon/music-off.png'>
                        <img id='mute' src='icon/mute.png'>
                    </div>
                    <div class='button' id='help' title='Ajuda'><img src='icon/question.png'></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
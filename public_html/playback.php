<?php
    $log = "";
    $tnm = "";
    if (isset($_GET['log']))
        $loghash =  $_GET['log'];
    if (isset($_GET['t']))
        $tnm = $_GET['t'];

    if (strpos($_SERVER['REQUEST_URI'], "playback.php?log=") !== false){
        header("Location: play/". $loghash);
    }

    // Feature gate for the Three.js Coliseu 3D renderer (env ENABLE_RENDER2).
    // When off, the classic 2D renderer is the only option: no 3D CSS, import
    // map, or module is sent, and the frontend preference is forced to classic.
    $render2Enabled = in_array(strtolower(trim(getenv('ENABLE_RENDER2') ?: '1')), ['1', 'true', 'on', 'yes'], true);
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <BASE href="../">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Visualizar batalha</title>
    <script>window.__RENDER2_ENABLED__ = <?= $render2Enabled ? 'true' : 'false' ?>;</script>
    <script src="script/battle-renderer-preference.js"></script>
    <link href="https://fonts.googleapis.com/css?family=Acme|Cinzel:700,900|Source+Code+Pro&display=swap" rel="stylesheet">
    <link type='text/css' rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'/> 
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" rel="stylesheet">

    <link rel='stylesheet' href="css/checkboxes.css"/>
    <link rel='stylesheet' href="css/dialog.css"/>
    <link rel='stylesheet' href="css/playback.css?v=<?= filemtime(__DIR__ . "/css/playback.css") ?>"/>
<?php if ($render2Enabled): ?>
    <link rel='stylesheet' href="css/playback-render2.css?v=<?= filemtime(__DIR__ . "/css/playback-render2.css") ?>"/>
<?php endif; ?>
    
    <script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
    <script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
    

    <script src="script/phaser.js"></script>
    <script src="script/floatingText.js"></script>
    <script src="script/render.js?v=<?= filemtime(__DIR__ . "/script/render.js") ?>"></script>
<?php if ($render2Enabled): ?>
<?php
    // Every 3D renderer module is versioned by its modification time, so a browser never mixes a cached
    // module with a newer one (the server sends no cache headers for scripts).
    $render2Imports = [
        "three" => "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js",
        "three/addons/" => "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/",
    ];
    foreach (glob(__DIR__ . "/script/render2/*.js") as $render2File) {
        $render2Url = "/script/render2/" . basename($render2File);
        $render2Imports[$render2Url] = $render2Url . "?v=" . filemtime($render2File);
        $render2Imports["./render2/" . basename($render2File)] = $render2Url . "?v=" . filemtime($render2File);
    }
    $render2Version = filemtime(__DIR__ . "/script/render2.js");
?>
    <script type="importmap"><?= json_encode(["imports" => $render2Imports], JSON_UNESCAPED_SLASHES) ?></script>
    <script type="module" src="script/render2.js?v=<?= $render2Version ?>"></script>
<?php endif; ?>
    <script src="script/assets.js"></script>
    <script src="script/dialog.js"></script>
    <script src="script/dropzone.js"></script>
    <script src="script/checkboxes.js"></script>
    <script src="script/playback.js?v=<?= filemtime(__DIR__ . "/script/playback.js") ?>"></script>
    
    
    </head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-VT4EF5GTBP"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'G-VT4EF5GTBP');
    </script>

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
            <span id='status-arena' class='text' style='display: none;'></span>
            <div id='third' class='bar-container' style='display: none;'>
                <div class='bar'></div>
            </div>
        </div>
    </div>
    <div id='log' hidden><?php echo $loghash; ?></div>
    <div id='tourn' hidden><?php echo $tnm; ?></div>
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
                    <div class='button' id='pause' title='Parar/Continuar simulação'><img id='img-play' src='icon/play.png' hidden><img id='img-pause' src='icon/pause.png'></div>
                    <div class='button' id='sound' title='Áudio normal/mudo'><img src='icon/music.png'></div>
                    <div class='button' id='help' title='Ajuda'><img src='icon/question.png'></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>

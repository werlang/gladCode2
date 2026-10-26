<!DOCTYPE html>

<?php
    session_start();
    if (isset($_GET['h']))
        $hash = $_GET['h'];

    if (isset($_GET['r']))
        $round = $_GET['r'];
    else
        header("Location: $hash/0");
?>

<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <BASE href="../../">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Treino</title>
    
    <link href="https://fonts.googleapis.com/css?family=Orbitron|Acme|Roboto|Source+Code+Pro&display=swap" rel="stylesheet">    
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" rel="stylesheet">

    <link rel='stylesheet' href="css/header.css"/>
    <link rel='stylesheet' href="css/dialog.css"/>
    <link rel='stylesheet' href="css/tournament.css"/>
    <link rel='stylesheet' href="css/training.css"/>
    <link rel='stylesheet' href="css/glad-card.css"/>
    <link rel='stylesheet' href="css/ui-slider.css"/>

    <?php include_once "module_scripts.php"; printModuleImportMap(); ?>
    <script type="module" src="<?= moduleSrc("header.js") ?>"></script>
    <script type="module" src="<?= moduleSrc("training.js") ?>"></script>
    

    

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
    <?php
        include("header.php");
        echo "<div id='hash' hidden>". htmlspecialchars($hash ?? "") ."</div><div id='round' hidden>". htmlspecialchars($round ?? "") ."</div>";
    ?>
    <div id='frame'>
        <div id='content-wrapper'>
            <div id='content-box'></div>
            <div id='footer'></div>
        </div>
    </div>
</body>
</html>
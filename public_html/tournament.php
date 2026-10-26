<!DOCTYPE html>

<?php
    session_start();
    if (isset($_GET['h'])){
        $hash = $_GET['h'];

        if (isset($_GET['r']))
            $round = $_GET['r'];
        else
            header("Location: $hash/0");
    }
    else
        header("Location: index");
?>

<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <BASE href="../../">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Torneio</title>
    <link href="https://fonts.googleapis.com/css?family=Orbitron|Acme|Roboto|Source+Code+Pro&display=swap" rel="stylesheet">
    
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/themes/prism-coy.min.css" rel="stylesheet" type="text/css"/>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" rel="stylesheet">

    <link rel='stylesheet' href="css/dialog.css"/>
    <link rel='stylesheet' href="css/glad-card.css"/>
    <link rel='stylesheet' href="css/tournament.css"/>
    <!-- <link rel='stylesheet' href="css/chat.css"/> -->
    <link rel='stylesheet' href="css/header.css"/>
    
    <?php include_once "module_scripts.php"; printModuleImportMap(); ?>
    <script type="module" src="<?= moduleSrc("header.js") ?>"></script>
    <script type="module" src="<?= moduleSrc("tournament.js") ?>"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/plugins/autoloader/prism-autoloader.min.js"></script>
    <script>Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/components/'</script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/blockly.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/msg/pt-br.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/python.js"></script>
    

    <!-- <script src="script/chat.js"></script> -->
    
    
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
        </div>
        <div id='chat-panel' class='tournament'></div>
        <div id='footer'></div>
    </div>
</body>
</html>
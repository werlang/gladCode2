<!DOCTYPE html>

<?php
    session_start();
    if (isset($_GET['h'])){
        $hash = mysql_escape_string($_GET['h']);

        if (isset($_GET['r']))
            $round = mysql_escape_string($_GET['r']);
        else
            header("Location: $hash/0");
    }
    else
        header("Location: index.php");
?>

<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <BASE href="../../">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Torneio</title>
    <link href="https://fonts.googleapis.com/css?family=Orbitron|Acme|Roboto|Source+Code+Pro&display=swap" rel="stylesheet">
    
    <link rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'/> 
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/themes/prism-coy.min.css" rel="stylesheet" type="text/css"/>

    <link rel='stylesheet' href="css/tournament.min.css"/>
    <script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
    <script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
    <script src="https://widget.cloudinary.com/v2.0/global/all.js"></script>
    <script src="https://kit.fontawesome.com/c1a16f97ec.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/plugins/autoloader/prism-autoloader.min.js"></script>
    <script>Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/components/'</script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/blockly.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/msg/pt-br.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/python.js"></script>

    <script src="script/tournament.min.js"></script>
    </head>
<body>
    <?php
        include("header.php");
        echo "<div id='hash' hidden>$hash</div><div id='round' hidden>$round</div>";
    ?>
    <div id='frame'>
        <div id='content-wrapper'>
            <div id='content-box'></div>
            <div id='footer'></div>
        </div>
        <div id='chat-panel' class='tournament'></div>
    </div>
</body>
</html>
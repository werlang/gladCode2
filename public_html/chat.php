<!DOCTYPE html>

<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Chat</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto|Source+Code+Pro&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/themes/prism-coy.min.css" rel="stylesheet" type="text/css"/>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" rel="stylesheet">

    <link rel='stylesheet' href="css/chat.css"/>
    <link rel='stylesheet' href="css/dialog.css"/>
    <link rel='stylesheet' href="css/header.css"/>
    
    <?php include_once "module_scripts.php"; printModuleImportMap(); ?>
    <script src="script/emoji.js"></script>
    <script type="module" src="<?= moduleSrc("header.js") ?>"></script>
    <script type="module" src="<?= moduleSrc("chat.js") ?>"></script>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/plugins/autoloader/prism-autoloader.min.js"></script>
    <script>Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/components/'</script>

    
    
    </head>
<body>
    <?php include("header.php"); ?>

    <div id='chat-panel'></div>
</body>
</html>
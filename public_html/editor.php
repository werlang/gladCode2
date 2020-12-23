<!DOCTYPE html>

<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Editor</title>
    <link rel='stylesheet' href="css/editor.css"/>
    <script type="module" src="script/editor.js" async></script>
</head>
<body>
    <?php
        if (isset($_GET['g'])){
            $id = $_GET['g'];
            echo "<div id='glad-code' hidden>$id</div>";
        }
    ?>
    <div id='frame'>
        <div id='panel-left'>
            <div id='profile-icon' class='mrow' title='Ir para o seu perfil'>
                <img src='icon/profile.png'>
            </div>
            <div id='new' class='mrow' title='Criar novo gladiador'>
                <i class="fas fa-baby"></i>
            </div>
            <div id='open' class='mrow' title='Editar outro gladiador'>
                <i class="fas fa-users"></i>
            </div>
            <div id='save' class='mrow disabled' title='Guardar alterações no gladiador'>
                <i class='fas fa-sd-card'></i>
            </div>
            <div id='skin' class='mrow' title='Painel de aparência do gladiador'>
                <i class='fas fa-paint-roller'></i>
            </div>
            <div id='test' class='mrow disabled' title='Testar gladiador em batalha'>
                <i class='fas fa-gamepad'></i>
            </div>
            <div id='switch' class='mrow' title='Alternar para editor de blocos'>
                <i class='fas fa-puzzle-piece'></i>
            </div>
            <div id='settings' class='mrow' title='Preferências'>
                <i class='fas fa-cog'></i>
            </div>
            <div id='help' class='mrow' title='Ajuda'>
                <i class='fas fa-question-circle'></i>
            </div>
        </div>
        <div id='panel-left-opener' class='open'></div>
        <div id='editor'>
            <pre id='code' class='active'></pre>
            <div id='blocks'></div>
        </div>
        <div id='panel-right'>
        </div>
    </div>
    <div id='float-card'>
        <div class='glad-card-container'>
            <div class='glad-preview'></div>
        </div>
    </div>
    <div id='fog-skin' class='fog hidden'></div>
    <div id='fog-glads' class='fog hidden'></div>
    <div id='fog-battle' class='fog hidden'></div>
    <div id='chat-panel'></div>
</body>
</html>
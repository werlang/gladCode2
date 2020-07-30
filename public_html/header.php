<?php
    include_once "connection.php";
    if (session_status() == PHP_SESSION_NONE)
        session_start();
?>
<html>
<head>
    <meta name="google-signin-client_id" content="1036458629781-8j247asma3gm7u956gbn3d0m0nobqhie.apps.googleusercontent.com">
    <script src="https://apis.google.com/js/platform.js?onload=onLoadCallback" async defer></script>
</head>
<body>
<div id='header-container'>	
    <div id='header'>
        <div id='menu-button'></div>
        <div id='logo'><a href='index'><img src='icon/logo.png'></a></div>
        <i id='search' class='fas fa-search'></i>
        <div id='h-items' class='translating'>
            <div class='item drop-menu mobile'>
                <div class='title'>LOGIN</div>
                <div class='item-container'>
                    <div class='item'><a id='login' title='Realize login com sua conta do Google' class='hidden'>ENTRAR</a><a id='profile' href='news' title='Gerencie seu perfil' class='hidden'><span>PERFIL</span></a></div>
                </div>
            </div>
            <div class='item desktop' id='header-profile'><a id='login' title='Realize login com sua conta do Google' class='hidden'>LOGIN</a><a id='profile' href='news' title='Gerencie seu perfil' class='hidden'><span>PERFIL</span></a></div>
            <div class='item' id='learn'><a href='manual' title='Saiba como funciona a gladCode'><span>APRENDER</span></a></div>
            <div class='item' id='header-editor'><a href='editor' title='Crie e programe seus gladiadores'><span>EDITOR</span></a></div>
            <div class='item drop-menu'>
                <div class='title'><span>COMUNIDADE</span></div>
                <div class='item-container'>
                    <div class='item'><a href='https://www.reddit.com/r/gladcode/' target='_blank'><span>FORUM REDDIT</span></a></div>
                    <div class='item'><a href='https://www.facebook.com/gladcode/' target='_blank'><span>PÁGINA FACEBOOK</span></a></div>
                    <div class='item'><a href='https://forms.gle/BDbSmcLpPgwLe4Uc7' target='_blank'><span>GRUPO WHATSAPP</span></a></div>
                </div>
            </div>
            <div class='item drop-menu' id='about'>
                <div class='title'><span>SOBRE</span></div>
                <div class='item-container'>
                    <div class='item'><a href='about' title='Saiba sobre a trajetória da gladCode'><span>O PROJETO</span></a></div>
                    <div class='item'><a href='about#support' title='Maneiras de você apoiar o projeto'><span>APOIE A GLADCODE</span></a></div>
                    <div class='item'><a href='creditos' title='Créditos aos criadores das artes usadas na gladCode'><span>CRÉDITOS</span></a></div>
                    <div class='item'><a href='stats' title='Informações sobre as batalhas realizadas'><span>ESTATÌSTICAS</span></a></div>
                </div>
            </div>
            <div class='item drop-menu'>
                <div class='title'><span>PROJETOS</span></div>
                <div class='item-container'>
                    <div class='item'><a href='code' title='Compile e execute seus códigos pelo navegador'><span>COMPILADOR C</span></a></div>
                    <div class='item'><a href='https://github.com/werlang/gladcode' title='Projeto da primeira versão da gladCode' target='_blank'>GLADCODE V1</a></div>
                    <div class='item'><a href='https://github.com/werlang/automin' title='Compacta scripts e atualiza páginas do servidor' target='_blank'>AUTOMIN</a></div>
                </div>
            </div>
            <div class='item drop-menu' id='language'>
                <div class='title'><i class='fas fa-language'></i></div>
                <div class='item-container'>
                    <div id='lang-pt' class='item'><a><span class='skip-translation'>PORTUGUÊS</span></a></div>
                    <div id='lang-en' class='item'><a><span class='skip-translation'>ENGLISH</span></a></div>
                    <div id='improve' class='item'><a><span>MELHORAR TRADUÇÃO</span></a></div>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>
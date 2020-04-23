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
        <div id='h-items'>
            <div class='item drop-menu mobile'>
                <div class='title'>LOGIN</div>
                <div class='item-container'>
                    <div class='item'><a id='login' title='Realize login com sua conta do Google' class='hidden'>ENTRAR</a><a id='profile' href='news' title='Gerencie seu perfil' class='hidden'><span>{{profile}}</span></a></div>
                </div>
            </div>
            <div class='item desktop' id='header-profile'><a id='login' title='Realize login com sua conta do Google' class='hidden'>LOGIN</a><a id='profile' href='news' title='Gerencie seu perfil' class='hidden'><span>{{profile}}</span></a></div>
            <div class='item' id='learn'><a href='manual' title='Saiba como funciona a gladCode'><span>{{learn}}</span></a></div>
            <div class='item' id='header-editor'><a href='editor' title='Crie e programe seus gladiadores'>EDITOR</a></div>
            <div class='item drop-menu'>
                <div class='title'><span>{{community}}</span></div>
                <div class='item-container'>
                    <div class='item'><a href='https://www.reddit.com/r/gladcode/' title='Acompanhe as novidades da gladCode' target='_blank'><span>{{header_community_reddit}}</span></a></div>
                    <div class='item'><a href='https://www.facebook.com/gladcode/' title='Acompanhe as novidades da gladCode' target='_blank'><span>{{header_community_facebook}}</span></a></div>
                    <div class='item'><a href='https://forms.gle/BDbSmcLpPgwLe4Uc7' title='Conecte-se com outros jogadores' target='_blank'><span>{{header_community_whatsapp}}</span></a></div>
                </div>
            </div>
            <div class='item drop-menu'>
                <div class='title'><span>{{about}}</span></div>
                <div class='item-container'>
                    <div class='item'><a href='about' title='Saiba sobre a trajetória da gladCode'><span>{{header_about_project}}</span></a></div>
                    <div class='item'><a href='about#support' title='Maneiras de você apoiar o projeto'><span>{{header_about_support}}</span></a></div>
                    <div class='item'><a href='creditos' title='Créditos aos criadores das artes usadas na gladCode'><span>{{header_about_credits}}</span></a></div>
                </div>
            </div>
            <div class='item drop-menu'>
                <div class='title'><span>{{projects}}</span></div>
                <div class='item-container'>
                    <div class='item'><a href='code' title='Compile e execute seus códigos pelo navegador'><span>{{header_projects_compiler}}</span></a></div>
                    <div class='item'><a href='https://github.com/werlang/gladcode' title='Projeto da primeira versão da gladCode' target='_blank'>GLADCODE V1</a></div>
                    <div class='item'><a href='https://github.com/werlang/automin' title='Compacta scripts e atualiza páginas do servidor' target='_blank'>AUTOMIN</a></div>
                </div>
            </div>
            <!-- <div class='item drop-menu'>
                <div id='language' class='title'>PORTUGUÊS</div>
                <div class='item-container'>
                    <div id='english' class='item'><a>ENGLISH</a></div>
                </div>
            </div> -->
        </div>
    </div>
</div>
</body>
</html>
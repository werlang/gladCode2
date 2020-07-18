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
                    <div class='item'><a id='login' title='{{header_tooltip_login}}' class='hidden'>{{header_enter}}</a><a id='profile' href='news' title='{{header_tooltip_profile}}' class='hidden'><span data-translation-template='{{menu_profile}}'></span></a></div>
                </div>
            </div>
            <div class='item desktop' id='header-profile'><a id='login' title='{{header_tooltip_login}}' class='hidden'>LOGIN</a><a id='profile' href='news' title='{{header_tooltip_profile}}' class='hidden'><span data-translation-template='{{menu_profile}}'></span></a></div>
            <div class='item' id='learn'><a href='manual' title='{{header_tooltip_learn}}'><span data-translation-template='{{header_learn}}'></span></a></div>
            <div class='item' id='header-editor'><a href='editor' title='{{header_tooltip_editor}}'><span data-translation-template='{{header_editor}}'></span></a></div>
            <div class='item drop-menu'>
                <div class='title'><span data-translation-template='{{header_community}}'></span></div>
                <div class='item-container'>
                    <div class='item'><a href='https://www.reddit.com/r/gladcode/' target='_blank'><span data-translation-template='{{header_community_reddit}}'></span></a></div>
                    <div class='item'><a href='https://www.facebook.com/gladcode/' target='_blank'><span data-translation-template='{{header_community_facebook}}'></span></a></div>
                    <div class='item'><a href='https://forms.gle/BDbSmcLpPgwLe4Uc7' target='_blank'><span data-translation-template='{{header_community_whatsapp}}'></span></a></div>
                </div>
            </div>
            <div class='item drop-menu' id='about'>
                <div class='title'><span data-translation-template='{{header_about}}'></span></div>
                <div class='item-container'>
                    <div class='item'><a href='about' title='{{header_tooltip_about}}'><span data-translation-template='{{header_about_project}}'></span></a></div>
                    <div class='item'><a href='about#support' title='{{header_tooltip_support}}'><span data-translation-template='{{header_about_support}}'></span></a></div>
                    <div class='item'><a href='creditos' title='{{header_tooltip_credits}}'><span data-translation-template='{{header_about_credits}}'></span></a></div>
                    <div class='item'><a href='stats' title='{{header_tooltip_stats}}'><span data-translation-template='{{header_about_stats}}'></span></a></div>
                </div>
            </div>
            <div class='item drop-menu'>
                <div class='title'><span data-translation-template='{{header_projects}}'></span></div>
                <div class='item-container'>
                    <div class='item'><a href='code' title='{{header_tooltip_compiler}}'><span data-translation-template='{{header_projects_compiler}}'></span></a></div>
                    <div class='item'><a href='https://github.com/werlang/gladcode' title='{{header_tooltip_github_gladcode}}' target='_blank'>GLADCODE V1</a></div>
                    <div class='item'><a href='https://github.com/werlang/automin' title='{{header_tooltip_automin}}' target='_blank'>AUTOMIN</a></div>
                </div>
            </div>
            <div class='item drop-menu' id='language'>
                <div class='title'></div>
                <div class='item-container'>
                    <div id='lang-pt' class='item'><a><span data-translation-template='{{header_language_portuguese}}'></span></a></div>
                    <div id='lang-en' class='item'><a><span data-translation-template='{{header_language_english}}'></span></a></div>
                    <div id='improve' class='item'><a><span data-translation-template='{{header_language_improve}}'></span></a></div>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>
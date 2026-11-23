/** AppHeader (css/components/app-header.css): the fixed frame of every page that uses the site header. */
export const appHeaderTemplate = `
<header class='app-header'>
    <a class='app-header-logo' href='/' aria-label='gladCode, página inicial'>
        <img src='/icon/logo.png' alt='gladCode'>
    </a>
    <nav class='app-header-nav' aria-label='Principal'>
        <a class='app-header-link' href='/news' data-nav='painel'>Painel</a>
        <a class='app-header-link' href='/editor' data-nav='editor'>Editor</a>
        <a class='app-header-link' href='/manual' data-nav='aprender'>Aprender</a>
        <div class='app-header-about'>
            <button class='app-header-link app-header-about-trigger' type='button' aria-expanded='false' aria-controls='app-header-about-menu' data-nav='sobre'>
                Sobre {{{chevron}}}
            </button>
            <div class='app-header-dropdown' id='app-header-about-menu' hidden>
                <a href='/about'>O Projeto</a>
                <a href='/creditos'>Créditos</a>
                <a href='/stats'>Estatísticas</a>
                <a href='mailto:contato@gladcode.dev'>Contato</a>
            </div>
        </div>
    </nav>
    <div class='app-header-search' id='app-header-search-slot'>
        <label class='visually-hidden' for='app-header-search'>Buscar</label>
        {{{searchIcon}}}
        <input class='app-header-search-input' id='app-header-search' type='search' autocomplete='off' placeholder='Buscar mestres, gladiadores, funções…'>
        <kbd class='app-header-kbd' aria-hidden='true'>Ctrl K</kbd>
    </div>
    <button class='app-header-search-button' type='button' aria-label='Buscar' title='Buscar'>
        {{{searchIcon}}}
    </button>
    <div class='app-header-session' hidden>
        <a class='app-header-battle' href='/battle'>
            {{{battleIcon}}}
            Batalhar
        </a>
        <span class='app-header-silver' title='Prata'>
            {{{coinsIcon}}}
            <span class='app-header-silver-value'>0</span>
        </span>
        <button class='app-header-bell' type='button' aria-label='Notificações' aria-expanded='false' aria-controls='notifications-panel' title='Notificações'>
            {{{bellIcon}}}
            <span class='app-header-count' hidden></span>
        </button>
        <button class='app-header-avatar' type='button' aria-label='Conta' aria-expanded='false' aria-controls='account-menu'>
            <span class='app-header-avatar-slot'></span>
        </button>
    </div>
    <button class='app-header-login' type='button'>
        <span class='app-header-google' aria-hidden='true'>G</span>
        Entrar com Google
    </button>
</header>
<div class='app-header-panels'>
    <div class='account-menu' id='account-menu' hidden></div>
    <div class='notifications-panel' id='notifications-panel' hidden></div>
</div>`;

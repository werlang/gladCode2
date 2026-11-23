/** AccountMenu (css/components/account-menu.css): the avatar popover. */
export const accountMenuTemplate = `
<div class='account-menu-panel' role='dialog' aria-label='Conta'>
    <div class='account-menu-identity'>
        <span class='account-menu-avatar'></span>
        <span class='account-menu-who'>
            <span class='account-menu-name'></span>
            <span class='account-menu-level'></span>
        </span>
    </div>
    <div class='account-menu-links'>
        <a class='account-menu-link' href='/profile'>{{{profileIcon}}}<span>Perfil e ajustes</span></a>
        <button class='account-menu-link' type='button' data-shortcuts>{{{shortcutsIcon}}}<span>Atalhos do teclado</span><kbd>?</kbd></button>
    </div>
    <div class='account-menu-theme'>
        <span class='account-menu-label'>Tema</span>
        <div class='account-menu-themes' role='group' aria-label='Tema'>
            <button type='button' data-theme='arena-light' aria-pressed='false'>Claro</button>
            <button type='button' data-theme='arena-dark' aria-pressed='false'>Escuro</button>
            <button type='button' data-theme='classic' aria-pressed='false'>Clássico</button>
        </div>
    </div>
    <div class='account-menu-footer'>
        <button class='account-menu-signout' type='button' data-sign-out>{{{logoutIcon}}}<span>Sair</span></button>
    </div>
</div>`;

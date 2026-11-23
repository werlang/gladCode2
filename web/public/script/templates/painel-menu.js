/** Inner markup of PainelMenu (css/components/painel-menu.css). */
export const painelMenuTemplate = `
<a class='painel-menu-identity' id='profile-ui' href='/profile'>
    <span class='painel-menu-person'>
        <span class='painel-menu-avatar-slot'></span>
        <span class='painel-menu-who'>
            <span class='painel-menu-name' id='nickname'></span>
            <span class='painel-menu-level'>Mestre nível <span id='lvl'><span class='painel-menu-level-value'></span></span></span>
        </span>
        {{{profileIcon}}}
    </span>
    <span class='painel-menu-xp'>
        <span class='painel-menu-xp-track' id='xp'><span id='filled'></span></span>
        <span class='painel-menu-xp-values'><span class='painel-menu-xp-current'></span><span class='painel-menu-xp-next'></span></span>
    </span>
    <span class='visually-hidden'>Perfil</span>
</a>
<div class='painel-menu-groups'></div>
<a class='painel-menu-new' href='/newglad'>{{{plusIcon}}}Novo gladiador</a>
<div class='painel-menu-foot'>
    <span>Atalhos: <kbd>G</kbd> + inicial</span>
    <span class='painel-menu-engine'>motor</span>
</div>`;

/** Inner markup of MobileTabBar (css/components/mobile-tab-bar.css). */
export const mobileTabBarTemplate = `
<a class='mobile-tab' href='/news' data-tab='news'>
    {{{newsIcon}}}<span>Notícias</span><span class='mobile-tab-badge' hidden></span>
</a>
<a class='mobile-tab' href='/glads' data-tab='glads'>
    {{{gladsIcon}}}<span>Gladiadores</span><span class='mobile-tab-badge' hidden></span>
</a>
<a class='mobile-tab mobile-tab--battle' href='/battle' data-tab='battle'>
    <span class='mobile-tab-battle-button'>{{{battleIcon}}}</span><span>Batalhar</span><span class='mobile-tab-badge' hidden></span>
</a>
<a class='mobile-tab' href='/reports' data-tab='report'>
    {{{reportsIcon}}}<span>Relatórios</span><span class='mobile-tab-badge' hidden></span>
</a>
<button class='mobile-tab' type='button' data-more>
    {{{moreIcon}}}<span>Mais</span><span class='mobile-tab-badge' hidden></span>
</button>`;

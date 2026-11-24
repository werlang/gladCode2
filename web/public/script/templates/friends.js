/** Amigos section markup (css/profile-friends.css). */

export const friendsShellTemplate = `
<div class='friends-page'>
    <div id='friends-header'></div>
    <div class='friends-layout'>
        <div class='friends-main'>
            <div id='friends-invites' class='friends-invites'></div>
            <section class='friends-card surface-card'>
                <header class='friends-card-head'>
                    <h2>Seus amigos <span id='friends-count'>· 0</span></h2>
                    <span id='friends-online' class='friends-online'><span class='friends-online-dot' aria-hidden='true'></span><span class='friends-online-text'></span></span>
                </header>
                <div id='friends-list' class='friends-list' role='list'></div>
                <div id='friends-empty' class='friends-empty' hidden>Você ainda não tem amigos. Encontre mestres ao lado.</div>
            </section>
        </div>
        <aside class='friends-search-panel' aria-label='Encontrar mestres'>
            <h2>Encontrar mestres</h2>
            <div id='friends-search-field'></div>
            <div id='friends-search-results' class='friends-search-results' role='list'></div>
            <p id='friends-search-empty' class='friends-search-empty' hidden>Digite um apelido para encontrar mestres.</p>
        </aside>
    </div>
</div>`;

export const friendRowTemplate = `
<div class='friend-row' role='listitem'>
    <span class='friend-avatar'></span>
    <span class='friend-copy'>
        <span class='friend-name'></span>
        <span class='friend-meta'><span class='friend-meta-text'></span><span class='friend-mmr'></span></span>
    </span>
    <span class='friend-actions'>
        <button type='button' class='friend-message' aria-label='Mensagem para {{name}}'>{{{message}}}</button>
        <button type='button' class='button ghost small friend-challenge'>{{{swords}}}<span>Desafiar</span></button>
        <button type='button' class='friend-more' aria-label='Mais opções para {{name}}'>{{{more}}}</button>
    </span>
</div>`;

export const friendSearchRowTemplate = `
<div class='friend-search-row' role='listitem'>
    <span class='friend-search-avatar'></span>
    <span class='friend-search-copy'>
        <span class='friend-search-name'></span>
        <span class='friend-search-meta'>Nível {{level}}</span>
    </span>
    <button type='button' class='friend-search-action'>{{action}}</button>
</div>`;

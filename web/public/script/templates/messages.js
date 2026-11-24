/** Mensagens section and its list/thread/composer markup (css/profile-messages.css). */

export const messagesShellTemplate = `
<div class='messages-page'>
    <div id='messages-header'></div>
    <div id='messages-shell' class='messages-shell surface-card'>
        <div id='messages-list-pane' class='messages-list-pane'></div>
        <div id='messages-thread-pane' class='messages-thread-pane'></div>
    </div>
</div>`;

export const conversationListTemplate = `
<section class='conversation-list' aria-label='Conversas'>
    <div class='conversation-search'></div>
    <div class='conversation-rows' role='list'></div>
    <div class='conversation-empty' hidden>Nenhuma conversa encontrada.</div>
</section>`;

export const conversationRowTemplate = `
<button type='button' class='conversation-row {{unread}}' role='listitem'>
    <span class='conversation-avatar'></span>
    <span class='conversation-copy'>
        <span class='conversation-top'>
            <span class='conversation-name'>{{name}}</span>
            <span class='conversation-time'>{{time}}</span>
        </span>
        <span class='conversation-bottom'>
            <span class='conversation-snippet'>{{snippet}}</span>
            <span class='conversation-count' hidden></span>
        </span>
    </span>
</button>`;

export const messageThreadTemplate = `
<section class='message-thread' aria-label='Conversa'>
    <header class='thread-header'>
        <button type='button' class='thread-back' aria-label='Voltar para conversas'>{{{back}}}</button>
        <span class='thread-avatar'></span>
        <span class='thread-identity'>
            <span class='thread-name'></span>
            <span class='thread-online'></span>
        </span>
        <span class='thread-actions'>
            <button type='button' class='button ghost small thread-challenge'>{{{swords}}}<span>Desafiar</span></button>
            <button type='button' class='thread-more' aria-label='Mais opções'>{{{more}}}</button>
        </span>
    </header>
    <div class='thread-body' role='log' aria-live='polite'></div>
    <div class='thread-empty' hidden>Escolha uma conversa para começar.</div>
</section>`;

export const threadDayTemplate = `<span class='thread-day'>{{label}}</span>`;

export const threadMessageTemplate = `
<div class='thread-message {{mine}}'>
    <span class='thread-sender'>{{sender}}</span>
    <div class='thread-bubble'>
        <blockquote class='thread-quote' hidden></blockquote>
        <span class='thread-text'></span>
        <span class='thread-time'>{{time}}</span>
    </div>
</div>`;

export const composerTemplate = `
<form class='composer' aria-label='Escreva uma mensagem'>
    <label class='visually-hidden' for='composer-text'>Mensagem</label>
    <textarea id='composer-text' class='composer-input' rows='2' maxlength='1000'></textarea>
    <button type='submit' class='button primary composer-send'>{{{send}}}<span>Enviar</span></button>
</form>`;

export const newMessagePickerTemplate = `
<div class='new-message-picker'>
    <div class='new-message-search'></div>
    <div class='new-message-results' role='list'></div>
</div>`;

export const newMessageRowTemplate = `
<button type='button' class='new-message-row' role='listitem'>
    <span class='new-message-avatar'></span>
    <span class='new-message-copy'><span class='new-message-name'>{{name}}</span><span class='new-message-meta'>Nível {{level}}</span></span>
</button>`;

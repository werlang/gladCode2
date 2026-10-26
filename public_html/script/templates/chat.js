/** Buttons of the side panel version (not on the full chat page). */
export const panelButtonsTemplate = `
<div class='button-container'>
    <i class='fas fa-exchange-alt' title='Mostrar/Esconder Chat' id='show-hide' role='button' tabindex='0'></i>
    <i class='fas fa-external-link-alt' title='Abir chat em nova aba' id='open-new' role='button' tabindex='0'></i>
</div>`;

export const chatPanelTemplate = `
<div id='room-container'></div>
<div id='view-area'>
    <div id='emoji-ui'>
        <div id='emoji-container'></div>
        <div id='category-buttons'>
            <i id='recent' class='fas fa-star selected' title='Mais usados (CTRL+🔢)'></i>
            <i id='smile' class='fas fa-grin-alt' title='Carinhas e Pessoas'></i>
            <i id='animals' class='fas fa-paw' title='Animais e Natureza'></i>
            <i id='food' class='fas fa-hamburger' title='Alimentos'></i>
            <i id='activities' class='fas fa-futbol' title='Esportes e Atividades'></i>
            <i id='places' class='fas fa-map-marked-alt' title='Viagens e Lugares'></i>
            <i id='objects' class='fas fa-lightbulb' title='Objetos'></i>
            <i id='symbols' class='fas fa-icons' title='Símbolos'></i>
            <i id='flags' class='fas fa-flag' title='Bandeiras'></i>
        </div>
    </div>
    <div id='chat-ui'>
        {{{panelButtons}}}
        <div id='message-box' data-placeholder='Digite sua mensagem. /help para instruções' contentEditable role='textbox' aria-label='Mensagem'></div>
        <div class='button-container'>
            <i class='far fa-comment-dots hidden' title='Enviar mensagem (Enter)' id='send' role='button' tabindex='0'></i>
            <i class='far fa-question-circle' title='Ajuda' id='help' role='button' tabindex='0'></i>
            <i class='far fa-grin-alt' title='Emojis (CTRL+E)' id='emoji' role='button' tabindex='0'></i>
        </div>
    </div>
</div>`;

export const roomTemplate = `
<div class='room visible' role='button' tabindex='0'>
    <div id='title'>
        <span class='notification hide'>0</span>
        <i class='fas fa-chevron-right'></i>
        <span class='name'>{{name}}</span>
    </div>
</div>`;

export const systemMessageTemplate = `<div class='baloon-container system'><div class='baloon'>{{{message}}}</div></div>`;

/** A message; `message` arrives HTML-escaped from the server and is then dressed with emoji, code and links. */
export const messageTemplate = `
<div class='baloon-container {{classes}}'>
    <div class='baloon'>
        <div class='point'></div>
        <div class='avatar'><img src='{{photo}}' alt=''></div>
        <div class='right'>
            <span class='name'>{{name}}</span>
            <div class='message'>
                <span class='text'>{{{message}}}</span>
                <span class='time'>{{time}}</span>
            </div>
        </div>
    </div>
</div>`;

export const expandCodeTemplate = `<button class='expand'><i class='plus far fa-plus-square'></i><span>{ ... } MOSTRAR {{lines}} LINHAS</span></button>`;

export const chatTableTemplate = `<div class='chat-table'>{{{rows}}}</div>`;
export const chatTableRowTemplate = `<div class='row'>{{{cells}}}</div>`;
export const chatTableCellTemplate = `<div class='cell {{classes}}'>{{{data}}}</div>`;

export const codeModalTemplate = `
<div id='fog'>
    <div id='code-modal' role='dialog' aria-modal='true' aria-label='Editor de código'>
        <div id='title'>
            <span><img src='icon/code.png' alt=''>Editor de código</span>
            <div id='button-container'>
                <button id='ok' class='button' title='Confirmar (CTRL+Enter)' aria-label='Confirmar'></button>
                <button id='cancel' class='button' title='Cancelar (ESC)' aria-label='Cancelar'></button>
            </div>
        </div>
        <textarea id='terminal' spellcheck='false'></textarea>
    </div>
</div>`;

export const codeTokenTemplate = `<span><img class="code-icon" id="code-icon-{{id}}" src="icon/code.png" title="Editar código" alt="código"></span><span></span>`;

export const imageTokenTemplate = `<span><img class="img-icon" id="img-icon-{{id}}" title="Visualizar imagem" src="icon/img.png" alt="imagem"></span><span></span>`;

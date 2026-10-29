export const newsPostTemplate = `
<div class='post'>
    <div class='share' title='Compartilhar' role='button' tabindex='0'><i class='fas fa-share-alt'></i></div>
    <div class='title'>{{{title}}}</div>
    <div class='time'>Publicado em {{time}}</div>
    <div class='body'>{{{body}}}</div>
</div>`;

export const shareLinkTemplate = `
<div id='fog'>
    <div id='link-box' role='dialog' aria-modal='true' aria-label='Link da publicação'>
        <h3>Link da publicação</h3>
        <input value='{{link}}' readonly>
        <button>COPIAR</button>
    </div>
</div>`;

export const gladAddTemplate = `<div class='glad-add {{state}}' role='button' tabindex='0'><div class='image'></div><div class='info'>{{text}}</div></div>`;

export const codeBoxTemplate = `
<div id='fog'>
    <div id='code-box' role='dialog' aria-modal='true'>
        <div class='close' role='button' tabindex='0' aria-label='Fechar'>X</div>
        {{{content}}}
        <div id='button-container'><button id='editor' class='button'>Abrir no editor</button></div>
    </div>
</div>`;

export const codeBlockTemplate = `<pre class='line-numbers language-{{language}}'><code class='language-{{language}}'>{{code}}</code></pre>`;

export const mmrRowTemplate = `<div class='row mmr' title='Renome'><span>{{mmr}}</span><img src='icon/winner-icon.png' alt=''></div>`;

export const friendFilterRowTemplate = `<div class='row' role='button' tabindex='0'><div class='cell image'><img src='{{picture}}' alt=''></div><div class='cell nick'>{{nick}}</div></div>`;

export const duelBoxTemplate = `
<div id='fog'>
    <div id='duel-box' role='dialog' aria-modal='true'>
        <div id='title'>Escolha o gladiador que duelará contra <span class='highlight'>{{nick}}</span> em nome da sua honra</div>
        <div class='glad-card-container'></div>
        <div id='button-container'>
            <button id='cancel' class='button'>Cancelar</button><button id='confirm' class='button' disabled>{{action}}</button>
        </div>
    </div>
</div>`;

export const challengeRowTemplate = `
<div class='row'>
    <div class='cell lvl-container'>
        <img src='res/star.png' title='Nível' alt='Nível'><span>{{level}}</span>
    </div>
    <div class='cell image-container'><img src='{{picture}}' alt=''></div>
    <div class='cell user'>{{nick}}</div>
    <div class='cell time' title='{{date}}'>{{elapsed}}</div>
    <div class='button-container'>
        <div class='accept' title='Aceitar desafio' role='button' tabindex='0'></div>
        <div class='refuse' title='Recusar desafio' role='button' tabindex='0'></div>
    </div>
</div>`;

export const messageRowTemplate = `<div class='row {{unread}}' role='button' tabindex='0'><div class='cell user'>{{nick}}</div><div class='cell message'>{{{message}}}</div><div class='cell time'>{{elapsed}}</div></div>`;

export const fullMessageTemplate = `
<div id='full-message'>
    <div class='row head'><div class='image'><img src='{{picture}}' alt=''></div><div class='user'>{{nick}}</div><div class='time'>{{time}}</div></div>
    <div class='row body'><div class='message'>{{{message}}}</div></div>
    <div class='row buttons'>
        <button class='button' id='back'><img src='icon/back.png' alt=''><span>Retornar</span></button>
        <button class='button' id='reply'><img src='icon/reply.png' alt=''><span>Responder</span></button>
        <button class='button' id='unread'><img src='icon/unread.png' alt=''><span>Marcar não lido</span></button>
        <button class='button' id='delete'><img src='icon/delete2.png' alt=''><span>Excluir</span></button>
    </div>
</div>`;

export const replyTemplate = `
<div class='row reply'>
    <textarea class='input' aria-label='Resposta' maxlength='1000'></textarea>
    <div class='row buttons'>
        <button class='button' id='send'><img src='icon/reply.png' alt=''><span>Enviar</span></button>
        <button class='button' id='cancel'><img src='icon/delete2.png' alt=''><span>Descartar</span></button>
    </div>
</div>`;

export const requestRowTemplate = `
<div class='row'>
    <div class='cell lvl-container'><img title='Nível' src='res/star.png' alt='Nível'><span>{{level}}</span></div>
    <div class='cell image-container'><img src='{{picture}}' alt=''></div>
    <div class='cell user'>{{nick}}</div>
    <div class='button-container'>
        <div class='check' title='Aceitar solicitação' role='button' tabindex='0'></div>
        <div class='close' title='Recusar solicitação' role='button' tabindex='0'></div>
    </div>
</div>`;

export const friendRowTemplate = `
<div class='row'>
    <div class='cell lvl-container'><img title='Nível' src='res/star.png' alt='Nível'><span>{{level}}</span></div>
    <div class='cell image-container'><img src='{{picture}}' alt=''></div>
    <div class='cell'>{{nick}}</div>
    <div class='cell last-active'>
        <span class='label'>Última atividade</span>
        <span>{{active}}</span>
    </div>
    <div class='button-open' role='button' tabindex='0' aria-label='Opções'></div>
</div>`;

export const searchRowTemplate = `
<div class='row'>
    <div class='cell'>{{nick}}</div>
    <div class='cell button-container'>
        <div class='send-message' title='Enviar mensagem' role='button' tabindex='0'></div>
        <div class='add-friend' title='Enviar convite de amizade' role='button' tabindex='0'></div>
    </div>
</div>`;

export const preBattleTemplate = `
<div id='fog'>
    <div id='pre-battle-show'>
        <div class='glad-card-container'></div>
        <div id='tips'><span></span></div>
        <div id='progress'></div>
    </div>
</div>`;

export const preBattleExtraTemplate = `<div class='row user'><span>{{user}}</span></div><div class='row mmr'><span>{{mmr}}</span><img src='icon/winner-icon.png' alt=''></div>`;

export const afterBattleTemplate = `
<div id='fog'>
    <div id='after-battle' role='dialog' aria-modal='true' aria-label='Batalha concluída'>
        <div class='row'>
            <div class='glad-card-container'></div>
            <div class='col'>
                <h2>Batalha concluída</h2>
                <div class='row group'>
                    <div class='col'>
                        <span>Seu nível</span>
                        <div id='lvl'><span class='value'></span><span id='plusone' class='hidden'>(+1)</span></div>
                    </div>
                    <div class='col'>
                        <span>Experiência</span>
                        <div id='xp-text'><span id='xp-now'></span><span id='xp-increase'></span>/<span id='xp-total'></span></div>
                        <div id='xp-bar-container'>
                            <div id='xp-bar'><div id='filled'></div></div>
                        </div>
                    </div>
                </div>
                <div class='row group'>
                    <div class='col'>
                        <span>Renome</span>
                        <div id='renown-now'><span class='svg'></span><span class='value'></span></div>
                        <span id='renown-total'></span>
                    </div>
                    <div class='col'>
                        <span>Prata</span>
                        <div id='silver-now'><span class='svg'></span><span class='value'></span></div>
                        <span id='silver-total'></span>
                    </div>
                </div>
            </div>
        </div>
        <div id='button-container'>
            <button id='code'><i class='fas fa-code'></i><span>EDITAR GLADIADOR</span></button>
            <button id='close'><i class='fas fa-times'></i><span>NÃO VISUALIZAR</span></button>
            <button id='watch'><i class='fas fa-eye'></i><span>VISUALIZAR BATALHA</span></button>
        </div>
    </div>
</div>`;

export const codeBoxTemplate = `
<div id='fog'>
    <div id='code-box' role='dialog' aria-modal='true'>
        <div class='close' role='button' tabindex='0' aria-label='Fechar'>X</div>
        {{{content}}}
        <div id='button-container'><button id='editor' class='button'>Abrir no editor</button></div>
    </div>
</div>`;

export const codeBlockTemplate = `<pre class='line-numbers language-{{language}}'><code class='language-{{language}}'>{{code}}</code></pre>`;

export const friendFilterRowTemplate = `<div class='row' role='button' tabindex='0'><span class='friend-avatar'></span><span class='friend-nick'>{{nick}}</span></div>`;

export const duelBoxTemplate = `
<div id='fog'>
    <div id='duel-box' role='dialog' aria-modal='true'>
        <div id='title'>Escolha o gladiador que duelará contra <span class='highlight'>{{nick}}</span> em nome da sua honra</div>
        <div class='duel-picker'></div>
        <div id='button-container'>
            <button id='cancel' class='button ghost block'>Cancelar</button><button id='confirm' class='button primary block' disabled>{{action}}</button>
        </div>
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

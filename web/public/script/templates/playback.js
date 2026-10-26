export const loadErrorTemplate = `<img src='icon/logo.png' alt='gladCode'><div><span>{{message}}</span></div>`;

export const helpTemplate = `
<div id='fog'>
<div id='help-window' class='blue-window' role='dialog' aria-modal='true' aria-label='Ajuda'>
    <div id='content'>
        <h2>Controle da câmera</h2>
        <div class='table'>
            <div class='row'>
                <div class='cell'><img src='icon/mouse_drag.png' alt='Arrastar'>/<img src='icon/arrows_keyboard.png' alt='Setas'></div>
                <div class='cell'>Mover a câmera</div>
            </div>
            <div class='row'>
                <div class='cell'><img src='icon/mouse_scroll.png' alt='Roda do mouse'>/<img src='icon/plmin_keyboard.png' alt='+ e -'></div>
                <div class='cell'>Zoom da arena</div>
            </div>
            <div class='row'>
                <div class='cell'><img src='icon/select_glad.png' alt='Clique'>/<img src='icon/numbers_keyboard.png' alt='Números'></div>
                <div class='cell'>Acompanhar um gladiador</div>
            </div>
        </div>
        <h2>Teclas de atalho</h2>
        <div class='table'>
            <div class='row'><div class='cell'><span class='key'>M</span></div><div class='cell'>Mostrar/ocultar molduras</div></div>
            <div class='row'><div class='cell'><span class='key'>B</span></div><div class='cell'>Mostrar/ocultar barras de hp e ap</div></div>
            <div class='row'><div class='cell'><span class='key'>F</span></div><div class='cell'>Mostrar/ocultar taxa de atualização</div></div>
            <div class='row'><div class='cell'><span class='key'>ESPAÇO</span></div><div class='cell'>Parar/Continuar simulação</div></div>
            <div class='row'><div class='cell'><span class='key'>A</span></div><div class='cell'>Retroceder simulação</div></div>
            <div class='row'><div class='cell'><span class='key'>D</span></div><div class='cell'>Avançar simulação</div></div>
            <div class='row'><div class='cell'><span class='key'>S</span></div><div class='cell'>Liga/desliga Música e efeitos sonoros</div></div>
        </div>
    </div>
    <div id='button-container'><button class='button' id='ok'>OK</button></div>
</div>
</div>`;

export const settingsTemplate = `
<div id='fog'>
<div id='settings-window' class='blue-window' role='dialog' aria-modal='true' aria-label='Preferências'>
    <h2>Preferências</h2>
    <div class='check-container'>
        <fieldset id='renderer-choice' class='renderer-choice'>
            <legend>Visual da arena</legend>
            <label class='renderer-option'>
                <input type='radio' name='battle-renderer' value='classic'>
                <span><strong>Clássico 2D</strong><small>Sprites originais em Phaser</small></span>
            </label>
            <label class='renderer-option'>
                <input type='radio' name='battle-renderer' value='three'>
                <span><strong>Coliseu 3D</strong><small>Câmera top-down em Three.js</small></span>
            </label>
            <p>A batalha será recarregada ao trocar o visual.</p>
        </fieldset>
        <div id='pref-bars'><label><input type='checkbox' class='checkslider'>Mostrar barras de hp e ap (B)</label></div>
        <div id='pref-frames'><label><input type='checkbox' class='checkslider'>Mostrar molduras dos gladiadores (M)</label></div>
        <div id='pref-fps'><label><input type='checkbox' class='checkslider'>Mostrar taxa de atualização da tela (FPS) (F)</label></div>
        <div id='pref-text'><label><input type='checkbox' class='checkslider'>Mostrar valores numéricos de hp, ap e dano (T)</label></div>
        <div id='pref-speech'><label><input type='checkbox' class='checkslider'>Mostrar balões de fala</label></div>
        <div id='volume-container'>
            <h3>Volume do áudio</h3>
            <p>Efeitos sonoros</p>
            <div id='sfx-volume'></div>
            <p>Música</p>
            <div id='music-volume'></div>
        </div>
        <div id='crowd-container'>
            <h3>Número de espectadores</h3>
            <div id='n-crowd'></div>
        </div>
        <div id='quality-container'>
            <h3>Qualidade gráfica (Coliseu 3D)</h3>
            <select id='render-quality'>
                <option value='auto'>Automática</option>
                <option value='high'>Alta</option>
                <option value='medium'>Média</option>
                <option value='low'>Baixa (aparelhos fracos)</option>
            </select>
            <p>Vale para este aparelho; a batalha será recarregada ao trocar.</p>
        </div>
    </div>
    <div id='button-container'><button class='button' id='ok'>OK</button></div>
</div>
</div>`;

export const endMessageTemplate = `
<div id='fog'>
    <div id='end-message' role='dialog' aria-modal='true' aria-label='Fim da batalha'>
        <div id='victory'>VITÓRIA</div>
        <div id='image-container'><div id='image'></div><div id='name-team-container'><span id='name'>{{name}}</span><span id='team'>{{team}}</span></div></div>
        <div id='button-container'>
            <button class='button' id='retornar' title='Retornar para a batalha'>OK</button>
            <button class='button small' id='share' title='Compartilhar' aria-label='Compartilhar'><i class="fas fa-share-alt"></i></button>
        </div>
    </div>
</div>`;

export const shareTemplate = `
<div id='url'>
    <div id='link'><span id='title'>Compartilhar batalha</span><span id='site'>gladcode.dev/play/</span><span id='hash'>{{hash}}</span></div>
    <div id='social'>
        <div id='getlink' class='button' title='Copiar link' role='button' tabindex='0'><i class="fas fa-link"></i></div>
        <a id='twitter' class='button' title='Compartilhar pelo Twitter' href='https://twitter.com/intent/tweet?text=Veja%20esta%20batalha:&url=https://{{link}}&hashtags=gladcode' target='_blank' rel='noopener'><i class="fab fa-twitter"></i></a>
        <a id='facebook' class='button' title='Compartilhar pelo Facebook' href='https://www.facebook.com/sharer/sharer.php?u={{link}}' target='_blank' rel='noopener'><i class="fab fa-facebook-square"></i></a>
        <a id='whatsapp' class='button' title='Compartilhar pelo Whatsapp' href='https://api.whatsapp.com/send?text=Veja esta batalha:%0a{{link}}%0a%23gladcode' target='_blank' rel='noopener'><i class="fab fa-whatsapp"></i></a>
    </div>
    <button id='close' class='button'>OK</button>
</div>`;

export const detailsTemplate = `
<div id='details'>
    <div id='title' class='span-col-2'>
        <i class="fas fa-arrows-alt" title='Mover'></i>
        <span>Detalhes do gladiador</span>
        <i id='minimize' class="fas fa-window-minimize" title='Minimizar' role='button' tabindex='0'></i>
    </div>
    <div id='content'>
        <span>Name:</span><input class='col-3 left' value='{{name}}' readonly>
        <span>LVL:</span><input readonly>
        <span>XP:</span><input readonly>
        <span>X:</span><input readonly>
        <span>HP:</span><input readonly>
        <span>Y:</span><input readonly>
        <span>AP:</span><input readonly>
        <span>STR:</span><input readonly>
        <span>Head:</span><div id='head'><input readonly><span>🡅</span></div>
        <span>AGI:</span><input readonly>
        <span>Action:</span><input readonly>
        <span>INT:</span><input readonly>
        <div id='buffs'>
            <span>Buffs:</span>
            <span>Valor</span>
            <span>Tempo</span>
            <div id='box'>{{{buffs}}}</div>
        </div>
        <span>AS:</span><input readonly>
        <span>CS:</span><input readonly>
        <span>Speed:</span><input readonly>
        <span>Locked:</span><input readonly>
        <div id='items'>
            <span>Items:</span>
            <div id='box'></div>
        </div>
        <div id='code'>
            <span>Comandos:</span>
            <span>Durac.</span>
            <span>Tempo</span>
            <div id='box'></div>
        </div>
    </div>
</div>`;

export const buffRowTemplate = `<span>{{name}}</span><span>0.0</span><span>0.0</span>`;

export const commandRowTemplate = `<div class='row'><div class='name'>{{code}}</div><div class='duration'>0.1</div><div class='time'>{{time}}</div></div>`;

export const itemRowTemplate = `<div class='row'><span>{{potion}}</span></div>`;

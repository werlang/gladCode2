export const trainingPitchTemplate = `
<h3>Transforme seu perfil em uma conta de tutor.</h3>
<img id='school' src='image/training.png' alt=''>
<p>Crie treinos onde você decide o tempo de duração e a quantidade de alunos por batalha.</p>
<p>Gere rankings personalizados e aumente o engajamento.</p>`;

export const createWindowTemplate = `
<div id='fog'>
    <div class='train window' role='dialog' aria-modal='true' aria-label='Criar treino'>
        <div id='title'><h2>Criar treino</h2></div>
        <input id='name' class='input' placeholder='Identificador do treino (nome)' maxlength='50'>
        <textarea id='desc' class='input' placeholder='Breve descrição...' maxlength='512'></textarea>
        <div id='options'>
            <div id='maxtime' class='col'>
                <span>Tempo máximo do treino</span>
                <div id='slider'></div>
            </div>
            <div id='players' class='col'>
                <span>Gladiadores por batalha</span>
                <div id='slider'></div>
            </div>
            <div id='weight' class='col'>
                <span>Peso do treino</span>
                <div id='slider'></div>
            </div>
        </div>
        <div id='button-container'>
            <button id='cancel' class='button'>Cancelar</button>
            <button id='create' class='button'>CRIAR</button>
        </div>
    </div>
</div>`;

export const createdTemplate = `
<div id='fog'>
    <div id='train-message' role='dialog' aria-modal='true'>
        <h2>Treino criado</h2>
        <p>Os mestres de gladiadores podem ingressar no treino</p>
        <div class='column-list'>
            <div class='item' id='qrcode' role='button' tabindex='0'>
                <span>Escaneando o QR code em seus celulares</span>
                <i class='fas fa-qrcode'></i>
            </div>
            <div class='item' id='link' role='button' tabindex='0'>
                <span>Usando o link do treino</span>
                <i class='fas fa-link'></i>
            </div>
            <div class='item' id='manual' role='button' tabindex='0'>
                <span>Digitando o código do treino</span>
                <i class='fas fa-font'></i>
            </div>
        </div>
        <div id='button-container'>
            <button class='button'>FECHAR</button>
        </div>
    </div>
    <div id='big-info'></div>
</div>`;

export const bigQrTemplate = `<div id='close' role='button' tabindex='0' aria-label='Fechar'><i class='icon fas fa-times'></i></div>`;

export const bigLinkTemplate = `
<i id='close' class='icon fas fa-times' role='button' tabindex='0' aria-label='Fechar'></i>
{{{intro}}}
<div class='row'>
    <span class='link {{manualClass}}' title='Copiar'>{{prefix}}<b>{{hash}}</b></span>
</div>
<div id='buttons' class='row'>
    <i id='reduce' class='icon fas fa-minus' title='Reduzir fonte' role='button' tabindex='0'></i>
    <i id='copy' class='icon fas fa-copy' title='Copiar link' role='button' tabindex='0'></i>
    <i id='increase' class='icon fas fa-plus' title='Aumentar fonte' role='button' tabindex='0'></i>
</div>`;

export const manualJoinTemplate = `<p>Para ingressar no treino acesse no menu BATALHA > Treino de equipes > PARTICIPAR DE TREINO, e informe o código abaixo</p>`;

export const chooseGladTemplate = `
<div id='fog'>
    <div id='duel-box' role='dialog' aria-modal='true'>
        <div id='title'>Escolha o gladiador que participará do treino</div>
        <div class='glad-card-container'></div>
        <div id='button-container'>
            <button id='cancel' class='button'>Cancelar</button>
            <button id='select' class='button' disabled>SELECIONAR</button>
        </div>
    </div>
</div>`;

export const listHeadTemplate = `<div class='row head'><div class='cell'>Identificador</div><div class='cell'>Descrição</div><div class='cell'>Mestres</div>{{{actions}}}</div>`;

export const listRowTemplate = `
<div class='row' role='button' tabindex='0'>
    <div class='cell' id='name'>{{name}}</div>
    <div class='cell'>{{description}}</div>
    <div class='cell'>{{masters}}</div>
    {{{actions}}}
</div>`;

export const removeActionTemplate = `<div class='cell actions'><i title='Remover treino' class='remove fas fa-times' role='button' tabindex='0'></i></div>`;

export const roomWindowTemplate = `
<div id='fog'>
    <div class='train window' role='dialog' aria-modal='true'>
        <div id='title'><h2>Treino<span id='train-name' class='edit'>{{name}}</span></h2></div>
        <div id='train-desc' class='edit'>{{description}}</div>
        <h3>Participantes: <span id='count'></span></h3>
        <div class='table'></div>
        <div id='options-container'>
            <div>
                <div id='qr' class='blur'></div>
                <div id='link'>https://gladcode.dev/train/</div>
            </div>
            <div id='time-container'>
                <span>Tempo máximo do treino</span>
                <span id='maxtime'>{{maxtime}}m</span>
            </div>
            <div id='player-container'>
                <span>Batalhas compostas por <span id='players'>{{players}}</span><span id='pl-second'></span> mestres</span>
            </div>
        </div>
        <div id='button-container'>
            <button id='delete' class='button' hidden>REMOVER</button>
            <button id='start' class='button' disabled>INICIAR TREINO</button>
            <button id='close' class='button'>FECHAR</button>
        </div>
    </div>
</div>`;

export const participantsHeadTemplate = `<div class='row head'><div class='cell'>Mestre</div><div class='cell'>Gladiador</div></div>`;

export const participantRowTemplate = `<div class='row {{signed}}'><div class='cell'>{{master}}</div><div class='cell'>{{glad}}</div><div class='kick' title='Expulsar participante' role='button' tabindex='0'><i class='fas fa-times-circle'></i></div></div>`;

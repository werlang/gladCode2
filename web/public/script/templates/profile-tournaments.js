export const createWindowTemplate = `
<div id='fog'>
    <div class='tourn window' role='dialog' aria-modal='true' aria-label='Criar torneio'>
        <div id='title'>
            <h2>Criar torneio</h2>
            <div id='public'>
                <label>Público<input type='checkbox' class='checkslider'></label>
            </div>
        </div>
        <input id='name' class='input' placeholder='Identificador do torneio (nome)' maxlength='50'><input type='password' id='pass' class='input' placeholder='senha para ingressar' maxlength='32'>
        <textarea id='desc' class='input' placeholder='Breve descrição...' maxlength='512'></textarea>
        <div id='options'>
            <div id='maxteams' class='col'>
                <span>Máximo de equipes</span>
                <input class='input' value='50' maxlength='2' inputmode='numeric'>
            </div>
            <div id='maxtime' class='col'>
                <span>Tempo máximo da rodada</span>
                <input class='input' value='23h 59m'>
            </div>
            <div id='flex-team'><label>
                <input type='checkbox' class='checkslider' checked>
                <span>Flex: Mestres podem inscrever mais de um gladiador</span>
            </label></div>
        </div>
        <div id='button-container'>
            <button id='cancel' class='button'>Cancelar</button>
            <button id='create' class='button'>CRIAR</button>
        </div>
    </div>
</div>`;

export const createdTemplate = `
<div id='fog'>
    <div id='tourn-message' class='tourn window' role='dialog' aria-modal='true'>
        <h2>Torneio registrado</h2>
        {{{content}}}
        <div id='button-container'><button class='button ghost'>OK</button></div>
    </div>
</div>`;

export const createdPrivateTemplate = `<p>As equipes deverão entrar com os seguintes dados para se inscrever em seu torneio:</p><div>Identificador: <span>{{name}}</span></div><div>Senha: <span>{{pass}}</span></div>`;

export const createdPublicTemplate = `<p>As equipes deverão procurar seu torneio na lista de torneios públicos, ou entrar com o seguinte identificador para se inscrever em seu torneio:</p><div>Identificador: <span>{{name}}</span></div>`;

export const joinWindowTemplate = `
<div id='fog' class='tourn'>
    <div class='tourn window' role='dialog' aria-modal='true' aria-label='Ingresso em torneio'>
        <h2>Ingresso em torneio</h2>
        <p>Informe os dados do torneio que deseja participar</p>
        <input id='name' class='input' placeholder='Identificador do torneio (nome)'>
        <input id='pass' class='input' placeholder='Senha do torneio' type='password'>
        <div id='button-container'><button id='cancel' class='button'>Cancelar</button><button id='join' class='button'>INGRESSAR</button></div>
    </div>
</div>`;

export const teamsWindowTemplate = `
<div id='title'><h2>Torneio<span>{{name}}</span></h2><div id='word'>Senha<span>{{pass}}</span></div></div>
<p>{{description}}</p>
<h3>Equipes inscritas <span id='count'></span></h3>
<div class='table'></div>
<div id='new-container'><button id='new' class='button'>Nova Equipe</button></div>
<div id='button-container'><button id='delete' class='button' hidden>REMOVER</button><button id='start' class='button' disabled>INICIAR TORNEIO</button><button id='close' class='button'>FECHAR</button></div>`;

export const newTeamTemplate = `<div class='input-button'><input placeholder='Nome da nova equipe' id='name'><button aria-label='Criar equipe'><i class='fas fa-users'></i></button></div>`;

export const teamCreatedTemplate = `
<div id='fog' class='message'>
    <div id='tourn-message' class='tourn window' role='dialog' aria-modal='true'>
        <h2>Equipe <span>{{name}}</span> registrada</h2>
        <p>Os mestres deverão informar a seguinte senha para ingressar nesta equipe:</p>
        <div>Senha: <span>{{word}}</span></div>
        <div id='button-container'><button class='button ghost'>OK</button></div>
    </div>
</div>`;

export const teamsHeadTemplate = `<div class='row head'><div class='cell'>Nome</div><div class='cell'>Gladiadores</div></div>`;

export const teamRowTemplate = `<div class='row {{state}}' role='button' tabindex='0'><div class='cell'>{{name}}</div><div class='cell'>{{glads}}/3</div><div class='kick' title='Expulsar equipe'><i class='fas fa-times-circle'></i></div></div>`;

export const listHeadTemplate = `<div class='row head'><div class='cell'>Identificador</div><div class='cell'>Descrição</div><div class='cell'>Equipes</div><div class='cell'>Flex</div></div>`;

export const listRowTemplate = `<div class='row' role='button' tabindex='0'><div class='cell' id='name'>{{name}}</div><div class='cell'>{{description}}</div><div class='cell'>{{teams}}/{{maxteams}}</div><div class='cell flex'>{{{flex}}}</div></div>`;

export const teamWindowTemplate = `
<div id='fog' class='team'>
    <div class='tourn window' role='dialog' aria-modal='true'>
        <div id='title'><h2>Equipe <span>{{name}}</span></h2><div id='word'>Senha<span></span></div></div>
        <h3>Gladiadores inscritos</h3>
        <div class='duel-picker'></div>
        <div id='button-container'><button id='back' class='button'>VOLTAR</button><button id='join-leave' class='button'>ABANDONAR</button></div>
    </div>
</div>`;

export const addGladTemplate = `<div class='glad-add' role='button' tabindex='0'><div class='image'></div><div class='info'>Clique para inscrever um novo gladiador</div></div>`;

export const chooseGladTemplate = `
<div id='fog' class='glads'>
    <div id='duel-box' role='dialog' aria-modal='true'>
        <div id='title'>Escolha o gladiador que irá lhe representar no torneio</div>
        <div class='duel-picker'></div>
        <div id='show-code'><label><input type='checkbox' class='checkslider'>Permitir que minha equipe veja o código do gladiador</label></div>
        <div id='button-container'><button id='cancel' class='button ghost block'>Cancelar</button><button id='choose' class='button primary block' disabled>ESCOLHER</button></div>
    </div>
</div>`;

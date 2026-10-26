export const finalRankingTemplate = `
<h1>Classificação final</h1>
<h3>O torneio <span id='tourn-name'>{{name}}</span> chegou ao fim e esta foi a classificação obtida pelas equipes</h3>
<div id='ranking-container'>{{{rows}}}</div>
<div id='button-container'><button id='back-round' class='button'>RODADA ANTERIOR</button></div>`;

export const rankingRowTemplate = `<div class='team {{medal}}'><div class='ordinal'>{{{ordinal}}}</div><div class='name'>{{name}}</div></div>`;

export const medalTemplate = `<img class='icon' src='icon/{{medal}}-medal.png' alt='{{place}}º'>`;

export const roundTemplate = `
<h1>Torneio <span id='tourn-name'>{{name}}</span></h1>
<h3 id='tourn-desc'>{{description}}</h3>
<div id='group-container'>{{{groups}}}</div>
<div class='timeleft' title='Tempo máximo restante até o fim da rodada'>{{{digits}}}</div>
<div id='button-container'>
    <button class='arrow' id='back-round' title='Rodada anterior' disabled>
        <i class='fas fa-chevron-left'></i>
    </button>
    <button id='prepare' class='button' disabled>PREPARAR-SE</button>
    <button class='arrow' id='next-round' title='Próxima rodada' disabled>
        <i class='fas fa-chevron-right'></i>
    </button>
</div>`;

export const groupTemplate = `
<div class='group'>
    <div class='head'>
        <div class='title'>Grupo {{number}} - <span>Rodada {{round}}</span></div>
        <div class='icons'>
            <div class='glad' title='Quantos gladiadores da equipe ainda restam'><img src='icon/gladcode_icon.png' alt=''></div>
            <div class='time' title='Quantos segundos o gladiador da equipe sobreviveu'><img src='icon/clock-icon.png' alt=''></div>
        </div>
    </div>
    <div class='teams-container'>{{{teams}}}</div>
    <div class='foot'><button class='button' disabled>Aguardando <span class='number'></span> mestre<span class='plural'>s</span></button></div>
</div>`;

export const teamTemplate = `
<div class='team {{mine}}'>
    <div class='icon'><i class='far fa-hourglass'></i></div>
    <div class='name'>{{name}}</div>
    <div class='info'>
        <div class='glad'>
            <div class='g-bar'></div>
            <div class='g-bar'></div>
            <div class='g-bar'></div>
        </div>
        <div class='time'>-</div>
    </div>
</div>`;

export const chooseGladTemplate = `
<div id='fog'>
    <div class='float-box'>
        <div id='text'>Olá <span class='highlight'>{{nick}}</span>, você precisa escolher um gladiador para representar a equipe <span class='highlight'>{{team}}</span> na rodada <span class='highlight'>{{round}}</span> do torneio</div>
        <div class='glad-card-container'></div>
        <div id='button-container'><button id='cancel' class='button'>AINDA NÃO</button><button id='choose' class='button' disabled>ESCOLHER</button></div>
    </div>
</div>`;

export const reloadButtonTemplate = `<span>VISUALIZAR BATALHA</span><span class='reload' title='Executar batalha novamente'>🔄️</span>`;

export const winnerIconTemplate = `<img class='win' src='icon/winner-icon.png' alt='Vencedor'>`;

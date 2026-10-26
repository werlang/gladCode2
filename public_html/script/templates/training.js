export const gladBoxTemplate = `
<div id='fog' class='black'>
    <div class='glad-box'>
        <div id='title'>Escolha o gladiador que participará do treino</div>
        <div class='glad-card-container'></div>
        <div id='button-container'>
            <button id='select' class='button' disabled>SELECIONAR</button>
        </div>
    </div>
</div>`;

export const finalRankingTemplate = `
<h1>Classificação final</h1>
<h3>O treino <span id='tourn-name'>{{name}}</span> chegou ao fim e esta foi a classificação obtida pelos participantes</h3>
<div id='ranking-container'>
    <div class='head'>
        <div class='score' title='Pontuação obtida no treino'><i class='fas fa-star'></i></div>
        <div class='time' title='Tempo médio sobrevivido'><i class='fas fa-clock'></i></div>
    </div>
    {{{rows}}}
</div>
<div id='button-container'><button id='back-round' class='button'>RODADA ANTERIOR</button></div>`;

export const rankingRowTemplate = `
<div class='team {{medal}}'>
    <div class='ordinal'>{{{ordinal}}}</div>
    <div class='name'>{{master}} - {{glad}}</div>
    <div class='score'>{{score}}</div>
    <div class='score'>{{time}}</div>
</div>`;

export const medalTemplate = `<img class='icon' src='icon/{{medal}}-medal.png' alt='{{place}}º'>`;

export const roundTemplate = `
<h1>Treino <span id='tourn-name'>{{name}}</span></h1>
<h3 id='tourn-desc'>{{description}}</h3>
<div id='group-container'>{{{groups}}}</div>
<div id='time-container'>
    <div class='timeleft round' title='Tempo máximo restante até o fim da rodada'>
        <div class='title'>FIM DA RODADA</div>
        {{{roundDigits}}}
    </div>
    <div class='timeleft train' title='Tempo máximo restante até o fim do treino'>
        <div class='title'>FIM DO TREINO</div>
        {{{trainDigits}}}
    </div>
</div>
<div id='button-container' class='train'>
    <button class='arrow' id='back-round' title='Rodada anterior' disabled>
        <i class='fas fa-chevron-left'></i>
    </button>
    <button id='prepare' class='button' disabled>ENCERRAR RODADA</button>
    <button class='arrow' id='next-round' title='Próxima rodada' disabled>
        <i class='fas fa-chevron-right'></i>
    </button>
</div>`;

export const groupTemplate = `
<div class='group'>
    <div class='head'>
        <div class='icons'>
            <div title='Pontuação total até o momento'><i class='fas fa-trophy'></i></div>
        </div>
        <div class='title'>Grupo {{number}} - <span>Rodada {{round}}</span></div>
        <div class='icons'>
            <div class='glad' title='Pontuação da última rodada'><i class='fas fa-star'></i></div>
            <div class='time' title='Quantos segundos o gladiador sobreviveu'><i class='fas fa-clock'></i></div>
        </div>
    </div>
    <div class='teams-container'>{{{teams}}}</div>
    <div class='foot'><button class='button' disabled></button><div class='rerun hidden' title='Executar simulação'><i class='fas fa-redo'></i></div></div>
</div>`;

export const teamTemplate = `
<div class='team {{mine}}'>
    <div class='score'>{{score}}</div>
    <div class='name'>{{master}} - {{glad}}</div>
    <div class='info'>
        <div class='glad'>0</div>
        <div class='time'>-</div>
    </div>
</div>`;

export const roundTimeTemplate = `
<span>Quanto tempo até o início das batalhas da rodada {{round}}?</span>
<div id='slider'></div>`;

export const winnerIconTemplate = `<img class='win' src='icon/winner-icon.png' alt='Vencedor'>`;

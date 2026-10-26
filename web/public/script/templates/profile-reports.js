export const battlesHeadTemplate = `<div class='row head'><div class='cell'>Gladiador</div><div class='cell reward'>Renome</div><div class='cell time'>Data</div></div>`;

export const battlesPlaceholderTemplate = `
<div class='row dummy'>
    <div class='cell favorite'><span class='dummy-text'><i class='far fa-star'></i></span></div>
    <div class='cell glad'><span class='dummy-text'>GLADIATOR</span></div>
    <div class='cell reward'><span class='dummy-text'>+00.0</span></div>
    <div class='cell time'><span class='dummy-text'>0 TEMPO</span></div>
</div>`;

export const battleRowTemplate = `
<div class='row {{unread}}'>
    <div class='cell favorite' title='{{starTitle}}' role='button' tabindex='0'><i class='{{starClass}} fa-star'></i></div>
    <div class='cell glad'>{{glad}}</div>
    <div class='cell reward {{rewardClass}}'>{{reward}}</div>
    <div class='cell time' title='{{date}}'>{{elapsed}}</div>
    {{{playback}}}
</div>`;

export const battlesEmptyRowTemplate = `<div class='row'><div class='cell favorite'></div><div class='cell glad'></div><div class='cell reward'></div><div class='cell time'></div></div>`;

export const playbackTemplate = `
<div class='playback' title='Visualizar batalha'>
    <a target='_blank' href='play/{{hash}}'><img src='icon/eye.png' alt='Visualizar batalha'></a>
</div>`;

export const favoritesHeadTemplate = `<div class='row head'><div class='cell'>Gladiador</div><div class='cell comment'>Comentário</div><div class='cell time'>Data</div></div>`;

export const favoritesPlaceholderTemplate = `
<div class='row dummy'>
    <div class='cell favorite'><span class='dummy-text'><i class='fas fa-star'></i></span></div>
    <div class='cell glad'><span class='dummy-text'>GLADIADOR</span></div>
    <div class='cell comment'><span class='dummy-text'>COMENTÁRIO DE EXEMPLO</span></div>
    <div class='cell time'><span class='dummy-text'>0 TEMPO</span></div>
</div>`;

export const favoriteRowTemplate = `
<div class='row'>
    <div class='cell favorite' title='Tirar dos favoritos' role='button' tabindex='0'><i class='fas fa-star'></i></div>
    <div class='cell glad'>{{glad}}</div>
    <div class='cell comment'>{{comment}}</div>
    <div class='cell time' title='{{date}}'>{{elapsed}}</div>
    {{{playback}}}
</div>`;

export const favoritesEmptyRowTemplate = `<div class='row'><div class='cell favorite'></div><div class='cell glad'></div><div class='cell comment'></div><div class='cell time'></div></div>`;

export const duelsHeadTemplate = `<div class='row head'><div class='cell'>Gladiador</div><div class='cell'>Oponente</div><div class='cell'>Mestre</div><div class='cell time'>Data</div></div>`;

export const duelsPlaceholderTemplate = `
<div class='row dummy'>
    <div class='cell glad'><span class='dummy-text'>GLADIADOR</span></div>
    <div class='cell enemy'><span class='dummy-text'>GLADIADOR</span></div>
    <div class='cell'><span class='dummy-text'>USUÁRIO</span></div>
    <div class='cell time'><span class='dummy-text'>0 TEMPO</span></div>
</div>`;

export const duelRowTemplate = `
<div class='row {{unread}}'>
    <div class='cell glad {{mineClass}}'>{{mine}}</div>
    <div class='cell enemy {{enemyClass}}'>{{enemy}}</div>
    <div class='cell'>{{user}}</div>
    <div class='cell time' title='{{date}}'>{{elapsed}}</div>
    {{{tail}}}
</div>`;

export const cancelDuelTemplate = `<div class='remove' title='Cancelar desafio' role='button' tabindex='0'>X</div>`;

export const duelsEmptyRowTemplate = `<div class='row'><div class='cell glad'></div><div class='cell enemy'></div><div class='cell'></div><div class='cell time'></div></div>`;

export const noRowsTemplate = `<div class='row'><div class='cell'><h3>{{message}}</h3></div></div>`;

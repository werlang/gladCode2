export const emptySlotTemplate = `
<div class='slot empty'>
    <div class='top'><div class='empty'></div></div>
    <div class='mid'><span class='name'>Nenhum item neste espaço</span></div>
    <div class='bot' title='Tempo restante'><i class='fas fa-clock'></i><span class='time'></span></div>
</div>`;

export const lockedSlotTemplate = `
<div class='slot disabled'>
    <div class='top'><div class='empty'></div></div>
    <div class='mid'><span>Atinja o nível {{level}} para desbloquear este item</span></div>
</div>`;

export const filledSlotTemplate = `
<div class='slot filled' role='button' tabindex='0'>
    <div class='top'><img src='{{icon}}' alt=''><div class='remove' role='button' tabindex='0' title='Cancelar encomenda'><i class='fas fa-trash-alt'></i></div></div>
    <div class='mid'><span class='name'>{{name}}</span></div>
    <div class='bot'><span class='time'></span><i class='fas fa-clock'></i></div>
</div>`;

export const shopTemplate = `
<div id='fog'>
    <div id='browse-potions' role='dialog' aria-modal='true' aria-label='Poções'>
        <h2>Estes são os produtos que você pode encomendar:</h2>
        <div id='shop-container'>{{{items}}}</div>
        <button id='close'>CANCELAR</button>
    </div>
</div>`;

export const shopItemTemplate = `
<div class='slot'>
    <div class='top'><img src='{{icon}}' alt=''></div>
    <div class='mid'>
        <div><i class='fas fa-arrow-alt-circle-up'></i><span class='lvl'>{{level}}</span></div>
        <div><i class='fas fa-coins silver'></i><span class='price'>{{price}}</span></div>
    </div>
    <div class='bot'>
        <span class='name'>{{name}}</span>
        <div class='button-container'>
            <span class='info' title='Informações' role='button' tabindex='0'><i class='fas fa-question-circle'></i></span>
            <span class='buy' title='Encomendar produto' role='button' tabindex='0'><i class='fas fa-thumbs-up'></i></span>
        </div>
    </div>
</div>`;

export const potionInfoTemplate = `
<h3><b>{{name}}</b></h3>
<div>{{{description}}}</div>
<div id='description-info'>
    <div class='col'>
        <span class='small'>Nível necessário:</span>
        <span><i class='fas fa-arrow-alt-circle-up'></i><b>{{level}}</b></span>
    </div>
    <div class='col'>
        <span>Custo:</span>
        <span><b>{{price}}</b><i class='fas fa-coins silver'></i></span>
    </div>
</div>`;

export const upgradeTemplate = `
<h2>Melhorar o apotecário?</h2>
<div id='up-table'>
    <div class='row'>
        <div>Nível</div>
        <div>{{level}}</div>
        <div class='icon'><i class='fas fa-angle-double-right'></i></div>
        <div class='new'>{{nextLevel}}</div>
    </div>
    <div class='row'>
        <div>Duração</div>
        <div>{{hours}} horas</div>
        <div class='icon'><i class='fas fa-angle-double-right'></i></div>
        <div class='new'>{{nextHours}} horas</div>
    </div>
    <div class='row cost {{costClass}}'>
        <div><b>Custo</b></div>
        <div><b><span>{{price}}</span></b><i class='fas fa-coins silver'></i></div>
    </div>
</div>`;

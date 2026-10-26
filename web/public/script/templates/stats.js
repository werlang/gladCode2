export const abilityRowTemplate = `
<tr>
    <td>{{name}}</td>
    <td>{{use}}%</td>
    <td>{{average}}</td>
    <td>{{win}}%</td>
</tr>`;

export const emptyAbilitiesTemplate = `<tr><td colspan=4>Nenhuma batalha encontrada</td></tr>`;

export const attributeCellsTemplate = `<td>{{average}}</td><td>{{winner}}</td>`;

export const potionCellTemplate = `
<td><div>
    <span class='up' title='Percentual de batalhas que a poção foi utilizada'>{{use}}%</span>/
    <span class='down' title='Percentual de batalhas que o gladiador que usou a poção venceu'>{{win}}%</span>
</div></td>`;

export const potionRowTemplate = `<tr><td>{{name}}</td>{{{cells}}}</tr>`;

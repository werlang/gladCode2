export const notFoundTemplate = `<h1>Função <i>{{name}}</i> não encontrada.</h1><p><a href='docs'>Voltar para documentação</a></p>`;

export const noVersionTemplate = `<h1>A função <i>{{name}}</i> não existe para esta linguagem.</h1><p><a href='docs'>Voltar para documentação</a></p>`;

export const voidParamTemplate = `<p>{{{description}}}</p>`;

export const paramTemplate = `<p class='syntax'>{{name}}</p><p>{{{description}}}</p>`;

export const seeAlsoRowTemplate = `
<tr>
    <td><a href='function/{{link}}'>{{name}}</a></td>
    <td>{{{brief}}}</td>
</tr>`;

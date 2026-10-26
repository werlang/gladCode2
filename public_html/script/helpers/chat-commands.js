/**
 * A chat table: rows of cells, each with markup and optional classes.
 *
 * @typedef {Array<Array<{ data: string|number, class?: string }>>} ChatTable
 */

/** @type {ChatTable} The /help table. */
export const HELP_TABLE = [
    [{ data: 'COMANDOS DO CHAT', class: 'head' }],
    [{ data: 'Comando', class: 'head half' }, { data: 'Descrição', class: 'head' }],
    [{ data: '&lt;&gt;', class: 'half' }, { data: 'Abre janela para inserção de código' }],
    [{ data: '!@', class: 'half' }, { data: 'Janela de upload de imagens' }],
    [{ data: '/show rooms', class: 'half' }, { data: 'Mostra todas salas públicas' }],
    [{ data: '/show users', class: 'half' }, { data: 'Mostra todos membros da sala' }],
    [{ data: '/list', class: 'half' }, { data: 'O mesmo que /show<br>Ex: /list rooms' }],
    [{ data: '/join SALA', class: 'half' }, { data: 'Entra na SALA (caso exista)<br>Ex: /join gladcode' }],
    [{ data: '/create SALA [-pvt] [-d DESC]', class: 'half' }, { data: 'Cria a SALA (caso não exista)<br>-pvt => (Opcional) Torna a sala privada<br>-d DESC => (Opcional) Insere uma descrição para a sala<br>Ex: /create sala teste -d descrição da sala -pvt' }],
    [{ data: '/leave SALA', class: 'half' }, { data: 'Sai da SALA<br>Ex: /leave gladcode' }],
    [{ data: '/leave', class: 'half' }, { data: 'Sai da sala atualmente aberta' }],
    [{ data: '/claim', class: 'half' }, { data: 'Torna-se o líder da sala aberta, caso os líderes estejam há muito inativos' }],
    [{ data: '/promote MEMBRO', class: 'half' }, { data: 'Torna o MEMBRO um líder da sala aberta<br>Ex: /promote fulaninho' }],
    [{ data: '/kick MEMBRO [-r SALA]', class: 'half' }, { data: 'Remove MEMBRO da SALA (Precisa ser Líder). Se estiver dentro de uma sala, não é necessário o argumento SALA.<br>Ex: /kick fulaninho' }],
    [{ data: '/ban MEMBRO', class: 'half' }, { data: 'Remove permissão do MEMBRO de ver mensagens da sala (Precisa ser Líder)<br>Ex: /ban fulaninho' }],
    [{ data: '/unban MEMBRO', class: 'half' }, { data: 'Devolve a permissão do MEMBRO de participar normalmente da sala (Precisa ser Líder)<br>Ex: /unban fulaninho' }],
    [{ data: '/edit [-r SALA] [-n NOME] [-d DESC] [-pvt | -pub]', class: 'half' }, { data: 'Edita informações da sala.<br>-r SALA => (Opcional) Indica qual sala será editada. Quando está dentro de uma sala, não é necessário.<br>-n NOME => (Opcional) Altera o nome da sala<br>-d DESC => (Opcional) Altera a descrição da sala<br>-pvt => (Opcional) Torna a sala privada<br>-pub => (Opcional) Torna a sala pública<br>Ex: /edit -n novo nome -d descrição da sala -pub' }],
];

/**
 * The table answering `/show rooms` or `/show users`.
 *
 * @param {{ room?: object[], user?: object[] }} data SEND answer with status `LIST`.
 * @returns {ChatTable|null}
 */
function listTable(data) {
    if (data.room) {
        return [
            [{ data: 'LISTAGEM DE SALAS PÚBLICAS', class: 'head' }],
            [{ data: 'Nome', class: 'head half' }, { data: '#', class: 'head small' }, { data: 'Descrição', class: 'head' }],
            ...data.room.map(room => [{ data: room.name, class: 'half' }, { data: room.members, class: 'small' }, { data: room.description }]),
        ];
    }
    if (data.user) {
        return [
            [{ data: 'LISTAGEM DE PARTICIPANTES DA SALA', class: 'head' }],
            [{ data: 'Autoridade', class: 'head half' }, { data: 'Nome', class: 'head' }, { data: 'Na sala desde', class: 'head half' }, { data: 'Último login', class: 'head half' }],
            ...data.user.map(user => [{ data: user.privilege, class: 'half' }, { data: user.apelido }, { data: user.since, class: 'half' }, { data: user.login, class: 'half' }]),
            [{ data: `Total de ${data.user.length} participantes` }],
        ];
    }
    return null;
}

/**
 * What the chat should do after sending a message or command.
 *
 * @param {Record<string, any>} data SEND answer.
 * @returns {{ toast?: [string, 'error'|'info'|'success'], table?: ChatTable,
 *   rooms?: { insert?: string, remove?: string } }} A toast to show, a table
 *   to print in the chat and how the room list changed.
 */
export function sendFeedback(data) {
    const { status, name, target, command, time } = data;
    switch (status) {
        case 'UNKNOWN': return { toast: ['Comando desconhecido', 'error'] };
        case 'LEFT': return { toast: [`Você saiu da sala ${name}`, 'success'], rooms: { remove: name } };
        case 'JOINED': return { toast: [`Bem-vindo à sala ${name}`, 'success'], rooms: { insert: name } };
        case 'CREATED': return { toast: [`Sala ${name} criada`, 'success'], rooms: { insert: name } };
        case 'EDITED': return { toast: ['Sala atualizada', 'success'], rooms: {} };
        case 'NOTFOUND': return { toast: ['Sala não encontrada', 'error'] };
        case 'NOPERMISSION': return { toast: ['Você não possui permissão para realizar esta ação', 'error'] };
        case 'PROMOTED': return { toast: [`O usuário ${target} foi promovido`, 'success'] };
        case 'MAXPROMOTION': return { toast: [`O usuário ${target} não pode mais ser promovido`, 'info'] };
        case 'NOTARGET': return command === 'ban' || command === 'promote'
            ? { toast: [`O usuário ${target} não foi encontrado na sala`, 'error'] }
            : { toast: [`O usuário ${target} não está banido`, 'info'] };
        case 'ALREADYBANNED': return { toast: [`${target} já está banido da sala`, 'error'] };
        case 'BANNED': return { toast: ['Você foi banido desta sala e não pode enviar mensagens', 'info'] };
        case 'SILENCED': return { toast: [`Você foi silenciado até ${time}`, 'info'] };
        case 'NOROOM': return { toast: ['Entre em uma sala antes', 'info'] };
        case 'EXISTS': return { toast: [`A sala ${name} já existe`, 'info'] };
        case 'ACTIVE': return { toast: ['Os líderes desta sala estão ativos', 'info'] };
        case 'RESTRICTED': return { toast: ['Você possui restrições a esta sala e não poderá assumir seu comando', 'error'] };
        case 'LIST': {
            const table = listTable(data);
            return table ? { table } : {};
        }
        default: return {};
    }
}

/** Matches a web address in message text. */
const URL_PATTERN = /((?:http(?:s)?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&//=,;]*))/i;

/**
 * Dresses a message's escaped text: `<code>` becomes a code block, `<img
 * src='...'>` and data URLs become images.
 *
 * @param {string} escaped Message as sent by the server (HTML-escaped).
 * @returns {{ html: string, url: string|null }} The markup, and a plain web
 *   address to turn into a link or an image once it is known which it is.
 */
export function dressMessage(escaped) {
    const html = escaped.replace(/&lt;code&gt;([\w\W]*?)&lt;\/code&gt;/g, "<pre class='language-c'><code>$1</code></pre>");

    const imageTag = /&lt;img src=(?:&#0?39;|')([\w\W]+?)(?:&#0?39;|')&gt;/g;
    if (imageTag.test(html)) {
        return { html: html.replace(imageTag, "<a href='$1' target='_blank' rel='noopener'><img class='chat-img' src='$1' alt=''></a>"), url: null };
    }
    const dataImage = /(data:image\/(?:jpeg|png);base64[\w\W]+)/;
    if (dataImage.test(html)) {
        return { html: html.replace(dataImage, "<img class='chat-img' src='$1' alt=''>"), url: null };
    }
    const url = html.includes('<span class="emoji') ? null : html.match(URL_PATTERN)?.[0] ?? null;
    return { html, url };
}

/**
 * Turns the first web address in a message into a link, or an image when it is one.
 *
 * @param {string} html Dressed message.
 * @param {string} url The address.
 * @param {boolean} isImage Whether it loads as an image.
 * @returns {string}
 */
export function linkMessage(html, url, isImage) {
    if (isImage) {
        return html.replace(url, `<a href='${url}' target='_blank' rel='noopener'><img class='chat-img' src='${url}' alt=''></a>`);
    }
    const href = /^https?:\/\//.test(url) ? url : `//${url}`;
    return html.replace(url, `<a href='${href}' target='_blank' rel='noopener'>${url}</a>`);
}

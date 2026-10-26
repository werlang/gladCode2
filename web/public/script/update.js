import { showDialog, showMessage } from './components/dialog.js';
import { createToast } from './components/toast.js';
import { ReleaseModel } from './models/release.js';

const panel = document.querySelector('#content-box');
const send = panel.querySelector('#send');
/** Version masters' gladiators fall to when their client crashed in a ranked battle. */
const BROKEN = 'broken';

/**
 * One line of the gladiators-by-version list, with a button that carries an older
 * version's gladiators forward.
 *
 * @param {{ version: string, count: number }} entry
 * @param {string} current The running version.
 * @returns {HTMLElement}
 */
function versionRow({ version, count }, current) {
    const row = document.createElement('div');
    row.className = version === current ? 'row current' : 'row';
    const name = document.createElement('span');
    name.textContent = version;
    const total = document.createElement('span');
    total.textContent = `${count} gladiadores`;
    row.append(name, total);

    if (version !== current && version !== BROKEN) {
        const button = document.createElement('button');
        button.className = 'button';
        button.textContent = `Atualizar para ${current}`;
        button.addEventListener('click', async () => {
            const question = `Mover os gladiadores da versão ${version} para a ${current}? Faça isso só quando a nova versão não muda o que o código deles faz.`;
            if (await showDialog(question, ['Sim', 'Não']) !== 'Sim') return;
            const { moved } = await ReleaseModel.carryForward(version);
            createToast(`${moved} gladiadores atualizados`, 'success');
            load();
        });
        row.append(button);
    }
    return row;
}

/** Shows the running version and the gladiators of each version. */
async function load() {
    let release;
    try {
        release = await ReleaseModel.current();
    }
    catch (error) {
        if (error.code !== 'ADMIN_ONLY' && error.code !== 'NOT_SIGNED_IN') throw error;
        await showMessage('Somente administradores podem acessar esta página');
        location.href = '/';
        return;
    }
    panel.querySelector('#version #current').textContent = release.version;
    panel.querySelector('#gladiators .list').replaceChildren(...release.gladiators.map(entry => versionRow(entry, release.version)));
    send.disabled = release.announcing;
}

/** E-mails the release to the users who asked for update news. */
async function announce() {
    // the summary is the administrator's own e-mail body, markup included
    const changes = panel.querySelector('#changes textarea').value.trim().replace(/\r?\n/g, '<br/>');
    const postLink = panel.querySelector('#postlink input').value.trim();
    if (!changes || !postLink.startsWith('https://')) {
        showMessage('Preencha o sumário e o link (https) do post');
        return;
    }
    if (await showDialog('Enviar o anúncio da versão por e-mail?', ['Sim', 'Não']) !== 'Sim') return;

    send.disabled = true;
    try {
        const { recipients } = await ReleaseModel.announce({ changes, postLink });
        showMessage(recipients ? `Enviando o anúncio para ${recipients} usuários` : 'Todos já receberam o anúncio desta versão');
    }
    catch (error) {
        send.disabled = false;
        if (error.code === 'ANNOUNCEMENT_RUNNING') showMessage('O anúncio ainda está sendo enviado');
        else if (error.code === 'INVALID_POST_LINK') showMessage('Link do post inválido');
        else throw error;
    }
}

send.addEventListener('click', announce);
load();

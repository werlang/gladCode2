import { showMessage } from './components/dialog.js';
import { nextVersion } from './helpers/version.js';
import { ReleaseModel } from './models/release.js';

const panel = document.querySelector('#content-box');
const newVersion = panel.querySelector('#version #new');
let current = [];

/** Shows the current version and proposes the next patch. */
async function load() {
    current = await ReleaseModel.current();
    panel.querySelector('#version #current').textContent = current.join('.');
    newVersion.value = nextVersion(current, 2);
}

/** Publishes the version, then announces it by e-mail. */
async function publish(button) {
    button.disabled = true;
    const version = newVersion.value;
    const answer = await ReleaseModel.publish({
        version,
        keepup: panel.querySelector('#keep-updated input').checked,
        pass: panel.querySelector('#pass-div input').value,
    });
    if (answer === 'WRONGPASS') {
        showMessage('Senha incorreta');
        button.disabled = false;
        return;
    }

    showMessage('Mensagem enviada. Aguarde. Não clique mais de uma vez antes de dar status 500 no console.');
    // the summary is the administrator's own e-mail body, markup included
    const summary = panel.querySelector('#changes textarea').value.replace(/\r?\n/g, '<br/>');
    const sent = await ReleaseModel.announce({ version, summary, postlink: panel.querySelector('#postlink input').value })
        .catch(() => null);
    showMessage(sent && typeof sent === 'object' ? 'Versão do sistema atualizada' : 'Erro');
    button.disabled = false;
}

panel.querySelector('#version #type select').addEventListener('change', event => {
    newVersion.value = nextVersion(current, event.currentTarget.selectedIndex);
});
panel.querySelector('#send').addEventListener('click', event => publish(event.currentTarget));
load();

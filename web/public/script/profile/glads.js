import { showDialog } from '../components/dialog.js';
import { loadGladCards } from '../components/glad-card.js';
import { createElement, decodeHtml, renderTemplate } from '../helpers/html.js';
import { fadeOut } from '../helpers/animate.js';
import { GladiatorModel } from '../models/gladiator.js';
import { profile } from './session.js';
import { codeBlockTemplate, codeBoxTemplate, gladAddTemplate } from '../templates/profile.js';

/** Gladiators every master can have, one more every `PER_LEVELS` levels, up to `MAX_GLADS`. */
const FIRST_GLADS = 1;
const PER_LEVELS = 10;
const MAX_GLADS = 6;

/**
 * How many gladiators a master of a level can have.
 *
 * @param {number|string} level Master level.
 * @returns {number}
 */
export function gladiatorLimit(level) {
    return Math.min(MAX_GLADS, FIRST_GLADS + Math.floor(parseInt(level, 10) / PER_LEVELS));
}

/**
 * Shows a gladiator's code (or blocks) with a button to open it in the editor.
 *
 * @param {Record<string, any>} glad Gladiator with HTML-escaped code.
 */
function showCode(glad) {
    const blocks = Boolean(glad.blocks);
    const language = glad.code.includes('def loop():') ? 'python' : 'c';
    const fog = createElement(renderTemplate(codeBoxTemplate, {
        content: blocks ? "<div id='code-ws'></div>" : renderTemplate(codeBlockTemplate, { language, code: glad.code }),
    }));
    document.body.append(fog);

    if (blocks) {
        const workspace = Blockly.inject('code-ws', { scrollbars: true, readOnly: true });
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(decodeHtml(glad.blocks)), workspace);
    }
    else {
        Prism.highlightElement(fog.querySelector('code'));
    }

    const close = () => fog.remove();
    fog.addEventListener('click', close);
    fog.querySelector('#code-box').addEventListener('click', event => event.stopPropagation());
    fog.querySelector('.close').addEventListener('click', close);
    fog.querySelector('#editor').addEventListener('click', () => {
        window.open(`glad-${glad.id}`);
        close();
    });
}

/**
 * The GLADIADORES tab: the user's gladiators, their code, deleting them and
 * the free places to create more.
 */
export class GladsTab {
    #container = document.querySelector('#glads-container .glad-card-container');

    /** Draws the gladiators and the free places. */
    async show() {
        const glads = await GladiatorModel.list();
        this.#container.replaceChildren();
        if (glads.length) document.querySelector('#menu #battle').classList.remove('disabled');

        const cards = await loadGladCards(this.#container, {
            glads,
            code: true,
            remove: true,
            onCode: glad => (glad.oldversion ? this.#askUpdate(glad) : showCode(glad)),
        });
        cards.forEach((card, index) => {
            const glad = glads[index];
            if (glad.oldversion) card.querySelector('.code .button').textContent = "{'atualizar'}";
            card.querySelector('.delete').addEventListener('click', () => this.#askDelete(card, glad));
        });

        this.#drawFreePlaces(glads.length);
    }

    /**
     * @param {number} count Gladiators the user has.
     */
    #drawFreePlaces(count) {
        this.#container.querySelectorAll('.glad-add').forEach(place => place.remove());
        const limit = gladiatorLimit(profile.user.lvl);
        for (let index = count; index < MAX_GLADS; index++) {
            const open = index < limit;
            const place = createElement(renderTemplate(gladAddTemplate, {
                state: open ? '' : 'inactive',
                text: open
                    ? 'Clique para criar um novo gladiador'
                    : `Atinja o nível ${(index - FIRST_GLADS + 1) * PER_LEVELS} de mestre para desbloquear este gladiador`,
            }));
            if (open) place.addEventListener('click', () => {
                location.href = 'newglad';
            });
            this.#container.append(place);
        }
    }

    /** @param {Record<string, any>} glad Outdated gladiator. */
    async #askUpdate(glad) {
        const answer = await showDialog(`A simulação da gladCode foi atualizada, e o código do gladiador <span class='highlight'>${glad.name}</span> precisa ser testado e salvo novamente para que ele volte a participar das batalhas. Clique em <span class='highlight'>OK</span> para abrir o editor`, ['Cancelar', 'OK']);
        if (answer === 'OK') window.open(`glad-${glad.id}`);
    }

    /**
     * @param {HTMLElement} card Gladiator card.
     * @param {Record<string, any>} glad Gladiator.
     */
    async #askDelete(card, glad) {
        const answer = await showDialog(`Deseja excluir o gladiador <span class='highlight'>${glad.name}</span>?`, ['Sim', 'Não']);
        if (answer !== 'Sim') return;
        await fadeOut(card);
        card.remove();
        await GladiatorModel.remove(glad.id);
        this.#drawFreePlaces(this.#container.querySelectorAll('.glad-preview').length);
    }
}

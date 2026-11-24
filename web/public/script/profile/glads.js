import { showDialog } from '../components/dialog.js';
import { GladiatorCard, emptyGladiatorCard } from '../components/gladiator-card.js';
import { PageHeader } from '../components/page-header.js';
import { SegmentedControl } from '../components/segmented-control.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { GladiatorModel } from '../models/gladiator.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import { pageHeaderTemplate } from '../templates/page-header.js';
import { gladsShellTemplate } from '../templates/profile-glads.js';
import { codeBlockTemplate, codeBoxTemplate } from '../templates/profile.js';
import { profile } from './session.js';

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
 * @param {Record<string, any>} glad Gladiator; the template escapes its code.
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
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(glad.blocks), workspace);
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
 * The Gladiadores section: filterable game cards, free slots and the editor/code/delete actions.
 */
export class GladsTab {
    #root = document.querySelector('#glads-container');
    #built = false;
    #header = null;
    #filter = null;
    #grid = null;
    #empty = null;
    #glads = [];
    #filterValue = 'all';
    #signal = null;

    /** Builds the section once. */
    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(gladsShellTemplate);
        const headerElement = createElement(pageHeaderTemplate);
        this.#root.querySelector('#glads-header').append(headerElement);
        this.#header = new PageHeader({ element: headerElement });
        this.#header.set({ title: 'Gladiadores', subtitle: 'Cada gladiador é uma peça sua na arena.' });
        this.#filter = new SegmentedControl({ label: 'Filtrar gladiadores' });
        this.#filter.listen('change', ({ value }) => {
            this.#filterValue = value;
            this.#render();
        });
        const add = createElement("<a class='button primary' href='/newglad'><i class='fa-solid fa-plus' aria-hidden='true'></i> Novo gladiador</a>");
        this.#header.setActions([this.#filter.element, add]);
        this.#grid = this.#root.querySelector('#glads-grid');
        this.#empty = this.#root.querySelector('#glads-empty');
        this.#built = true;
    }

    /**
     * Opens the section.
     *
     * @param {object} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    async show(route = {}, { signal } = {}) {
        if (signal?.aborted) return;
        this.#build();
        this.#signal = signal;
        const glads = await settleRequest(() => GladiatorModel.list({ signal }), signal);
        if (!glads || signal?.aborted) return;
        this.#glads = glads;
        const attention = this.#glads.filter(glad => glad.broken || glad.outdated).length;
        this.#filter.setOptions([
            { value: 'all', label: `Todos`, count: this.#glads.length },
            { value: 'ready', label: 'Prontos', count: this.#glads.length - attention },
            { value: 'attention', label: 'Precisam de atenção', count: attention },
        ]);
        this.#filter.set(this.#filterValue, { silent: true });
        const limit = gladiatorLimit(profile.user.level);
        this.#header.set({
            title: 'Gladiadores',
            subtitle: `${this.#glads.length} de ${limit} vagas ocupadas. Grave no editor para atualizar a versão do motor.`,
        });
        this.#render();
    }

    /** Draws the filtered cards and the free places. */
    #render() {
        this.#grid.replaceChildren();
        this.#empty.hidden = true;
        const filtered = this.#glads.filter(glad => {
            if (this.#filterValue === 'ready') return !glad.broken && !glad.outdated;
            if (this.#filterValue === 'attention') return glad.broken || glad.outdated;
            return true;
        });

        if (!filtered.length) {
            this.#empty.hidden = false;
            this.#empty.innerHTML = renderTemplate(emptyStateTemplate, {
                variantClass: 'compact',
                icon: 'glads',
                title: this.#filterValue === 'attention' ? 'Nenhum gladiador precisa de atenção' : 'Nenhum gladiador aqui',
                summary: this.#filterValue === 'all' ? 'Recrute o primeiro gladiador no editor.' : 'Troque o filtro para ver os outros.',
                actionHtml: '',
            });
        }

        for (const glad of filtered) {
            const card = new GladiatorCard({ gladiator: glad });
            card.listen('battle', () => { location.href = `/battle?glad=${glad.id}`; });
            card.listen('code', () => showCode(glad));
            card.listen('delete', () => this.#askDelete(card, glad));
            this.#grid.append(card.element);
        }

        const limit = gladiatorLimit(profile.user.level);
        const free = Math.max(0, limit - this.#glads.length);
        if (this.#filterValue === 'all' && free > 0) {
            this.#grid.append(emptyGladiatorCard(`${free} vaga${free === 1 ? '' : 's'} livre${free === 1 ? '' : 's'}`));
        }
    }

    /**
     * @param {GladiatorCard} card
     * @param {Record<string, any>} glad
     */
    async #askDelete(card, glad) {
        const answer = await showDialog(`Deseja excluir o gladiador <span class='highlight'>${escapeHtml(glad.name)}</span>?`, ['Sim', 'Não']);
        if (answer !== 'Sim') return;
        try {
            await GladiatorModel.remove(glad.id);
        }
        catch (error) {
            writeErrorToast(error);
            return;
        }
        card.element.remove();
        this.#glads = this.#glads.filter(item => item.id !== glad.id);
        await this.show({}, { signal: this.#signal });
    }
}

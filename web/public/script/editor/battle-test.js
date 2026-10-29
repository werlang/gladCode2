import { showMessage } from '../components/dialog.js';
import { loadGladCards } from '../components/glad-card.js';
import { ProgressButton, Simulation } from '../components/simulation.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { GladiatorModel } from '../models/gladiator.js';
import { SimulationModel } from '../models/simulation.js';
import { codeBoxTemplate, opponentTemplate } from '../templates/editor.js';

/** Sample opponents (served by the API) and their difficulty. */
export const SAMPLE_GLADS = {
    Wanderer: 1,
    Runner: 1,
    Blinker: 1,
    Arch: 2,
    Patient: 2,
    Warrior: 2,
    Mage: 2,
    Rogue: 2,
    Archie: 3,
    'War Maker': 3,
    Magnus: 3,
    Rouge: 3,
};

const DIFFICULTY_CLASSES = ['', 'one', 'two', 'three'];
const MAX_OPPONENTS = 4;

/**
 * Shows an opponent's code (or blocks).
 *
 * @param {{ code: string, blocks?: string }} glad Opponent, with its code as written.
 */
function showCode({ code, blocks }) {
    const language = code.includes('def loop():') ? 'python' : 'c';
    const content = blocks?.length
        ? "<div id='code-ws'></div>"
        : `<pre class='line-numbers language-${language}'><code class='language-${language}'></code></pre>`;
    const fog = createElement(renderTemplate(codeBoxTemplate, { content }));
    document.body.append(fog);
    if (blocks?.length) {
        const workspace = Blockly.inject('code-ws', { scrollbars: true, readOnly: true });
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(blocks), workspace);
    }
    else {
        const element = fog.querySelector('code');
        element.textContent = code;
        Prism.highlightElement(element);
    }
    fog.querySelector('#close').addEventListener('click', () => fog.remove());
}

/**
 * Runs a test battle of the edited gladiator against opponents.
 *
 * @param {HTMLButtonElement} button Button that shows the progress.
 * @param {Array<{ sample: string, name: string }|{ id: number, name: string }>} opponents Samples by name,
 *   or the master's own gladiators by id.
 * @param {{ source: string, name: string, breakpoints: string[]|false }} edited The edited gladiator.
 * @param {(simulation: Simulation, progress: ProgressButton) => void} [onStart] Receives the run, to cancel it.
 * @returns {Promise<string|false>} The battle log hash, or `false` when it failed.
 */
export async function runTestBattle(button, opponents, { source, name, breakpoints }, onStart) {
    const progress = new ProgressButton(button, ['Executando batalha...', 'Aguardando resposta do servidor']);
    // the server lines them up as: samples, the edited gladiator, then saved gladiators
    const samples = opponents.filter(opponent => opponent.sample);
    const saved = opponents.filter(opponent => opponent.id);
    const battle = {
        source,
        opponents: [...samples.map(({ sample }) => ({ sample })), ...saved.map(({ id }) => ({ id }))],
        breakpoints: (breakpoints || []).map(Number),
    };
    const simulation = new Simulation(signal => SimulationModel.test(battle, { signal }), {
        terminal: true,
        names: [...samples.map(opponent => opponent.name), name, ...saved.map(opponent => opponent.name)],
    });
    onStart?.(simulation, progress);
    try {
        const data = await simulation.run();
        return data.hash || false;
    }
    catch (error) {
        // a cancelled run needs no message
        if (!error.aborted) {
            showMessage(error.code === 'BATTLE_RUNNING'
                ? 'Aguarde a sua outra batalha terminar e tente novamente.'
                : 'Não foi possível executar a batalha. Tente novamente.');
        }
        return false;
    }
    finally {
        progress.kill();
    }
}

/**
 * The "Testar gladiador" window: pick up to four opponents among the samples
 * and the user's gladiators, then fight them.
 */
export class BattleTest {
    #fog = document.querySelector('#fog-battle');
    #list = this.#fog.querySelector('#list');
    /** Opponent of each list entry. */
    #entries = new Map();
    #running = null;

    /**
     * @param {() => { source: string, breakpoints: string[]|false }} edited Reads the edited gladiator.
     * @param {(hash: string) => void} onFought Called after a battle ran.
     */
    constructor(edited, onFought) {
        this.edited = edited;
        this.onFought = onFought;
        Object.entries(SAMPLE_GLADS).forEach(([name, difficulty]) => this.#addEntry(name, DIFFICULTY_CLASSES[difficulty], { sample: name }));
        this.#fog.querySelector('#btn-cancel').addEventListener('click', () => this.#cancel());
        this.#fog.querySelector('#btn-battle').addEventListener('click', () => this.#fight());
    }

    /**
     * Lists the user's gladiators as opponents too.
     *
     * @param {object[]} glads The user's gladiators.
     */
    addOwnGladiators(glads) {
        glads.forEach(glad => this.#addEntry(glad.name, 'none', { glad }));
    }

    /**
     * Opens the window for a gladiator.
     *
     * @param {string} name Edited gladiator's name.
     */
    open(name) {
        this.#fog.style.display = '';
        this.#fog.querySelector('h3 span').textContent = name;
    }

    close() {
        this.#fog.style.display = 'none';
    }

    /**
     * @param {string} name Shown name.
     * @param {string} difficulty Difficulty class.
     * @param {{ sample?: string, glad?: object }} opponent The opponent.
     */
    #addEntry(name, difficulty, opponent) {
        const entry = createElement(renderTemplate(opponentTemplate, { name, difficulty }));
        this.#entries.set(entry, opponent);
        entry.addEventListener('click', () => this.#toggle(entry));
        this.#list.append(entry);
    }

    /** @returns {HTMLElement[]} The chosen opponents. */
    #chosen() {
        return [...this.#list.querySelectorAll('.glad.selected')];
    }

    /**
     * Picks or drops an opponent, previewing the picked one.
     *
     * @param {HTMLElement} entry List entry.
     */
    async #toggle(entry) {
        const preview = this.#fog.querySelector('.glad-card-container');
        if (entry.classList.contains('selected')) {
            entry.classList.remove('selected');
            preview.replaceChildren();
        }
        else if (this.#chosen().length < MAX_OPPONENTS) {
            entry.classList.add('selected');
            const opponent = this.#entries.get(entry);
            const glad = opponent.glad ?? await GladiatorModel.sample(opponent.sample);
            preview.replaceChildren();
            await loadGladCards(preview, { glads: [glad], code: true, onCode: showCode });
        }

        const count = this.#chosen().length;
        this.#fog.querySelector('#btn-battle').disabled = count === 0;
        this.#fog.querySelector('#list-title span').textContent = count ? `${count} selecionados` : '';
    }

    #cancel() {
        if (this.#running) {
            this.#running.progress.kill();
            this.#running.simulation.abort();
            this.#running = null;
        }
        else {
            this.close();
        }
    }

    async #fight() {
        const opponents = this.#chosen().map(entry => {
            const opponent = this.#entries.get(entry);
            return opponent.glad ? { id: opponent.glad.id, name: opponent.glad.name } : { sample: opponent.sample, name: opponent.sample };
        });
        const hash = await runTestBattle(this.#fog.querySelector('#btn-battle'), opponents, this.edited(), (simulation, progress) => {
            this.#running = { simulation, progress };
        });
        this.#running = null;
        this.close();
        if (hash) this.onFought(hash);
    }
}

import { loadGladCards } from '../components/glad-card.js';
import { ProgressButton, Simulation } from '../components/simulation.js';
import { createElement, decodeHtml, escapeHtml, renderTemplate } from '../helpers/html.js';
import { GladiatorModel } from '../models/gladiator.js';
import { codeBoxTemplate, opponentTemplate } from '../templates/editor.js';

/** Sample opponents (samples/gladbots/<file>.c) and their difficulty. */
export const SAMPLE_GLADS = {
    Wanderer: { difficulty: 1, file: 'Wanderer' },
    Runner: { difficulty: 1, file: 'Runner' },
    Blinker: { difficulty: 1, file: 'Blinker' },
    Arch: { difficulty: 2, file: 'Arch' },
    Patient: { difficulty: 2, file: 'Patient' },
    Warrior: { difficulty: 2, file: 'Warrior' },
    Mage: { difficulty: 2, file: 'Mage' },
    Rogue: { difficulty: 2, file: 'Rogue' },
    Archie: { difficulty: 3, file: 'Archie' },
    'War Maker': { difficulty: 3, file: 'WarMaker' },
    Magnus: { difficulty: 3, file: 'Magnus' },
    Rouge: { difficulty: 3, file: 'Rouge' },
};

/** The strongest samples, fought before a gladiator can be saved untested. */
export const SAVE_TEST_GLADS = ['Archie', 'War Maker', 'Magnus', 'Rouge'];

const DIFFICULTY_CLASSES = ['', 'one', 'two', 'three'];
const MAX_OPPONENTS = 4;

/**
 * A sample gladiator read from its file, with its skin as JSON.
 *
 * @param {string} name Sample name.
 * @returns {Promise<Record<string, any>>}
 */
export async function loadSample(name) {
    const glad = await GladiatorModel.parse({ filename: `samples/gladbots/${SAMPLE_GLADS[name].file}.c` });
    if (glad.skin) glad.skin = JSON.stringify(glad.skin);
    return glad;
}

/**
 * Shows an opponent's code (or blocks).
 *
 * @param {{ code: string, blocks?: string }} glad Opponent with HTML-escaped code.
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
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(decodeHtml(blocks)), workspace);
    }
    else {
        const element = fog.querySelector('code');
        element.innerHTML = code;
        Prism.highlightElement(element);
    }
    fog.querySelector('#close').addEventListener('click', () => fog.remove());
}

/**
 * Runs a test battle of the edited gladiator against opponents.
 *
 * @param {HTMLButtonElement} button Button that shows the progress.
 * @param {Array<string|number>} opponents Opponents' code or gladiator ids.
 * @param {{ source: string, breakpoints: string[]|false }} edited The edited gladiator's code and breakpoints.
 * @param {(simulation: Simulation, progress: ProgressButton) => void} [onStart] Receives the run, to cancel it.
 * @returns {Promise<string|false>} The battle log hash, or `false` when it failed.
 */
export async function runTestBattle(button, opponents, { source, breakpoints }, onStart) {
    const progress = new ProgressButton(button, ['Executando batalha...', 'Aguardando resposta do servidor']);
    const simulation = new Simulation({
        glads: [...opponents, source],
        savecode: true,
        origin: 'editor',
        single: true,
        breakpoints,
        terminal: true,
    });
    onStart?.(simulation, progress);
    try {
        const data = await simulation.run();
        return data.error ? false : data.simulation;
    }
    catch {
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
        Object.entries(SAMPLE_GLADS).forEach(([name, sample]) => this.#addEntry(name, DIFFICULTY_CLASSES[sample.difficulty], { sample: name }));
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
            // saved gladiators come with their code escaped, sample files do not
            const glad = opponent.glad ?? await loadSample(opponent.sample).then(sample => ({ ...sample, code: escapeHtml(sample.code) }));
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
        const opponents = await Promise.all(this.#chosen().map(async entry => {
            const opponent = this.#entries.get(entry);
            return opponent.glad ? opponent.glad.id : (await loadSample(opponent.sample)).code;
        }));
        const hash = await runTestBattle(this.#fog.querySelector('#btn-battle'), opponents, this.edited(), (simulation, progress) => {
            this.#running = { simulation, progress };
        });
        this.#running = null;
        this.close();
        if (hash) this.onFought(hash);
    }
}

import { showTerminal } from './dialog.js';
import { simulationProblem } from '../helpers/simulation-report.js';
import { SimulationModel } from '../models/simulation.js';

/** The request of the last {@link runSimulation}, cancelled by the next one. */
let pending = null;

/**
 * Removes the overlays a page shows while a battle runs.
 */
function removeOverlays() {
    document.querySelectorAll('#fog').forEach(fog => fog.remove());
}

/**
 * Shows what went wrong with a battle, if anything did.
 *
 * @param {unknown} data back_simulation.php answer.
 * @param {Array<object|string|number>} [glads] The simulation's gladiators.
 * @returns {boolean} Whether a problem was shown.
 */
function reportProblem(data, glads) {
    const problem = simulationProblem(data, glads);
    if (!problem) return false;
    showTerminal(problem.title, problem.message);
    return true;
}

/**
 * One battle run.
 *
 * @example
 * const result = await new Simulation({ glads, terminal: true }).run();
 * if (result.simulation) open(`play/${result.simulation}`);
 */
export class Simulation {
    #controller = null;

    /**
     * @param {object} args Simulation arguments (see {@link SimulationModel.run});
     *   `terminal: true` shows problems in a terminal window.
     */
    constructor({ terminal = false, ...args }) {
        this.args = args;
        this.terminal = terminal;
        this.running = false;
        this.hash = null;
    }

    /**
     * Runs the battle and removes the page's overlays when it answers.
     *
     * @returns {Promise<Record<string, any>>} The backend answer.
     * @throws {Error} With `error` set to the answer when it is not JSON.
     */
    async run() {
        this.running = true;
        this.#controller = new AbortController();
        try {
            const data = await SimulationModel.run(this.args, { signal: this.#controller.signal });
            removeOverlays();
            if (this.terminal) reportProblem(data, this.args.glads);
            if (!data || typeof data !== 'object') {
                throw Object.assign(new Error('The simulation did not answer with JSON'), { error: data });
            }
            this.hash = data;
            return data;
        }
        finally {
            this.running = false;
        }
    }

    /** Cancels the battle request. */
    abort() {
        this.running = false;
        this.#controller?.abort();
    }
}

/**
 * Runs a battle, cancelling the previous one still waiting, and shows any problem.
 *
 * @param {object} args Simulation arguments (see {@link SimulationModel.run}).
 * @returns {Promise<string|false>} The battle log hash, `'ERROR'` when a
 *   problem was shown, `false` without an answer.
 */
export async function runSimulation(args) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;

    try {
        const data = await SimulationModel.run(args, { signal: controller.signal });
        if (reportProblem(data, args.glads)) return 'ERROR';
        if (data.output) console.log(`MENSAGEM: ${data.output}`);
        return data.simulation || false;
    }
    catch (error) {
        if (error.aborted) return false;
        throw error;
    }
    finally {
        if (pending === controller) pending = null;
    }
}

/** Cancels the battle request of {@link runSimulation}, if one is waiting. */
export function abortSimulation() {
    pending?.abort();
}

/** How long a battle may take before the button gives up, in ms. */
const PROGRESS_LIMIT_MS = 20000;
/** How long each waiting message stays, in ms. */
const MESSAGE_MS = 2000;

/**
 * Turns a button into a progress bar while a battle runs: the bar fills over
 * {@link PROGRESS_LIMIT_MS}, the label cycles through `messages`, and a full
 * bar cancels the battle and reports a timeout.
 */
export class ProgressButton {
    #button;
    #html;
    #bar;
    #label;
    #timer = null;

    /**
     * @param {HTMLButtonElement} button Button to take over.
     * @param {string[]} messages Labels shown in turn while waiting.
     */
    constructor(button, messages) {
        this.#button = button;
        this.#html = button.innerHTML;
        this.#render();

        const start = performance.now();
        this.#timer = setInterval(() => {
            const elapsed = performance.now() - start;
            this.#bar.style.width = `${Math.min(100, (elapsed / PROGRESS_LIMIT_MS) * 100)}%`;
            this.#label.innerHTML = messages[Math.floor(elapsed / MESSAGE_MS) % messages.length];
            if (elapsed >= PROGRESS_LIMIT_MS) {
                this.kill();
                showTerminal('ERRO DE CONEXÃO', 'Falha ao obter resposta do servidor dentro do tempo limite.');
                abortSimulation();
            }
        }, 50);
    }

    #render() {
        this.#button.disabled = true;
        this.#button.style.padding = '0';
        this.#button.style.position = 'relative';
        this.#button.innerHTML = '';

        this.#bar = document.createElement('div');
        this.#bar.id = 'bar';
        Object.assign(this.#bar.style, {
            backgroundColor: '#00638d',
            width: '0%',
            height: '100%',
            borderRadius: '3px',
        });
        this.#label = document.createElement('div');
        this.#label.id = 'oldcontent';
        Object.assign(this.#label.style, {
            position: 'absolute',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        });
        this.#button.append(this.#bar, this.#label);
    }

    /**
     * Shows a fixed label and progress.
     *
     * @param {string} text Label.
     * @param {number} percent Bar fill, 0 to 100.
     */
    set(text, percent) {
        clearInterval(this.#timer);
        this.#label.innerHTML = text;
        this.#bar.style.width = `${percent}%`;
    }

    /** Restores the button. */
    kill() {
        clearInterval(this.#timer);
        this.#button.innerHTML = this.#html;
        this.#button.style.padding = '';
        this.#button.style.position = '';
        this.#button.disabled = false;
    }

    /** @returns {boolean} Whether the button still shows the progress. */
    isActive() {
        return this.#button.contains(this.#label);
    }
}

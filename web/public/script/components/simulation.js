import { showTerminal } from './dialog.js';
import { simulationProblem } from '../helpers/simulation-report.js';

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
 * @param {{ hash: string|null, error: string }} data The run's answer.
 * @param {string[]} [names] Gladiator names in battle order, to name them in compiler output.
 * @returns {boolean} Whether a problem was shown.
 */
function reportProblem(data, names) {
    const problem = simulationProblem(data, names);
    if (!problem) return false;
    showTerminal(problem.title, problem.message);
    return true;
}

/**
 * One battle run.
 *
 * @example
 * const run = new Simulation(signal => SimulationModel.test(battle, { signal }), { terminal: true });
 * const { hash } = await run.run();
 */
export class Simulation {
    #controller = null;

    /**
     * @param {(signal: AbortSignal) => Promise<{ hash: string|null, error: string }>} request Starts the run
     *   (a {@link import('../models/simulation.js').SimulationModel} call).
     * @param {{ terminal?: boolean, names?: string[] }} [options] `terminal` shows problems in a terminal
     *   window; `names` label the gladiators in compiler output.
     */
    constructor(request, { terminal = false, names = [] } = {}) {
        this.request = request;
        this.terminal = terminal;
        this.names = names;
        this.running = false;
    }

    /**
     * Runs the battle and removes the page's overlays when it answers.
     *
     * @returns {Promise<{ hash: string|null, error: string }>}
     */
    async run() {
        this.running = true;
        this.#controller = new AbortController();
        try {
            const data = await this.request(this.#controller.signal);
            removeOverlays();
            if (this.terminal) reportProblem(data, this.names);
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
 * @param {(signal: AbortSignal) => Promise<{ hash: string|null, error: string }>} request Starts the run.
 * @param {string[]} [names] Gladiator names in battle order.
 * @returns {Promise<string|false>} The battle log hash, `'ERROR'` when a problem was shown,
 *   `false` without an answer.
 */
export async function runSimulation(request, names = []) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;

    try {
        const data = await request(controller.signal);
        if (reportProblem(data, names)) return 'ERROR';
        return data.hash || false;
    }
    catch (error) {
        if (error.aborted) return false;
        throw error;
    }
    finally {
        if (pending === controller) pending = null;
    }
}

/** How long the bar takes to fill, in ms: about a slow battle (most take a few seconds). */
const PROGRESS_FILL_MS = 20000;
/** Where a full bar stops until the battle answers, in %. */
const PROGRESS_MAX = 95;
/** How long each waiting message stays, in ms. */
const MESSAGE_MS = 2000;

/**
 * Turns a button into a progress bar while a battle runs: the bar fills over
 * {@link PROGRESS_FILL_MS} and waits near the end, the label cycles through
 * `messages`. Only the battle request decides when it failed (its timeout is
 * `BATTLE_TIMEOUT_MS`): a battle may wait for others on the server and still count.
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
            this.#bar.style.width = `${Math.min(PROGRESS_MAX, (elapsed / PROGRESS_FILL_MS) * 100)}%`;
            this.#label.innerHTML = messages[Math.floor(elapsed / MESSAGE_MS) % messages.length];
        }, 50);
    }

    #render() {
        this.#button.disabled = true;
        this.#button.classList.add('is-progress');
        this.#button.innerHTML = '';

        this.#bar = document.createElement('div');
        this.#bar.className = 'progress-bar';
        this.#label = document.createElement('div');
        this.#label.className = 'progress-label';
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
        this.#button.classList.remove('is-progress');
        this.#button.disabled = false;
    }

    /** @returns {boolean} Whether the button still shows the progress. */
    isActive() {
        return this.#button.contains(this.#label);
    }
}

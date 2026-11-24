import { randomBytes } from 'node:crypto';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CustomError } from './error.js';
import { engineSource } from './gladiator-code.js';

/** How long to wait for the runner (its own limit is 30 s per battle). */
const RUNNER_TIMEOUT_MS = 60000;

/** Battles running at once; the next ones wait their turn (each engine container takes a CPU share). */
const MAX_RUNS = Number(process.env.RUNNER_CONCURRENCY) || 6;
let runs = 0;
/** @type {Array<() => void>} */
const queue = [];
/** Clients with a battle running, for {@link oneBattlePerClient}. */
const clients = new Set();

/**
 * Longest wait for a free run, in ms. A queued battle plus its run stays under the group locks
 * (`LOCK_SECONDS` in the round models) and the browser's battle timeout.
 */
export const MAX_QUEUE_MS = 60000;

/**
 * Waits for a free run, in arrival order.
 *
 * @throws {CustomError} 503 `RUNNER_BUSY` after {@link MAX_QUEUE_MS}.
 */
async function acquireRun() {
    if (runs < MAX_RUNS) {
        runs++;
        return;
    }
    await new Promise((resolve, reject) => {
        let timer = null;
        const turn = () => {
            clearTimeout(timer);
            resolve();
        };
        timer = setTimeout(() => {
            queue.splice(queue.indexOf(turn), 1);
            reject(new CustomError(503, 'Too many battles right now. Try again shortly.', 'RUNNER_BUSY'));
        }, MAX_QUEUE_MS);
        queue.push(turn);
    });
}

/** Hands the run to the next battle waiting, if any. */
function releaseRun() {
    const next = queue.shift();
    if (next) next();
    else runs--;
}

/**
 * Lets each client run one battle at a time, so one visitor cannot fill the runner: a second
 * request while the first runs answers 429.
 *
 * @template T
 * @param {string} client Who asks: `user:<id>` for a master, `ip:<address>` for a visitor.
 * @param {() => Promise<T>} work Runs the battle.
 * @returns {Promise<T>}
 * @throws {CustomError} 429 `BATTLE_RUNNING`.
 */
export async function oneBattlePerClient(client, work) {
    if (clients.has(client)) throw new CustomError(429, 'Wait for your other battle to finish.', 'BATTLE_RUNNING');
    clients.add(client);
    try {
        return await work();
    }
    finally {
        clients.delete(client);
    }
}

/** @returns {string} Folder shared with the runner, where each battle gets a run folder. */
function runsDir() {
    return process.env.RUNS_DIR || '/data/runs';
}

/** @returns {string} The engine sources copied into every run folder (`Payload/`). */
function payloadDir() {
    return process.env.PAYLOAD_DIR || '/app/payload';
}

/**
 * Runs one battle in the sandboxed engine.
 *
 * The run folder gets the engine sources and one `code<i>.c|py|js` per gladiator; the runner
 * (`runner/`) copies it into the Docker-in-Docker volume, compiles and runs it, deletes it and
 * answers with the engine's error output and simulation log. At most `RUNNER_CONCURRENCY` (6)
 * battles run at once; the others wait.
 *
 * @param {string[]} codes Full sources, in battle order.
 * @param {{ sandbox?: boolean, noitems?: boolean }} [options] `sandbox` enables the test-only
 *   commands (editor runs only); `noitems` disables every potion (tournaments).
 * @returns {Promise<{ simlog: string, error: string }>} Raw log text (a JSON array) and error output.
 * @throws {CustomError} 502 `RUNNER_UNAVAILABLE` when the runner cannot be reached.
 */
export async function runBattle(codes, { sandbox = false, noitems = false } = {}) {
    const folder = randomBytes(16).toString('hex');
    const dir = path.join(runsDir(), folder);

    await acquireRun();
    try {
        // cp creates the run folder: creating it first races cp's own existence check on bind mounts
        await mkdir(runsDir(), { recursive: true });
        await cp(payloadDir(), dir, { recursive: true });
        await Promise.all(codes.map((code, index) => {
            const { file, text } = engineSource(code);
            return writeFile(path.join(dir, `code${index}.${file}`), text);
        }));

        const response = await fetch(`${process.env.RUNNER_URL || 'http://runner:3000'}/${folder}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sandbox, noitems }),
            signal: AbortSignal.timeout(RUNNER_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`runner answered ${response.status}`);
        const { simlog = '', error = '' } = await response.json();
        return { simlog, error };
    }
    catch (error) {
        if (error instanceof CustomError) throw error;
        console.error('Runner failure:', error);
        throw new CustomError(502, 'The battle engine is unavailable. Try again shortly.', 'RUNNER_UNAVAILABLE');
    }
    finally {
        releaseRun();
        // the runner removes the folder after a run; this covers failures before it got there
        await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
}

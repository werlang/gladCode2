import { randomBytes } from 'node:crypto';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CustomError } from './error.js';
import { engineSource } from './gladiator-code.js';

/** How long to wait for the runner (its own limit is 30 s per battle). */
const RUNNER_TIMEOUT_MS = 60000;

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
 * The run folder gets the engine sources and one `code<i>.c|py` per gladiator; the runner
 * (`runner/`) copies it into the Docker-in-Docker volume, compiles and runs it, deletes it and
 * answers with the engine's error output and simulation log.
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
        // the runner removes the folder after a run; this covers failures before it got there
        await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
}

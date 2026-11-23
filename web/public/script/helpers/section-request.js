import { createToast } from '../components/toast.js';

/**
 * Whether an error is the cancellation of work by the shell's AbortSignal.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAborted(error) {
    return Boolean(error && typeof error === 'object'
        && (error.aborted || error.name === 'AbortError'));
}

/**
 * Waits for a section request: a navigation abort resolves to `undefined` so listeners that cannot
 * await the shell never produce an unhandled rejection. Any other failure still rejects.
 *
 * @template T
 * @param {() => Promise<T>} task
 * @param {AbortSignal} [signal]
 * @returns {Promise<T|undefined>}
 */
export async function settleRequest(task, signal) {
    try {
        const value = await task();
        return signal?.aborted ? undefined : value;
    }
    catch (error) {
        if (isAborted(error) || signal?.aborted) return undefined;
        throw error;
    }
}

/**
 * Runs a load started by a section control. A navigation abort stays silent; another failure shows
 * the section error toast instead of becoming an unhandled rejection.
 *
 * @param {() => Promise<unknown>} task
 * @returns {Promise<void>}
 */
export function runSectionTask(task) {
    return Promise.resolve()
        .then(task)
        .then(() => {}, error => {
            if (isAborted(error)) return;
            createToast('Não foi possível carregar esta seção. Tente novamente.', 'error');
        });
}

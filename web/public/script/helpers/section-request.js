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
 * Waits for a secondary read (a position, badge, count or side panel). A failure degrades to
 * `undefined` so the section can show its own empty state without blocking the primary content.
 *
 * @template T
 * @param {() => Promise<T>} task
 * @param {AbortSignal} [signal]
 * @returns {Promise<T|undefined>}
 */
export async function secondaryRequest(task, signal) {
    try {
        const value = await task();
        return signal?.aborted ? undefined : value;
    }
    catch {
        return undefined;
    }
}

/**
 * The retry action of an error toast: it only runs while the navigation that failed is still current.
 *
 * @param {() => void} retry
 * @param {AbortSignal} [signal]
 * @returns {() => unknown}
 */
export function retryAction(retry, signal) {
    return () => {
        if (signal?.aborted) return undefined;
        return retry();
    };
}

/**
 * Shows a retryable read error tied to the navigation signal. Leaving the section aborts the signal,
 * which dismisses the toast and makes its action inert.
 *
 * @param {string} message
 * @param {() => void} retry
 * @param {AbortSignal} [signal]
 * @returns {HTMLElement|null}
 */
export function retryableError(message, retry, signal) {
    if (signal?.aborted) return null;
    const toast = createToast(message, {
        type: 'error',
        action: { label: 'Tentar novamente', onClick: retryAction(retry, signal) },
    });
    signal?.addEventListener('abort', () => {
        toast.dismiss();
        toast.remove();
    }, { once: true });
    return toast;
}

/**
 * Runs an idempotent read started by a section control. A navigation abort stays silent; another
 * failure offers a retry bound to the current navigation. Never wrap a write in this task.
 *
 * @param {() => Promise<unknown>} task
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function runReadTask(task, signal, notify = retryableError) {
    return Promise.resolve()
        .then(task)
        .then(() => {}, error => {
            if (isAborted(error) || signal?.aborted) return;
            return notify(
                'Não foi possível carregar esta seção. Tente novamente.',
                () => runReadTask(task, signal, notify),
                signal,
            );
        });
}

/**
 * Runs a write and then an idempotent re-read. The write is attempted once and never retried; only
 * the read is retryable, and its retry is bound to the navigation signal. A write failure goes to
 * `onWriteError` (the caller keeps its own messages/validation).
 *
 * @param {() => Promise<unknown>} write
 * @param {() => Promise<unknown>} read
 * @param {{ signal?: AbortSignal, onWriteError?: (error: Error) => void, notify?: typeof retryableError }} [options]
 * @returns {Promise<void>}
 */
export function writeThenRead(write, read, { signal, onWriteError, notify } = {}) {
    return Promise.resolve()
        .then(write)
        .then(
            () => runReadTask(read, signal, notify),
            error => {
                if (isAborted(error) || signal?.aborted) return;
                onWriteError?.(error);
            },
        );
}

/**
 * Runs an action started by a section control that may write. It only reports the failure; it never
 * offers a generic retry, because repeating a POST/PUT/DELETE is not safe.
 *
 * @param {() => Promise<unknown>} task
 * @returns {Promise<void>}
 */
export function runSectionTask(task) {
    return Promise.resolve()
        .then(task)
        .then(() => {}, error => {
            if (isAborted(error)) return;
            createToast('Não foi possível concluir esta ação. Tente novamente.', 'error');
        });
}

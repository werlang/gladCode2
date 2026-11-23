import { createToast } from '../components/toast.js';
import { escapeHtml } from './html.js';

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
 * Reports a refused write with the API's own message. Controls keep their pre-click state; this only
 * supplies the feedback (there is deliberately no retry).
 *
 * @param {unknown} error
 * @returns {void}
 */
export function writeErrorMessage(error) {
    return typeof error?.message === 'string' && error.message.trim()
        ? escapeHtml(error.message.trim())
        : 'Não foi possível concluir esta ação.';
}

/**
 * @param {unknown} error
 * @returns {void}
 */
export function writeErrorToast(error) {
    createToast(writeErrorMessage(error), 'error');
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
 * @param {{ signal?: AbortSignal, onWriteError?: (error: Error) => void, reportWrite?: (error: Error) => void,
 *   notify?: typeof retryableError }} [options]
 * @returns {Promise<void>}
 */
export function writeThenRead(write, read, { signal, onWriteError, reportWrite = writeErrorToast, notify } = {}) {
    return Promise.resolve()
        .then(write)
        .then(
            () => runReadTask(read, signal, notify),
            error => {
                if (isAborted(error) || signal?.aborted) return;
                (onWriteError ?? reportWrite)(error);
            },
        );
}

/**
 * Applies an optimistic UI change, runs its write and rolls the change back with feedback on a
 * refusal. The write is attempted once.
 *
 * @param {{ apply: () => void, rollback: () => void, write: () => Promise<unknown>,
 *   onError?: (error: Error) => void }} options
 * @returns {Promise<boolean>} Whether the write succeeded.
 */
export async function optimisticWrite({ apply, rollback, write, onError = writeErrorToast }) {
    apply();
    try {
        await write();
        return true;
    }
    catch (error) {
        if (isAborted(error)) return false;
        rollback();
        onError(error);
        return false;
    }
}

/**
 * Runs an undo started by a toast action. Whether the restore succeeds or is refused, the caller's
 * `restore` puts the controls back on the value the API confirms; a refusal is reported with the
 * API message. The promise never rejects, so the toast action never produces an unhandled rejection.
 *
 * @param {() => Promise<unknown>} undo
 * @param {{ restore?: () => void, report?: (error: Error) => void }} [options]
 * @returns {Promise<any|null>} The undo result, or null when it was refused.
 */
export async function undoChange(undo, { restore, report = writeErrorToast } = {}) {
    try {
        const result = await undo();
        if (result?.ignored || result?.superseded) return result;
        restore?.();
        return result;
    }
    catch (error) {
        if (isAborted(error)) return null;
        restore?.();
        report(error);
        return null;
    }
}

/**
 * Runs an action started by a section control that may write. It only reports the failure; it never
 * offers a generic retry, because repeating a POST/PUT/DELETE is not safe.
 *
 * @param {() => Promise<unknown>} task
 * @param {(error: Error) => void} [reportWrite]
 * @returns {Promise<void>}
 */
export function runSectionTask(task, reportWrite = writeErrorToast) {
    return Promise.resolve()
        .then(task)
        .then(() => {}, error => {
            if (isAborted(error)) return;
            reportWrite(error);
        });
}

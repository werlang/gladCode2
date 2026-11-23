import { createElement, renderTemplate } from '../helpers/html.js';
import { fadeOut } from '../helpers/animate.js';
import { toastTemplate } from '../templates/dialog.js';

const ICONS = {
    error: 'times-circle',
    info: 'exclamation-circle',
    success: 'check-circle',
};

/** How long a toast stays fully visible before it starts fading, in ms. */
const HOLD_MS = 2000;
/** A toast with an action stays long enough to be read and pressed. */
const ACTION_HOLD_MS = 6000;
const FADE_MS = 3000;

/**
 * @typedef {object} ToastAction
 * @property {string} label
 * @property {() => unknown} onClick
 */

/**
 * @typedef {object} ToastOptions
 * @property {'error'|'info'|'success'} [type]
 * @property {number} [duration] Time fully visible, in ms.
 * @property {ToastAction} [action] Undo/retry button.
 */

/**
 * The options of a toast, accepting the old string type for existing callers.
 *
 * @param {'error'|'info'|'success'|ToastOptions} [typeOrOptions]
 * @returns {{ type: 'error'|'info'|'success', duration: number, action: ToastAction|null }}
 */
export function toastOptions(typeOrOptions = 'info') {
    const options = typeof typeOrOptions === 'string' ? { type: typeOrOptions } : (typeOrOptions ?? {});
    const type = ['error', 'info', 'success'].includes(options.type) ? options.type : 'info';
    const defaultDuration = options.action ? ACTION_HOLD_MS : HOLD_MS;
    const duration = Number.isFinite(Number(options.duration)) && Number(options.duration) > 0
        ? Number(options.duration)
        : defaultDuration;
    return { type, duration, action: options.action ?? null };
}

/**
 * Restacks the visible toasts from the bottom of the screen up.
 */
function stackToasts() {
    document.querySelectorAll('.toast').forEach((toast, index) => {
        toast.style.bottom = `calc(${index} * (1.5em + var(--space-5)))`;
    });
}

/**
 * Shows a short notification in the corner of the screen. With `action`, it stays until the action
 * is pressed or the duration ends; the returned element has `dismiss()`.
 *
 * @param {string} message Message markup (escape user text).
 * @param {'error'|'info'|'success'|ToastOptions} [typeOrOptions] Tone, or options.
 * @returns {HTMLElement} The toast element.
 */
export function createToast(message, typeOrOptions = 'info') {
    const { type, duration, action } = toastOptions(typeOrOptions);
    const toast = createElement(renderTemplate(toastTemplate, {
        type,
        icon: ICONS[type] ?? ICONS.info,
        message,
    }));
    document.body.append(toast);
    stackToasts();

    let timer = null;
    const dismiss = async () => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        await fadeOut(toast, FADE_MS);
        toast.remove();
        stackToasts();
    };

    if (action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'toast-action';
        button.textContent = action.label;
        button.addEventListener('click', () => {
            try {
                action.onClick();
            }
            finally {
                dismiss();
            }
        });
        toast.append(button);
    }

    timer = setTimeout(dismiss, duration);
    toast.dismiss = dismiss;
    return toast;
}

import { createElement, renderTemplate } from '../helpers/html.js';
import { fadeOut, isVisible } from '../helpers/animate.js';
import { toastTemplate } from '../templates/dialog.js';

const ICONS = {
    error: 'times-circle',
    info: 'exclamation-circle',
    success: 'check-circle',
};

/** The documented shortcut that moves focus to the newest toast action. */
export const TOAST_ACTION_SHORTCUT = 'Alt+Z';

/**
 * Whether a key event is the toast-action shortcut.
 *
 * @param {KeyboardEvent|{ altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, key?: string }} event
 * @returns {boolean}
 */
export function isToastShortcut(event) {
    return Boolean(event.altKey) && !event.ctrlKey && !event.metaKey && !event.shiftKey
        && String(event.key ?? '').toLowerCase() === 'z';
}

/**
 * Whether an open modal/dialog focus trap owns the page. A global shortcut must not pull focus out.
 *
 * @param {Document} [doc]
 * @returns {boolean}
 */
export function isModalOpen(doc = globalThis.document) {
    if (!doc) return false;
    if (doc.activeElement?.closest?.('[role="dialog"]')) return true;
    const modals = doc.querySelectorAll?.('[role="dialog"][aria-modal="true"], dialog[open]') ?? [];
    return [...modals].some(modal => isVisible(modal));
}

/** The actions of the live toasts, newest last. */
const liveActions = new Set();
let shortcutBound = false;

/**
 * Binds the one keydown listener the first time an action toast appears. It only moves focus when the
 * person presses the shortcut, so asynchronous toasts leave the current control untouched.
 */
function bindShortcut() {
    if (shortcutBound || typeof document === 'undefined') return;
    shortcutBound = true;
    document.addEventListener('keydown', event => {
        const action = [...liveActions].filter(node => node.isConnected).at(-1);
        if (!isToastShortcut(event) || !action || isModalOpen()) return;
        event.preventDefault();
        action.focus();
    });
}

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
    const opener = document.activeElement;
    const toast = createElement(renderTemplate(toastTemplate, {
        type,
        icon: ICONS[type] ?? ICONS.info,
        message,
    }));
    document.body.append(toast);
    stackToasts();

    let timer = null;
    let actionButton = null;
    let dismiss = null;
    const startTimer = () => {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(dismiss, duration);
    };
    const stopTimer = () => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
    };
    dismiss = async () => {
        stopTimer();
        const hadFocus = toast.contains(document.activeElement);
        await fadeOut(toast, FADE_MS);
        toast.remove();
        stackToasts();
        if (actionButton) liveActions.delete(actionButton);
        if (hadFocus && opener?.isConnected) opener.focus();
    };

    if (action) {
        const button = document.createElement('button');
        actionButton = button;
        button.type = 'button';
        button.className = 'toast-action';
        button.textContent = action.label;
        button.setAttribute('aria-keyshortcuts', TOAST_ACTION_SHORTCUT);
        button.addEventListener('click', () => {
            try {
                action.onClick();
            }
            finally {
                dismiss();
            }
        });
        // The action stays while it is focused, so the shortcut has time to be used.
        button.addEventListener('focus', stopTimer);
        button.addEventListener('blur', startTimer);
        toast.append(button);
        liveActions.add(button);
        bindShortcut();
    }

    startTimer();
    toast.dismiss = dismiss;
    return toast;
}

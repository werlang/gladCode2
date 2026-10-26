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
const FADE_MS = 3000;

/**
 * Restacks the visible toasts from the bottom of the screen up.
 */
function stackToasts() {
    document.querySelectorAll('.toast').forEach((toast, index) => {
        toast.style.bottom = `calc(${index * 1.5}em + ${index * 20}px)`;
    });
}

/**
 * Shows a short notification in the corner of the screen.
 *
 * @param {string} message Message markup.
 * @param {'error'|'info'|'success'} [type] Tone.
 * @returns {HTMLElement} The toast element.
 */
export function createToast(message, type = 'info') {
    const toast = createElement(renderTemplate(toastTemplate, { type, icon: ICONS[type] ?? ICONS.info, message }));
    document.body.append(toast);
    stackToasts();

    setTimeout(async () => {
        await fadeOut(toast, FADE_MS);
        toast.remove();
        stackToasts();
    }, HOLD_MS);

    return toast;
}

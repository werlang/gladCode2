/** Duration of jQuery's default fades and slides, kept so the site feels the same. */
export const DEFAULT_DURATION = 400;

/**
 * Whether the visitor asked for reduced motion.
 *
 * @returns {boolean}
 */
function reducedMotion() {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Runs a Web Animation and resolves when it ends (immediately under reduced motion).
 *
 * @param {HTMLElement} element Animated element.
 * @param {Keyframe[]} keyframes Keyframes.
 * @param {number} duration Milliseconds.
 * @returns {Promise<void>}
 */
async function run(element, keyframes, duration) {
    if (!element?.animate || reducedMotion() || duration <= 0) return;
    await element.animate(keyframes, { duration, easing: 'ease' }).finished.catch(() => {});
}

/**
 * Shows an element, fading it in.
 *
 * @param {HTMLElement} element Element to show.
 * @param {number} [duration] Milliseconds.
 * @param {string} [display] Display value to show it with ('' keeps the stylesheet's).
 * @returns {Promise<void>}
 */
export async function fadeIn(element, duration = DEFAULT_DURATION, display = '') {
    if (!element) return;
    show(element, display);
    await run(element, [{ opacity: 0 }, { opacity: 1 }], duration);
}

/**
 * Fades an element out, then hides it.
 *
 * @param {HTMLElement} element Element to hide.
 * @param {number} [duration] Milliseconds.
 * @returns {Promise<void>}
 */
export async function fadeOut(element, duration = DEFAULT_DURATION) {
    if (!element) return;
    await run(element, [{ opacity: 1 }, { opacity: 0 }], duration);
    element.style.display = 'none';
}

/**
 * Shows an element, unrolling it from the top.
 *
 * @param {HTMLElement} element Element to show.
 * @param {number} [duration] Milliseconds.
 * @param {string} [display] Display value to show it with.
 * @returns {Promise<void>}
 */
export async function slideDown(element, duration = DEFAULT_DURATION, display = '') {
    if (!element) return;
    show(element, display);
    const height = `${element.scrollHeight}px`;
    element.style.overflow = 'hidden';
    await run(element, [{ height: '0px' }, { height }], duration);
    element.style.overflow = '';
}

/**
 * Rolls an element up, then hides it.
 *
 * @param {HTMLElement} element Element to hide.
 * @param {number} [duration] Milliseconds.
 * @returns {Promise<void>}
 */
export async function slideUp(element, duration = DEFAULT_DURATION) {
    if (!element) return;
    const height = `${element.offsetHeight}px`;
    element.style.overflow = 'hidden';
    await run(element, [{ height }, { height: '0px' }], duration);
    element.style.overflow = '';
    element.style.display = 'none';
}

/**
 * Slides an element in from the left, or back out when it is visible.
 *
 * @param {HTMLElement} element Element to toggle.
 * @param {number} [duration] Milliseconds.
 * @returns {Promise<boolean>} Whether the element is visible afterwards.
 */
export async function slideHorizontal(element, duration = DEFAULT_DURATION) {
    if (!element) return false;
    const opening = !isVisible(element);
    const frames = [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }];
    if (opening) {
        show(element);
        await run(element, frames, duration);
    }
    else {
        await run(element, frames.reverse(), duration);
        element.style.display = 'none';
    }
    return opening;
}

/**
 * Shows an element that may have been hidden inline or by the stylesheet.
 *
 * @param {HTMLElement} element Element to show.
 * @param {string} [display] Display value; '' restores the stylesheet's,
 *   falling back to `block` when the stylesheet hides it.
 */
export function show(element, display = '') {
    if (!element) return;
    element.style.display = display;
    if (!display && getComputedStyle(element).display === 'none') {
        element.style.display = 'block';
    }
}

/**
 * Hides an element.
 *
 * @param {HTMLElement} element Element to hide.
 */
export function hide(element) {
    if (element) element.style.display = 'none';
}

/**
 * Shows or hides an element.
 *
 * @param {HTMLElement} element Element to toggle.
 * @param {boolean} [visible] Forced state; toggles when omitted.
 */
export function toggle(element, visible = !isVisible(element)) {
    if (visible) show(element);
    else hide(element);
}

/**
 * Whether an element takes up space on the page (jQuery's `:visible`).
 *
 * @param {HTMLElement|null} element Element to test.
 * @returns {boolean}
 */
export function isVisible(element) {
    return Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
}

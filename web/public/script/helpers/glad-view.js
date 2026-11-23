import { APP_EVENTS, events } from './event-bus.js';
import { LocalData } from './local-data.js';

/** How a gladiator is drawn across the site: the pixel-art sprite, or the 3D coliseum model. */
export const GLAD_VIEW_CHOICES = ['sprite', '3d'];

/** The style of a master who has not chosen one: the site's current 3D coliseum look. */
export const DEFAULT_GLAD_VIEW = '3d';

/** Where the choice is cached in this browser, so every page draws gladiators the same way. */
const STORAGE_ID = 'gladcode-glad-view';

/**
 * Cookie the web service reads to name the style on `<html data-glad-view>` before the page
 * scripts run. It is only the cached choice; the account keeps it as `gladView`.
 */
export const GLAD_VIEW_COOKIE = 'gladview';

/** One year, in seconds, for the cookie that lets the server paint the right style first. */
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/**
 * @param {unknown} value
 * @returns {'sprite'|'3d'} The value when it is a choice, the default otherwise.
 */
export function normalizeGladView(value) {
    return GLAD_VIEW_CHOICES.includes(value) ? value : DEFAULT_GLAD_VIEW;
}

/**
 * @returns {'sprite'|'3d'} The cached choice; the default when none was made or storage is unavailable.
 */
export function storedGladView() {
    try {
        return normalizeGladView(new LocalData({ id: STORAGE_ID }).get());
    }
    catch {
        return DEFAULT_GLAD_VIEW;
    }
}

/**
 * The style this page draws: the server-rendered `<html data-glad-view>` first, then the browser
 * cache, then the default.
 *
 * @returns {'sprite'|'3d'}
 */
export function currentGladView() {
    const attribute = typeof document === 'undefined' ? null : document.documentElement.getAttribute('data-glad-view');
    if (GLAD_VIEW_CHOICES.includes(attribute)) return attribute;
    return storedGladView();
}

/**
 * Shows a style at once: caches it for every page, names it on the root element and fires a
 * `gladviewchange` event on `document` with `{ choice }`. The profile saves the choice on the
 * account separately (`gladView`).
 *
 * The cookie is what lets the web service render the right style on the next page before its
 * scripts run; storage keeps it inside the browser.
 *
 * @param {'sprite'|'3d'} choice
 * @returns {'sprite'|'3d'} The choice as applied (unknown values fall back to the default).
 */
export function applyGladView(choice) {
    const safe = normalizeGladView(choice);
    try {
        new LocalData({ id: STORAGE_ID }).set({ data: safe });
    }
    catch {
        // storage can be unavailable (private windows); the cookie and this page still follow the choice
    }
    document.documentElement.setAttribute('data-glad-view', safe);
    document.cookie = `${GLAD_VIEW_COOKIE}=${safe}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    document.dispatchEvent(new CustomEvent('gladviewchange', { detail: { choice: safe } }));
    events.emit(APP_EVENTS.gladViewChanged, { choice: safe });
    return safe;
}

/**
 * Runs `handler` after every {@link applyGladView}.
 *
 * @param {(choice: 'sprite'|'3d', event: CustomEvent) => void} handler
 * @returns {() => void} Unsubscribe.
 */
export function onGladViewChange(handler) {
    const listener = event => handler(event.detail.choice, event);
    document.addEventListener('gladviewchange', listener);
    return () => document.removeEventListener('gladviewchange', listener);
}

import { APP_EVENTS, events } from './event-bus.js';
import { LocalData } from './local-data.js';

/** The themes a master can choose; `system` picks Arena light or dark from the device's colour scheme. */
export const THEME_CHOICES = ['system', 'classic', 'arena-light', 'arena-dark'];

/** Where the choice is cached in this browser (read before paint by `script/theme-boot.js`). */
const STORAGE_ID = 'gladcode-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

let watching = false;

/**
 * @returns {'system'|'classic'|'arena-light'|'arena-dark'} The cached choice, `system` when none was made.
 */
export function storedThemeChoice() {
    const choice = new LocalData({ id: STORAGE_ID }).get();
    return THEME_CHOICES.includes(choice) ? choice : 'system';
}

/**
 * @param {'system'|'classic'|'arena-light'|'arena-dark'} choice
 * @param {boolean} [prefersDark] The system colour scheme (read from the browser by default).
 * @returns {'classic'|'arena-light'|'arena-dark'} The theme a choice shows.
 */
export function resolveTheme(choice, prefersDark = window.matchMedia?.(DARK_QUERY).matches ?? false) {
    if (choice !== 'system' && THEME_CHOICES.includes(choice)) return choice;
    return prefersDark ? 'arena-dark' : 'arena-light';
}

/**
 * Shows a theme choice: sets the `theme-<name>` class on the root element, caches the choice for
 * the next page load, and follows the system scheme live while the choice is `system`. Fires a
 * `themechange` event on `document` with `{ choice, theme }`.
 *
 * @param {'system'|'classic'|'arena-light'|'arena-dark'} choice
 */
export function applyTheme(choice) {
    const safe = THEME_CHOICES.includes(choice) ? choice : 'system';
    const theme = resolveTheme(safe);
    const root = document.documentElement;
    for (const name of THEME_CHOICES.slice(1)) root.classList.toggle(`theme-${name}`, name === theme);
    new LocalData({ id: STORAGE_ID }).set({ data: safe });
    document.dispatchEvent(new CustomEvent('themechange', { detail: { choice: safe, theme } }));
    events.emit(APP_EVENTS.themeChanged, { choice: safe, theme });

    if (!watching && window.matchMedia) {
        watching = true;
        window.matchMedia(DARK_QUERY).addEventListener('change', () => {
            if (storedThemeChoice() === 'system') applyTheme('system');
        });
    }
}

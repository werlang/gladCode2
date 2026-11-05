import { TemplateVar } from './template-var.js';

/**
 * The player's battle renderer choice, read by module pages (the editor's gladiator creator). The replay page keeps
 * its classic `script/battle-renderer-preference.js`, which must run before its classic renderer; both read the same
 * storage key with the same aliases, and `tests/frontend/renderer-preference.test.mjs` runs the classic script to keep
 * the two in agreement.
 */

/** Where the choice is stored (written by the replay page's settings window). */
export const RENDERER_STORAGE_KEY = 'gladcode:battle-renderer';

/** The renderers and the spellings each accepts, from storage or `?renderer=`. */
export const RENDERER_ALIASES = Object.freeze({
    three: Object.freeze(['2', 'v2', 'three', '3d']),
    classic: Object.freeze(['1', 'v1', 'classic', 'phaser', '2d']),
});

/**
 * @param {unknown} value A stored or query value.
 * @returns {'three'|'classic'|null} The renderer it names, or null.
 */
export function normalizeRenderer(value) {
    const text = String(value ?? '').toLowerCase();
    if (RENDERER_ALIASES.three.includes(text)) return 'three';
    if (RENDERER_ALIASES.classic.includes(text)) return 'classic';
    return null;
}

/**
 * The renderer a page uses: classic whenever this server turns the 3D renderer off, otherwise the `?renderer=` value,
 * then the stored choice, then classic.
 *
 * @param {{ enabled: boolean, query?: unknown, stored?: unknown }} sources The server flag and the two choices.
 * @returns {'three'|'classic'}
 */
export function chooseRenderer({ enabled, query = null, stored = null }) {
    if (!enabled) return 'classic';
    return normalizeRenderer(query) ?? normalizeRenderer(stored) ?? 'classic';
}

/**
 * The battle renderer for this page: the server flag comes from the page's template vars (`render2`, set by
 * `web/app.js`; a page without it gets classic, since only pages with it map three), the choice from the URL and
 * storage (classic when storage is unavailable).
 *
 * @returns {'three'|'classic'}
 */
export function battleRenderer() {
    let stored = null;
    try {
        stored = window.localStorage.getItem(RENDERER_STORAGE_KEY);
    }
    catch {
        // privacy modes may refuse storage; the classic default stays
    }
    return chooseRenderer({
        enabled: TemplateVar.get('render2') === true,
        query: new URLSearchParams(window.location.search).get('renderer'),
        stored,
    });
}

import { LocalData } from './local-data.js';

/** Replay settings of a viewer who never changed them. */
export const DEFAULT_PREFERENCES = Object.freeze({
    show_frames: true,
    show_bars: true,
    show_fps: false,
    show_text: true,
    show_speech: true,
    sfx_volume: 1,
    music_volume: 0.1,
    crowd: 1,
});

const STORAGE_KEY = 'replay-preferences';
/** Cookie the PHP backend kept the settings in; read once, then dropped. */
const LEGACY_COOKIE = 'render_prefs';

/**
 * Reads and removes the settings the old backend left in a cookie.
 *
 * @returns {Record<string, unknown>}
 */
function takeLegacyCookie() {
    const entry = document.cookie.split('; ').find(cookie => cookie.startsWith(`${LEGACY_COOKIE}=`));
    if (!entry) return {};
    document.cookie = `${LEGACY_COOKIE}=; Max-Age=0; path=/`;
    try {
        return JSON.parse(decodeURIComponent(entry.slice(LEGACY_COOKIE.length + 1)));
    }
    catch {
        return {};
    }
}

/**
 * The viewer's replay settings (bars, frames, FPS, texts, speech, volumes, crowd). They only
 * matter to this browser, so they live in its storage.
 */
export class ReplayPreferences {
    /** @returns {Record<string, unknown>} The settings, with defaults for the ones never set. */
    static load() {
        const stored = new LocalData({ id: STORAGE_KEY }).get();
        if (stored) return { ...DEFAULT_PREFERENCES, ...stored };

        const legacy = takeLegacyCookie();
        const preferences = { ...DEFAULT_PREFERENCES, ...legacy };
        if (Object.keys(legacy).length) new LocalData({ id: STORAGE_KEY }).set({ data: preferences });
        return preferences;
    }

    /**
     * Changes some settings.
     *
     * @param {Record<string, unknown>} fields
     */
    static save(fields) {
        new LocalData({ id: STORAGE_KEY }).set({ data: { ...ReplayPreferences.load(), ...fields } });
    }
}

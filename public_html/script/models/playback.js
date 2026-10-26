import { api } from '../helpers/request.js';

const ENDPOINT = 'back_play.php';

/**
 * The viewer's replay preferences (`back_play.php`).
 */
export class PlaybackModel {
    /**
     * @returns {Promise<{ show_bars: string|boolean, show_frames: string|boolean, show_fps: string|boolean,
     *   show_text: string|boolean, show_speech: string|boolean, crowd: string, music_volume: string, sfx_volume: string }>}
     */
    static preferences() {
        return api.post(ENDPOINT, { action: 'GET_PREF' });
    }

    /**
     * Saves some preferences.
     *
     * @param {Record<string, unknown>} fields Preference fields (`show_bars`, `music_volume`, ...).
     * @returns {Promise<unknown>}
     */
    static savePreferences(fields) {
        return api.post(ENDPOINT, { action: 'SET_PREF', ...fields });
    }
}

(() => {
    const STORAGE_KEY = 'gladcode:battle-renderer';
    const CLASSIC = 'classic';
    const THREE = 'three';

    // Feature gate set by playback.php from env ENABLE_RENDER2. When the gate
    // is off, the 3D option is hidden and any stored/?renderer=three value is
    // ignored so the page always runs the classic renderer. Defaults to
    // enabled when the flag is absent (e.g. direct script use outside playback).
    const ENABLED = window.__RENDER2_ENABLED__ !== false;

    /**
     * Normalizes URL and storage aliases into the supported renderer names.
     *
     * @param {unknown} value Candidate renderer value.
     * @returns {'classic'|'three'|null} Supported renderer or null.
     */
    function normalize(value) {
        const normalized = String(value ?? '').toLowerCase();
        if (['2', 'v2', 'three', '3d'].includes(normalized)) return THREE;
        if (['1', 'v1', 'classic', 'phaser', '2d'].includes(normalized)) return CLASSIC;
        return null;
    }

    /** Applies the renderer class used by the page stylesheet. */
    function applyClass(renderer) {
        document.documentElement.classList.toggle('renderer-three', renderer === THREE);
        document.documentElement.classList.toggle('renderer-classic', renderer === CLASSIC);
    }

    const queryRenderer = normalize(new URLSearchParams(window.location.search).get('renderer'));
    let storedRenderer = null;
    try {
        storedRenderer = normalize(window.localStorage.getItem(STORAGE_KEY));
    }
    catch {
        // Storage can be unavailable in privacy modes; the classic default remains safe.
    }
    let current = ENABLED ? (queryRenderer ?? storedRenderer ?? CLASSIC) : CLASSIC;
    applyClass(current);

    window.battleRendererVersion = current;
    window.BattleRendererPreference = Object.freeze({
        CLASSIC,
        THREE,
        ENABLED,
        get() {
            return current;
        },
        set(renderer) {
            const normalized = normalize(renderer) ?? CLASSIC;
            const applied = ENABLED ? normalized : CLASSIC;
            current = applied;
            window.battleRendererVersion = applied;
            applyClass(applied);
            try {
                window.localStorage.setItem(STORAGE_KEY, applied);
            }
            catch {
                // The current page still switches even if persistence is unavailable.
            }
            return applied;
        },
        /**
         * Demotes the renderer for this page load only, keeping the stored
         * preference intact so transient failures retry on the next visit.
         *
         * @param {string} renderer Renderer name.
         * @returns {string} The applied renderer.
         */
        setTransient(renderer) {
            const normalized = normalize(renderer) ?? CLASSIC;
            const applied = ENABLED ? normalized : CLASSIC;
            current = applied;
            window.battleRendererVersion = applied;
            applyClass(applied);
            return applied;
        },
    });
})();

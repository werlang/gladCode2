(() => {
    const STORAGE_KEY = 'gladcode:battle-renderer';
    const CLASSIC = 'classic';
    const THREE = 'three';

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
    let current = queryRenderer ?? storedRenderer ?? CLASSIC;
    applyClass(current);

    window.battleRendererVersion = current;
    window.BattleRendererPreference = Object.freeze({
        CLASSIC,
        THREE,
        get() {
            return current;
        },
        set(renderer) {
            const normalized = normalize(renderer) ?? CLASSIC;
            current = normalized;
            window.battleRendererVersion = normalized;
            applyClass(normalized);
            try {
                window.localStorage.setItem(STORAGE_KEY, normalized);
            }
            catch {
                // The current page still switches even if persistence is unavailable.
            }
            return normalized;
        },
    });
})();

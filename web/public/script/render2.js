import { BattleRenderer } from './render2/renderer.js';
import { storeQuality, storedQuality } from './render2/quality.js';

const classicLoadRenderer = window.load_phaser;
const classicUpdateRenderer = window.phaser_update;
let renderer = null;
let rendererWasLoaded = false;

/**
 * Installs the Three.js renderer behind the legacy playback adapter boundary.
 *
 * @returns {Promise<BattleRenderer|null>} Active renderer or null after fallback.
 */
async function installThreeRenderer() {
    if (window.__RENDER2_ENABLED__ === false) {
        return null;
    }
    if (window.BattleRendererPreference?.get() !== window.BattleRendererPreference?.THREE) {
        return null;
    }

    const third = document.querySelector('#loadbar #third');
    const statusArena = document.querySelector('#loadbar #status-arena');
    if (third) third.style.display = 'block';
    if (statusArena) {
        statusArena.style.display = 'block';
        statusArena.textContent = 'Carregando arena 3D';
    }

    try {
        const THREE = await import('three');
        const container = document.querySelector('#canvas-div');
        if (!(container instanceof HTMLElement)) {
            throw new Error('Battle canvas container was not found.');
        }

        renderer = new BattleRenderer({ THREE, container });
        window.threeBattleRenderer = renderer;
        window.game = renderer.createLegacyFacade();
        window.music = renderer.music;
        window.ending = renderer.ending;
        window.victory = renderer.victory;
        window.loadCache = true;

        window.load_phaser = () => {
            if (rendererWasLoaded) return false;
            rendererWasLoaded = true;
            return true;
        };
        window.phaser_update = (step) => {
            window.json = step;
            window.nglad = Array.isArray(step?.glads) ? step.glads.length : 0;
            renderer.update(step);
        };
        window.changeCrowd = (density) => renderer.setCrowdDensity(density);
        // The settings window reads and stores the graphics quality of this device (see quality.js).
        window.Render2Quality = { get: storedQuality, set: storeQuality, active: () => renderer.getDebugSnapshot().timings.quality };
        return renderer;
    }
    catch (error) {
        console.error('Não foi possível iniciar o render 3D.', error);
        // Demote for this page load only: a transient failure (CDN hiccup,
        // WebGL context loss) must not permanently rewrite the stored
        // preference, or the arena would stay classic after the cause clears.
        window.BattleRendererPreference?.setTransient(window.BattleRendererPreference?.CLASSIC ?? 'classic');
        window.load_phaser = classicLoadRenderer;
        window.phaser_update = classicUpdateRenderer;
        if (status) status.textContent = 'Arena 3D indisponível; carregando modo clássico';
        return null;
    }
}

window.battleRendererReady = installThreeRenderer();
window.addEventListener('pagehide', () => renderer?.destroy(), { once: true });

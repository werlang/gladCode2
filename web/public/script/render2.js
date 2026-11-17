import { currentGladView } from './helpers/glad-view.js';
import { storeQuality, storedQuality } from './render2/quality.js';

const classicLoadRenderer = window.load_phaser;
const classicUpdateRenderer = window.phaser_update;
let renderer = null;
let rendererWasLoaded = false;

/**
 * Whether this browser can run the 3D renderer. WebGL2 is the floor: the renderer and the Synty
 * materials need it, and a browser without it keeps the classic Phaser replay.
 *
 * @returns {boolean}
 */
function hasWebGl2() {
    try {
        const context = document.createElement('canvas').getContext('webgl2');
        if (!context) return false;
        // the probe canvas is never drawn on: hand its context back before the arena makes its own
        context.getExtension('WEBGL_lose_context')?.loseContext();
        return true;
    }
    catch {
        return false;
    }
}

/**
 * Whether the replay boots on the classic Phaser renderer, in the page's decision order: the
 * server's gate always wins, then the master's style preference (`currentGladView()`, which reads
 * the server-rendered `data-glad-view` first), then the browser's WebGL2 support. The Synty pack
 * being present never changes the answer.
 *
 * @returns {boolean}
 */
function classicRequired() {
    return window.__RENDER2_ENABLED__ === false
        || currentGladView() === 'sprite'
        || !hasWebGl2();
}

/**
 * Installs the Three.js renderer behind the legacy playback adapter boundary. The replay runs it
 * when the server gate is on, the page draws the 3D style and the browser has WebGL2; the classic
 * renderer takes over otherwise or when the 3D renderer cannot start.
 *
 * @returns {Promise<import('./render2/renderer.js').BattleRenderer|null>} Active renderer or null after fallback.
 */
async function installThreeRenderer() {
    if (classicRequired()) {
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
        // the 3D modules load only once the boot decision above wants them (sprites keep the classic replay)
        const [THREE, { BattleRenderer }] = await Promise.all([import('three'), import('./render2/renderer.js')]);
        const container = document.querySelector('#canvas-div');
        if (!(container instanceof HTMLElement)) {
            throw new Error('Battle canvas container was not found.');
        }

        renderer = new BattleRenderer({ THREE, container });
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
        // Only a fully installed 3D renderer is announced: the page and the stylesheet follow this reference.
        window.threeBattleRenderer = renderer;
        // The stylesheet and the classic renderer read this class: it hides the classic controls and shortcuts.
        document.documentElement.classList.add('renderer-three');
        return renderer;
    }
    catch (error) {
        console.error('Não foi possível iniciar o render 3D.', error);
        try {
            renderer?.destroy();
        }
        catch {
            // a half-built renderer must never keep the classic replay from starting
        }
        renderer = null;
        window.threeBattleRenderer = null;
        window.game = null;
        window.load_phaser = classicLoadRenderer;
        window.phaser_update = classicUpdateRenderer;
        if (statusArena) statusArena.textContent = 'Arena 3D indisponível; carregando modo clássico';
        return null;
    }
}

window.battleRendererReady = installThreeRenderer();
window.addEventListener('pagehide', () => renderer?.destroy(), { once: true });

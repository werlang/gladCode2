import { ThreeBattleRenderer } from './render2/three-battle-renderer.js';
import { SyntyHeroAssets } from './render2/synty-hero-assets.js';

const classicLoadRenderer = window.load_phaser;
const classicUpdateRenderer = window.phaser_update;
let renderer = null;
let rendererWasLoaded = false;

/**
 * Installs the Three.js renderer behind the legacy playback adapter boundary.
 *
 * @returns {Promise<ThreeBattleRenderer|null>} Active renderer or null after fallback.
 */
async function installThreeRenderer() {
    if (window.BattleRendererPreference?.get() !== window.BattleRendererPreference?.THREE) {
        return null;
    }

    const status = document.querySelector('#loadbar #status');
    if (status) status.textContent = 'Carregando arena 3D';

    try {
        const [THREE, { FBXLoader }, SkeletonUtils] = await Promise.all([
            import('three'),
            import('three/addons/loaders/FBXLoader.js'),
            import('three/addons/utils/SkeletonUtils.js'),
        ]);
        const container = document.querySelector('#canvas-div');
        if (!(container instanceof HTMLElement)) {
            throw new Error('Battle canvas container was not found.');
        }

        let heroAssets = null;
        try {
            if (status) status.textContent = 'Preparando heróis modulares';
            heroAssets = new SyntyHeroAssets({ THREE, FBXLoader, SkeletonUtils });
            await heroAssets.load((ratio) => {
                if (status) status.textContent = `Preparando heróis modulares ${Math.round(ratio * 100)}%`;
            });
        }
        catch (error) {
            heroAssets?.dispose();
            heroAssets = null;
            console.warn('Modelos Synty indisponíveis; usando gladiadores geométricos.', error);
            if (status) status.textContent = 'Carregando modelos alternativos';
        }

        renderer = new ThreeBattleRenderer({ THREE, container, heroAssets });
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
        return renderer;
    }
    catch (error) {
        console.error('Não foi possível iniciar o render 3D.', error);
        window.BattleRendererPreference?.set(window.BattleRendererPreference.CLASSIC);
        window.load_phaser = classicLoadRenderer;
        window.phaser_update = classicUpdateRenderer;
        if (status) status.textContent = 'Arena 3D indisponível; carregando modo clássico';
        return null;
    }
}

window.battleRendererReady = installThreeRenderer();
window.addEventListener('pagehide', () => renderer?.destroy(), { once: true });

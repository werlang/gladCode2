import { getAppearance, sampleSkinColors } from './palette.js';
import { renderPortrait } from './portrait.js';
import { loadSynty } from './synty-model.js';

/** Three.js namespace and the offscreen renderer, created on the first use. */
let engine = null;
/** Portrait canvases by skin: a promise each, so a skin is modelled once per page. */
const portraits = new Map();

/**
 * Loads Three.js and creates the offscreen renderer the portraits are drawn with.
 *
 * @returns {Promise<{ THREE: typeof import('three'), renderer: import('three').WebGLRenderer }>}
 */
async function startEngine() {
    if (!engine) {
        const THREE = await import('three');
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        engine = { THREE, renderer };
    }
    return engine;
}

/**
 * Models a batch of gladiators: one Synty load for all of them, then one portrait each.
 *
 * @param {string[]} skins Skin JSON of each gladiator.
 * @returns {Promise<HTMLCanvasElement[]>} Portraits in the same order.
 */
async function modelGladiators(skins) {
    const { THREE, renderer } = await startEngine();
    const colors = await sampleSkinColors(skins);
    const looks = skins.map((skin, index) => getAppearance(skin, index, colors));
    const createModel = await loadSynty(THREE, looks);
    return looks.map((look, index) => renderPortrait(THREE, renderer, createModel({ THREE, look, index })));
}

/**
 * The 3D portraits of gladiators, head and shoulders, drawn from the same Synty models that fight
 * in the arena. Each skin is modelled once and cached; a batch shares one load of the models.
 *
 * @param {string[]} skins Skin JSON of each gladiator.
 * @returns {Promise<HTMLCanvasElement[]>} Transparent square canvases, in the order of `skins`.
 * @throws When the 3D assets or WebGL are unavailable; the caller shows the pixel sprite instead.
 */
export function renderGladPortraits(skins) {
    const missing = [...new Set(skins)].filter(skin => !portraits.has(skin));
    if (missing.length) {
        const batch = modelGladiators(missing);
        missing.forEach((skin, index) => {
            const portrait = batch.then(canvases => canvases[index]);
            // a failed batch is forgotten so a later call can try again
            portrait.catch(() => portraits.delete(skin));
            portraits.set(skin, portrait);
        });
    }
    return Promise.all(skins.map(skin => portraits.get(skin)));
}

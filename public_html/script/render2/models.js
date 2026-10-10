import { ProceduralModel } from './procedural-model.js';

export const MODEL_KINDS = ['procedural', 'synty'];
const STORAGE_KEY = 'gladcode.render2.models';

/**
 * Picks the body model: `?models=` in the URL wins, then localStorage, then `synty`.
 *
 * @returns {'procedural'|'synty'} Requested model kind.
 */
export function resolveModelKind() {
    let requested = new URLSearchParams(window.location.search).get('models');
    try {
        requested ??= window.localStorage.getItem(STORAGE_KEY);
    }
    catch {
        // storage can be blocked; fall through to the default
    }
    return MODEL_KINDS.includes(requested) ? requested : 'synty';
}

/**
 * Builds the factory Fighter uses to create bodies. The Synty module (and its FBX assets) is only
 * imported when requested, and any failure falls back to the procedural model.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {Array<Record<string, any>>} looks Fighter appearances, used to preload only the needed assets.
 * @param {'procedural'|'synty'} kind Requested model kind.
 * @returns {Promise<{ kind: string, createModel: (options: object) => object }>} Model factory.
 */
export async function loadModelFactory(THREE, looks, kind = resolveModelKind()) {
    if (kind === 'synty') {
        try {
            const { loadSynty } = await import('./synty-model.js');
            return { kind, createModel: await loadSynty(THREE, looks) };
        }
        catch (error) {
            console.warn('Synty models unavailable, using procedural models.', error);
        }
    }
    return { kind: 'procedural', createModel: (options) => new ProceduralModel(options) };
}

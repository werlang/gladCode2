/**
 * Loads curated Synty animation FBXs and exposes their clips by semantic key.
 *
 * Clips come from the sword-combat pack and cover only the states where
 * packaged animation reads well in the arena: guard idles, block, hit
 * reacts, staggers, stun and directional deaths. Locomotion and attacks are
 * procedurally posed instead — the packaged cycles were authored on a
 * different skeleton proportion and slid badly once retargeted. Every FBX
 * carries a throwaway skeleton; only `animations[0]` is retained so the
 * runtime cost is a handful of keyframe tracks shared by every fighter.
 */

import { HERO_BONE_NAMES, RIG_BONE_PREFIX } from './synty-hero-animation.js';

export const CLIP_SOURCES = Object.freeze({
    idle: 'assets/sword-combat/Animations/Polygon/Idle/Base/A_Idle_Base_Sword.fbx',
    idleMenacing: 'assets/sword-combat/Animations/Polygon/Idle/Menacing01/A_Idle_Menacing01_Sword.fbx',
    idleEnergetic: 'assets/sword-combat/Animations/Polygon/Idle/Fidgets/A_Idle_EnergeticStance01_Sword.fbx',
    idleFlourish: 'assets/sword-combat/Animations/Polygon/Idle/Fidgets/A_Idle_Flourish01_Sword.fbx',
    block: 'assets/sword-combat/Animations/Polygon/Block/A_Block_Loop_Sword.fbx',
    deathF: 'assets/sword-combat/Animations/Polygon/Death/A_Death_F_01_Sword.fbx',
    deathB: 'assets/sword-combat/Animations/Polygon/Death/A_Death_B_01_Sword.fbx',
    deathL: 'assets/sword-combat/Animations/Polygon/Death/A_Death_L_01_Sword.fbx',
    deathR: 'assets/sword-combat/Animations/Polygon/Death/A_Death_R_01_Sword.fbx',
    hitF: 'assets/sword-combat/Animations/Polygon/Hit/HitReact/A_Hit_F_React_Sword.fbx',
    hitB: 'assets/sword-combat/Animations/Polygon/Hit/HitReact/A_Hit_B_React_Sword.fbx',
    hitL: 'assets/sword-combat/Animations/Polygon/Hit/HitReact/A_Hit_L_React_Sword.fbx',
    hitR: 'assets/sword-combat/Animations/Polygon/Hit/HitReact/A_Hit_R_React_Sword.fbx',
    staggerF: 'assets/sword-combat/Animations/Polygon/Hit/HitStagger/A_Hit_F_Stagger_Sword.fbx',
    staggerB: 'assets/sword-combat/Animations/Polygon/Hit/HitStagger/A_Hit_B_Stagger_Sword.fbx',
    staggerL: 'assets/sword-combat/Animations/Polygon/Hit/HitStagger/A_Hit_L_Stagger_Sword.fbx',
    staggerR: 'assets/sword-combat/Animations/Polygon/Hit/HitStagger/A_Hit_R_Stagger_Sword.fbx',
    stun: 'assets/sword-combat/Animations/Polygon/Hit/Stun/A_Stun_Loop_Sword.fbx',
});

export const ANIMATION_KEYS = Object.freeze(Object.keys(CLIP_SOURCES));

/** Disposes a loaded hierarchy while keeping its animation clips alive. */
function disposeHierarchy(object) {
    object.traverse((child) => {
        child.geometry?.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.filter(Boolean).forEach((material) => material.dispose());
    });
}

/**
 * Runtime library of shared Synty animation clips.
 */
export class SyntyAnimationLibrary {
    #clips = new Map();
    #failedKeys = [];
    #FBXLoader;

    /**
     * @param {{ FBXLoader: Function }} options Loader dependencies.
     */
    constructor({ FBXLoader }) {
        this.#FBXLoader = FBXLoader;
    }

    /**
     * Loads every curated clip, reporting aggregate progress.
     *
     * A single unreadable file is logged and skipped so one broken asset never
     * disables the whole animation system.
     *
     * @param {(ratio: number) => void} [onProgress] Completion ratio from zero to one.
     */
    async load(onProgress = undefined) {
        const entries = Object.entries(CLIP_SOURCES);
        let completed = 0;

        await Promise.all(entries.map(async ([key, url]) => {
            try {
                const loader = new this.#FBXLoader();
                const fbx = await new Promise((resolve, reject) => {
                    loader.load(url, resolve, undefined, reject);
                });
                const clip = fbx.animations[0];
                if (clip) {
                    clip.name = key;
                    this.#retargetClip(clip);
                    this.#clips.set(key, clip);
                }
                else {
                    this.#failedKeys.push(key);
                }
                disposeHierarchy(fbx);
            }
            catch (error) {
                this.#failedKeys.push(key);
                console.warn(`Animation clip "${key}" failed to load.`, error);
            }
            completed += 1;
            onProgress?.(completed / entries.length);
        }));
    }

    /**
     * Returns a loaded clip by key.
     *
     * @param {string} key Semantic clip key.
     * @returns {import('three').AnimationClip|undefined} Shared clip instance.
     */
    get(key) {
        return this.#clips.get(key);
    }

    /**
     * @param {string} key Semantic clip key.
     * @returns {boolean} Whether the clip loaded successfully.
     */
    has(key) {
        return this.#clips.has(key);
    }

    /** @returns {number} Count of successfully loaded clips. */
    get size() {
        return this.#clips.size;
    }

    /**
     * Rewrites clip tracks so they can only bind to the consolidated rig bones
     * (prefixed `GC_`), dropping tracks for nodes the arena rig does not carry
     * (root motion, eyes, jaw, fingers).
     *
     * @param {import('three').AnimationClip} clip freshly parsed clip.
     */
    #retargetClip(clip) {
        const animatedBones = new Set(HERO_BONE_NAMES);
        clip.tracks = clip.tracks
            .filter((track) => {
                const match = /^(\w+)\.(?:position|quaternion|scale)$/.exec(track.name);
                return match !== null && animatedBones.has(match[1]);
            })
            .map((track) => {
                track.name = track.name.replace(/^\w+\./, `${RIG_BONE_PREFIX}$&`);
                return track;
            });
    }

    /** @returns {string[]} Keys that failed to load or carried no animation. */
    get failedKeys() {
        return [...this.#failedKeys];
    }

    /**
     * Debug helper describing a clip's tracks for retargeting diagnostics.
     *
     * @param {string} key Semantic clip key.
     * @returns {{ duration: number, tracks: string[] }|null} Track summary.
     */
    inspect(key) {
        const clip = this.#clips.get(key);
        if (!clip) return null;
        return {
            duration: clip.duration,
            tracks: clip.tracks.map((track) => track.name),
        };
    }
}

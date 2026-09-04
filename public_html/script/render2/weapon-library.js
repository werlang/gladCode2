/**
 * Shared parser and cache for the rigid weapon FBXs introduced with the
 * bow-crossbow, dungeon-pack and ancient-empire drops.
 *
 * The Synty FBX drops reference their atlas textures by stale `.psd` names
 * that no longer exist next to the shipped `.png` files. Every parse goes
 * through one LoadingManager whose URL modifier renames those requests onto
 * the real files, so meshes come out textured without touching the sources.
 */

const TEXTURE_REMAP = Object.freeze({
    // bow-crossbow pack ships one PNG; both spellings appear inside the FBXs.
    'texture_01.psd': 'assets/bow-crossbow/Texture_01.png',
    'texture_01.png': 'assets/bow-crossbow/Texture_01.png',
    // dungeon-pack weapons share the character atlas.
    'dungeons_texture.psd': 'assets/dungeon-pack/Textures/Dungeons_Texture_01.png',
    'dungeons_texture.png': 'assets/dungeon-pack/Textures/Dungeons_Texture_01.png',
    // ancient-empire renamed its atlases after authoring the FBXs.
    'polygonancientworlds_texture_01.psd': 'assets/ancient-empire/Textures/Alts/PolygonAncientWorlds_Texture_01_A.png',
    'polygonancientworlds_texture_01.png': 'assets/ancient-empire/Textures/Alts/PolygonAncientWorlds_Texture_01_A.png',
    'polygonancientworlds_texture_01_mike.psd': 'assets/ancient-empire/Textures/Alts/PolygonAncientWorlds_Texture_01_A.png',
    'building_marble_02.png': 'assets/ancient-empire/Textures/BuildingAlts/Building_Marble_02.png',
});

/** Disposes unique geometry/material resources below an object. */
export function disposeObjectResources(object, disposed) {
    object?.traverse((child) => {
        if (child.geometry && !disposed.has(child.geometry)) {
            disposed.add(child.geometry);
            child.geometry.dispose();
        }
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.filter(Boolean).forEach((material) => {
            if (disposed.has(material)) return;
            disposed.add(material);
            material.dispose();
        });
    });
}

/**
 * Parses weapon FBXs once and hands out SkeletonUtils-safe clones.
 *
 * Cloning through SkeletonUtils keeps skinned sources such as the rigged bow
 * bound correctly; static meshes pass through unaffected.
 */
export class WeaponLibrary {
    #FBXLoader;
    #SkeletonUtils;
    #THREE;
    #sources = new Map();
    #textures = new Map();
    #failedFiles = [];

    /**
     * @param {{ THREE: typeof import('three'), FBXLoader: Function, SkeletonUtils: { clone: Function } }} options Loader dependencies.
     */
    constructor({ THREE, FBXLoader, SkeletonUtils }) {
        this.#THREE = THREE;
        this.#FBXLoader = FBXLoader;
        this.#SkeletonUtils = SkeletonUtils;
    }

    /** Rewrites stale atlas filenames onto the shipped PNG files. */
    #buildManager() {
        const manager = new this.#THREE.LoadingManager();
        manager.setURLModifier((url) => {
            const base = decodeURIComponent(url.split(/[\\/]/).pop()).toLowerCase();
            return TEXTURE_REMAP[base] ?? url;
        });
        return manager;
    }

    /**
     * Parses every requested FBX file up front.
     *
     * @param {string[]} files Repository-relative FBX paths under public_html.
     */
    async load(files) {
        await Promise.all(files.map(async (file) => {
            try {
                const loader = new this.#FBXLoader(this.#buildManager());
                const source = await new Promise((resolve, reject) => {
                    loader.load(file, resolve, undefined, reject);
                });
                this.#sources.set(file, source);
            }
            catch (error) {
                this.#failedFiles.push(file);
                console.warn(`Weapon asset "${file}" failed to load.`, error);
            }
        }));
    }

    /**
     * Returns whether a parsed source exists for the file.
     *
     * @param {string} file Repository-relative FBX path.
     * @returns {boolean} Availability.
     */
    has(file) {
        return this.#sources.has(file);
    }

    /**
     * Creates an independent clone of a cached source hierarchy.
     *
     * @param {string} file Repository-relative FBX path.
     * @returns {import('three').Group|null} Clone sharing cached geometry, or null when unavailable.
     */
    clone(file) {
        const source = this.#sources.get(file);
        return source ? this.#SkeletonUtils.clone(source) : null;
    }

    /**
     * Loads (and memoizes) one atlas texture as a shared weapon material.
     *
     * @param {string} file Texture path used as the cache key.
     * @param {{ roughness?: number, metalness?: number }} [options] Surface response.
     * @returns {import('three').MeshStandardMaterial} Shared material.
     */
    atlasMaterial(file, options = {}) {
        const cached = this.#textures.get(file);
        if (cached) return cached;

        const texture = new this.#THREE.TextureLoader().load(file);
        texture.colorSpace = this.#THREE.SRGBColorSpace;
        texture.flipY = false;
        this.#textures.set(`${file}:tex`, texture);
        const material = new this.#THREE.MeshStandardMaterial({
            map: texture,
            roughness: options.roughness ?? 0.55,
            metalness: options.metalness ?? 0.35,
        });
        this.#textures.set(file, material);
        return material;
    }

    /** @returns {string[]} Files that failed to parse. */
    get failedFiles() {
        return [...this.#failedFiles];
    }

    /** Releases cached GPU resources. */
    dispose() {
        const disposed = new Set();
        this.#sources.forEach((source) => disposeObjectResources(source, disposed));
        this.#textures.forEach((value) => {
            if (value.isTexture && !disposed.has(value)) {
                disposed.add(value);
                value.dispose();
            }
            else if (value.dispose) value.dispose();
        });
        this.#sources.clear();
        this.#textures.clear();
    }
}

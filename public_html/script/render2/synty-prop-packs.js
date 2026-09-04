import { WeaponLibrary } from './weapon-library.js';

/**
 * Static dressing pieces for the coliseum, drawn from the dungeon-pack and
 * ancient-empire drops.
 *
 * Every entry parses once; instances clone the cached hierarchy and share one
 * converted MeshStandardMaterial set per source file so the whole arena costs
 * a handful of GPU buffers regardless of piece count.
 */
export const PROP_REGISTRY = Object.freeze({
    // Ancient Empire structures.
    pillar: { file: 'assets/ancient-empire/FBX/Buildings/SM_Bld_Pillar_Large_02.fbx', fit: 'height', size: 3.95, anchor: 'ground', tint: 0xd8d2c6 },
    statue: { file: 'assets/ancient-empire/FBX/Props/SM_Prop_Statue_01.fbx', fit: 'height', size: 2.25, anchor: 'ground' },
    lionStatue: { file: 'assets/ancient-empire/FBX/Props/SM_Prop_Statue_Lion_01.fbx', fit: 'height', size: 1.45, anchor: 'ground' },
    // Dungeon-pack props and fittings.
    brazier: { file: 'assets/dungeon-pack/FBX/SM_Prop_Brazier_01.fbx', fit: 'height', size: 0.82, anchor: 'ground' },
    torch: { file: 'assets/dungeon-pack/FBX/SM_Prop_Torch_Ornate_01.fbx', fit: 'height', size: 0.85, anchor: 'ground' },
    wallBanner: { file: 'assets/dungeon-pack/FBX/SM_Prop_Wall_Banner_01.fbx', fit: 'height', size: 2.05, anchor: 'top', doubleSide: true },
    throne: { file: 'assets/dungeon-pack/FBX/SM_Env_Stone_Throne_01.fbx', fit: 'height', size: 1.5, anchor: 'ground' },
    portcullis: { file: 'assets/dungeon-pack/FBX/SM_Env_Portcullis_01.fbx', fit: 'width', size: 3.0, anchor: 'ground' },
    weaponRack: { file: 'assets/dungeon-pack/FBX/SM_Prop_WeaponRack_01.fbx', fit: 'width', size: 1.7, anchor: 'ground' },
    obelisk: { file: 'assets/dungeon-pack/FBX/SM_Env_Obelisk_01.fbx', fit: 'height', size: 4.4, anchor: 'ground' },
    bonePile: { file: 'assets/dungeon-pack/FBX/SM_Env_BonePile_01.fbx', fit: 'width', size: 1.35, anchor: 'ground' },
});

/**
 * Lists every prop FBX referenced by the registry so loaders can prefetch.
 *
 * @returns {string[]} Unique repository-relative FBX paths.
 */
export function listPropAssetFiles() {
    return [...new Set(Object.values(PROP_REGISTRY).map((entry) => entry.file))];
}

/**
 * Bakes transformed copies of a prop's meshes into a single geometry so large
 * repeated structures (the colonnade) cost one draw call instead of one per
 * piece.
 *
 * Only the attributes every piece shares survive the merge; the result is
 * non-indexed, which matches FBXLoader output and keeps the helper free of
 * addon dependencies.
 *
 * @param {typeof import('three')} THREE Active Three.js module.
 * @param {Array<{ geometry: import('three').BufferGeometry, matrix: import('three').Matrix4 }>} entries Piece geometries with their final world transforms.
 * @returns {import('three').BufferGeometry|null} Merged geometry, or null when nothing was supplied.
 */
export function mergePropGeometries(THREE, entries) {
    if (!entries.length) return null;

    const names = ['position', 'normal', 'uv'];
    const buffers = { position: [], normal: [], uv: [] };
    entries.forEach(({ geometry, matrix }) => {
        const source = geometry.index ? geometry.toNonIndexed() : geometry;
        const baked = source.clone().applyMatrix4(matrix);
        names.forEach((name) => {
            const attribute = baked.getAttribute(name);
            if (attribute) buffers[name].push(attribute.array);
        });
        baked.dispose();
        if (source !== geometry) source.dispose();
    });

    const merged = new THREE.BufferGeometry();
    Object.entries(buffers).forEach(([name, chunks]) => {
        if (!chunks.length || chunks.length !== entries.length) return;
        const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const mergedArray = new Float32Array(total);
        let offset = 0;
        chunks.forEach((chunk) => {
            mergedArray.set(chunk, offset);
            offset += chunk.length;
        });
        merged.setAttribute(name, new THREE.BufferAttribute(mergedArray, name === 'uv' ? 2 : 3));
    });
    return merged;
}

/** Small deterministic hash noise for scatter placement. */
function hash2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
}

/**
 * Loads and serves the coliseum dressing meshes.
 */
export class SyntyPropAssets {
    #THREE;
    #library = null;
    #materials = new Map();

    /**
     * @param {{ THREE: typeof import('three'), FBXLoader: Function, SkeletonUtils: { clone: Function } }} options Loader dependencies.
     */
    constructor({ THREE, FBXLoader, SkeletonUtils }) {
        this.#THREE = THREE;
        this.#library = new WeaponLibrary({ THREE, FBXLoader, SkeletonUtils });
    }

    /** Parses every registered prop FBX through the shared weapon library. */
    async load() {
        await this.#library.load(listPropAssetFiles());
        if (this.#library.failedFiles.length) {
            throw new Error(`Prop assets failed to parse: ${this.#library.failedFiles.join(', ')}`);
        }
    }

    /** @param {string} key Registry key. @returns {boolean} Whether the prop parsed successfully. */
    has(key) {
        const entry = PROP_REGISTRY[key];
        return Boolean(entry && this.#library?.has(entry.file));
    }

    /**
     * Converts (and memoizes) one source's materials into shared Standard materials.
     *
     * Textured slots keep their remapped atlas maps; untextured slots fall back
     * to the registry tint or a neutral stone.
     *
     * @param {string} key Registry key.
     * @returns {Array<import('three').MeshStandardMaterial>} Material set shared by all clones of this prop.
     */
    #materialSet(key) {
        const cached = this.#materials.get(key);
        if (cached) return cached;

        const THREE = this.#THREE;
        const entry = PROP_REGISTRY[key];
        const seen = new Map();
        const side = entry.doubleSide ? THREE.DoubleSide : THREE.FrontSide;
        const fallback = new THREE.MeshStandardMaterial({
            color: entry.tint ?? 0x8f8a80,
            roughness: 0.82,
            metalness: 0.12,
            // Banners and other flat pieces need both faces; solid props keep
            // front-side rendering for half the fragment work.
            side,
        });
        const set = [fallback];

        const source = this.#library.clone(entry.file);
        source?.traverse((object) => {
            if (!object.isMesh) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.filter(Boolean).forEach((material) => {
                if (!material.map || seen.has(material.map.uuid)) return;
                material.map.colorSpace = THREE.SRGBColorSpace;
                seen.set(material.map.uuid, material.map);
                set.push(new THREE.MeshStandardMaterial({
                    map: material.map,
                    roughness: 0.72,
                    metalness: 0.18,
                    side,
                }));
            });
        });

        this.#materials.set(key, set);
        return set;
    }

    /**
     * Builds a world-normalized instance of one prop.
     *
     * @param {string} key Registry key.
     * @param {{ tint?: number }} [overrides] Optional tint replacing the default stone fallback.
     * @returns {import('three').Group|null} Instance anchored per its registry entry, or null when unavailable.
     */
    create(key, overrides = {}) {
        const entry = PROP_REGISTRY[key];
        if (!entry || !this.has(key)) return null;

        const THREE = this.#THREE;
        const instance = this.#library.clone(entry.file);
        const materialSet = this.#materialSet(key);
        const primary = overrides.tint
            ? new THREE.MeshStandardMaterial({ color: overrides.tint, roughness: 0.82, metalness: 0.12 })
            : null;
        instance.traverse((object) => {
            if (!object.isMesh) return;
            object.material = primary ?? materialSet;
            object.castShadow = true;
            object.receiveShadow = true;
        });

        instance.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(instance);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const reference = entry.fit === 'width'
            ? Math.max(size.x, size.z)
            : size.y;
        const scale = entry.size / Math.max(reference, 1e-4);

        // Anchor semantics make placement deterministic. The offset is baked
        // into the inner instance so the returned group's origin is the anchor
        // point itself: callers position the group without re-deriving offsets.
        const anchorShift = entry.anchor === 'top'
            ? -bounds.max.y
            : entry.anchor === 'center'
                ? -center.y
                : -bounds.min.y;
        instance.position.set(-center.x, anchorShift, -center.z);
        const normalized = new THREE.Group();
        normalized.scale.setScalar(scale);
        normalized.add(instance);
        return normalized;
    }

    /**
     * Builds one merged mesh containing the prop repeated at every transform.
     *
     * Used for large repeated structures (the colonnade) so the whole ring
     * costs a single draw call. The source FBX normalization (world size,
     * anchor) is baked into every piece exactly as `create()` does, and
     * multi-slot sources collapse onto their first textured material.
     *
     * @param {string} key Registry key.
     * @param {Array<{ position?: number[], rotationY?: number }>} transforms World placements.
     * @param {{ tint?: number }} [overrides] Optional tint replacing the default material.
     * @returns {import('three').Mesh|null} Merged mesh, or null when unavailable.
     */
    createMerged(key, transforms, overrides = {}) {
        const entry = PROP_REGISTRY[key];
        if (!entry || !this.has(key) || !transforms.length) return null;

        const THREE = this.#THREE;
        const template = this.#library.clone(entry.file);
        const materialSet = this.#materialSet(key);
        const material = overrides.tint
            ? new THREE.MeshStandardMaterial({ color: overrides.tint, roughness: 0.82, metalness: 0.12 })
            : materialSet.find((candidate) => candidate.map) ?? materialSet[0];

        template.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(template);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const reference = entry.fit === 'width' ? Math.max(size.x, size.z) : size.y;
        const scale = entry.size / Math.max(reference, 1e-4);
        const anchorShift = entry.anchor === 'top'
            ? -bounds.max.y
            : entry.anchor === 'center'
                ? -center.y
                : -bounds.min.y;

        const pieces = [];
        template.traverse((object) => {
            if (object.isMesh) pieces.push({ geometry: object.geometry, local: object.matrixWorld.clone() });
        });
        if (!pieces.length) return null;

        // Mirror create(): recenter on X/Z, apply the fit scale, then shift so
        // the anchor point sits on the group origin. Applied to every piece
        // before the per-instance placement so raw FBX units never leak out.
        const normal = new THREE.Matrix4().makeTranslation(0, anchorShift * scale, 0)
            .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
            .multiply(new THREE.Matrix4().makeTranslation(-center.x, 0, -center.z));

        const entries = [];
        transforms.forEach(({ position = [0, 0, 0], rotationY = 0 }) => {
            const world = new THREE.Matrix4().makeRotationY(rotationY)
                .setPosition(position[0], position[1] ?? 0, position[2]);
            pieces.forEach(({ geometry, local }) => {
                entries.push({ geometry, matrix: world.clone().multiply(normal).multiply(local) });
            });
        });

        const geometry = mergePropGeometries(THREE, entries);
        if (!geometry) return null;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    /** Deterministic pseudo-random helper reused by arena scatter layouts. */
    static hash2(x, y) {
        return hash2(x, y);
    }

    /** Releases cached GPU resources once every instance has been removed. */
    dispose() {
        const disposed = new Set();
        this.#materials.forEach((set) => set.forEach((material) => {
            if (disposed.has(material)) return;
            disposed.add(material);
            material.dispose();
        }));
        this.#materials.clear();
        this.#library?.dispose();
        this.#library = null;
    }
}

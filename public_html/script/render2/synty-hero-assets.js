import { getSyntyHeroConfig } from './synty-hero-config.js';

const ASSET_ROOT = 'assets/synty-modular-heroes';
const CHARACTER_ASSET = `${ASSET_ROOT}/FBX/ModularCharactersFixedScale.fbx`;
const TEXTURE_ROOT = `${ASSET_ROOT}/Textures`;
const WEAPON_ROOT = `${ASSET_ROOT}/FBX/Weapons`;

/** Loads one FBX while exposing byte progress for the large character source. */
function loadFbx(loader, url, onProgress = undefined) {
    return new Promise((resolve, reject) => loader.load(url, resolve, onProgress, reject));
}

/** Removes unused modular meshes and their disconnected bones from a clone. */
function pruneCharacter(character, selectedNames) {
    const discardedMeshes = [];
    const selectedMeshes = [];

    character.traverse((object) => {
        if (!object.isMesh) return;
        if (selectedNames.has(object.name)) selectedMeshes.push(object);
        else discardedMeshes.push(object);
    });
    discardedMeshes.forEach((mesh) => mesh.removeFromParent());

    const requiredBones = new Set();
    selectedMeshes.forEach((mesh) => {
        mesh.skeleton?.bones.forEach((bone) => {
            let current = bone;
            while (current && current !== character.parent) {
                requiredBones.add(current);
                current = current.parent;
            }
        });
    });

    const discardedBones = [];
    character.traverse((object) => {
        if (object.isBone && !requiredBones.has(object)) discardedBones.push(object);
    });
    discardedBones.forEach((bone) => bone.removeFromParent());

    return selectedMeshes;
}

/** Disposes unique loader-owned geometry and material resources. */
function disposeObjectResources(object, disposed) {
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
 * Runtime adapter for the user-provided Synty modular hero pack.
 *
 * The large FBX is parsed once. Each fighter shares its geometry, owns one
 * palette material, and retains only the selected modular meshes and bones.
 */
export class SyntyHeroAssets {
    #FBXLoader;
    #SkeletonUtils;
    #THREE;
    #characterSource = null;
    #textures = new Map();
    #weapons = new Map();

    /**
     * @param {{ THREE: typeof import('three'), FBXLoader: Function, SkeletonUtils: { clone: Function } }} options Three.js loader dependencies.
     */
    constructor({ THREE, FBXLoader, SkeletonUtils }) {
        this.#THREE = THREE;
        this.#FBXLoader = FBXLoader;
        this.#SkeletonUtils = SkeletonUtils;
    }

    /**
     * Parses the body, palette atlases, and the three rigid weapon categories.
     *
     * @param {(ratio: number) => void} [onProgress] Character-source byte progress.
     */
    async load(onProgress = undefined) {
        const fbxLoader = new this.#FBXLoader();
        const textureLoader = new this.#THREE.TextureLoader();
        const textureNames = [
            'PolygonFantasyHero_Texture_01.png',
            'PolygonFantasyHero_Texture_01_A.png',
            'PolygonFantasyHero_Texture_01_B.png',
            'PolygonFantasyHero_Texture_01_C.png',
            'PolygonFantasyHero_Texture_02_A.png',
            'PolygonFantasyHero_Texture_02_B.png',
            'PolygonFantasyHero_Texture_02_C.png',
            'PolygonFantasyHero_Texture_03_A.png',
            'PolygonFantasyHero_Texture_03_B.png',
            'PolygonFantasyHero_Texture_03_C.png',
            'PolygonFantasyHero_Texture_04_A.png',
            'PolygonFantasyHero_Texture_04_B.png',
            'PolygonFantasyHero_Texture_04_C.png',
        ];
        const weaponNames = [
            'SK_Wep_Joust_01.fbx',
            'SK_Wep_Staff_01.fbx',
            'SK_Wep_Sword_01.fbx',
        ];

        const characterPromise = loadFbx(fbxLoader, CHARACTER_ASSET, (event) => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total);
        });
        const texturePromises = textureNames.map(async (name) => {
            const texture = await textureLoader.loadAsync(`${TEXTURE_ROOT}/${name}`);
            texture.colorSpace = this.#THREE.SRGBColorSpace;
            texture.flipY = false;
            this.#textures.set(name, texture);
        });
        const weaponPromises = weaponNames.map(async (name) => {
            this.#weapons.set(name, await loadFbx(fbxLoader, `${WEAPON_ROOT}/${name}`));
        });

        [this.#characterSource] = await Promise.all([
            characterPromise,
            Promise.all(texturePromises),
            Promise.all(weaponPromises),
        ]);
        onProgress?.(1);
    }

    /**
     * Creates a lightweight modular fighter from shared source resources.
     *
     * @param {{ name?: string, user?: string }} gladiator Fighter metadata.
     * @param {ReturnType<import('./gladiator-appearance.js').getGladiatorAppearance>} appearance Visual contract.
     * @returns {{ object: import('three').Group, material: import('three').MeshStandardMaterial, mixer: import('three').AnimationMixer|null, action: import('three').AnimationAction|null, weapon: import('three').Group|null, dispose(): void }} Hero resources.
     */
    createHero(gladiator, appearance) {
        if (!this.#characterSource) throw new Error('Synty hero assets are not loaded.');

        const THREE = this.#THREE;
        const config = getSyntyHeroConfig(gladiator, appearance);
        const character = this.#SkeletonUtils.clone(this.#characterSource);
        const selectedMeshes = pruneCharacter(character, new Set(config.meshes));
        if (selectedMeshes.length !== config.meshes.length) {
            throw new Error(`Synty modular selection is incomplete (${selectedMeshes.length}/${config.meshes.length}).`);
        }

        const texture = this.#textures.get(config.textureAsset);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: texture,
            metalness: appearance.armor === 'metal' || appearance.armor === 'gold' ? 0.2 : 0.04,
            roughness: appearance.armor === 'metal' || appearance.armor === 'gold' ? 0.58 : 0.78,
        });
        selectedMeshes.forEach((mesh) => {
            mesh.material = material;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
        });

        character.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(character);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const content = new THREE.Group();
        const scale = 2.3 / Math.max(size.y, 1);
        character.position.set(-center.x, -bounds.min.y, -center.z);
        content.scale.setScalar(scale);
        content.add(character);

        const object = new THREE.Group();
        object.name = 'synty-modular-hero';
        object.add(content);

        let mixer = null;
        let action = null;
        if (this.#characterSource.animations.length) {
            mixer = new THREE.AnimationMixer(character);
            action = mixer.clipAction(this.#characterSource.animations[0]);
            action.setLoop(THREE.LoopPingPong, Infinity);
            action.setEffectiveWeight(0.24);
            action.play();
        }

        return {
            object,
            material,
            mixer,
            action,
            weapon: this.#createWeapon(config.weaponAsset, material),
            dispose() {
                mixer?.stopAllAction();
                if (mixer) mixer.uncacheRoot(character);
            },
        };
    }

    /** Builds a normalized rigid weapon that can use the same palette atlas. */
    #createWeapon(assetName, material) {
        if (!assetName) return null;
        const source = this.#weapons.get(assetName);
        if (!source) return null;

        const THREE = this.#THREE;
        const weapon = this.#SkeletonUtils.clone(source);
        weapon.traverse((object) => {
            if (!object.isMesh) return;
            object.material = material;
            object.castShadow = true;
            object.receiveShadow = true;
        });
        weapon.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(weapon);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const longestSide = Math.max(size.x, size.y, size.z, 1);
        const targetLength = assetName.includes('Joust') ? 1.55 : assetName.includes('Staff') ? 1.42 : 1.08;

        weapon.position.copy(center).multiplyScalar(-1);
        const normalized = new THREE.Group();
        normalized.scale.setScalar(targetLength / longestSide);
        normalized.add(weapon);
        return normalized;
    }

    /** Releases source-pack GPU resources after every fighter has been removed. */
    dispose() {
        const disposed = new Set();
        disposeObjectResources(this.#characterSource, disposed);
        this.#weapons.forEach((weapon) => disposeObjectResources(weapon, disposed));
        this.#textures.forEach((texture) => {
            if (disposed.has(texture)) return;
            disposed.add(texture);
            texture.dispose();
        });
        this.#characterSource = null;
        this.#weapons.clear();
        this.#textures.clear();
    }
}

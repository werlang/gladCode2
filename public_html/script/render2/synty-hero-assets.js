import { getSyntyHeroConfig } from './synty-hero-config.js';
import { HERO_BONE_NAMES } from './synty-hero-animation.js';

const ASSET_ROOT = 'assets/synty-modular-heroes';
const CHARACTER_ASSET = `${ASSET_ROOT}/FBX/ModularCharactersFixedScale.fbx`;
const TEXTURE_ROOT = `${ASSET_ROOT}/Textures`;
const WEAPON_ROOT = `${ASSET_ROOT}/FBX/Weapons`;

/** Loads one FBX while exposing byte progress for the large character source. */
function loadFbx(loader, url, onProgress = undefined) {
    return new Promise((resolve, reject) => loader.load(url, resolve, onProgress, reject));
}

/** Removes modular meshes that are not part of this fighter. */
function pruneCharacter(character, selectedNames) {
    const discardedMeshes = [];
    const selectedMeshes = [];

    character.traverse((object) => {
        if (!object.isMesh) return;
        if (selectedNames.has(object.name)) selectedMeshes.push(object);
        else discardedMeshes.push(object);
    });
    discardedMeshes.forEach((mesh) => mesh.removeFromParent());

    return selectedMeshes;
}

/** Distinguishes the pack's duplicated left/right finger bone names. */
function getBoneKey(bone) {
    if (!bone?.name) return '';
    if (!/^(?:Thumb|IndexFinger|Finger)_/.test(bone.name)) return bone.name;

    let current = bone.parent;
    while (current?.isBone) {
        if (current.name === 'Hand_L') return `${bone.name}:L`;
        if (current.name === 'Hand_R') return `${bone.name}:R`;
        current = current.parent;
    }
    return bone.name;
}

/** Finds the nearest ancestor that does not repeat the same pack bone name. */
function getCanonicalParentKey(bone) {
    const ownKey = getBoneKey(bone);
    let parent = bone.parent;
    while (parent?.isBone && getBoneKey(parent) === ownKey) parent = parent.parent;
    return parent?.isBone ? getBoneKey(parent) : null;
}

/** Scores the authored transform above the pack's identity wrapper bones. */
function getBoneRepresentativeScore(bone) {
    const transformed = bone.position.lengthSq() > 1e-8
        || Math.abs(bone.quaternion.w - 1) > 1e-6
        || Math.abs(bone.quaternion.x) > 1e-6
        || Math.abs(bone.quaternion.y) > 1e-6
        || Math.abs(bone.quaternion.z) > 1e-6;
    return Number(transformed);
}

/**
 * Rebinds every selected modular mesh to one canonical skeleton.
 *
 * The source FBX contains identity-wrapped copies of the rig for each modular
 * part. Animating every same-named copy makes the pieces diverge. Reusing one
 * authored transform per semantic bone keeps every mesh seam connected.
 */
function consolidateCharacterRig(THREE, character, selectedMeshes) {
    const sourceBones = new Set();
    selectedMeshes.forEach((mesh) => {
        mesh.skeleton?.bones.forEach((bone) => {
            let current = bone;
            while (current?.isBone) {
                sourceBones.add(current);
                current = current.parent;
            }
        });
    });

    const representatives = new Map();
    sourceBones.forEach((bone) => {
        const key = getBoneKey(bone);
        const current = representatives.get(key);
        if (!current || getBoneRepresentativeScore(bone) > getBoneRepresentativeScore(current)) {
            representatives.set(key, bone);
        }
    });

    const bones = new Map();
    representatives.forEach((source, key) => {
        const bone = new THREE.Bone();
        bone.name = key;
        bone.position.copy(source.position);
        bone.quaternion.copy(source.quaternion);
        bone.scale.copy(source.scale);
        bones.set(key, bone);
    });

    representatives.forEach((source, key) => {
        const bone = bones.get(key);
        const parent = bones.get(getCanonicalParentKey(source));
        if (parent) parent.add(bone);
        else character.add(bone);
    });

    character.updateMatrixWorld(true);
    selectedMeshes.forEach((mesh) => {
        const mappedBones = mesh.skeleton.bones.map((sourceBone) => bones.get(getBoneKey(sourceBone)));
        if (mappedBones.some((bone) => !bone)) {
            throw new Error(`Synty skeleton mapping is incomplete for ${mesh.name}.`);
        }
        const boneInverses = mesh.skeleton.boneInverses.map((inverse) => inverse.clone());
        mesh.bind(new THREE.Skeleton(mappedBones, boneInverses), mesh.bindMatrix.clone());
    });

    const originalRoots = [];
    character.traverse((object) => {
        if (object.isBone && sourceBones.has(object) && !object.parent?.isBone) originalRoots.push(object);
    });
    originalRoots.forEach((root) => root.removeFromParent());
    character.updateMatrixWorld(true);

    return bones;
}

/** Applies authored local rotation deltas to the consolidated Synty skeleton. */
class SyntyHeroRig {
    #bones;
    #deltaQuaternion;
    #euler;
    #restQuaternions = new Map();

    constructor(THREE, bones) {
        this.#bones = bones;
        this.#euler = new THREE.Euler(0, 0, 0, 'XYZ');
        this.#deltaQuaternion = new THREE.Quaternion();
        HERO_BONE_NAMES.forEach((name) => {
            const bone = bones.get(name);
            if (bone) this.#restQuaternions.set(name, bone.quaternion.clone());
        });
    }

    /** Applies a complete pose relative to the pack's authored bind pose. */
    applyPose(pose) {
        HERO_BONE_NAMES.forEach((name) => {
            const bone = this.#bones.get(name);
            const rest = this.#restQuaternions.get(name);
            const rotation = pose.bones[name];
            if (!bone || !rest || !rotation) return;
            this.#euler.set(rotation.x, rotation.y, rotation.z);
            this.#deltaQuaternion.setFromEuler(this.#euler);
            bone.quaternion.copy(rest).multiply(this.#deltaQuaternion);
        });
    }

    /** Mounts world-normalized equipment on either canonical hand. */
    attachEquipment(THREE, equipment, contentScale, {
        handName = 'Hand_R',
        rotation = [0, 0, 0],
    } = {}) {
        const hand = this.#bones.get(handName);
        if (!hand || !equipment) return null;

        const mount = new THREE.Group();
        mount.name = 'synty-weapon-mount';
        mount.scale.setScalar(1 / contentScale);
        mount.rotation.set(...rotation);
        mount.add(equipment);
        hand.add(mount);
        return mount;
    }
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
     * @returns {{ object: import('three').Group, material: import('three').MeshStandardMaterial, rig: SyntyHeroRig, contentScale: number, weapon: import('three').Group|null, dispose(): void }} Hero resources.
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
        const rig = new SyntyHeroRig(THREE, consolidateCharacterRig(THREE, character, selectedMeshes));

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

        const weapon = this.#createWeapon(config.weaponAsset, material);
        if (weapon) {
            weapon.position.y = appearance.weapon === 'staff' || appearance.weapon === 'spear' ? 0.34 : 0.28;
            rig.attachEquipment(THREE, weapon, scale, {
                rotation: [0, 0, appearance.weapon === 'staff' || appearance.weapon === 'spear' ? -Math.PI / 2 : Math.PI / 2],
            });
        }

        return {
            object,
            material,
            rig,
            contentScale: scale,
            weapon,
            dispose() {},
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

import { getSyntyHeroConfig, WEAPON_ASSET_REGISTRY, listWeaponAssetFiles } from './synty-hero-config.js';
import { HERO_BONE_NAMES } from './synty-hero-animation.js';
import { WeaponLibrary, disposeObjectResources } from './weapon-library.js';

const ASSET_ROOT = 'assets/synty-modular-heroes';
const CHARACTER_ASSET = `${ASSET_ROOT}/FBX/ModularCharactersFixedScale.fbx`;
const TEXTURE_ROOT = `${ASSET_ROOT}/Textures`;
/** Projectile mesh flown by ranged fighters; kept out of the equipment registry. */
const ARROW_ASSET_FILE = 'assets/bow-crossbow/SM_Arrow_01.fbx';

/** Shared atlas surface settings per non-hero equipment pack. */
const PACK_ATLASES = Object.freeze({
    dungeon: {
        texture: 'assets/dungeon-pack/Textures/Dungeons_Texture_01.png',
        roughness: 0.55,
        metalness: 0.35,
    },
    empire: {
        texture: 'assets/ancient-empire/Textures/Alts/PolygonAncientWorlds_Texture_01_A.png',
        roughness: 0.5,
        metalness: 0.45,
    },
    bow: {
        texture: 'assets/bow-crossbow/Texture_01.png',
        roughness: 0.68,
        metalness: 0.22,
    },
});

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
            this.#euler.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
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

/**
 * Runtime adapter for the user-provided Synty modular hero pack.
 *
 * The large FBX is parsed once. Each fighter shares its geometry, owns one
 * palette material, and retains only the selected modular meshes and bones.
 * Ranged and melee equipment come from every dropped weapon pack through the
 * shared WeaponLibrary cache.
 */
export class SyntyHeroAssets {
    #FBXLoader;
    #SkeletonUtils;
    #THREE;
    #characterSource = null;
    #textures = new Map();
    #weaponLibrary = null;

    /**
     * @param {{ THREE: typeof import('three'), FBXLoader: Function, SkeletonUtils: { clone: Function } }} options Three.js loader dependencies.
     */
    constructor({ THREE, FBXLoader, SkeletonUtils }) {
        this.#THREE = THREE;
        this.#FBXLoader = FBXLoader;
        this.#SkeletonUtils = SkeletonUtils;
    }

    /**
     * Parses the body, palette atlases, and every registered equipment FBX.
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

        const characterPromise = loadFbx(fbxLoader, CHARACTER_ASSET, (event) => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total);
        });
        const texturePromises = textureNames.map(async (name) => {
            const texture = await textureLoader.loadAsync(`${TEXTURE_ROOT}/${name}`);
            texture.colorSpace = this.#THREE.SRGBColorSpace;
            texture.flipY = false;
            this.#textures.set(name, texture);
        });

        this.#weaponLibrary = new WeaponLibrary({
            THREE: this.#THREE,
            FBXLoader: this.#FBXLoader,
            SkeletonUtils: this.#SkeletonUtils,
        });

        [this.#characterSource] = await Promise.all([
            characterPromise,
            Promise.all(texturePromises),
            this.#weaponLibrary.load([...listWeaponAssetFiles(), ARROW_ASSET_FILE]),
        ]);
        onProgress?.(1);
    }

    /** Lazily built shared materials for the newer equipment packs. */
    #packMaterial(pack) {
        const atlas = PACK_ATLASES[pack];
        if (!atlas || !this.#weaponLibrary) return null;
        return this.#weaponLibrary.atlasMaterial(atlas.texture, {
            roughness: atlas.roughness,
            metalness: atlas.metalness,
        });
    }

    /**
     * Creates a lightweight modular fighter from shared source resources.
     *
     * @param {{ name?: string, user?: string }} gladiator Fighter metadata.
     * @param {ReturnType<import('./gladiator-appearance.js').getGladiatorAppearance>} appearance Visual contract.
     * @returns {{ object: import('three').Group, material: import('three').MeshStandardMaterial, rig: SyntyHeroRig, contentScale: number, weapon: import('three').Group|null, shield: import('three').Group|null, weaponClass: string, dispose(): void }} Hero resources.
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
        // The pack models face +Z; the arena contract (chevron, shield, lunges,
        // slash arcs) treats -Z as forward, so turn the hero to match.
        content.rotation.y = Math.PI;
        content.add(character);

        const object = new THREE.Group();
        object.name = 'synty-modular-hero';
        object.add(content);

        // Arsenal: every weapon the skin justifies, attached once and toggled
        // per action — bow while shooting, blade while swinging, nothing while
        // casting. The primary rides the hand outside of combat.
        const polearmMelee = Boolean(appearance.families?.spear);
        const melee = this.#createWeapon(config.arsenal.melee, material);
        const ranged = this.#createWeapon(config.arsenal.ranged, material);
        const staff = this.#createWeapon(config.arsenal.staff, material);

        if (melee) {
            const polearm = polearmMelee;
            melee.position.y = polearm ? 0.3 : 0.26;
            rig.attachEquipment(THREE, melee, scale, {
                rotation: [0.32, 0, polearm ? -Math.PI / 2 : Math.PI / 2],
            });
        }
        if (ranged) {
            // Archery draws with the off hand: the bow rides the extended
            // left arm, limbs vertical, slightly canted over the fist.
            ranged.position.y = 0.24;
            rig.attachEquipment(THREE, ranged, scale, {
                handName: 'Hand_L',
                rotation: [-0.18, 0, 0],
            });
        }
        if (staff) {
            staff.position.y = 0.3;
            rig.attachEquipment(THREE, staff, scale, {
                rotation: [0.32, 0, -Math.PI / 2],
            });
        }

        const shield = this.#createWeapon(config.shieldAsset, material);
        if (shield) {
            shield.position.set(0, 0.05, 0.14);
            rig.attachEquipment(THREE, shield, scale, {
                handName: 'Hand_L',
                rotation: [0, Math.PI / 2, 0],
            });
        }

        // Initial visibility follows the primary weapon.
        const primary = config.arsenal.primary;
        if (melee) melee.visible = primary === 'melee';
        if (ranged) ranged.visible = primary === 'ranged';
        if (staff) staff.visible = primary === 'staff';
        if (shield) shield.visible = primary === 'melee';

        return {
            object,
            material,
            rig,
            contentScale: scale,
            weapons: { melee, ranged, staff, shield, primary },
            weaponClass: config.weaponClass,
            dispose() {},
        };
    }

    /** Builds a normalized rigid weapon for tooling probes and harnesses. */
    createWeaponForProbe(assetKey, material) {
        return this.#createWeapon(assetKey, material);
    }

    /**
     * Creates an engine projectile body for arrows.
     *
     * The returned group is normalized so its long axis is +Y, matching the
     * flight-direction alignment used by the effects layer.
     *
     * @param {{ color?: number, emissive?: number, emissiveIntensity?: number }} [tint] Optional override that replaces the wood-and-steel atlas look.
     * @returns {import('three').Group|null} Arrow group or null when unavailable.
     */
    createArrow(tint = {}) {
        if (!this.#weaponLibrary) return null;
        const source = this.#weaponLibrary.clone(ARROW_ASSET_FILE);
        if (!source) return null;

        const THREE = this.#THREE;
        const material = tint.color !== undefined
            ? new THREE.MeshStandardMaterial({
                color: tint.color,
                emissive: tint.emissive ?? tint.color,
                emissiveIntensity: tint.emissiveIntensity ?? 0.65,
                roughness: 0.5,
                metalness: 0.3,
            })
            : this.#packMaterial('bow');
        source.traverse((object) => {
            if (!object.isMesh) return;
            object.material = material;
            object.castShadow = true;
        });
        source.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(source);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());

        source.position.copy(center).multiplyScalar(-1);
        // FBX arrow flies along -Z (tip forward); the effects layer expects
        // the +Y flight axis, so rotate the tip onto +Y.
        source.rotation.x = Math.PI / 2;
        const normalized = new THREE.Group();
        normalized.scale.setScalar(0.82 / Math.max(size.x, size.y, size.z, 1));
        normalized.add(source);
        return normalized;
    }

    /**
     * Builds a normalized rigid weapon from the shared registry sources.
     *
     * @param {string|null} assetKey Registry key such as `dungeon:Spear_01`.
     * @param {import('three').MeshStandardMaterial} paletteMaterial Hero body palette, used by `hero:` pack entries.
     * @returns {import('three').Group|null} Normalized weapon group.
     */
    #createWeapon(assetKey, paletteMaterial) {
        if (!assetKey || !this.#weaponLibrary) return null;
        const entry = WEAPON_ASSET_REGISTRY[assetKey];
        if (!entry || !this.#weaponLibrary.has(entry.file)) return null;

        const THREE = this.#THREE;
        const weapon = this.#weaponLibrary.clone(entry.file);
        const material = entry.pack === 'hero'
            ? paletteMaterial
            : this.#packMaterial(entry.pack) ?? paletteMaterial;
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

        weapon.position.copy(center).multiplyScalar(-1);
        const normalized = new THREE.Group();
        normalized.scale.setScalar(entry.length / longestSide);
        normalized.add(weapon);
        return normalized;
    }

    /** Releases source-pack GPU resources after every fighter has been removed. */
    dispose() {
        const disposed = new Set();
        disposeObjectResources(this.#characterSource, disposed);
        this.#textures.forEach((texture) => {
            if (disposed.has(texture)) return;
            disposed.add(texture);
            texture.dispose();
        });
        this.#weaponLibrary?.dispose();
        this.#characterSource = null;
        this.#textures.clear();
        this.#weaponLibrary = null;
    }
}

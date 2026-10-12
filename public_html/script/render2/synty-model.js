import {
    ACTION_SPECS, FIGURE_SCALE, FOOT_HEIGHT, LEG_SEGMENT, smoothstep,
} from './motion.js';
import {
    ATLASES, BODIES, PROPS, SHIELD_MODELS, WEAPON_MODELS, syntyOutfit,
} from './synty-outfit.js';
import { loadTexture as loadImageTexture } from './textures.js';

const ROOT = '/assets/synty/';
const HEROES = `${ROOT}synty-modular-heroes/`;
const CHARACTER_FBX = `${HEROES}FBX/ModularCharactersFixedScale.fbx`;
const ANIMATION_CHARACTER_FBX = `${ROOT}base-locomotion/Character/PolygonSyntyCharacter.fbx`;
const EMPTY_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
const IMAGE_URL = /\.(png|jpe?g|tga|tif|psd)(\?|$)/i;

/**
 * Recolours the hero atlas per part (see `synty-outfit.js`): fragments whose UV falls in one of the eight
 * flat clothing swatches take that swatch's colour, the hair swatch takes the hair colour, and the skin area
 * is scaled by target/base so lips and stubble keep their relative tint. Rectangles are atlas pixels (1024²,
 * y down); palettes, the chainmail weave and the eye ramp keep their texels.
 */
const RECOLOR_SHADER = /* glsl */ `
#ifdef USE_MAP
{
    vec2 atlasPx = vec2(vMapUv.x, 1.0 - vMapUv.y) * 1024.0;
    if (atlasPx.y >= 624.0 && atlasPx.y < 715.0 && atlasPx.x >= 283.0 && atlasPx.x < 464.0) {
        int column = atlasPx.x < 328.0 ? 0 : atlasPx.x < 373.0 ? 1 : atlasPx.x < 419.0 ? 2 : 3;
        vec4 swatch = swatchColors[column + (atlasPx.y < 670.0 ? 0 : 4)];
        if (swatch.w > 0.5) diffuseColor.rgb = swatch.rgb;
    }
    else if (atlasPx.x >= 95.0 && atlasPx.x < 144.0 && atlasPx.y >= 801.0 && atlasPx.y < 874.0) {
        diffuseColor.rgb = hairColor;
    }
    else if (atlasPx.y >= 624.0 && atlasPx.y < 1002.0 && !(atlasPx.x < 283.0 && atlasPx.y < 801.0) && !(atlasPx.x >= 512.0 && atlasPx.y < 768.0)) {
        diffuseColor.rgb *= skinRatio;
    }
}
#endif
`;
const SWATCH_KEYS = ['P', 'S', 'LP', 'LS', 'MP', 'MS', 'MD', 'X'];
/** sRGB colour of the atlas skin area, the reference the skin ratio scales from. */
const ATLAS_SKIN = 0xffccae;

/** Maps the bow FBX frame (limbs along Y, string on the -Z side) onto the bow group frame (limbs along X, string on the -Z side). */
/** Turns the bow on the hand socket so the limbs stand vertical with the string toward the archer while the bow arm aims forward. */
const BOW_GRIP = [-0.506, 0.462, 0.532, 0.498];
const BOW_FRAME = { x: [0, -1, 0], y: [1, 0, 0], z: [0, 0, 1] };

const LOCOMOTION_ROOT = `${ROOT}base-locomotion/Animations/Polygon/`;
const COMBAT_ROOT = `${ROOT}sword-combat/Animations/Polygon/`;

/** Locomotion clips per gender (`Masc`/`Femn`); every clip is a one-cycle loop. */
const LOCOMOTION_CLIPS = {
    idle: 'Idle/A_Idle_Standing',
    crouch: 'Idle/A_Idle_Crouching',
    walkF: 'Locomotion/Walk/A_Walk_F',
    walkL: 'Locomotion/Walk/A_Walk_FwdStrafeL',
    walkR: 'Locomotion/Walk/A_Walk_FwdStrafeR',
    walkB: 'Locomotion/Walk/A_Walk_BckStrafeB',
    runF: 'Locomotion/Run/A_Run_F',
    runL: 'Locomotion/Run/A_Run_FwdStrafeL',
    runR: 'Locomotion/Run/A_Run_FwdStrafeR',
    runB: 'Locomotion/Run/A_Run_BckStrafeB',
    sprintF: 'Locomotion/Sprint/A_Sprint_F',
    turn90L: 'Locomotion/Turn/A_Turn_Standing_90L',
    turn90R: 'Locomotion/Turn/A_Turn_Standing_90R',
    turn180L: 'Locomotion/Turn/A_Turn_Standing_180L',
    turn180R: 'Locomotion/Turn/A_Turn_Standing_180R',
};

/** Ground covered by one cycle of each gait, in cm (from the RootMotion variants of the clips). */
const CYCLE_CM = { walk: 150, run: 181, sprint: 434.6 };
const CYCLE_SECONDS = { walk: 1.0667, run: 0.7333, sprint: 0.6333 };
const MAX_CYCLES_PER_SECOND = 2.2;

/**
 * Sword clips played for the melee action styles of `motion.js`. `start` skips the idle lead-in, `contact` is the
 * moment of the blow (peak weapon speed) and `end` where the follow-through stops, all in clip seconds.
 */
const ATTACK_CLIPS = {
    melee: { file: 'Attack/LightCombo01/A_Attack_LightCombo01A_Sword', start: 0, contact: 0.38, end: 0.83 },
    slashBack: { file: 'Attack/LightCombo01/A_Attack_LightCombo01B_Sword', start: 0.6, contact: 1.08, end: 1.5 },
    thrust: { file: 'Attack/HeavyStab01/A_Attack_HeavyStab01_Sword', start: 0.4, contact: 0.93, end: 1.4 },
    smash: { file: 'Attack/HeavyCombo01/A_Attack_HeavyCombo01A_Sword', start: 0.55, contact: 1.15, end: 1.7 },
    stab: { file: 'Attack/LightFencing01/A_Attack_LightFencing01_Sword', start: 0, contact: 0.55, end: 1 },
};
const STATE_CLIPS = {
    idleCombat: 'Idle/Base/A_Idle_Base_Sword',
    blockBegin: 'Block/A_Block_Begin_Sword',
    blockLoop: 'Block/A_Block_Loop_Sword',
    hitF: 'Hit/HitReact/A_Hit_F_React_Sword',
    hitB: 'Hit/HitReact/A_Hit_B_React_Sword',
    hitL: 'Hit/HitReact/A_Hit_L_React_Sword',
    hitR: 'Hit/HitReact/A_Hit_R_React_Sword',
    stun: 'Hit/Stun/A_Stun_Loop_Sword',
    death: 'Death/A_Death_F_01_Sword',
};
const BLOCK_BEGIN_SECONDS = 0.5;
const HIT_CLIP_SECONDS = 0.6;
/**
 * Directional hit reactions: clip and the side a blow comes from that it answers (x: left, z: ahead). The clips are
 * named for where the body goes (measured: F folds forward, B arches back, L sways left, R right), so a blow from
 * ahead plays B and one from the left plays R: the body is driven away from the blow.
 */
const HIT_SIDES = [['hitB', 0, 1], ['hitF', 0, -1], ['hitR', 1, 0], ['hitL', -1, 0]];
const DEATH_CLIP_SECONDS = 1.47;
/** Actions without a Synty clip: the base locomotion stays and the upper body follows the `motion.js` pose. */
const POSE_ACTIONS = new Set(['ranged', 'assassinate', 'fireball', 'teleport', 'potion']);
/** Bow shots: the archery IK, nocked arrow and string pull. */
const SHOT_STYLES = new Set(['ranged', 'assassinate']);
/** How far the torso turns side-on while drawing a bow (radians). */
const ARCHERY_TWIST = 1.3;
/** Forward tip of the top limb of a bow carried at the side. */
const BOW_CARRY_TILT = 0.45;
/** Length of the arrow shaft in world units (matches the flying arrow in effects.js). */
const ARROW_LENGTH = 0.5;
/** Arrows are modelled 0.5 m long and drawn at this scale (matches `effects.js`). */
const ARROW_SCALE = 0.72;
const IK_VECTORS = ['up', 'aim', 'side', 'from', 'to', 'at', 's', 'e', 'h', 'dir', 'bend', 'joint', 'goal', 'anchor', 'bowHand', 'drawHand', 'pole', 'neck', 'left', 'right', 'x', 'y', 'z'];

const FINGER = /^(Thumb|IndexFinger|Finger)_/;
const SIDES = ['L', 'R'];
const HAND_OFFSET_CM = 8;
const HIP_JOINT_HEIGHT = 2 * LEG_SEGMENT + FOOT_HEIGHT;
/** Bones of the cape chain (Synty back attachment 03), top to bottom. */
const CAPE_BONES = ['Capes_01', 'back_02', 'back_03', 'back_04', 'back_05'];
/** How far (radians per bone, roughly) a running fighter's cape streams out behind, and how it grows with speed. */
const CAPE_MAX_LIFT = 0.55;
const CAPE_LIFT_PER_SPEED = 0.22;
/** Length of the quick head shake when a stun wears off. */
const SHAKE_OFF_SECONDS = 0.55;

/**
 * Name of a part bone inside the animation skeleton. The part meshes share finger names between hands,
 * while the animation files call the right-hand ones `<name>_1`.
 */
function boneKey(bone) {
    if (!FINGER.test(bone.name)) return bone.name;
    for (let node = bone.parent; node; node = node.parent) {
        if (node.name === 'Hand_R') return `${bone.name}_1`;
        if (node.name === 'Hand_L') return bone.name;
    }
    return bone.name;
}

/**
 * Loads the Synty FBX assets once and returns the model factory used by Fighter.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {Array<Record<string, any>>} looks Appearances of the fighters, used to preload only the needed weapons.
 * @returns {Promise<(options: { THREE: typeof import('three'), look: Record<string, any>, index: number }) => SyntyModel>} Model factory.
 */
export async function loadSynty(THREE, looks = []) {
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const { clone: cloneSkinned } = await import('three/addons/utils/SkeletonUtils.js');
    const manager = new THREE.LoadingManager();
    // Skip the stale texture references inside the FBX files; materials are replaced with the shared atlases.
    manager.setURLModifier((url) => (IMAGE_URL.test(url) ? EMPTY_PIXEL : url));
    const fbx = new FBXLoader(manager);
    const loadFbx = (url) => new Promise((resolve, reject) => fbx.load(url, resolve, undefined, reject));
    // FBX UVs put v = 0 at the bottom of the image, which is three's default texture orientation (flipY).
    const loadTexture = (url) => loadImageTexture(THREE, url);

    // Only the gear and props these fighters wear are fetched; the default sword and bow always are, as fallbacks.
    const outfits = looks.map((look) => syntyOutfit(look));
    const kinds = new Set(['sword', 'bow', ...outfits.flatMap((outfit) => [outfit.weapon, outfit.bow])]);
    const shields = new Set(outfits.map((outfit) => outfit.shield).filter(Boolean));
    const propIds = new Set(outfits.flatMap((outfit) => outfit.props.map((prop) => prop.id)));
    const bodies = new Set(outfits.map((outfit) => outfit.body).filter((body) => BODIES[body]));
    const atlasNames = [...new Set([
        ...[...kinds].map((kind) => WEAPON_MODELS[kind].atlas),
        ...[...shields].map((key) => SHIELD_MODELS[key].atlas),
        ...[...bodies].map((key) => BODIES[key].atlas),
    ])];
    const genders = new Set(looks.map((look) => (look.female ? 'Femn' : 'Masc')));
    if (!genders.size) genders.add('Masc');
    const clipFiles = new Map();
    for (const gender of genders) {
        const folder = gender === 'Femn' ? 'Feminine' : 'Masculine';
        for (const [name, file] of Object.entries(LOCOMOTION_CLIPS)) {
            const dir = file.slice(0, file.lastIndexOf('/') + 1);
            clipFiles.set(`${gender}:${name}`, `${LOCOMOTION_ROOT}${folder}/${dir}${file.slice(dir.length)}_${gender}.fbx`);
        }
    }
    for (const [name, file] of Object.entries(STATE_CLIPS)) clipFiles.set(name, `${COMBAT_ROOT}${file}.fbx`);
    for (const [name, { file }] of Object.entries(ATTACK_CLIPS)) clipFiles.set(name, `${COMBAT_ROOT}${file}.fbx`);

    // Optional pieces (one fighter's gear, props, bodies) may be missing from a partial asset install: the
    // fighter then falls back to the default sword/bow or simply goes without.
    const optional = (key, url) => loadFbx(url).then((source) => [key, source], (error) => {
        console.warn(`Synty asset unavailable: ${url}`, error);
        return [key, null];
    });
    const [character, animationCharacter, heroAtlas, atlases, weapons, shieldSources, propSources, bodySources, clips] = await Promise.all([
        loadFbx(CHARACTER_FBX),
        loadFbx(ANIMATION_CHARACTER_FBX),
        loadTexture(ROOT + ATLASES.heroes),
        Promise.all(atlasNames.map(async (name) => [name, await loadTexture(ROOT + ATLASES[name]).catch(() => null)])),
        Promise.all([...kinds].map((kind) => optional(kind, ROOT + WEAPON_MODELS[kind].file))),
        Promise.all([...shields].map((key) => optional(key, ROOT + SHIELD_MODELS[key].file))),
        Promise.all([...propIds].map((key) => optional(key, ROOT + PROPS[key].file))),
        Promise.all([...bodies].map((key) => optional(key, ROOT + BODIES[key].file))),
        Promise.all([...clipFiles].map(async ([name, url]) => [name, await loadFbx(url)])),
    ]);

    const assets = new SyntyAssets(THREE, character, animationCharacter, heroAtlas, clips[0][1].children.find((node) => node.name === 'Root'));
    assets.cloneSkinned = cloneSkinned;
    for (const [name, source] of clips) {
        const clip = source.animations[0];
        // Root motion is applied by the fighter itself; the clips only animate the body in place.
        clip.tracks = clip.tracks.filter((track) => !track.name.startsWith('Root.'));
        clip.name = name;
        assets.clips.set(name, clip);
    }
    const atlasByName = new Map(atlases);
    for (const [kind, source] of weapons) if (source) assets.addWeapon(kind, source, WEAPON_MODELS[kind], atlasByName.get(WEAPON_MODELS[kind].atlas));
    if (!assets.weapons.has('sword') || !assets.weapons.has('bow')) throw new Error('Synty default sword or bow missing');
    for (const [key, source] of shieldSources) if (source) assets.addShield(key, source, SHIELD_MODELS[key], atlasByName.get(SHIELD_MODELS[key].atlas));
    for (const [key, source] of propSources) if (source) assets.addProp(key, source, PROPS[key]);
    for (const [key, source] of bodySources) if (source) assets.addBody(key, source, atlasByName.get(BODIES[key].atlas));
    return (options) => new SyntyModel({ ...options, assets });
}

/** Parsed Synty assets: character part geometry bound to one canonical skeleton, plus normalised weapons. */
class SyntyAssets {
    #THREE;
    /** @type {Map<string, { geometry: import('three').BufferGeometry, keys: string[], inverses: import('three').Matrix4[] }>} */
    parts = new Map();
    weapons = new Map();
    /** @type {Map<string, import('three').Group>} Shields normalised to face +Z, centred on their grip. */
    shields = new Map();
    /** @type {Map<string, import('three').Group>} Head props in the `Head` bone's frame (cm). */
    props = new Map();
    /** @type {Map<string, { geometry: import('three').BufferGeometry, keys: string[], inverses: import('three').Matrix4[], material: import('three').Material }[]>} Full bodies. */
    bodies = new Map();
    /** @type {Map<string, import('three').AnimationClip>} */
    clips = new Map();
    #bindWorld = new Map();
    #animationBind = new Map();
    #parents = new Map();
    #animationRoot;

    /**
     * @param {typeof import('three')} THREE Three namespace.
     * @param {import('three').Object3D} character Modular hero FBX.
     * @param {import('three').Object3D} animationCharacter Skinned character in the animation files' bone frames (T-pose bind).
     * @param {import('three').Texture} atlas Hero atlas, recoloured per part by {@link RECOLOR_SHADER}.
     * @param {import('three').Bone} animationRoot Skeleton of an animation FBX (clean 52-bone hierarchy).
     */
    constructor(THREE, character, animationCharacter, atlas, animationRoot) {
        this.#THREE = THREE;
        this.atlas = atlas;
        this.#animationRoot = animationRoot;
        animationCharacter.updateMatrixWorld(true);
        animationCharacter.traverse((node) => {
            if (!node.isSkinnedMesh) return;
            node.skeleton.bones.forEach((bone, i) => this.#animationBind.set(bone.name, node.skeleton.boneInverses[i].clone().invert()));
        });
        character.updateMatrixWorld(true);
        character.traverse((node) => {
            if (!node.isSkinnedMesh) return;
            const keys = node.skeleton.bones.map(boneKey);
            this.parts.set(node.name, { geometry: node.geometry, keys, inverses: node.skeleton.boneInverses });
            node.skeleton.bones.forEach((bone, i) => {
                if (this.#bindWorld.has(keys[i])) return;
                this.#bindWorld.set(keys[i], node.skeleton.boneInverses[i].clone().invert());
                // Attachment bones (cape chain) sit under a same-named twin in the FBX; the real parent is above it.
                let parent = bone.parent;
                while (parent?.isBone && boneKey(parent) === keys[i]) parent = parent.parent;
                this.#parents.set(keys[i], parent?.isBone ? boneKey(parent) : null);
            });
        });
    }

    /**
     * Builds a skeleton with the animation files' bone names and the hero's T-pose proportions, so the part
     * meshes (bound to that T-pose) and the clips (which only set rotations) agree. Bones that exist only on
     * the parts (attachments) are added under their original parent.
     *
     * @returns {import('three').Bone} Fresh skeleton root.
     */
    createSkeleton() {
        const THREE = this.#THREE;
        const root = this.#animationRoot.clone(true);
        const byName = new Map();
        root.traverse((node) => byName.set(node.name, node));
        const matrix = new THREE.Matrix4();
        const world = new Map();
        const place = (bone, parentWorld) => {
            const target = this.#bindWorld.get(bone.name);
            if (target) {
                matrix.copy(parentWorld).invert().multiply(target).decompose(bone.position, bone.quaternion, bone.scale);
                world.set(bone.name, target);
            }
            else {
                bone.updateMatrix();
                world.set(bone.name, parentWorld.clone().multiply(bone.matrix));
            }
            bone.children.forEach((child) => place(child, world.get(bone.name)));
        };
        place(root, new THREE.Matrix4());
        // Extra part bones, parents first.
        let pending = [...this.#bindWorld.keys()].filter((key) => !byName.has(key));
        while (pending.length) {
            const next = pending.filter((key) => !byName.has(this.#parents.get(key)));
            const ready = pending.filter((key) => byName.has(this.#parents.get(key)));
            if (!ready.length) break;
            ready.forEach((key) => {
                const bone = new THREE.Bone();
                bone.name = key;
                matrix.copy(world.get(this.#parents.get(key))).invert().multiply(this.#bindWorld.get(key)).decompose(bone.position, bone.quaternion, bone.scale);
                byName.get(this.#parents.get(key)).add(bone);
                byName.set(key, bone);
                world.set(key, this.#bindWorld.get(key));
            });
            pending = next;
        }
        return root;
    }

    /** Bind-pose world rotation of a bone in the hero's or the animation's frame. */
    #bindQuaternion(map, name) {
        const matrix = map.get(name);
        return matrix ? new this.#THREE.Quaternion().setFromRotationMatrix(matrix) : null;
    }

    /**
     * Creates the two skeletons of a fighter. The clips drive `anim` (their own bone frames); every frame the
     * world rotation change of each `anim` bone from its T-pose is applied on top of the hero bone's T-pose,
     * which is what `links` describes (parents come before children).
     *
     * @returns {{ hero: import('three').Bone, anim: import('three').Bone, links: object[] }} Rig.
     */
    createRig() {
        const THREE = this.#THREE;
        const hero = this.createSkeleton();
        const anim = this.#animationRoot.clone(true);
        const animByName = new Map();
        anim.traverse((node) => animByName.set(node.name, node));
        const rest = new Map();
        const restOf = (node) => {
            if (rest.has(node.name)) return rest.get(node.name);
            const bound = this.#bindQuaternion(this.#animationBind, node.name);
            const value = bound ?? (node.parent ? restOf(node.parent).clone().multiply(node.quaternion) : node.quaternion.clone());
            rest.set(node.name, value);
            return value;
        };
        const links = [];
        const index = new Map();
        hero.traverse((bone) => {
            const source = animByName.get(bone.name);
            const bind = this.#bindQuaternion(this.#bindWorld, bone.name);
            index.set(bone, links.length);
            links.push({
                bone,
                source: source ?? null,
                parent: bone.parent && index.has(bone.parent) ? index.get(bone.parent) : -1,
                delta: source && bind ? restOf(source).clone().invert().multiply(bind) : null,
            });
        });
        return { hero, anim, links };
    }

    /**
     * Where the animation files' hand socket sits in the hero hand's frame, so a prop attached there keeps the
     * orientation the clips expect.
     *
     * @param {'L'|'R'} side Hand side.
     * @returns {{ position: import('three').Vector3, quaternion: import('three').Quaternion }} Mount transform in cm.
     */
    mountFrame(side) {
        const THREE = this.#THREE;
        const socket = this.#animationRoot.getObjectByName(`Prop_${side}`);
        const hand = `Hand_${side}`;
        const heroInverse = this.#bindQuaternion(this.#bindWorld, hand).invert();
        const animRest = this.#bindQuaternion(this.#animationBind, hand);
        return {
            position: socket.position.clone().applyQuaternion(animRest).applyQuaternion(heroInverse),
            quaternion: heroInverse.multiply(animRest).multiply(socket.quaternion),
        };
    }

    /**
     * Normalises a weapon FBX: tip along +Y, grip at the origin, `length` tall, atlas material (tinted or
     * glowing when the catalogue says so). Blades modelled along Z (`axis: 'z'`) are stood up first.
     */
    addWeapon(kind, source, spec, atlas) {
        const THREE = this.#THREE;
        if (!spec.rigged) source = this.#unskin(source);
        if (spec.axis === 'z') {
            const upright = new THREE.Group();
            upright.rotation.x = -Math.PI / 2;
            upright.add(source);
            source = upright;
        }
        source.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(source);
        const size = box.getSize(new THREE.Vector3());
        const scale = spec.length / size.y;
        const holder = new THREE.Group();
        source.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + size.y * spec.grip), -(box.min.z + box.max.z) / 2);
        const inner = new THREE.Group();
        inner.scale.setScalar(scale);
        inner.add(source);
        holder.add(inner);
        source.traverse((node) => {
            if (!node.isMesh) return;
            node.material = new THREE.MeshLambertMaterial({
                map: atlas ?? null,
                color: spec.tint ?? 0xffffff,
                emissive: spec.glow ?? 0x000000,
                emissiveIntensity: spec.glow ? 0.55 : 1,
            });
            // A skinned prop moves with its bones, outside the bounds of its bind pose.
            node.frustumCulled = false;
        });
        holder.userData.string = spec.string ?? null;
        this.weapons.set(kind, holder);
    }

    /** Normalises a shield FBX: centred, face toward +Z, `size` across its widest side. */
    addShield(key, source, spec, atlas) {
        const THREE = this.#THREE;
        source = this.#unskin(source);
        source.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(source);
        const size = box.getSize(new THREE.Vector3());
        const inner = new THREE.Group();
        inner.scale.setScalar(spec.size / Math.max(size.x, size.y));
        source.position.copy(box.getCenter(new THREE.Vector3()).negate());
        inner.add(source);
        source.traverse((node) => {
            if (node.isMesh) node.material = new THREE.MeshLambertMaterial({ map: atlas ?? null, side: THREE.DoubleSide });
        });
        const holder = new THREE.Group();
        holder.add(inner);
        this.shields.set(key, holder);
    }

    /** Keeps a head prop's meshes as authored (in the `Head` bone frame, cm). */
    addProp(key, source, spec) {
        const THREE = this.#THREE;
        const holder = this.#unskin(source);
        holder.scale.setScalar(spec.scale ?? 1);
        holder.userData.tint = spec.tint ?? null;
        holder.traverse((node) => {
            if (node.isMesh) node.material = new THREE.MeshLambertMaterial({ flatShading: true });
        });
        this.props.set(key, holder);
    }

    /** Keeps the skinned meshes of a full-body character for binding to a fighter's hero skeleton. */
    addBody(key, source, atlas) {
        const THREE = this.#THREE;
        const meshes = [];
        source.traverse((node) => {
            if (!node.isSkinnedMesh) return;
            meshes.push({
                geometry: node.geometry,
                keys: node.skeleton.bones.map(boneKey),
                inverses: node.skeleton.boneInverses,
                material: new THREE.MeshLambertMaterial({ map: atlas ?? null }),
            });
        });
        if (meshes.length) this.bodies.set(key, meshes);
    }

    /** Rigged props other than the bow are shown in bind pose as plain meshes, so their own bones cannot distort them. */
    #unskin(source) {
        const THREE = this.#THREE;
        const clean = new THREE.Group();
        source.updateMatrixWorld(true);
        source.traverse((node) => {
            if (!node.isMesh) return;
            const mesh = new THREE.Mesh(node.geometry, node.material);
            node.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
            clean.add(mesh);
        });
        return clean;
    }

    /** Names of the character meshes matching a prefix. */
    has(name) {
        return this.parts.has(name);
    }
}

/** Extra rotation of the carried props relative to the animation files' weapon sockets, as XYZ Euler angles. */
const SOCKET_ROTATION = { R: [0, 0, 0], L: [0, 0, 0] };
/** Shield placement on the left forearm: fraction of the way from elbow to wrist, and lift off the forearm (figure units). */
const SHIELD_ALONG = 0.45;
const SHIELD_OUT = 0.07;

const WORLD_PER_CM = (FIGURE_SCALE * HIP_JOINT_HEIGHT) / 83.2;
const GAIT_CM_PER_SECOND = {
    walk: CYCLE_CM.walk / CYCLE_SECONDS.walk,
    run: CYCLE_CM.run / CYCLE_SECONDS.run,
    sprint: CYCLE_CM.sprint / CYCLE_SECONDS.sprint,
};

/**
 * Body made of the Synty modular hero parts, skinned to the animation skeleton. Locomotion, sword attacks,
 * block, hit, stun and death play the Synty clips; spells and archery keep the `motion.js` upper-body pose
 * layered over the locomotion legs.
 */
export class SyntyModel {
    #THREE;
    #assets;
    #materials = [];
    #bones = {};
    #rest = new Map();
    #parts = {};
    #emissiveKey = '';
    #scratch;
    #hang = {};
    #flaskGeometry;
    #mixer;
    #links;
    #hips;
    #animationWorld;
    #heroWorld;
    #gender;
    #actions = new Map();
    #targets = new Map();
    #base = [];
    #overlays = [];
    #hitLayer = [];
    #hitSaved = [];
    #hit = 0;
    #turnBlend = 0;
    #turnSign = 0;
    #turnTime = 0;
    #turnTotal = 0;
    #turnName = 'turn90L';
    #clock = 0;
    #stride = 0;
    #stun = 0;
    #dizzyScratch = null;
    /** Seconds left of the head shake that throws off a stun, and whether the last frame was stunned. */
    #shake = 0;
    #wasStunned = false;
    #shakeScratch = null;
    /** Cape chain bones with their rest rotations (empty when the outfit has none), its current lift and scratch. */
    #cape = [];
    #capeLift = 0;
    #capeScratch = null;
    /** Skinned meshes of the body (not the carried props), for `bodyHit`. */
    #bodyMeshes = [];
    #raycaster = null;
    #ik = null;
    #bowGrip;
    #bowBasis;
    #string = null;
    #pull = 0;
    #arrowGeometries = [];
    #arrowMaterials = null;
    #arrowWorld = null;

    /** Fighter hands the death over to the clip instead of tipping the figure over. */
    animatesDeath = true;
    deathSeconds = 1;

    /** @param {{ THREE: typeof import('three'), look: Record<string, any>, index: number, assets: SyntyAssets }} options Dependencies. */
    constructor({ THREE, look, index, assets }) {
        this.#THREE = THREE;
        this.#assets = assets;
        this.#gender = look.female ? 'Femn' : 'Masc';
        this.#scratch = { q: new THREE.Quaternion(), d: new THREE.Quaternion(), e: new THREE.Euler(), a: new THREE.Quaternion(), t: new THREE.Quaternion() };
        this.figure = new THREE.Group();
        this.figure.scale.setScalar(FIGURE_SCALE);

        const outfit = syntyOutfit(look);
        const makeMaterial = (options = {}) => {
            const material = new THREE.MeshLambertMaterial({ map: assets.atlas, ...options });
            material.userData.baseOpacity = 1;
            this.#materials.push(material);
            return material;
        };

        const scale = HIP_JOINT_HEIGHT / 83.2;
        const content = new THREE.Group();
        content.scale.setScalar(scale);
        this.figure.add(content);
        const rig = assets.createRig();
        const skeleton = rig.hero;
        content.add(skeleton);
        this.#links = rig.links;
        // Hit reaction layer: 1 = torso/head, 2 = arms; legs and hips stay with the locomotion.
        this.#hitLayer = rig.links.map((link, i, all) => {
            let layer = 0;
            for (let at = i; at >= 0; at = all[at].parent) {
                const name = all[at].bone.name;
                if (/^Shoulder_/.test(name)) return 2;
                if (name === 'Spine_01') layer = 1;
            }
            return layer;
        });
        this.#hitSaved = rig.links.map(() => new THREE.Quaternion());
        this.#hips = rig.links.find((link) => link.bone.name === 'Hips').source;
        this.#animationWorld = rig.links.map(() => new THREE.Quaternion());
        this.#heroWorld = rig.links.map(() => new THREE.Quaternion());
        content.updateMatrixWorld(true);
        const byKey = new Map();
        skeleton.traverse((node) => byKey.set(node.name, node));

        const bindTo = (geometry, keys, inverses, partMaterial) => {
            const bones = keys.map((key) => byKey.get(key) ?? byKey.get('Hips'));
            const mesh = new THREE.SkinnedMesh(geometry, partMaterial);
            mesh.frustumCulled = false;
            content.add(mesh);
            this.#bodyMeshes.push(mesh);
            mesh.bind(new THREE.Skeleton(bones, inverses), new THREE.Matrix4());
        };
        for (const body of assets.bodies.get(outfit.body) ?? []) {
            const bodyMaterial = body.material.clone();
            bodyMaterial.userData.baseOpacity = 1;
            this.#materials.push(bodyMaterial);
            bindTo(body.geometry, body.keys, body.inverses, bodyMaterial);
        }
        // A missing full body (partial install) falls back to the bare hero parts.
        const parts = outfit.body !== 'hero' && !assets.bodies.has(outfit.body) ? syntyOutfit({ ...look, skeleton: false }).parts : outfit.parts;
        for (const { name, colors } of parts) {
            const part = assets.parts.get(this.#resolvePart(name));
            if (!part) continue;
            bindTo(part.geometry, part.keys, part.inverses, this.#recolor(makeMaterial(), colors, outfit));
        }

        for (const name of ['Hips', 'Spine_01', 'Spine_02', 'Spine_03', 'Neck', 'Head', ...SIDES.flatMap((s) => [`Shoulder_${s}`, `Elbow_${s}`, `Hand_${s}`])]) {
            const bone = byKey.get(name);
            const world = bone.getWorldQuaternion(new THREE.Quaternion());
            this.#bones[name] = bone;
            this.#rest.set(name, { local: bone.quaternion.clone(), world, inverse: world.clone().invert() });
        }

        this.#cape = CAPE_BONES.map((name) => byKey.get(name)).filter(Boolean).map((bone) => ({ bone, rest: bone.quaternion.clone() }));

        // Arms are modelled in a T-pose; the upper-body pose override swings them down to the sides.
        for (const [side, sign] of [['L', -1], ['R', 1]]) {
            const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sign * (Math.PI / 2 - 0.08));
            this.#hang[side] = { down, up: down.clone().invert() };
        }

        const mounts = { torso: new THREE.Group(), head: new THREE.Group() };
        mounts.torso.position.set(0, HIP_JOINT_HEIGHT + 0.07, 0);
        mounts.head.position.set(0, HIP_JOINT_HEIGHT + 0.63, 0);
        this.figure.add(mounts.torso, mounts.head);
        this.mounts = mounts;

        for (const { id, color } of outfit.props) this.#addProp(id, color, byKey.get('Head'));

        this.#mixer = new THREE.AnimationMixer(rig.anim);
        this.#buildWeapons(outfit, makeMaterial, scale);
        this.setWeapons('melee', null);
    }

    /**
     * Name of an existing hero mesh for an outfit part: the part itself, or the bare (`_00`) piece of the same
     * family when this gender lacks that number.
     */
    #resolvePart(name) {
        if (this.#assets.has(name)) return name;
        const bare = name.replace(/_\d+$/, '_00');
        return this.#assets.has(bare) ? bare : null;
    }

    /**
     * Turns a part material into a recoloured hero atlas: the outfit's skin and hair everywhere, plus this part's
     * swatch colours (`colors` keyed by swatch, `hair` overriding the hair colour for beards).
     */
    #recolor(material, colors, outfit) {
        const THREE = this.#THREE;
        const swatches = SWATCH_KEYS.map((key) => (key in colors ? new THREE.Vector4(...new THREE.Color(colors[key]).toArray(), 1) : new THREE.Vector4(0, 0, 0, 0)));
        const skin = new THREE.Color(outfit.skin ?? ATLAS_SKIN);
        const base = new THREE.Color(ATLAS_SKIN);
        const uniforms = {
            swatchColors: { value: swatches },
            hairColor: { value: new THREE.Color(colors.hair ?? outfit.hair ?? 0x433622) },
            skinRatio: { value: new THREE.Vector3(skin.r / base.r, skin.g / base.g, skin.b / base.b) },
        };
        material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, uniforms);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nuniform vec4 swatchColors[8];\nuniform vec3 hairColor;\nuniform vec3 skinRatio;')
                .replace('#include <map_fragment>', `#include <map_fragment>\n${RECOLOR_SHADER}`);
        };
        // Every recoloured part shares one program; the colours are per-material uniforms.
        material.customProgramCacheKey = () => 'synty-recolor';
        return material;
    }

    /** Hangs a head prop (hair, bandana) on the head bone, painted in the outfit colour it asks for. */
    #addProp(id, color, head) {
        const THREE = this.#THREE;
        const source = this.#assets.props.get(id);
        if (!source || !head) return;
        const prop = source.clone(true);
        const material = new THREE.MeshLambertMaterial({ color: color ?? 0x5a3a22, flatShading: true });
        material.userData.baseOpacity = 1;
        this.#materials.push(material);
        prop.traverse((node) => {
            if (node.isMesh) node.material = material;
        });
        head.add(prop);
    }

    /** Creates the carried props on the hand sockets of the animation skeleton, and the shield on the left forearm. */
    #buildWeapons(outfit, makeMaterial, scale) {
        const THREE = this.#THREE;
        const mount = (side) => {
            const grip = new THREE.Group();
            const frame = this.#assets.mountFrame(side);
            grip.position.copy(frame.position);
            grip.quaternion.copy(frame.quaternion).multiply(this.#scratch.q.setFromEuler(this.#scratch.e.set(...SOCKET_ROTATION[side], 'XYZ')));
            grip.scale.setScalar(1 / scale);
            this.#bones[`Hand_${side}`].add(grip);
            return grip;
        };
        const tint = (object) => {
            object.traverse((node) => {
                if (!node.isMesh) return;
                node.material = node.material.clone();
                node.material.userData.baseOpacity = 1;
                this.#materials.push(node.material);
            });
            return object;
        };
        const kind = this.#assets.weapons.has(outfit.weapon) ? outfit.weapon : 'sword';
        const melee = tint(this.#assets.weapons.get(kind).clone(true));
        mount('R').add(melee);

        const bow = new THREE.Group();
        // Each fighter needs its own bow skeleton to pull the string.
        const bowSource = this.#assets.weapons.get(outfit.bow) ?? this.#assets.weapons.get('bow');
        const bowFrame = tint(this.#assets.cloneSkinned(bowSource));
        const string = bowSource.userData.string ? bowFrame.getObjectByName(bowSource.userData.string) : null;
        this.#string = string ? { bone: string, rest: string.position.clone() } : null;
        bowFrame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
            new THREE.Vector3(...BOW_FRAME.x), new THREE.Vector3(...BOW_FRAME.y), new THREE.Vector3(...BOW_FRAME.z),
        ));
        bow.add(bowFrame);
        bow.quaternion.set(...BOW_GRIP);
        this.#bowGrip = bow.quaternion.clone();
        this.#bowBasis = new THREE.Matrix4();
        mount('L').add(bow);

        const glass = makeMaterial({ color: 0x62ef70, emissive: 0x1d7a2a, transparent: true, opacity: 0.9 });
        glass.userData.baseOpacity = 0.9;
        const flask = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6).translate(0, 0.08, 0), glass);
        this.#flaskGeometry = flask.geometry;
        mount('R').add(flask);

        // Arrow on the string while drawing; same proportions as the flying arrow in effects.js, which takes over from it.
        const arrow = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, ARROW_LENGTH, 4).rotateX(Math.PI / 2), makeMaterial({ map: null, color: 0xe6d2a1 }));
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4).rotateX(Math.PI / 2), makeMaterial({ map: null, color: 0xc8ced6 }));
        head.position.z = ARROW_LENGTH / 2 + 0.04;
        arrow.add(shaft, head);
        arrow.visible = false;
        this.figure.add(arrow);
        this.#arrowGeometries = [shaft.geometry, head.geometry];
        this.#arrowMaterials = { shaft: shaft.material, head: head.material };
        this.#parts = { melee, bow, flask, arrow, shield: this.#buildShield(outfit.shield, tint, scale) };
    }

    /**
     * Straps the LPC shield to the outside of the left forearm: face out from the back of the forearm, top
     * toward the thumb, so a raised guard shows it to the opponent.
     */
    #buildShield(key, tint, scale) {
        const source = key ? this.#assets.shields.get(key) : null;
        if (!source) return null;
        const THREE = this.#THREE;
        const elbow = this.#bones.Elbow_L;
        const hand = this.#bones.Hand_L;
        this.figure.updateMatrixWorld(true);
        const from = elbow.getWorldPosition(new THREE.Vector3());
        const to = hand.getWorldPosition(new THREE.Vector3());
        const along = to.clone().sub(from);
        // In the bind T-pose the left forearm runs along +X with the palm down: back of the forearm +Y, thumb +Z.
        const world = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
            new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0),
        ));
        const shield = tint(source.clone(true));
        shield.quaternion.copy(elbow.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
        shield.position.copy(elbow.worldToLocal(from.addScaledVector(along, SHIELD_ALONG).add(new THREE.Vector3(0, SHIELD_OUT * FIGURE_SCALE, 0))));
        shield.scale.setScalar(1 / scale);
        elbow.add(shield);
        return shield;
    }

    // ------------------------------------------------------------------ clips

    /** Mixer action for a clip, created on first use. */
    #entry(name) {
        const key = name in LOCOMOTION_CLIPS ? `${this.#gender}:${name}` : name;
        let entry = this.#actions.get(key);
        if (!entry) {
            const clip = this.#assets.clips.get(key);
            const action = this.#mixer.clipAction(clip);
            action.enabled = false;
            action.play();
            entry = { action, duration: clip.duration };
            this.#actions.set(key, entry);
        }
        return entry;
    }

    /** Queues a clip for this frame; `seconds` is wrapped into the clip length. */
    #queue(list, name, weight, seconds) {
        if (weight > 0.002) list.push([this.#entry(name), weight, seconds]);
    }

    /** Locomotion clips for the current ground velocity, with one gait cycle per distance covered. */
    #locomotion(m, weight) {
        const centimetres = m.speed / WORLD_PER_CM;
        const run = smoothstep(GAIT_CM_PER_SECOND.walk, GAIT_CM_PER_SECOND.run, centimetres);
        const total = Math.abs(m.forward) + Math.abs(m.lateral) + 1e-4;
        const front = Math.max(0, m.forward) / total;
        const sprint = run * front * smoothstep(GAIT_CM_PER_SECOND.run * 1.15, GAIT_CM_PER_SECOND.sprint * 0.8, centimetres);
        const direction = { F: front, B: Math.max(0, -m.forward) / total, L: Math.max(0, m.lateral) / total, R: Math.max(0, -m.lateral) / total };
        const cycleCm = CYCLE_CM.walk * (1 - run) + CYCLE_CM.run * (run - sprint) + CYCLE_CM.sprint * sprint;
        if (m.phase !== undefined) {
            this.#stride = m.phase;
        } else {
            this.#stride += Math.min(m.travel / (cycleCm * WORLD_PER_CM), MAX_CYCLES_PER_SECOND * m.dt);
        }
        const phase = (this.#stride % 1 + 1) % 1;
        const list = this.#base;
        for (const [dir, share] of Object.entries(direction)) {
            this.#queue(list, `walk${dir}`, weight * (1 - run) * share, phase * this.#entry(`walk${dir}`).duration);
            const runShare = dir === 'F' ? share * run - sprint : share * run;
            this.#queue(list, `run${dir}`, weight * runShare, phase * this.#entry(`run${dir}`).duration);
        }
        this.#queue(list, 'sprintF', weight * sprint, phase * this.#entry('sprintF').duration);
    }

    /** Collects the base (locomotion/idle) and overlay (action, hit, stun, death) clips of this frame. */
    #plan(m) {
        const base = this.#base;
        const overlays = this.#overlays;
        base.length = 0;
        overlays.length = 0;
        if (m.dt > 0) {
            this.#clock += m.dt;
            const turning = m.turn !== 0 && m.moveWeight < 0.3 && !m.action;
            this.#turnBlend += ((turning ? 1 : 0) - this.#turnBlend) * (1 - Math.exp(-m.dt * 12));
            if (turning) {
                if (m.turn * this.#turnSign <= 0 || this.#turnTotal === 0) this.#turnTotal = Math.abs(m.turn);
                this.#turnSign = Math.sign(m.turn);
                this.#turnTime = Math.max(0, 1 - Math.abs(m.turn) / this.#turnTotal);
                this.#turnName = `turn${Math.abs(m.turn) > 2.2 ? 180 : 90}${m.turn > 0 ? 'L' : 'R'}`;
            }
            else if (this.#turnBlend < 0.01) this.#turnTotal = this.#turnTime = 0;
            this.#stun += ((m.stunned ? 1 : 0) - this.#stun) * (1 - Math.exp(-m.dt * 10));
            if (this.#wasStunned && !m.stunned && !(m.dead > 0)) this.#shake = SHAKE_OFF_SECONDS;
            this.#wasStunned = Boolean(m.stunned);
            this.#shake = Math.max(0, this.#shake - m.dt);
        }
        const loop = (name) => this.#clock % this.#entry(name).duration;
        const still = (1 - m.moveWeight) * (1 - this.#turnBlend);
        this.#queue(base, 'idle', still * (1 - m.combat), loop('idle'));
        this.#queue(base, 'idleCombat', still * m.combat, loop('idleCombat'));
        if (m.moveWeight > 0.002) this.#locomotion(m, m.moveWeight);
        if (this.#turnBlend > 0.01) {
            const entry = this.#entry(this.#turnName);
            this.#queue(base, this.#turnName, this.#turnBlend, this.#turnTime * entry.duration * 0.9);
        }

        const a = m.action;
        if (a) {
            const attack = ATTACK_CLIPS[a.style];
            if (attack) {
                const ratio = (attack.contact - attack.start) / a.contact;
                const time = a.time < a.contact ? attack.start + a.time * ratio : attack.contact + (a.time - a.contact);
                this.#queue(overlays, a.style, a.blend, Math.min(time, attack.end));
            }
            else if (a.style === 'block') {
                if (a.time < BLOCK_BEGIN_SECONDS) this.#queue(overlays, 'blockBegin', a.blend, a.time);
                else this.#queue(overlays, 'blockLoop', a.blend, (a.time - BLOCK_BEGIN_SECONDS) % this.#entry('blockLoop').duration);
            }
            else if (a.style === 'ambush') this.#queue(overlays, 'crouch', a.blend, loop('crouch'));
        }

        this.#hit = m.flinch > 0 ? Math.max(0, Math.min(1, (1 - m.flinch) / 0.1, m.flinch / 0.4)) * m.hitScale : 0;
        this.#queue(overlays, 'stun', this.#stun, loop('stun'));
        if (m.dead > 0) {
            overlays.length = 0;
            this.#queue(overlays, 'death', smoothstep(0, 0.15, m.dead), Math.min(1, m.dead) * DEATH_CLIP_SECONDS * 0.98);
        }
    }

    /** Pushes the planned weights/times into the mixer and evaluates it. */
    #play(m) {
        this.#plan(m);
        const targets = this.#targets;
        targets.clear();
        let overlay = 0;
        for (const [, weight] of this.#overlays) overlay += weight;
        const overlayScale = overlay > 0 ? Math.min(1, overlay) / overlay : 0;
        let base = 0;
        for (const [, weight] of this.#base) base += weight;
        const baseScale = base > 0 ? (1 - Math.min(1, overlay)) / base : 0;
        for (const [entry, weight, time] of this.#overlays) targets.set(entry, [weight * overlayScale, time]);
        for (const [entry, weight, time] of this.#base) targets.set(entry, [weight * baseScale, time]);
        for (const entry of this.#actions.values()) {
            const target = targets.get(entry);
            const { action } = entry;
            action.enabled = Boolean(target) && target[0] > 0.001;
            if (!target) continue;
            action.weight = target[0];
            action.time = Math.min(target[1], entry.duration - 1e-3);
        }
        this.#mixer.update(0);
        this.#retarget();
        if (this.#hit > 0.002 && !(m.dead > 0)) this.#layerHit(m);
    }

    /**
     * Merges the hit reaction into the pose that is already retargeted: the torso and head flinch (less while
     * the fighter is swinging), the arms follow the reaction only when no action is using them, and the legs
     * keep the locomotion.
     */
    #layerHit(m) {
        const links = this.#links;
        const saved = this.#hitSaved;
        for (let i = 0; i < links.length; i += 1) if (this.#hitLayer[i]) saved[i].copy(links[i].bone.quaternion);
        const hips = this.#bones.Hips.position.clone();
        for (const entry of this.#actions.values()) entry.action.enabled = false;
        // The reaction to the side the blow came from: the two nearest of the four directional clips, blended.
        const angle = m.hitAngle ?? 0;
        const shares = HIT_SIDES.map(([, x, z]) => Math.max(0, Math.cos(angle) * z + Math.sin(angle) * x));
        const total = shares.reduce((sum, share) => sum + share, 0) || 1;
        HIT_SIDES.forEach(([name], index) => {
            const hit = this.#entry(name);
            hit.action.enabled = shares[index] > 0.001;
            hit.action.weight = shares[index] / total;
            hit.action.time = Math.min((1 - m.flinch) * HIT_CLIP_SECONDS, hit.duration - 1e-3);
        });
        this.#mixer.update(0);
        this.#retarget();
        this.#bones.Hips.position.copy(hips);
        // A fighter hit mid-swing keeps its own blow readable: the torso only rocks, the arms barely move.
        const acting = m.action ? m.action.blend : 0;
        const torso = this.#hit * (1 - acting * 0.55);
        const arms = this.#hit * (1 - acting * 0.85);
        for (let i = 0; i < links.length; i += 1) {
            const layer = this.#hitLayer[i];
            if (!layer) continue;
            const { quaternion } = links[i].bone;
            const weight = layer === 1 ? torso : arms;
            quaternion.copy(saved[i]).slerp(quaternion, weight);
        }
    }

    /** Copies the clips' world-space bone motion onto the hero skeleton (see SyntyAssets#createRig). */
    #retarget() {
        const links = this.#links;
        const animated = this.#animationWorld;
        const posed = this.#heroWorld;
        const { q } = this.#scratch;
        for (let i = 0; i < links.length; i += 1) {
            const { bone, source, parent, delta } = links[i];
            if (source) {
                if (parent >= 0) animated[i].copy(animated[parent]).multiply(source.quaternion);
                else animated[i].copy(source.quaternion);
            }
            else if (parent >= 0) animated[i].copy(animated[parent]);
            if (delta) {
                posed[i].copy(animated[i]).multiply(delta);
                if (parent >= 0) bone.quaternion.copy(q.copy(posed[parent]).invert()).multiply(posed[i]);
                else bone.quaternion.copy(posed[i]);
            }
            else if (parent >= 0) posed[i].copy(posed[parent]).multiply(bone.quaternion);
            else posed[i].copy(bone.quaternion);
        }
        if (this.#hips) this.#bones.Hips.position.copy(this.#hips.position);
    }


    // ------------------------------------------------------------------ pose layer

    /** Sets `bone` toward its rest rotation turned by `delta` (a rotation in the posed parent frame), by `weight`. */
    #turn(name, delta, weight = 1) {
        const { local, world, inverse } = this.#rest.get(name);
        const target = this.#scratch.t.copy(local).multiply(this.#scratch.q.copy(inverse).multiply(delta).multiply(world));
        if (weight >= 1) this.#bones[name].quaternion.copy(target);
        else this.#bones[name].quaternion.slerp(target, weight);
    }

    #euler(x, y, z) {
        return this.#scratch.d.setFromEuler(this.#scratch.e.set(x, y, z, 'XYZ'));
    }

    /** Spells and archery: the torso, head and arms follow the `motion.js` pose over the clip legs. */
    #overridePose(p, o, weight) {
        this.#turn('Spine_01', this.#euler(p.lean - o.bodyRecoil * 0.35, p.twist, p.roll), weight);
        this.#turn('Neck', this.#euler(p.hx, p.hy - p.twist * 0.6, 0), weight);
        this.#arm('L', p.lsh - o.armRecoil * 0.4, p.lsz, p.lel, weight);
        this.#arm('R', p.rsh - o.armRecoil * 0.4, p.rsz, p.rel, weight);
    }

    /** Shoulder swing/abduction on top of the hang rotation, and the elbow bend about the hanging arm's own X axis. */
    #arm(side, swing, spread, elbow, weight) {
        const { down, up } = this.#hang[side];
        const q = this.#scratch.a;
        this.#turn(`Shoulder_${side}`, this.#euler(swing, 0, spread).multiply(down), weight);
        q.copy(up).multiply(this.#euler(elbow, 0, 0)).multiply(down);
        this.#turn(`Elbow_${side}`, q, weight);
    }

    // ------------------------------------------------------------------ archery

    /** Sets a bone's world rotation (blended by `weight`) and refreshes its subtree. */
    #setWorld(bone, world, weight) {
        const { q, t } = this.#scratch;
        bone.parent.getWorldQuaternion(q);
        t.copy(q.invert()).multiply(world);
        if (weight >= 1) bone.quaternion.copy(t);
        else bone.quaternion.slerp(t, weight);
        bone.updateMatrixWorld(true);
    }

    /** Turns a bone about the world vertical by `angle`, on top of its current pose. */
    #yaw(bone, angle, weight) {
        const { a, d } = this.#scratch;
        bone.getWorldQuaternion(a);
        d.setFromAxisAngle(this.#ik.up, angle);
        this.#setWorld(bone, d.multiply(a), weight);
    }

    /** Swings `bone` so the direction toward `child` points at `target` (world space). */
    #aimBone(bone, child, target, weight) {
        const { from, to, at } = this.#ik;
        const { a, d } = this.#scratch;
        bone.getWorldPosition(at);
        child.getWorldPosition(from).sub(at).normalize();
        to.copy(target).sub(at).normalize();
        d.setFromUnitVectors(from, to);
        bone.getWorldQuaternion(a);
        this.#setWorld(bone, d.multiply(a), weight);
    }

    /** Two-bone IK: shoulder and elbow so the hand reaches `target`, the elbow bending toward `pole`. */
    #reach(side, target, pole, weight) {
        const shoulder = this.#bones[`Shoulder_${side}`];
        const elbow = this.#bones[`Elbow_${side}`];
        const hand = this.#bones[`Hand_${side}`];
        const { s, e, h, dir, bend, joint } = this.#ik;
        shoulder.getWorldPosition(s);
        elbow.getWorldPosition(e);
        hand.getWorldPosition(h);
        const upper = s.distanceTo(e);
        const fore = e.distanceTo(h);
        dir.copy(target).sub(s);
        const reach = Math.min(dir.length(), (upper + fore) * 0.999);
        dir.normalize();
        const cos = Math.max(-1, Math.min(1, (upper * upper + reach * reach - fore * fore) / (2 * upper * reach)));
        bend.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
        joint.copy(s).addScaledVector(dir, upper * cos).addScaledVector(bend, upper * Math.sqrt(1 - cos * cos));
        this.#aimBone(shoulder, elbow, joint, weight);
        this.#aimBone(elbow, hand, this.#ik.goal.copy(s).addScaledVector(dir, reach), weight);
    }

    /**
     * Archery on the Synty skeleton (there is no bow clip): the torso turns side-on, the head looks down the
     * shot, the bow arm stretches toward the target at eye level and the draw hand pulls the string from the bow
     * to the anchor under the chin, snapping back past it on release. The bow is stood upright in world space.
     */
    #aimBow(action, weight) {
        const THREE = this.#THREE;
        this.#ik ??= Object.fromEntries(IK_VECTORS.map((key) => [key, new THREE.Vector3()]));
        const ik = this.#ik;
        const spec = ACTION_SPECS[action.style] ?? ACTION_SPECS.ranged;
        const time = action.time;
        ik.up.set(0, 1, 0);
        this.figure.updateWorldMatrix(true, true);
        this.figure.getWorldDirection(ik.aim);
        ik.aim.y = 0;
        ik.aim.normalize();

        // Side-on: the bow shoulder leads, the head turns back to look along the arrow.
        for (const name of ['Spine_01', 'Spine_02', 'Spine_03']) this.#yaw(this.#bones[name], -ARCHERY_TWIST / 3, weight);
        this.#yaw(this.#bones.Neck, ARCHERY_TWIST * 0.55, weight);
        this.#yaw(this.#bones.Head, ARCHERY_TWIST * 0.3, weight);

        const { left, right, neck, anchor, bowHand, drawHand, pole } = ik;
        this.#bones.Shoulder_L.getWorldPosition(left);
        this.#bones.Shoulder_R.getWorldPosition(right);
        this.#bones.Neck.getWorldPosition(neck);
        const width = left.distanceTo(right);
        const arm = this.#bones.Shoulder_L.getWorldPosition(ik.s).distanceTo(this.#bones.Elbow_L.getWorldPosition(ik.e))
            + ik.e.distanceTo(this.#bones.Hand_L.getWorldPosition(ik.h));
        // Anchor: at the corner of the jaw on the draw-hand side, so the forearm passes beside the head, not
        // through it; the arrow runs level from there.
        ik.side.crossVectors(ik.aim, ik.up);
        anchor.copy(neck).addScaledVector(ik.up, width * 0.14).addScaledVector(ik.aim, width * 0.12).addScaledVector(ik.side, width * 0.24);
        bowHand.copy(left).addScaledVector(ik.aim, arm * 0.97);
        bowHand.y = anchor.y + width * 0.08;
        const draw = smoothstep(0.06, spec.holdAt - 0.04, time);
        const release = smoothstep(spec.contact, spec.contact + 0.07, time);
        // The string rides with the fingers from the nock to the anchor and snaps back on release.
        // Released the moment the engine reports the arrow (it flies on from where it sat), or on the clock if it never does.
        this.#pull = action.fired ? 0 : smoothstep(0, 0.25, draw) * (1 - smoothstep(spec.contact, spec.contact + 0.03, time));
        drawHand.copy(bowHand).addScaledVector(ik.aim, -width * 0.25).lerp(anchor, draw)
            .addScaledVector(ik.aim, -width * 0.3 * release);
        this.#reach('L', bowHand, pole.copy(ik.up).multiplyScalar(-1).addScaledVector(ik.aim, -0.3), weight);
        // The draw elbow points straight back from the arrow, a little out from the body.
        this.#reach('R', drawHand, pole.copy(ik.aim).multiplyScalar(-1).addScaledVector(ik.side, 0.45).addScaledVector(ik.up, -0.1), weight);

    }

    /**
     * Stands the bow in world space, whatever the hand is doing: carried at the side with the top limb tipped
     * forward, or upright with the string toward the archer while shooting (`aim` blends between the two).
     * In the bow's own frame the limbs run along X and bend in the X-Z plane, with the string on the -Z side.
     */
    #standBow(aim) {
        const THREE = this.#THREE;
        const ik = this.#ik ??= Object.fromEntries(IK_VECTORS.map((key) => [key, new THREE.Vector3()]));
        const bow = this.#parts.bow;
        const { x, y, z } = ik;
        const { q, t, d } = this.#scratch;
        this.figure.updateWorldMatrix(true, true);
        this.figure.getWorldDirection(ik.aim);
        ik.aim.y = 0;
        ik.aim.normalize();
        ik.up.set(0, 1, 0);
        const basis = (tilt, out) => {
            x.copy(ik.up).addScaledVector(ik.aim, tilt).normalize();
            z.copy(ik.aim).addScaledVector(x, -ik.aim.dot(x)).normalize();
            y.crossVectors(z, x);
            return out.setFromRotationMatrix(this.#bowBasis.makeBasis(x, y, z));
        };
        basis(BOW_CARRY_TILT, t);
        if (aim > 0) t.slerp(basis(0, d), aim);
        bow.parent.getWorldQuaternion(q);
        bow.quaternion.copy(q.invert().multiply(t));
        bow.updateMatrixWorld(true);
    }

    /**
     * Lays the arrow on the string: nock in the draw hand, shaft through the bow hand, tip past the bow.
     * Kept in world terms so the flying arrow can start exactly here (see `nockedArrow`).
     */
    #nock(visible) {
        const arrow = this.#parts.arrow;
        arrow.visible = visible;
        if (!visible) return;
        const THREE = this.#THREE;
        const world = this.#arrowWorld ??= { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), nock: new THREE.Vector3(), dir: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, 1), scale: new THREE.Vector3() };
        this.#bones.Hand_R.getWorldPosition(world.nock);
        this.#bones.Hand_L.getWorldPosition(world.dir).sub(world.nock);
        if (world.dir.lengthSq() < 1e-6) world.dir.copy(this.#ik.aim);
        world.dir.normalize();
        world.position.copy(world.nock).addScaledVector(world.dir, (ARROW_LENGTH * ARROW_SCALE) / 2);
        world.quaternion.setFromUnitVectors(world.forward, world.dir);
        const { q } = this.#scratch;
        this.figure.updateWorldMatrix(true, false);
        this.figure.matrixWorld.decompose(world.scale, q, world.scale);
        arrow.position.copy(this.figure.worldToLocal(this.#ik.goal.copy(world.position)));
        arrow.quaternion.copy(q.invert().multiply(world.quaternion));
        this.figure.getWorldScale(world.scale);
        arrow.scale.set(ARROW_SCALE / world.scale.x, ARROW_SCALE / world.scale.y, ARROW_SCALE / world.scale.z);
    }

    /**  {{ position: import('three').Vector3, quaternion: import('three').Quaternion }|null} World pose of the arrow on the string, if one is drawn. */
    nockedArrow() {
        if (!this.#parts.arrow.visible || !this.#arrowWorld) return null;
        return { position: this.#arrowWorld.position.clone(), quaternion: this.#arrowWorld.quaternion.clone() };
    }

    /** Pulls the middle of the string toward the draw hand by `amount` (0 = at rest, 1 = in the hand). */
    #pullString(amount) {
        const string = this.#string;
        if (!string) return;
        string.bone.position.copy(string.rest);
        if (amount <= 0.001) return;
        const { at, goal } = this.#ik;
        string.bone.parent.updateWorldMatrix(true, false);
        string.bone.parent.localToWorld(at.copy(string.rest));
        this.#bones.Hand_R.getWorldPosition(goal);
        string.bone.position.copy(string.bone.parent.worldToLocal(at.lerp(goal, amount)));
    }

    /**
     * Dizzy wobble over the stun clip: the torso, neck and head circle about tilting axes on staggered phases and
     * the hips sway side to side, as if the fighter is about to lose balance (the stars spin overhead).
     */
    #dizzy(weight) {
        const THREE = this.#THREE;
        const t = this.#clock;
        this.#dizzyScratch ??= { axis: new THREE.Vector3(), turn: new THREE.Quaternion(), world: new THREE.Quaternion() };
        const { axis, turn, world } = this.#dizzyScratch;
        this.figure.updateWorldMatrix(true, true);
        const sway = Math.sin(t * 1.7);
        this.#bones.Hips.position.x += sway * 4 * weight;
        this.#bones.Hips.updateMatrixWorld(true);
        for (const [name, amount, lag] of [['Spine_01', 0.14, 0], ['Neck', 0.18, 0.7], ['Head', 0.16, 1.3]]) {
            const phase = t * 2.4 - lag;
            axis.set(Math.cos(phase), 0, Math.sin(phase));
            turn.setFromAxisAngle(axis, amount * weight * (0.8 + 0.2 * Math.sin(t * 0.9)));
            const bone = this.#bones[name];
            bone.getWorldQuaternion(world);
            this.#setWorld(bone, turn.multiply(world), 1);
        }
    }

    /**
     * Shaking off a stun: three quick turns of the head from side to side that die away, the neck following, with a
     * small nod as it clears.
     *
     * @param {number} u Progress through the shake, 0 to 1.
     */
    #shakeOff(u) {
        const THREE = this.#THREE;
        this.#shakeScratch ??= { up: new THREE.Vector3(0, 1, 0), side: new THREE.Vector3(), turn: new THREE.Quaternion(), nodding: new THREE.Quaternion(), world: new THREE.Quaternion() };
        const { up, side, turn, nodding, world } = this.#shakeScratch;
        this.figure.updateWorldMatrix(true, true);
        // The nod tips about the fighter's own left-right axis, whichever way it faces.
        side.set(1, 0, 0).applyQuaternion(this.figure.getWorldQuaternion(world));
        const envelope = Math.sin(Math.PI * u) * (1 - u * 0.4);
        const swing = Math.sin(u * Math.PI * 6) * 0.5 * envelope;
        const nod = Math.sin(u * Math.PI * 2) * 0.12 * envelope;
        for (const [name, share] of [['Neck', 0.4], ['Head', 0.6]]) {
            const bone = this.#bones[name];
            bone.getWorldQuaternion(world);
            turn.setFromAxisAngle(up, swing * share).multiply(nodding.setFromAxisAngle(side, nod * share));
            this.#setWorld(bone, turn.multiply(world), 1);
        }
    }

    /** Applies pose math and blends locomotion, combat, and upper-body IK overrides. */
    applyPose(p, o) {
        const m = o.motion;
        this.#play(m);
        if (this.#stun > 0.01 && !(m.dead > 0)) this.#dizzy(this.#stun);
        if (this.#shake > 0 && !(m.dead > 0)) this.#shakeOff(1 - this.#shake / SHAKE_OFF_SECONDS);
        const pose = POSE_ACTIONS.has(m.action?.style) && m.dead <= 0 ? m.action.blend : 0;
        const shooting = pose > 0.001 && SHOT_STYLES.has(m.action.style);
        if (shooting) this.#aimBow(m.action, pose);
        else if (pose > 0.001) this.#overridePose(p, o, pose);
        if (!this.#parts.bow.visible) {
            this.#parts.arrow.visible = false;
            return;
        }
        if (m.dead > 0) this.#parts.bow.quaternion.copy(this.#bowGrip);
        else this.#standBow(shooting ? pose : 0);
        this.#pullString(shooting && m.dead <= 0 ? pose * this.#pull : 0);
        if (shooting) {
            // The assassin's bleeding arrow is red, like the flying arrow that takes over from it.
            const bleeding = m.action.style === 'assassinate';
            this.#arrowMaterials.shaft.color.setHex(bleeding ? 0x8a1420 : 0xe6d2a1);
            this.#arrowMaterials.head.color.setHex(bleeding ? 0xd01020 : 0xc8ced6);
        }
        this.#nock(shooting && m.dead <= 0 && this.#pull > 0.05 && pose > 0.3);
        this.#capeSway(m);
    }

    /**
     * Lets a cape move: each bone of its chain bends a little behind the fighter, more the faster it moves (the cape
     * streams out when running) and with a soft flutter travelling down the cloth. Five bone rotations on the CPU, reset
     * to rest every frame; nothing extra for the GPU. Capes without the chain (the tattered one) stay rigid.
     */
    #capeSway(m) {
        if (!this.#cape.length) return;
        const THREE = this.#THREE;
        this.#capeScratch ??= { side: new THREE.Vector3(), turn: new THREE.Quaternion(), world: new THREE.Quaternion() };
        const { side, turn, world } = this.#capeScratch;
        for (const { bone, rest } of this.#cape) bone.quaternion.copy(rest);
        this.#cape[0].bone.parent.updateWorldMatrix(true, false);
        side.set(1, 0, 0).applyQuaternion(this.figure.getWorldQuaternion(world));
        // The lift follows speed with some lag, as cloth does; a fallen fighter's cape just lies.
        const target = m.dead > 0 ? 0 : Math.min(CAPE_MAX_LIFT, (m.speed ?? 0) * CAPE_LIFT_PER_SPEED);
        this.#capeLift += (target - this.#capeLift) * (1 - Math.exp(-(m.dt ?? 0) * 3));
        const t = this.#clock;
        this.#cape.forEach(({ bone }, i) => {
            const flutter = Math.sin(t * 2.6 - i * 0.9) * (0.035 + 0.06 * this.#capeLift);
            const bend = this.#capeLift * (0.3 + 0.12 * i) + flutter;
            bone.getWorldQuaternion(world);
            turn.setFromAxisAngle(side, bend);
            this.#setWorld(bone, turn.multiply(world), 1);
        });
    }

    /**
     * Writes the world-space centre of the head into `target`, for portrait framing.
     *
     * @param {import('three').Vector3} target Receives the position.
     * @returns {import('three').Vector3} `target`.
     */
    /**
     * Where a ray meets the body as it is posed now, and the bone nearest that point (so something stuck there can
     * follow the animation). Weapons and props are ignored.
     *
     * @param {import('three').Vector3} origin Ray start, in world space.
     * @param {import('three').Vector3} direction Unit ray direction.
     * @param {number} far Longest distance to look.
     * @returns {{ point: import('three').Vector3, normal: import('three').Vector3|null, bone: import('three').Bone }|null} Hit, or null on a miss.
     */
    bodyHit(origin, direction, far) {
        const THREE = this.#THREE;
        this.#raycaster ??= new THREE.Raycaster();
        this.#raycaster.set(origin, direction);
        this.#raycaster.far = far;
        this.figure.updateMatrixWorld(true);
        // Skinned bounds are computed once in whatever pose the mesh had; refresh them so the ray tests this pose.
        for (const mesh of this.#bodyMeshes) mesh.computeBoundingSphere();
        const hit = this.#raycaster.intersectObjects(this.#bodyMeshes, false)[0];
        if (!hit) return null;
        // The bone that drives the struck triangle most (its first corner's strongest skin weight).
        const { skinIndex, skinWeight } = hit.object.geometry.attributes;
        let bone = this.#bones.Spine_03;
        if (hit.face && skinIndex && skinWeight) {
            let best = 0;
            for (let k = 0; k < 4; k += 1) {
                const weight = skinWeight.getComponent(hit.face.a, k);
                if (weight > best) {
                    best = weight;
                    bone = hit.object.skeleton.bones[skinIndex.getComponent(hit.face.a, k)] ?? bone;
                }
            }
        }
        return { point: hit.point.clone(), normal: hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : null, bone };
    }

    /**
     * @param {string} name A posed bone (`Hips`, `Spine_01..03`, `Neck`, `Head`, `Shoulder_L/R`, `Elbow_L/R`, `Hand_L/R`).
     * @param {import('three').Vector3} target Receives the bone's world position.
     * @returns {import('three').Vector3} `target`.
     */
    bonePosition(name, target) {
        return this.#bones[name].getWorldPosition(target);
    }

    headPosition(target) {
        this.figure.updateMatrixWorld(true);
        return this.#bones.Neck.getWorldPosition(target);
    }

    /** Updates equipped hand props based on current combat action. */
    setWeapons(held, extra) {
        const { melee, bow, flask, shield } = this.#parts;
        const casting = extra === 'orb';
        melee.visible = held === 'melee' && !casting;
        bow.visible = held === 'bow' && !casting;
        // The bow hand cannot carry the shield; it stays strapped on for melee and spells.
        if (shield) shield.visible = held !== 'bow';
        flask.visible = extra === 'flask';
    }

    /** Sets visual status effects such as opacity, flinch flashes, and burn intensity. */
    setLook({ opacity, flash, burn, poison = 0 }) {
        const key = `${opacity}|${flash.toFixed(2)}|${burn.toFixed(2)}|${poison.toFixed(2)}`;
        if (key === this.#emissiveKey) return;
        this.#emissiveKey = key;
        for (const material of this.#materials) {
            if (material.userData.baseEmissive === undefined) material.userData.baseEmissive = material.emissive.getHex();
            material.emissive.setHex(material.userData.baseEmissive);
            if (flash > 0.01) material.emissive.r += flash * 0.75;
            if (burn > 0) material.emissive.setRGB(material.emissive.r + burn, material.emissive.g + burn * 0.35, material.emissive.b);
            if (poison > 0) material.emissive.setRGB(material.emissive.r + poison * 0.15, material.emissive.g + poison * 0.85, material.emissive.b);
            const alpha = material.userData.baseOpacity * opacity;
            const transparent = alpha < 0.999 || material.userData.baseOpacity < 1;
            // three compiles an OPAQUE shader variant, so flipping the flag needs a recompile
            if (material.transparent !== transparent) {
                material.transparent = transparent;
                material.needsUpdate = true;
            }
            material.opacity = alpha;
            material.depthWrite = alpha > 0.6;
        }
    }

    /** Releases the per-fighter materials; geometry, textures and clips are shared and live as long as the renderer. */
    dispose() {
        this.#mixer.stopAllAction();
        this.#materials.forEach((material) => material.dispose());
        this.#flaskGeometry?.dispose();
        this.#arrowGeometries.forEach((geometry) => geometry.dispose());
    }
}

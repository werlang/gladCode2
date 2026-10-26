import { MAX_SPECTATORS, STANDING_MOTIONS, planCrowd, weighted } from './crowd-layout.js';
import { loadTexture } from './textures.js';

const ROOT = '/assets/synty/';
const CHARACTERS = `${ROOT}ancient-empire/FBX/Characters/Individual/`;
const ATLASES = ['01_A', '02_A', '03_A'].map((name) => `${ROOT}ancient-empire/Textures/Alts/PolygonAncientWorlds_Texture_${name}.png`);
const ANIMATION_CHARACTER = `${ROOT}base-locomotion/Character/PolygonSyntyCharacter.fbx`;
const LOCOMOTION = `${ROOT}base-locomotion/Animations/Polygon/`;
const SWORD = `${ROOT}sword-combat/Animations/Polygon/`;
const EMPTY_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
const IMAGE_URL = /\.(png|jpe?g|tga|tif|psd)(\?|$)/i;

/** Centimetres (the FBX unit) to metres, at a size where a seated shin spans one tread of the stands. */
export const CROWD_SCALE = 0.0056;

/** Who fills the stands, who guards them, and the editor of the games in the honour box. */
const SPECTATOR_TYPES = ['Farmer_Male_01', 'Farmer_Female_01', 'Worker_Male_01', 'Worker_Female_01', 'Upperclass_Male_01', 'Upperclass_Female_01'];
const GUARD_TYPES = ['Solider_Male_01', 'Soldier_Female_02'];
const NOTABLE_TYPE = 'Leader_Male_01';
/** Head props of the pack; each load dresses every character type afresh. */
const ATTACHMENTS = `${ROOT}ancient-empire/FBX/Attachments/`;
const HAIR = { Masc: [1, 2, 3, 4, 5, 6, 7].map((n) => `SM_Chr_Hair_Male_0${n}`), Femn: [1, 2, 3, 4, 5, 6].map((n) => `SM_Chr_Hair_Female_0${n}`) };
const BEARDS = [1, 2, 3, 4].map((n) => `SM_Chr_Hair_Beard_0${n}`);
const HELMETS = [1, 2, 3, 4].map((n) => `SM_Chr_Attach_Helmet_0${n}`);
const CROWN = 'SM_Chr_Attach_Crown_Leaf_01';
const any = (list) => list[Math.floor(Math.random() * list.length)];

/** Props for a character: hair (and a beard for some men) for citizens, a helmet for soldiers, laurels for the leader. */
function dress(role, gender) {
    if (role === 'guards') return [any(HELMETS)];
    if (role === 'notable') return [CROWN, any(BEARDS)];
    const props = [any(HAIR[gender])];
    if (gender === 'Masc' && Math.random() < 0.45) props.push(any(BEARDS));
    return props;
}

/** Source clips, per gender where the pack has both. */
const CLIPS = {
    idle: (g) => `${LOCOMOTION}${g === 'Femn' ? 'Feminine' : 'Masculine'}/Idle/A_Idle_Standing_${g}.fbx`,
    jump: (g) => `${LOCOMOTION}${g === 'Femn' ? 'Feminine' : 'Masculine'}/InAir/A_Jump_Idle_${g}.fbx`,
    walk: (g) => `${LOCOMOTION}${g === 'Femn' ? 'Feminine' : 'Masculine'}/Locomotion/Walk/A_Walk_F_${g}.fbx`,
    guard: (g) => `${SWORD}Idle/Sheathed/A_Idle_Sheathed_Sword_${g}.fbx`,
};

/**
 * Baked motions: a source clip, optionally seated, with procedural arms. `frames` samples one loop of
 * `seconds`; `whole` plays the full source clip over the loop, otherwise the body holds the clip's first pose
 * (plus a little sway) and the arms carry the motion.
 */
const MOTIONS = {
    sit: { clip: 'idle', seated: true, arms: 'rest', frames: 12, whole: true },
    sitClap: { clip: 'idle', seated: true, arms: 'clap', frames: 8, seconds: 0.38 },
    sitFist: { clip: 'idle', seated: true, arms: 'fist', frames: 10, seconds: 0.8 },
    sitWave: { clip: 'idle', seated: true, arms: 'wave', frames: 12, seconds: 1.2 },
    stand: { clip: 'idle', frames: 12, whole: true },
    standCheer: { clip: 'idle', arms: 'wave', frames: 12, seconds: 1.1 },
    standPump: { clip: 'idle', arms: 'pump', frames: 10, seconds: 0.7 },
    jumpCheer: { clip: 'jump', arms: 'up', frames: 16, whole: true },
    guard: { clip: 'guard', frames: 12, whole: true },
    walk: { clip: 'walk', frames: 16, whole: true },
};
const SPECTATOR_MOTIONS = ['sit', 'sitClap', 'sitFist', 'sitWave', 'stand', 'standCheer', 'standPump', 'jumpCheer'];
const GUARD_MOTIONS = ['guard', 'walk'];
const NOTABLE_MOTIONS = ['sit', 'sitWave'];
/** Seconds over which a spectator or guard blends into a new motion. */
const CROSSFADE_SECONDS = 0.45;
/** How far (radians) a spectator turns off its bench facing to follow the fight. */
const LOOK_LIMIT = 0.6;
/** Seconds between updates of where the spectators look. */
const FOLLOW_INTERVAL = 0.1;
/** Walk speed in metres per second that matches the walk clip's stride at crowd scale. */
const WALK_SPEED = (150 / 1.0667) * CROWD_SCALE;

const loadFbx = (loader, url) => loader.loadAsync(url);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Bakes skinned characters into vertex animation textures: every frame of every motion is retargeted from the
 * Synty animation skeleton onto the character (both share bone names and a T-pose bind), shaped by the
 * procedural arm and leg poses, skinned on the CPU and stored as one texture row of vertex positions.
 */
class CrowdBaker {
    #THREE;
    #anim;
    #animRest = new Map();
    #mixer;
    #clips;
    #v = {};
    #q = {};

    constructor(THREE, animationCharacter, clips) {
        this.#THREE = THREE;
        this.#anim = animationCharacter;
        this.#clips = clips;
        animationCharacter.updateMatrixWorld(true);
        animationCharacter.traverse((node) => {
            if (node.isBone) this.#animRest.set(node.name, { world: node.getWorldQuaternion(new THREE.Quaternion()), position: node.getWorldPosition(new THREE.Vector3()) });
        });
        this.#mixer = new THREE.AnimationMixer(animationCharacter);
        for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']) this.#v[name] = new THREE.Vector3();
        for (const name of ['a', 'b', 'c', 'd']) this.#q[name] = new THREE.Quaternion();
    }

    /**
     * @param {import('three').Object3D} character Loaded character FBX.
     * @param {string} gender `Masc` or `Femn`, to pick the matching clips.
     * @param {string[]} motions Motions to bake.
     * @param {import('three').Object3D[]} [attachments] Hair, beard, helmet or crown FBX, modelled around the head pivot.
     * @returns {Promise<{ geometry: import('three').BufferGeometry, texture: import('three').DataTexture, rows: Record<string, { start: number, frames: number, seconds: number }> }>} Baked crowd member.
     */
    async bake(character, gender, motions, attachments = []) {
        const THREE = this.#THREE;
        character.updateMatrixWorld(true);
        const mesh = [];
        character.traverse((node) => { if (node.isSkinnedMesh) mesh.push(node); });
        const skinned = mesh[0];
        const bones = new Map();
        character.traverse((node) => { if (node.isBone) bones.set(node.name, node); });
        const rest = new Map([...bones].map(([name, bone]) => [name, bone.getWorldQuaternion(new THREE.Quaternion())]));
        const restLocal = new Map([...bones].map(([name, bone]) => [name, { q: bone.quaternion.clone(), p: bone.position.clone() }]));
        const hipsRatio = bones.get('Hips').getWorldPosition(new THREE.Vector3()).y / this.#animRest.get('Hips').position.y;
        const order = [];
        character.traverse((node) => { if (node.isBone) order.push(node); });
        const head = bones.get('Head');
        const headBindInverse = head.matrixWorld.clone().invert();

        const body = skinned.geometry;
        const props = this.#attachments(attachments, head.getWorldPosition(new THREE.Vector3()), Boolean(body.index));
        const bodyCount = body.attributes.position.count;
        const count = bodyCount + props.count;
        const rows = {};
        let total = 0;
        for (const name of motions) {
            rows[name] = { start: total, frames: MOTIONS[name].frames, seconds: 0 };
            total += MOTIONS[name].frames;
        }
        const data = new Uint16Array(count * total * 4);
        const toHalf = THREE.DataUtils.toHalfFloat;
        const skin = this.#skinner(skinned, character);
        const headMotion = new THREE.Matrix4();
        const point = new THREE.Vector3();

        for (const name of motions) {
            const motion = MOTIONS[name];
            const clip = this.#clips.get(`${motion.clip}:${gender}`) ?? this.#clips.get(`${motion.clip}:Masc`);
            const action = this.#mixer.clipAction(clip);
            this.#mixer.stopAllAction();
            action.reset().play();
            const seconds = motion.whole ? clip.duration : motion.seconds;
            rows[name].seconds = seconds;
            for (let frame = 0; frame < motion.frames; frame += 1) {
                const u = frame / motion.frames;
                action.time = motion.whole ? u * clip.duration : 0;
                this.#mixer.update(0);
                this.#anim.updateMatrixWorld(true);
                for (const [boneName, local] of restLocal) {
                    bones.get(boneName).quaternion.copy(local.q);
                    bones.get(boneName).position.copy(local.p);
                }
                this.#retarget(order, rest, bones, hipsRatio);
                character.updateMatrixWorld(true);
                this.#shape(bones, motion, u, character);
                character.updateMatrixWorld(true);
                const positions = skin();
                const row = (rows[name].start + frame) * count * 4;
                for (let i = 0; i < bodyCount; i += 1) {
                    data[row + i * 4] = toHalf(positions[i * 3]);
                    data[row + i * 4 + 1] = toHalf(positions[i * 3 + 1]);
                    data[row + i * 4 + 2] = toHalf(positions[i * 3 + 2]);
                }
                // Props ride on the head: its motion since the bind pose, applied to their bind positions.
                headMotion.multiplyMatrices(head.matrixWorld, headBindInverse);
                for (let i = 0; i < props.count; i += 1) {
                    point.fromArray(props.positions, i * 3).applyMatrix4(headMotion);
                    const at = row + (bodyCount + i) * 4;
                    data[at] = toHalf(point.x);
                    data[at + 1] = toHalf(point.y);
                    data[at + 2] = toHalf(point.z);
                }
            }
            await tick();
        }
        const texture = new THREE.DataTexture(data, count, total, THREE.RGBAFormat, THREE.HalfFloatType);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        const baked = new THREE.BufferGeometry();
        const join = (name, size) => {
            const array = new Float32Array(count * size);
            array.set(body.attributes[name].array.subarray(0, bodyCount * size));
            array.set(props[name], bodyCount * size);
            return new THREE.BufferAttribute(array, size);
        };
        baked.setAttribute('position', join('position', 3));
        baked.setAttribute('uv', join('uv', 2));
        baked.setAttribute('normal', join('normal', 3));
        if (body.index) {
            const index = new Uint32Array(body.index.count + props.index.length);
            index.set(body.index.array);
            index.set(props.index.map((i) => i + bodyCount), body.index.count);
            baked.setIndex(new THREE.BufferAttribute(index, 1));
        }
        baked.setAttribute('vatIndex', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => i), 1));
        baked.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 90, 0), 160);
        return { geometry: baked, texture, rows };
    }

    /**
     * Flattens the attachments into one vertex list in character space at the bind pose (they are modelled with
     * the head pivot as origin and the character's axes).
     */
    #attachments(roots, headPosition, indexed) {
        const THREE = this.#THREE;
        const lists = { position: [], uv: [], normal: [], index: [] };
        let count = 0;
        for (const root of roots) {
            root.updateMatrixWorld(true);
            root.traverse((node) => {
                if (!node.isMesh) return;
                let geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
                geometry.translate(headPosition.x, headPosition.y, headPosition.z);
                if (!indexed && geometry.index) geometry = geometry.toNonIndexed();
                const n = geometry.attributes.position.count;
                lists.position.push(...geometry.attributes.position.array);
                lists.uv.push(...(geometry.attributes.uv?.array ?? new Float32Array(n * 2)));
                lists.normal.push(...geometry.attributes.normal.array);
                if (indexed) {
                    const index = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: n }, (_, i) => i);
                    lists.index.push(...index.map((i) => i + count));
                }
                count += n;
                geometry.dispose();
            });
        }
        return { count, positions: Float32Array.from(lists.position), position: Float32Array.from(lists.position), uv: Float32Array.from(lists.uv), normal: Float32Array.from(lists.normal), index: lists.index };
    }


    /** Fast CPU skinning into character-root space: one matrix per bone per frame, then four weighted transforms per vertex. */
    #skinner(mesh, character) {
        const THREE = this.#THREE;
        const { skinIndex, skinWeight, position } = mesh.geometry.attributes;
        const count = position.count;
        const out = new Float32Array(count * 3);
        const bones = mesh.skeleton.bones;
        const matrices = bones.map(() => new THREE.Matrix4());
        const toRoot = new THREE.Matrix4();
        const base = new Float32Array(count * 3);
        const bind = mesh.bindMatrix;
        const v = new THREE.Vector3();
        for (let i = 0; i < count; i += 1) {
            v.fromBufferAttribute(position, i).applyMatrix4(bind);
            base[i * 3] = v.x; base[i * 3 + 1] = v.y; base[i * 3 + 2] = v.z;
        }
        return () => {
            // Bone matrices map the bind space straight into the character root (whose world is the identity here).
            const rootInverse = toRoot.copy(character.matrixWorld).invert();
            bones.forEach((bone, i) => matrices[i].multiplyMatrices(rootInverse, bone.matrixWorld).multiply(mesh.skeleton.boneInverses[i]));
            for (let i = 0; i < count; i += 1) {
                const x = base[i * 3]; const y = base[i * 3 + 1]; const z = base[i * 3 + 2];
                let ox = 0; let oy = 0; let oz = 0;
                for (let k = 0; k < 4; k += 1) {
                    const weight = skinWeight.getComponent(i, k);
                    if (weight === 0) continue;
                    const e = matrices[skinIndex.getComponent(i, k)].elements;
                    ox += (e[0] * x + e[4] * y + e[8] * z + e[12]) * weight;
                    oy += (e[1] * x + e[5] * y + e[9] * z + e[13]) * weight;
                    oz += (e[2] * x + e[6] * y + e[10] * z + e[14]) * weight;
                }
                out[i * 3] = ox; out[i * 3 + 1] = oy; out[i * 3 + 2] = oz;
            }
            return out;
        };
    }

    /** Copies the animation skeleton's world rotations (relative to its T-pose) onto the character's T-pose. */
    #retarget(order, rest, bones, hipsRatio) {
        const THREE = this.#THREE;
        const world = new Map();
        const { a, b } = this.#q;
        for (const bone of order) {
            const source = this.#anim.getObjectByName(bone.name);
            const parentWorld = world.get(bone.parent?.name) ?? (bone.parent ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion());
            const animRest = this.#animRest.get(bone.name);
            let target;
            if (source?.isBone && animRest && rest.has(bone.name)) {
                target = source.getWorldQuaternion(a).multiply(b.copy(animRest.world).invert()).multiply(rest.get(bone.name)).clone();
                bone.quaternion.copy(parentWorld.clone().invert().multiply(target));
            }
            else target = parentWorld.clone().multiply(bone.quaternion);
            world.set(bone.name, target);
            if (bone.name === 'Hips' && source) {
                const position = source.getWorldPosition(this.#v.a).multiplyScalar(hipsRatio);
                bone.parent.updateWorldMatrix(true, false);
                bone.position.copy(bone.parent.worldToLocal(position));
            }
        }
    }

    // ------------------------------------------------------------------ procedural poses

    /** Sets a bone's world rotation and refreshes its subtree. */
    #setWorld(bone, world) {
        const parent = bone.parent.getWorldQuaternion(this.#q.c);
        bone.quaternion.copy(parent.invert().multiply(world));
        bone.updateMatrixWorld(true);
    }

    /** Swings `bone` so the direction toward `child` points at `target`. */
    #aim(bone, child, target) {
        const { a, b, c } = this.#v;
        bone.getWorldPosition(a);
        child.getWorldPosition(b).sub(a).normalize();
        c.copy(target).sub(a).normalize();
        const turn = this.#q.d.setFromUnitVectors(b, c);
        this.#setWorld(bone, turn.multiply(bone.getWorldQuaternion(this.#q.a)).clone());
    }

    /** Two-bone IK: `upper` and `lower` so `end` reaches `target`, bending toward `pole`. */
    #reach(upper, lower, end, target, pole) {
        const { d, e, f, g, h } = this.#v;
        upper.getWorldPosition(d);
        const a = d.distanceTo(lower.getWorldPosition(e));
        const b = e.distanceTo(end.getWorldPosition(f));
        g.copy(target).sub(d);
        const reach = Math.min(g.length(), (a + b) * 0.999);
        g.normalize();
        const cos = Math.max(-1, Math.min(1, (a * a + reach * reach - b * b) / (2 * a * reach)));
        h.copy(pole).addScaledVector(g, -pole.dot(g)).normalize();
        const joint = d.clone().addScaledVector(g, a * cos).addScaledVector(h, a * Math.sqrt(1 - cos * cos));
        this.#aim(upper, lower, joint);
        this.#aim(lower, end, d.clone().addScaledVector(g, reach));
    }

    /**
     * Seats the figure and moves its arms. The character faces +Z with its left on +X, in centimetres; a seated
     * figure's origin is the seat surface, a standing one's the floor.
     */
    #shape(bones, motion, u, character) {
        const THREE = this.#THREE;
        const up = new THREE.Vector3(0, 1, 0);
        const forward = new THREE.Vector3(0, 0, 1);
        const left = new THREE.Vector3(1, 0, 0);
        const at = (name) => bones.get(name).getWorldPosition(new THREE.Vector3());
        const wave = Math.sin(u * Math.PI * 2);
        if (motion.seated) {
            const hips = bones.get('Hips');
            const target = at('Hips').setY(14).setZ(-4);
            hips.parent.updateWorldMatrix(true, false);
            hips.position.copy(hips.parent.worldToLocal(target));
            character.updateMatrixWorld(true);
            for (const [side, sign] of [['L', 1], ['R', -1]]) {
                const hip = at(`UpperLeg_${side}`);
                const thigh = at(`UpperLeg_${side}`).distanceTo(at(`LowerLeg_${side}`));
                const shin = at(`LowerLeg_${side}`).distanceTo(at(`Ankle_${side}`));
                const ankle = hip.clone().addScaledVector(forward, thigh * 0.95 + shin * 0.12).addScaledVector(up, -shin * 0.98).addScaledVector(left, sign * 4);
                this.#reach(bones.get(`UpperLeg_${side}`), bones.get(`LowerLeg_${side}`), bones.get(`Ankle_${side}`), ankle, forward.clone().addScaledVector(up, 0.4));
                const ball = bones.get(`Ball_${side}`);
                if (ball) this.#aim(bones.get(`Ankle_${side}`), ball, at(`Ankle_${side}`).addScaledVector(forward, 10).addScaledVector(up, -2));
            }
        }
        // A light sway keeps a held pose alive.
        if (!motion.whole) {
            const spine = bones.get('Spine_01');
            const sway = new THREE.Quaternion().setFromAxisAngle(left, 0.04 * wave);
            this.#setWorld(spine, sway.multiply(spine.getWorldQuaternion(new THREE.Quaternion())));
        }
        if (!motion.arms) return;
        const chest = at('Spine_03');
        const arm = (side, target, pole) => this.#reach(bones.get(`Shoulder_${side}`), bones.get(`Elbow_${side}`), bones.get(`Hand_${side}`), target, pole);
        const shoulder = { L: at('Shoulder_L'), R: at('Shoulder_R') };
        const sideways = { L: 1, R: -1 };
        const out = (side) => left.clone().multiplyScalar(sideways[side]);
        const downOut = (side) => out(side).addScaledVector(up, -1).addScaledVector(forward, -0.3);
        const raised = (side, spread, height, sway = 0) => shoulder[side].clone().addScaledVector(up, height).addScaledVector(out(side), spread + sway * sideways[side]).addScaledVector(forward, 6);
        const rest = (side) => {
            const knee = at(`LowerLeg_${side}`);
            return knee.addScaledVector(up, 8).addScaledVector(forward, -10);
        };
        switch (motion.arms) {
            case 'rest':
                for (const side of ['L', 'R']) arm(side, rest(side), downOut(side));
                break;
            case 'clap': {
                // Hands swing apart and meet in front of the chest once per loop.
                const apart = 3 + 15 * (0.5 + 0.5 * Math.cos(u * Math.PI * 2));
                for (const side of ['L', 'R']) arm(side, chest.clone().addScaledVector(forward, 30).addScaledVector(up, 6).addScaledVector(out(side), apart / 2), downOut(side));
                break;
            }
            case 'fist':
                arm('R', raised('R', 8, 42 + 6 * wave, 4 * Math.cos(u * Math.PI * 2)), out('R').addScaledVector(forward, -0.5));
                arm('L', rest('L'), downOut('L'));
                break;
            case 'wave':
                for (const side of ['L', 'R']) arm(side, raised(side, 10, 46, 8 * wave), out(side).addScaledVector(forward, -0.4));
                break;
            case 'pump': {
                // Two sharp punches at the sky per loop, the other hand on the hip.
                const punch = Math.pow(Math.abs(Math.sin(u * Math.PI * 2)), 0.6);
                arm('R', shoulder.R.clone().addScaledVector(up, 6 + 44 * punch).addScaledVector(forward, 16 * (1 - punch) + 4).addScaledVector(out('R'), 6), out('R').addScaledVector(up, -0.5));
                arm('L', at('UpperLeg_L').addScaledVector(out('L'), 10).addScaledVector(up, 12).addScaledVector(forward, 4), out('L').addScaledVector(forward, -1));
                break;
            }
            case 'up':
                for (const side of ['L', 'R']) arm(side, raised(side, 9, 48), out(side).addScaledVector(forward, -0.4));
                break;
            default: break;
        }
    }
}

/**
 * Vertex shader patch: the vertex position comes from the baked texture, blended between two frames of the
 * instance's motion (`crowdClip`: first row, frame count, phase, loops per second). Normals come from the
 * screen-space derivatives (flat shading), which suits the low-poly look and needs no second texture.
 */
function vatMaterial(THREE, map, texture, time) {
    const material = new THREE.MeshLambertMaterial({ map, flatShading: true });
    material.onBeforeCompile = (shader) => {
        shader.uniforms.vatPositions = { value: texture };
        shader.uniforms.vatTime = time;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
uniform sampler2D vatPositions;
uniform float vatTime;
attribute float vatIndex;
attribute vec4 crowdClip;
attribute vec4 crowdFrom;
attribute float crowdSwitch;
vec3 vatSample(vec4 clip, int column) {
    float frame = fract(clip.z + vatTime * clip.w) * clip.y;
    float base = floor(frame);
    vec3 a = texelFetch(vatPositions, ivec2(column, int(clip.x + base)), 0).xyz;
    vec3 b = texelFetch(vatPositions, ivec2(column, int(clip.x + mod(base + 1.0, clip.y))), 0).xyz;
    return mix(a, b, frame - base);
}`)
            .replace('#include <begin_vertex>', `
int vatColumn = int(vatIndex);
// A new motion fades in over the previous one from the moment it was switched.
float vatFade = smoothstep(0.0, ${CROSSFADE_SECONDS.toFixed(2)}, vatTime - crowdSwitch);
vec3 transformed = vatSample(crowdClip, vatColumn);
if (vatFade < 1.0) transformed = mix(vatSample(crowdFrom, vatColumn), transformed, vatFade);`);
    };
    material.customProgramCacheKey = () => 'synty-crowd-vat';
    return material;
}

/** One instanced batch: a baked character in one colour variant. */
class CrowdBatch {
    constructor(THREE, baked, map, time, capacity) {
        this.baked = baked;
        this.material = vatMaterial(THREE, map, baked.texture, time);
        this.clip = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
        this.clip.setUsage(THREE.DynamicDrawUsage);
        this.from = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
        this.from.setUsage(THREE.DynamicDrawUsage);
        this.switched = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(-1e4), 1);
        this.switched.setUsage(THREE.DynamicDrawUsage);
        this.time = time;
        // Every batch needs its own clip attribute, so each gets a shallow copy of the shared geometry.
        const geometry = new THREE.BufferGeometry();
        for (const [name, attribute] of Object.entries(baked.geometry.attributes)) geometry.setAttribute(name, attribute);
        geometry.setIndex(baked.geometry.index);
        geometry.setAttribute('crowdClip', this.clip);
        geometry.setAttribute('crowdFrom', this.from);
        geometry.setAttribute('crowdSwitch', this.switched);
        geometry.boundingSphere = baked.geometry.boundingSphere;
        this.geometry = geometry;
        this.mesh = new THREE.InstancedMesh(geometry, this.material, capacity);
        this.mesh.count = 0;
        // Members span the whole bowl; per-instance culling is not worth it.
        this.mesh.frustumCulled = false;
        this.members = [];
        this.matrix = new THREE.Matrix4();
        this.rotation = new THREE.Quaternion();
        this.up = new THREE.Vector3(0, 1, 0);
        this.scale = new THREE.Vector3(CROWD_SCALE, CROWD_SCALE, CROWD_SCALE);
        this.position = new THREE.Vector3();
    }

    add(member) {
        member.batch = this;
        member.slot = this.members.length;
        this.members.push(member);
        this.place(member);
        this.play(member, member.motion);
    }

    place(member) {
        const size = CROWD_SCALE * (member.size ?? 1);
        this.matrix.compose(this.position.set(member.x, member.y, member.z), this.rotation.setFromAxisAngle(this.up, member.yaw), this.scale.set(size, size, size));
        this.mesh.setMatrixAt(member.slot, this.matrix);
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    /** Switches a member to `motion`, fading from what it was doing (the first motion starts outright). */
    play(member, motion) {
        const row = this.baked.rows[motion];
        const slot = member.slot;
        if (member.started) {
            if (member.motion === motion) return;
            this.from.setXYZW(slot, this.clip.getX(slot), this.clip.getY(slot), this.clip.getZ(slot), this.clip.getW(slot));
            this.switched.setX(slot, this.time.value);
            this.from.needsUpdate = true;
            this.switched.needsUpdate = true;
        }
        member.started = true;
        member.motion = motion;
        this.clip.setXYZW(slot, row.start, row.frames, member.phase ?? 0, (member.rate ?? 1) / row.seconds);
        this.clip.needsUpdate = true;
    }

    /** Shows the first `count` members (they were shuffled when placed). */
    show(count) {
        this.mesh.count = Math.min(this.members.length, count);
    }
}

/**
 * The coliseum crowd: spectators of the Ancient Empire pack in the stands, guards at the gates, on the walkway and
 * by the honour box, patrols on the sand and on the walkway, and the editor of the games in the honour box. A new
 * random layout every time it is built. Spectators switch between sitting and their own way of cheering, and the
 * whole crowd gets to its feet when the fight heats up (`react`).
 */
export class SyntyCrowd {
    group;
    #THREE;
    #time = { value: 0 };
    #batches = [];
    #spectators = [];
    #patrols = [];
    #density = 1;
    #excitement = 0;
    #elapsed = 0;
    #nextShuffle = 0;
    /** Where the fight is (world x, z), which the spectators turn to follow; null keeps them facing ahead. */
    #focus = null;
    #sinceFollow = 0;
    #disposables = [];

    /**
     * @param {typeof import('three')} THREE Three namespace.
     * @param {{ spectators: object[], guards: object[], notable: object }} baked Baked characters by role.
     * @param {import('three').Texture[]} atlases Colour variants.
     * @param {Map<string, object>} plan Coliseum plan, for the layout.
     */
    constructor(THREE, baked, atlases, plan, posts = [], throne = null) {
        this.#THREE = THREE;
        this.group = new THREE.Group();
        this.group.name = 'synty-crowd';
        const layout = planCrowd(plan, Math.random, posts, throne);
        const batch = (role, typeIndex, variantIndex, capacity) => {
            const key = `${role}:${typeIndex}:${variantIndex}`;
            let found = this.#batches.find((entry) => entry.key === key);
            if (!found) {
                found = new CrowdBatch(THREE, baked[role][typeIndex], atlases[variantIndex], this.#time, capacity);
                found.key = key;
                this.#batches.push(found);
                this.group.add(found.mesh);
                this.#disposables.push(found.material, found.geometry);
            }
            return found;
        };
        const pick = (list, value) => Math.min(list.length - 1, Math.floor(value * list.length));

        for (const spectator of layout.spectators) {
            const member = { ...spectator, motion: spectator.upright ? spectator.standing : spectator.seated, standUntil: 0 };
            member.yaw += member.jitter;
            // Each follows the fight from its own bench facing, with its own eye and its own pace.
            member.ahead = member.yaw;
            member.look = 0;
            member.lookBias = (Math.random() - 0.5) * 0.16;
            member.lookRate = 1.2 + Math.random() * 2;
            batch('spectators', pick(baked.spectators, spectator.type), pick(atlases, spectator.variant), MAX_SPECTATORS).add(member);
            this.#spectators.push(member);
        }
        for (const guard of layout.guards) {
            batch('guards', pick(baked.guards, guard.type), pick(atlases, guard.variant), 32).add({ ...guard, motion: 'guard', rate: 1 });
        }
        for (const patrol of layout.patrols) {
            const member = { ...patrol, x: patrol.a.x, z: patrol.a.z, yaw: 0, motion: 'walk', phase: 0, rate: 1, state: 'walk', wait: 0, forward: true };
            batch('guards', pick(baked.guards, patrol.type), pick(atlases, patrol.variant), 32).add(member);
            this.#patrols.push(member);
        }
        if (layout.notable && baked.notable[0]) {
            batch('notable', 0, 0, 1).add({ ...layout.notable, motion: 'sit', phase: 0, rate: 1, notable: true });
        }
        this.setDensity(1);
    }

    /** @param {number} density Fraction of the spectators shown (guards always stand). */
    setDensity(density) {
        this.#density = Math.max(0, Math.min(1, Number(density)));
        for (const entry of this.#batches) {
            if (!entry.key.startsWith('spectators')) {
                entry.show(Infinity);
                continue;
            }
            // Members were shuffled, so each batch shows its share of the crowd.
            entry.show(Math.round(entry.members.length * this.#density));
        }
    }

    /**
     * The crowd reacts to the fight: a share of the seated spectators jumps up for a few seconds.
     *
     * @param {number} intensity 0 to 1 (a death is 1, a big hit about 0.4).
     */
    react(intensity) {
        this.#excitement = Math.min(1, this.#excitement + intensity);
        // A death brings most of the crowd to its feet; a solid blow only the keenest few.
        const share = 0.05 + 0.65 * intensity * intensity;
        for (const member of this.#spectators) {
            if (member.upright || Math.random() > share) continue;
            member.standUntil = this.#elapsed + 2 + Math.random() * 3 * (0.5 + intensity);
            if (!STANDING_MOTIONS.some(([name]) => name === member.motion)) member.batch.play(member, member.standing);
        }
    }

    /**
     * @param {number} elapsed Animation seconds (real time).
     * @param {number} dt Seconds since the previous frame.
     */
    update(elapsed, dt) {
        this.#elapsed = elapsed;
        // Excited crowds move faster; the shared clock runs ahead instead of every loop changing speed.
        this.#excitement = Math.max(0, this.#excitement - dt * 0.25);
        this.#time.value += dt * (1 + 0.5 * this.#excitement);
        for (const member of this.#spectators) {
            if (member.standUntil && elapsed > member.standUntil) {
                member.standUntil = 0;
                member.batch.play(member, member.seated);
            }
        }
        // Now and then a few spectators change how they cheer.
        if (elapsed > this.#nextShuffle) {
            this.#nextShuffle = elapsed + 1.5 + Math.random() * 2;
            for (let i = 0; i < 6 && this.#spectators.length; i += 1) {
                const member = this.#spectators[Math.floor(Math.random() * this.#spectators.length)];
                if (member.standUntil) continue;
                if (member.upright) member.standing = weighted(STANDING_MOTIONS, Math.random);
                member.batch.play(member, member.upright ? member.standing : member.seated);
            }
        }
        for (const patrol of this.#patrols) this.#patrol(patrol, dt);
        // Heads turn slowly: following the fight 10 times a second looks the same and re-uploads the instance
        // matrices a sixth as often.
        this.#sinceFollow += dt;
        if (this.#sinceFollow >= FOLLOW_INTERVAL) {
            this.#follow(this.#sinceFollow);
            this.#sinceFollow = 0;
        }
    }

    /**
     * Where the action is: the spectators turn toward it as far as their seat allows.
     *
     * @param {{ x: number, z: number }|null} at World position of the fight (null: face ahead).
     */
    setFocus(at) {
        this.#focus = at ? { x: at.x, z: at.z } : null;
    }

    /**
     * Turns every spectator toward the fight, at most `LOOK_LIMIT` off its bench facing, each at its own pace and
     * aiming a little off, so the stands sway with the action instead of snapping to it.
     */
    #follow(dt) {
        if (dt <= 0) return;
        for (const member of this.#spectators) {
            let goal = 0;
            if (this.#focus) {
                const toward = Math.atan2(this.#focus.x - member.x, this.#focus.z - member.z);
                const off = ((toward - member.ahead + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                goal = Math.max(-LOOK_LIMIT, Math.min(LOOK_LIMIT, off + member.lookBias));
            }
            const next = member.look + (goal - member.look) * (1 - Math.exp(-dt * member.lookRate));
            if (Math.abs(next - member.look) < 0.002) continue;
            member.look = next;
            member.yaw = member.ahead + next;
            member.batch.place(member);
        }
    }

    /** Walks a patrol to the end of its beat, has it stand a moment, turn round and walk back. */
    #patrol(member, dt) {
        const from = member.forward ? member.a : member.b;
        const to = member.forward ? member.b : member.a;
        const length = Math.hypot(to.x - from.x, to.z - from.z);
        const heading = Math.atan2(to.x - from.x, to.z - from.z);
        if (member.state === 'walk') {
            member.progress = Math.min(1, member.progress + (dt * WALK_SPEED) / length);
            member.x = from.x + (to.x - from.x) * member.progress;
            member.z = from.z + (to.z - from.z) * member.progress;
            member.yaw = heading;
            if (member.progress >= 1) {
                member.state = 'wait';
                member.wait = 1.5 + Math.random() * 2.5;
                member.batch.play(member, 'guard');
            }
        }
        else {
            member.wait -= dt;
            // Turns about while standing, toward the way back.
            const back = heading + Math.PI;
            const delta = Math.atan2(Math.sin(back - member.yaw), Math.cos(back - member.yaw));
            if (member.wait < 1) member.yaw += delta * Math.min(1, dt * 4);
            if (member.wait <= 0) {
                member.state = 'walk';
                member.forward = !member.forward;
                member.progress = 0;
                member.batch.play(member, 'walk');
            }
        }
        member.batch.place(member);
    }

    dispose() {
        this.group.removeFromParent();
        this.#disposables.forEach((item) => item.dispose());
    }
}

/**
 * Loads the Ancient Empire characters and the Synty clips, bakes them and builds a crowd in the coliseum.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {Map<string, object>} plan Coliseum plan (`SyntyColiseum#plan`).
 * @param {Array<{ x: number, y: number, z: number }>} [posts] Lookout points on the structure (`SyntyColiseum#posts`).
 * @returns {Promise<SyntyCrowd>} Crowd; rejects when the packs are missing.
 */
export async function loadSyntyCrowd(THREE, plan, posts = [], throne = null, manager = null) {
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    if (!manager) {
        manager = new THREE.LoadingManager();
        manager.setURLModifier((url) => (IMAGE_URL.test(url) ? EMPTY_PIXEL : url));
    }
    const loader = new FBXLoader(manager);
    const loadTex = async (url) => {
        manager.itemStart(url);
        try {
            const texture = await loadTexture(THREE, url);
            manager.itemEnd(url);
            return texture;
        } catch (error) {
            manager.itemError(url);
            throw error;
        }
    };
    const genders = ['Masc', 'Femn'];
    const clipEntries = Object.entries(CLIPS).flatMap(([name, url]) => genders.map((g) => [`${name}:${g}`, url(g)]));
    const female = (name) => /Female/.test(name);
    const [animationCharacter, clipSources, spectators, guards, notable, atlases] = await Promise.all([
        loadFbx(loader, ANIMATION_CHARACTER),
        Promise.all(clipEntries.map(async ([key, url]) => [key, await loadFbx(loader, url)])),
        Promise.all(SPECTATOR_TYPES.map((name) => loadFbx(loader, `${CHARACTERS}SM_Chr_${name}.fbx`))),
        Promise.all(GUARD_TYPES.map((name) => loadFbx(loader, `${CHARACTERS}SM_Chr_${name}.fbx`))),
        loadFbx(loader, `${CHARACTERS}SM_Chr_${NOTABLE_TYPE}.fbx`),
        Promise.all(ATLASES.map((url) => loadTex(url))),
    ]);
    const clips = new Map(clipSources.map(([key, source]) => {
        const clip = source.animations[0];
        // In place: the crowd walks along its own path.
        clip.tracks = clip.tracks.filter((track) => !track.name.startsWith('Root.'));
        return [key, clip];
    }));
    const baker = new CrowdBaker(THREE, animationCharacter, clips);
    const props = new Map();
    const prop = (name) => {
        if (!props.has(name)) props.set(name, loadFbx(loader, `${ATTACHMENTS}${name}.fbx`));
        return props.get(name);
    };
    const bakeAll = async (role, characters, names, motions) => {
        const out = [];
        for (const [index, character] of characters.entries()) {
            const gender = female(names[index]) ? 'Femn' : 'Masc';
            const attachments = await Promise.all(dress(role, gender).map(prop));
            out.push(await baker.bake(character, gender, motions, attachments));
        }
        return out;
    };
    const baked = {
        spectators: await bakeAll('spectators', spectators, SPECTATOR_TYPES, SPECTATOR_MOTIONS),
        guards: await bakeAll('guards', guards, GUARD_TYPES, GUARD_MOTIONS),
        notable: await bakeAll('notable', [notable], [NOTABLE_TYPE], NOTABLE_MOTIONS),
    };
    return new SyntyCrowd(THREE, baked, atlases, plan, posts, throne);
}

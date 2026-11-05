/**
 * Small synthetic Synty FBX scenes for tests of `render2/synty-model.js`, in the shape the real packs have: cm units,
 * the Synty bone names, skinned part meshes named like the modular hero parts (bare `_00` pieces), clip files with a
 * `Root` skeleton and one clip, weapons, a rigged bow with its string bone and a shield. `buildSyntyFbx(url)` picks
 * the scene a URL asks for, as `FBXLoader#load` would return it.
 */
import * as THREE from 'three';

/** The Synty hero skeleton, T-pose, in cm: name, parent, offset from the parent. +X is the character's left. */
const BONES = [
    ['Root', null, [0, 0, 0]],
    ['Hips', 'Root', [0, 83.2, 0]],
    ['Spine_01', 'Hips', [0, 10, 0]],
    ['Spine_02', 'Spine_01', [0, 12, 0]],
    ['Spine_03', 'Spine_02', [0, 12, 0]],
    ['Neck', 'Spine_03', [0, 15, 0]],
    ['Head', 'Neck', [0, 8, 0]],
    ['Shoulder_L', 'Spine_03', [17, 10, 0]],
    ['Elbow_L', 'Shoulder_L', [27, 0, 0]],
    ['Hand_L', 'Elbow_L', [25, 0, 0]],
    ['Prop_L', 'Hand_L', [7, 0, 0]],
    ['Shoulder_R', 'Spine_03', [-17, 10, 0]],
    ['Elbow_R', 'Shoulder_R', [-27, 0, 0]],
    ['Hand_R', 'Elbow_R', [-25, 0, 0]],
    ['Prop_R', 'Hand_R', [-7, 0, 0]],
    ['UpperLeg_L', 'Hips', [9, -4, 0]],
    ['LowerLeg_L', 'UpperLeg_L', [0, -38, 0]],
    ['Ankle_L', 'LowerLeg_L', [0, -38, 0]],
    ['UpperLeg_R', 'Hips', [-9, -4, 0]],
    ['LowerLeg_R', 'UpperLeg_R', [0, -38, 0]],
    ['Ankle_R', 'LowerLeg_R', [0, -38, 0]],
];

function skeleton() {
    const bones = new Map();
    for (const [name, parent, offset] of BONES) {
        const bone = new THREE.Bone();
        bone.name = name;
        bone.position.set(...offset);
        bones.set(name, bone);
        if (parent) bones.get(parent).add(bone);
    }
    const root = bones.get('Root');
    root.updateMatrixWorld(true);
    return { root, bones, list: [...bones.values()] };
}

const world = (bones, name) => bones.get(name).getWorldPosition(new THREE.Vector3());

/** Atlas points the recolour shader reads: the skin area and the mid-metal / secondary cloth swatches. */
const UV = {
    skin: [600 / 1024, 1 - 900 / 1024],
    cloth: [350 / 1024, 1 - 690 / 1024],
    leather: [395 / 1024, 1 - 640 / 1024],
    hair: [120 / 1024, 1 - 840 / 1024],
};

/** A box between two points (cm), skinned to one bone, its UVs on one atlas point. */
function part(rig, name, bone, from, to, thickness, uv) {
    const a = world(rig.bones, from);
    const b = to ? world(rig.bones, to) : a.clone().add(new THREE.Vector3(0, thickness, 0));
    const length = a.distanceTo(b) || thickness;
    const geometry = new THREE.BoxGeometry(thickness, length, thickness * 0.8);
    geometry.translate(0, length / 2, 0);
    const direction = b.clone().sub(a).normalize();
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.lengthSq() ? direction : new THREE.Vector3(0, 1, 0)));
    geometry.translate(a.x, a.y, a.z);
    const count = geometry.attributes.position.count;
    const index = rig.list.indexOf(rig.bones.get(bone));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(count * 4).fill(0).map((_, i) => (i % 4 === 0 ? index : 0)), 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(count * 4).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
    const uvs = geometry.attributes.uv;
    for (let i = 0; i < uvs.count; i += 1) uvs.setXY(i, ...UV[uv]);
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshLambertMaterial());
    mesh.name = name;
    return mesh;
}

/** Hero parts: every family the outfits name, in its bare `_00` piece (SyntyModel falls back to it). */
function heroParts(rig, gender) {
    const g = gender;
    return [
        part(rig, `Chr_Torso_${g}_00`, 'Spine_02', 'Spine_01', 'Neck', 30, 'cloth'),
        part(rig, `Chr_Hips_${g}_00`, 'Hips', 'UpperLeg_R', 'UpperLeg_L', 22, 'leather'),
        part(rig, `Chr_Head_${g}_01`, 'Head', 'Head', null, 20, 'skin'),
        part(rig, `Chr_Eyebrow_${g}_01`, 'Head', 'Head', null, 1, 'hair'),
        part(rig, `Chr_ArmUpperLeft_${g}_00`, 'Shoulder_L', 'Shoulder_L', 'Elbow_L', 9, 'skin'),
        part(rig, `Chr_ArmUpperRight_${g}_00`, 'Shoulder_R', 'Shoulder_R', 'Elbow_R', 9, 'skin'),
        part(rig, `Chr_ArmLowerLeft_${g}_00`, 'Elbow_L', 'Elbow_L', 'Hand_L', 8, 'skin'),
        part(rig, `Chr_ArmLowerRight_${g}_00`, 'Elbow_R', 'Elbow_R', 'Hand_R', 8, 'skin'),
        part(rig, `Chr_HandLeft_${g}_00`, 'Hand_L', 'Hand_L', 'Prop_L', 8, 'skin'),
        part(rig, `Chr_HandRight_${g}_00`, 'Hand_R', 'Hand_R', 'Prop_R', 8, 'skin'),
        part(rig, `Chr_LegLeft_${g}_00`, 'UpperLeg_L', 'UpperLeg_L', 'LowerLeg_L', 12, 'leather'),
        part(rig, `Chr_LegRight_${g}_00`, 'UpperLeg_R', 'UpperLeg_R', 'LowerLeg_R', 12, 'leather'),
    ];
}

function character() {
    const group = new THREE.Group();
    // one rig per part list, as the Synty FBX repeats its skeleton per part
    for (const gender of ['Male', 'Female']) {
        const rig = skeleton();
        const extra = gender === 'Male' ? [
            part(rig, 'Chr_Hair_00', 'Head', 'Head', null, 22, 'hair'),
            part(rig, 'Chr_FacialHair_Male_00', 'Head', 'Head', null, 6, 'hair'),
            part(rig, 'Chr_HeadCoverings_No_Hair_00', 'Head', 'Head', null, 23, 'cloth'),
            part(rig, 'Chr_HeadCoverings_Base_Hair_00', 'Head', 'Head', null, 23, 'cloth'),
            part(rig, 'Chr_BackAttachment_00', 'Spine_03', 'Spine_03', 'Spine_01', 26, 'cloth'),
            part(rig, 'Chr_ShoulderAttachLeft_00', 'Shoulder_L', 'Shoulder_L', null, 12, 'cloth'),
            part(rig, 'Chr_ShoulderAttachRight_00', 'Shoulder_R', 'Shoulder_R', null, 12, 'cloth'),
            part(rig, 'Chr_Ear_Ear_00', 'Head', 'Head', null, 4, 'skin'),
        ] : [];
        const meshes = [...heroParts(rig, gender), ...extra];
        const holder = new THREE.Group();
        holder.add(rig.root);
        for (const mesh of meshes) {
            holder.add(mesh);
            mesh.bind(new THREE.Skeleton(rig.list), new THREE.Matrix4());
        }
        group.add(holder);
    }
    return group;
}

function animationCharacter() {
    const rig = skeleton();
    const group = new THREE.Group();
    group.add(rig.root);
    const mesh = part(rig, 'Body', 'Hips', 'Hips', 'Neck', 20, 'cloth');
    group.add(mesh);
    mesh.bind(new THREE.Skeleton(rig.list), new THREE.Matrix4());
    return group;
}

/** A clip file: the Root skeleton and one clip (legs and arms swing on the walks, the sword arm on the attacks). */
function clip(url) {
    const rig = skeleton();
    const group = new THREE.Group();
    group.add(rig.root);
    // the synthetic bones rest unrotated, so a track is the swing itself: out, back, out again over one second
    const swing = (bone, axis, amount) => new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, [0, 0.5, 1],
        [-amount, amount, -amount].flatMap((angle) => new THREE.Quaternion().setFromAxisAngle(axis, angle).toArray()));
    const X = new THREE.Vector3(1, 0, 0);
    const Z = new THREE.Vector3(0, 0, 1);
    let tracks;
    if (/Walk|Run|Sprint/.test(url)) tracks = [swing('UpperLeg_L', X, 0.45), swing('UpperLeg_R', X, -0.45), swing('Shoulder_L', Z, 0.15), swing('Shoulder_R', Z, -0.15)];
    else if (/Attack/.test(url)) tracks = [swing('Shoulder_R', Z, 0.9), swing('Spine_02', new THREE.Vector3(0, 1, 0), 0.4)];
    else tracks = [swing('Spine_01', X, 0.03)];
    tracks.push(new THREE.VectorKeyframeTrack('Root.position', [0, 1], [0, 0, 0, 0, 0, 10]));
    group.animations = [new THREE.AnimationClip('Take 001', 1, tracks)];
    return group;
}

/** A weapon: Viking Realm swords and knives lie along Z, the rest along Y. */
function weapon(url) {
    const group = new THREE.Group();
    const alongZ = /viking-realm\/FBX\/SM_Wep_(Sword|Knife)/.test(url);
    const blade = new THREE.BoxGeometry(3, 90, 1.2);
    blade.translate(0, 45, 0);
    if (alongZ) blade.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(blade, new THREE.MeshLambertMaterial());
    group.add(mesh);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 2), new THREE.MeshLambertMaterial());
    guard.position.set(0, alongZ ? 0 : 10, alongZ ? 10 : 0);
    group.add(guard);
    return group;
}

/** A rigged bow: limbs along Y, the string on -Z, with the string bone the archery pulls. */
function bow(url) {
    const group = new THREE.Group();
    const root = new THREE.Bone();
    root.name = 'BowRoot';
    const string = new THREE.Bone();
    string.name = /viking/.test(url) ? 'Wep_Bow_01' : 'bowString';
    string.position.set(0, 0, -6);
    root.add(string);
    group.add(root);
    group.updateMatrixWorld(true);
    const geometry = new THREE.TorusGeometry(45, 1.2, 6, 24, Math.PI);
    geometry.rotateZ(-Math.PI / 2);
    const count = geometry.attributes.position.count;
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(count * 4).fill(0), 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(count * 4).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshLambertMaterial());
    group.add(mesh);
    mesh.bind(new THREE.Skeleton([root, string]), new THREE.Matrix4());
    return group;
}

function shield() {
    const group = new THREE.Group();
    const geometry = new THREE.CylinderGeometry(30, 30, 3, 20).rotateX(Math.PI / 2);
    group.add(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial()));
    return group;
}

/**
 * @param {string} url A Synty FBX URL.
 * @returns {import('three').Group} The synthetic scene for it.
 */
export function buildSyntyFbx(url) {
    if (/ModularCharactersFixedScale/.test(url)) return character();
    if (/PolygonSyntyCharacter/.test(url)) return animationCharacter();
    if (/\/Animations\//.test(url)) return clip(url);
    if (/Rigged_Bow|Bow_Rigged/.test(url)) return bow(url);
    if (/Shield/.test(url)) return shield();
    if (/Chr_Skeleton/.test(url)) return character().children[0];
    return weapon(url);
}

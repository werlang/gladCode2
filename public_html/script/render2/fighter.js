import { terrainHeight } from './arena.js';
import { getAppearance } from './palette.js';
import {
    ACTION_BY_ID, ACTION_SPECS, COMBAT_STANCES, FOOT_HEIGHT, LEG_SEGMENT, REST, actionDuration, actionWeight, blendPose,
    MELEE_STYLES, TWO_HANDED, applyCombatStance, composePose, gaitForSpeed, hipHeight, locomotionPose, smoothstep,
} from './motion.js';

const FIGURE_SCALE = 0.6;
const ANCHOR_HEIGHT = 1.05;
const SPEED_SMOOTHING_SECONDS = 0.06;
const COMBAT_SECONDS = 4;
const COMBAT_ACTIONS = new Set(['melee', 'ranged', 'assassinate', 'charge', 'block', 'fireball']);
const YAW_SMOOTHING_PER_SECOND = 16;
const TELEPORT_DISTANCE = 4;
const FLINCH_SECONDS = 0.28;
const BOW_RADIUS = 0.38;
const BOW_BRACE = 0.25;
const BOW_DRAW = 0.43;
const MAX_HOLD_SECONDS = 1;
const DEATH_SECONDS = 0.55;
const TWO_PI = Math.PI * 2;
/** Direction the blade extends from the fist, in the forearm's local frame. */
const BLADE_DIRECTION = [0, -0.85, 0.5];
// Polearms run along the forearm so they point up-forward in guard and straight ahead when thrusting.
const POLEARM_DIRECTION = [0, -0.98, -0.1];

/** Shortest signed angle from `from` to `to`. */
function angleDelta(from, to) {
    return ((to - from) % TWO_PI + TWO_PI * 1.5) % TWO_PI - Math.PI;
}

/**
 * One gladiator: a procedural low-poly rig (hips, knees, shoulders, elbows) driven by
 * the pose math in motion.js. It owns interpolation between replay frames, distance-
 * driven gait, timed combat actions, flinch, death and status visuals.
 */
export class Fighter {
    #THREE;
    #materials = [];
    #geometries = new Map();
    #bones = {};
    #parts = {};
    #appearance;
    #from = { x: 0, z: 0 };
    #to = { x: 0, z: 0, yaw: 0 };
    #yaw = 0;
    #speed = 0;
    #moveWeight = 0;
    #combat = 0;
    #swings = 0;
    #forward = 0;
    #strafe = 0;
    #back = 0;
    #lateral = 0;
    #phase = 0;
    #clock = 0;
    #action = null;
    #flinch = 0;
    #stringParts = [];
    #actionBlend = 0;
    #weapon = 'melee';
    #dead = 0;
    #alive = true;
    #emissiveKey = '';
    #frozen = null;
    #basePose = { ...REST };
    #locoPose = { ...REST };
    #finalPose = { ...REST };
    #idlePose = { ...REST };
    #keyPose = { ...REST };
    #activeSpec = null;
    #anchor;

    /**
     * @param {{ THREE: typeof import('three'), gladiator: Record<string, unknown>, index: number, shadowTexture: import('three').Texture, colors?: Map<string, number> }} options Fighter dependencies.
     */
    constructor({ THREE, gladiator, index, shadowTexture, colors }) {
        this.#THREE = THREE;
        this.index = index;
        this.state = gladiator;
        this.#appearance = getAppearance(gladiator.skin, index, colors);
        this.#anchor = new THREE.Vector3();
        this.root = new THREE.Group();
        this.root.name = `gladiator-${index}`;
        this.#build(shadowTexture);
    }

    /** @returns {{ female: boolean }} Traits, used for voice selection. */
    get appearance() {
        return this.#appearance;
    }

    /** @returns {{ x: number, z: number, yaw: number, speed: number, phase: number, action: string|null }} Debug values. */
    get debug() {
        return {
            x: this.root.position.x,
            z: this.root.position.z,
            yaw: this.#yaw,
            speed: this.#speed,
            phase: this.#phase,
            action: this.#action?.name ?? null,
            weapon: this.#weapon,
        };
    }

    /** @returns {number} World-space Y of the head anchor used for labels. */
    static get anchorHeight() {
        return ANCHOR_HEIGHT;
    }

    // ---------------------------------------------------------------- building

    #material(color, options = {}) {
        const material = new this.#THREE.MeshLambertMaterial({ color, flatShading: true, ...options });
        material.userData.baseOpacity = options.opacity ?? 1;
        this.#materials.push(material);
        return material;
    }

    #geometry(key, factory) {
        if (!this.#geometries.has(key)) this.#geometries.set(key, factory());
        return this.#geometries.get(key);
    }

    /** Box whose origin is at its top-center, so it hangs from a joint. */
    #limb(width, height, depth, material) {
        const geometry = this.#geometry(`limb:${width}:${height}:${depth}`, () => {
            const box = new this.#THREE.BoxGeometry(width, height, depth);
            box.translate(0, -height / 2, 0);
            return box;
        });
        return new this.#THREE.Mesh(geometry, material);
    }

    /** Tapered rounded limb segment hanging from its top joint; `depth` scales the oval cross-section. */
    #tube(width, height, depth, material) {
        const geometry = this.#geometry(`tube:${width}:${height}:${depth}`, () => {
            const tube = new this.#THREE.CylinderGeometry(width / 2, width * 0.4, height, 6, 1);
            tube.scale(1, 1, depth / width);
            tube.translate(0, -height / 2, 0);
            return tube;
        });
        return new this.#THREE.Mesh(geometry, material);
    }

    #geometryMesh(key, factory, material) {
        return new this.#THREE.Mesh(this.#geometry(key, factory), material);
    }

    /** Box centered on its origin. */
    #block(width, height, depth, material) {
        const geometry = this.#geometry(`block:${width}:${height}:${depth}`, () => new this.#THREE.BoxGeometry(width, height, depth));
        return new this.#THREE.Mesh(geometry, material);
    }

    #ball(radius, material) {
        const geometry = this.#geometry(`ball:${radius}`, () => new this.#THREE.SphereGeometry(radius, 8, 6));
        return new this.#THREE.Mesh(geometry, material);
    }

    /** Hexagonal skull: broad cheek ring, narrow crown and a pointed chin, so flat shading yields angular facets. */
    #skullGeometry() {
        return this.#geometry('skull', () => {
            const skull = new this.#THREE.CylinderGeometry(1, 1, 1, 6, 3).rotateY(Math.PI / 6);
            const position = skull.attributes.position;
            const rings = [[0.105, 0.085], [0.13, 0.115], [0.115, 0.115], [0.045, 0.05]];
            const heights = [0.16, 0.07, -0.03, -0.16];
            for (let i = 0; i < position.count; i += 1) {
                const ring = Math.round((0.5 - position.getY(i)) * 3);
                const [x, z] = rings[ring];
                position.setXYZ(i, position.getX(i) * x, heights[ring], position.getZ(i) * z);
            }
            skull.computeVertexNormals();
            return skull;
        });
    }

    /** Hexagonal cap that sits over the crown for hair and helmets. */
    #hairCapGeometry(scale = 1) {
        return this.#geometry(`cap:${scale}`, () => new this.#THREE.CylinderGeometry(0.115 * scale, 0.15 * scale, 0.12 * scale, 6, 1).rotateY(Math.PI / 6));
    }

    /** Synty-style faceted head: skull, wedge nose, ears, eyes, then hair, beard and headgear from the skin. */
    #buildHead(head, look, skinMaterial) {
        const THREE = this.#THREE;
        const mesh = (geometry, material, x, y, z) => {
            const part = new THREE.Mesh(geometry, material);
            part.position.set(x, y, z);
            head.add(part);
            return part;
        };
        const box = (width, height, depth) => this.#geometry(`block:${width}:${height}:${depth}`, () => new THREE.BoxGeometry(width, height, depth));
        mesh(this.#geometry('neck', () => new THREE.CylinderGeometry(0.05, 0.06, 0.12, 6)), skinMaterial, 0, 0.02, 0);
        mesh(this.#skullGeometry(), skinMaterial, 0, 0.2, 0);
        const nose = mesh(this.#geometry('nose', () => new THREE.ConeGeometry(0.035, 0.085, 4).rotateX(Math.PI / 2)), skinMaterial, 0, 0.2, 0.115);
        nose.rotation.x = 0.25;
        for (const side of [1, -1]) {
            const ear = look.elfEars
                ? mesh(box(0.025, 0.11, 0.045), skinMaterial, side * 0.135, 0.27, -0.01)
                : mesh(box(0.03, 0.07, 0.05), skinMaterial, side * 0.125, 0.22, -0.01);
            if (look.elfEars) ear.rotation.z = -side * 0.55;
        }
        const eyes = this.#material(look.eyes);
        const brow = this.#material(look.hair);
        for (const side of [1, -1]) {
            mesh(box(0.035, 0.03, 0.02), eyes, side * 0.045, 0.245, 0.095);
            mesh(box(0.06, 0.018, 0.025), brow, side * 0.045, 0.28, 0.098);
        }
        if (look.hairStyle) this.#buildHair(mesh, box, look);
        if (look.facial) this.#buildFacial(mesh, box, look.facial);
        if (look.headgear) this.#buildHeadgear(mesh, box, look);
    }

    /** Hair silhouette per original style family: crest, afro, bun, tail, pigtails, long or cropped. */
    #buildHair(mesh, box, look) {
        const style = look.hairStyle;
        const hair = this.#material(look.hair);
        if (/hawk/.test(style)) {
            mesh(box(0.05, /long/.test(style) ? 0.2 : (/short/.test(style) ? 0.08 : 0.14), 0.26), hair, 0, 0.42, -0.02);
            return;
        }
        if (style === 'jewfro') {
            mesh(this.#geometry('afro', () => new this.#THREE.IcosahedronGeometry(0.21, 0)), hair, 0, 0.33, -0.02);
            return;
        }
        mesh(this.#hairCapGeometry(), hair, 0, 0.3, -0.01);
        mesh(box(0.2, 0.05, 0.05), hair, 0, 0.335, 0.085);
        const longStyle = /^(long|xlong|loose|princess|shoulder|bangslong)/.test(style);
        const back = /^xlong/.test(style) ? 0.5 : (longStyle ? 0.36 : 0.2);
        mesh(box(0.22, back, 0.06), hair, 0, 0.36 - back / 2, -0.11);
        if (longStyle) {
            for (const side of [1, -1]) mesh(box(0.04, back * 0.75, 0.1), hair, side * 0.12, 0.34 - back * 0.375, -0.06);
        }
        if (/^ponytail/.test(style)) mesh(box(0.07, 0.34, 0.07), hair, 0, 0.16, -0.17);
        if (/knot/.test(style)) mesh(this.#geometry('bun', () => new this.#THREE.IcosahedronGeometry(0.07, 0)), hair, 0, 0.4, -0.1);
        if (style === 'bunches') {
            for (const side of [1, -1]) mesh(box(0.07, 0.2, 0.07), hair, side * 0.15, 0.2, -0.04);
        }
    }

    /** Moustache, beard and stubble sit on the flat front of the skull and jaw. */
    #buildFacial(mesh, box, { kind, color }) {
        const material = this.#material(color ?? 0x3a2a1c);
        if (/stache/.test(kind) || kind === 'mustache') {
            mesh(box(/big/.test(kind) ? 0.15 : 0.1, 0.03, 0.03), material, 0, 0.165, 0.105);
        }
        if (kind === 'beard' || kind === 'frenchstache') {
            mesh(box(0.13, kind === 'beard' ? 0.11 : 0.05, 0.05), material, 0, kind === 'beard' ? 0.1 : 0.1, 0.075);
        }
        if (kind === 'fiveoclock') mesh(box(0.13, 0.08, 0.03), material, 0, 0.11, 0.085);
    }

    /** Helm, hood, cap, wizard hat, bandana or tiara, colored from the equipped item. */
    #buildHeadgear(mesh, box, look) {
        const gear = this.#material(look.helmet);
        switch (look.headgear) {
            case 'helm':
                mesh(this.#hairCapGeometry(1.12), gear, 0, 0.3, 0);
                mesh(box(0.03, 0.12, 0.03), gear, 0, 0.24, 0.125);
                break;
            case 'hood':
                mesh(this.#hairCapGeometry(1.2), gear, 0, 0.29, -0.01);
                mesh(box(0.3, 0.34, 0.08), gear, 0, 0.17, -0.12);
                for (const side of [1, -1]) mesh(box(0.05, 0.28, 0.16), gear, side * 0.14, 0.2, -0.04);
                break;
            case 'wizard': {
                mesh(this.#geometry('hat-brim', () => new this.#THREE.CylinderGeometry(0.27, 0.27, 0.02, 8)), gear, 0, 0.33, 0);
                const cone = mesh(this.#geometry('hat-cone', () => new this.#THREE.ConeGeometry(0.15, 0.34, 6)), gear, 0, 0.5, -0.02);
                cone.rotation.x = -0.18;
                break;
            }
            case 'bandana':
                mesh(this.#geometry('bandana', () => new this.#THREE.CylinderGeometry(0.135, 0.145, 0.06, 6).rotateY(Math.PI / 6)), gear, 0, 0.3, 0);
                mesh(box(0.07, 0.08, 0.03), gear, 0, 0.28, -0.14);
                break;
            case 'tiara':
                mesh(this.#geometry('tiara', () => new this.#THREE.CylinderGeometry(0.13, 0.14, 0.035, 6).rotateY(Math.PI / 6)), gear, 0, 0.34, 0);
                mesh(box(0.035, 0.05, 0.025), gear, 0, 0.375, 0.11);
                break;
            default:
                mesh(this.#hairCapGeometry(1.06), gear, 0, 0.31, 0);
                mesh(box(0.2, 0.02, 0.09), gear, 0, 0.27, 0.13);
        }
    }

    #buildLeg(side) {
        const { pants, boots } = this.#appearance;
        const trousers = this.#material(pants);
        const shoes = this.#material(boots);
        const hip = new this.#THREE.Group();
        hip.position.set(side * 0.12, 0, 0);
        hip.add(this.#tube(0.19, LEG_SEGMENT, 0.19, trousers));
        const knee = new this.#THREE.Group();
        knee.position.y = -LEG_SEGMENT;
        knee.add(this.#ball(0.085, trousers), this.#tube(0.16, LEG_SEGMENT - FOOT_HEIGHT, 0.16, trousers));
        const foot = this.#block(0.16, FOOT_HEIGHT * 1.4, 0.27, shoes);
        foot.position.set(0, -LEG_SEGMENT + FOOT_HEIGHT * 0.3, 0.05);
        knee.add(foot);
        hip.add(knee);
        return { hip, knee };
    }

    #buildArm(side) {
        const { skin, tunic, shoulder: pauldron, gloves, longSleeves, shield } = this.#appearance;
        const sleeve = this.#material(pauldron ?? tunic);
        const bare = this.#material(longSleeves ? tunic : skin);
        const handMaterial = this.#material(gloves ?? skin);
        const shoulder = new this.#THREE.Group();
        shoulder.position.set(side * 0.34, 0.5, 0);
        shoulder.add(this.#ball(0.085, sleeve), this.#tube(0.15, 0.26, 0.15, sleeve));
        const elbow = new this.#THREE.Group();
        elbow.position.y = -0.26;
        elbow.add(this.#ball(0.065, bare), this.#tube(0.12, 0.24, 0.12, bare));
        const hand = new this.#THREE.Group();
        hand.position.y = -0.26;
        hand.add(this.#ball(0.075, handMaterial));
        elbow.add(hand);
        if (shield !== null && side > 0) {
            const buckler = this.#geometryMesh('buckler', () => new this.#THREE.CylinderGeometry(0.2, 0.2, 0.035, 8).rotateZ(Math.PI / 2), this.#material(shield));
            buckler.position.set(0.09, -0.13, 0);
            elbow.add(buckler);
        }
        shoulder.add(elbow);
        return { shoulder, elbow, hand };
    }

    /** Straight blade: `length` and `width` in metres, an optional cross guard and pommel. */
    #buildSword({ length = 0.85, width = 0.075, guard = 0.24, color = 0xdfe6ee, glow = false } = {}) {
        const steel = this.#material(color, { emissive: glow ? color : 0x151a20 });
        const gold = this.#material(0xd4a83a);
        const grip = this.#material(0x4a3020);
        const sword = new this.#THREE.Group();
        sword.add(this.#block(0.05, 0.16, 0.05, grip));
        const crossGuard = this.#block(guard, 0.035, 0.06, gold);
        crossGuard.position.y = 0.09;
        sword.add(crossGuard);
        const blade = this.#block(width, length, 0.022, steel);
        blade.position.y = 0.09 + length / 2;
        sword.add(blade);
        const tip = this.#ball(width / 2, steel);
        tip.scale.set(1, 1.4, 0.4);
        tip.position.y = 0.09 + length + 0.02;
        sword.add(tip);
        return sword;
    }

    /** Curved single-edged blade: two segments bent forward, no cross guard. */
    #buildSaber(color) {
        const steel = this.#material(color, { emissive: 0x151a20 });
        const gold = this.#material(0xd4a83a);
        const saber = new this.#THREE.Group();
        saber.add(this.#block(0.05, 0.16, 0.05, this.#material(0x4a3020)));
        const knuckle = this.#block(0.1, 0.03, 0.09, gold);
        knuckle.position.y = 0.09;
        saber.add(knuckle);
        const lower = this.#block(0.08, 0.5, 0.022, steel);
        lower.position.y = 0.36;
        const upper = this.#block(0.09, 0.42, 0.022, steel);
        upper.position.set(0, 0.52, 0.04);
        upper.rotation.x = -0.32;
        upper.position.y = 0.53;
        saber.add(lower, upper);
        return saber;
    }

    /** Thin thrusting blade with a round cup guard. */
    #buildRapier(color) {
        const rapier = this.#buildSword({ length: 1.05, width: 0.03, guard: 0.14, color });
        const cup = this.#geometryMesh('rapier-cup', () => new this.#THREE.SphereGeometry(0.075, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), this.#material(0xd4a83a));
        cup.position.y = 0.1;
        rapier.add(cup);
        return rapier;
    }

    /** Round tapered shaft from `from` to `to` along the weapon's Y axis. */
    #rod(radius, from, to, material) {
        const length = to - from;
        const rod = this.#geometryMesh(`rod:${radius}:${length}`, () => new this.#THREE.CylinderGeometry(radius * 0.8, radius, length, 6), material);
        rod.position.y = (from + to) / 2;
        return rod;
    }

    /** Bearded axe: extruded crescent head on a round haft with iron collar and butt cap. */
    #buildAxe() {
        const THREE = this.#THREE;
        const wood = this.#material(0x6b4a2a);
        const iron = this.#material(0xb4bcc6, { emissive: 0x151a20 });
        const dark = this.#material(0x4a4f57);
        const axe = new THREE.Group();
        axe.add(this.#rod(0.026, -0.14, 0.82, wood));
        const head = this.#geometryMesh('axe-head', () => {
            const shape = new THREE.Shape();
            shape.moveTo(0, 0.1);
            shape.lineTo(0.08, 0.13);
            shape.quadraticCurveTo(0.2, 0.2, 0.26, 0.2);
            shape.quadraticCurveTo(0.22, 0.08, 0.22, 0);
            shape.quadraticCurveTo(0.22, -0.08, 0.26, -0.2);
            shape.quadraticCurveTo(0.2, -0.2, 0.08, -0.13);
            shape.lineTo(0, -0.1);
            shape.closePath();
            const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
            return geometry.translate(0, 0, -0.015);
        }, iron);
        head.position.set(0.02, 0.66, 0);
        const poll = this.#block(0.07, 0.11, 0.05, dark);
        poll.position.set(-0.03, 0.66, 0);
        const collar = this.#rod(0.036, 0.58, 0.74, dark);
        const cap = this.#ball(0.03, dark);
        cap.position.y = -0.14;
        axe.add(head, poll, collar, cap);
        return axe;
    }

    #buildMelee(kind, color = null) {
        switch (kind) {
            case 'staff': return this.#buildStaff();
            case 'wand': return this.#buildWand();
            case 'spear': return this.#buildSpear();
            case 'trident': return this.#buildTrident();
            case 'mace': return this.#buildMace();
            case 'warhammer': return this.#buildWarhammer();
            case 'axe': return this.#buildAxe();
            case 'saber': return this.#buildSaber(color ?? 0xdfe6ee);
            case 'rapier': return this.#buildRapier(color ?? 0xdfe6ee);
            case 'dagger': return this.#buildSword({ length: 0.4, width: 0.06, guard: 0.14, color: color ?? 0xdfe6ee });
            case 'longsword': return this.#buildSword({ length: 1.05, width: 0.09, guard: 0.32, color: color ?? 0xdfe6ee });
            case 'lightblade': return this.#buildSword({ length: 0.95, width: 0.06, guard: 0.12, color: color ?? 0x62c8ff, glow: true });
            default: return this.#buildSword({ color: color ?? 0xdfe6ee });
        }
    }

    /** Spear held near its balance point: butt behind the hand, leaf head ahead of it. */
    #buildSpear() {
        const THREE = this.#THREE;
        const wood = this.#material(0x6b4a2a);
        const steel = this.#material(0xdfe6ee, { emissive: 0x151a20 });
        const gold = this.#material(0xb08a2a);
        const spear = new THREE.Group();
        spear.add(this.#rod(0.022, -0.6, 1.05, wood));
        const head = this.#geometryMesh('spear-leaf', () => new THREE.LatheGeometry([
            new THREE.Vector2(0, 0), new THREE.Vector2(0.025, 0.02), new THREE.Vector2(0.06, 0.1),
            new THREE.Vector2(0.055, 0.2), new THREE.Vector2(0.03, 0.3), new THREE.Vector2(0, 0.4),
        ], 6).scale(1, 1, 0.3), steel);
        head.position.y = 1.05;
        const collar = this.#rod(0.032, 1.0, 1.08, gold);
        const cap = this.#geometryMesh('spear-cap', () => new THREE.ConeGeometry(0.03, 0.08, 6).rotateX(Math.PI), gold);
        cap.position.y = -0.64;
        spear.add(head, collar, cap);
        return spear;
    }

    #buildTrident() {
        const THREE = this.#THREE;
        const wood = this.#material(0x6b4a2a);
        const steel = this.#material(0xdfe6ee, { emissive: 0x151a20 });
        const trident = new THREE.Group();
        trident.add(this.#rod(0.022, -0.6, 1.0, wood));
        const crown = this.#geometryMesh('trident-crown', () => new THREE.TorusGeometry(0.11, 0.014, 5, 12, Math.PI).rotateZ(Math.PI), steel);
        crown.position.y = 1.02;
        trident.add(crown);
        for (const [x, length] of [[-0.11, 0.26], [0, 0.34], [0.11, 0.26]]) {
            const prong = this.#geometryMesh(`trident-prong:${length}`, () => new THREE.ConeGeometry(0.026, length, 5).translate(0, length / 2, 0), steel);
            prong.position.set(x, x === 0 ? 1.0 : 1.02, 0);
            trident.add(prong);
        }
        return trident;
    }

    #buildMace() {
        const THREE = this.#THREE;
        const wood = this.#material(0x6b4a2a);
        const iron = this.#material(0x8b939d);
        const mace = new THREE.Group();
        mace.add(this.#rod(0.026, -0.12, 0.72, wood));
        const head = this.#geometryMesh('mace-head', () => new THREE.IcosahedronGeometry(0.12, 0), iron);
        head.position.y = 0.78;
        mace.add(head);
        for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
            const spike = this.#geometryMesh('mace-spike', () => new THREE.ConeGeometry(0.03, 0.1, 4).translate(0, 0.05, 0), iron);
            spike.position.set(x * 0.11, 0.78 + y * 0.11, z * 0.11);
            spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z));
            mace.add(spike);
        }
        return mace;
    }

    #buildWarhammer() {
        const THREE = this.#THREE;
        const wood = this.#material(0x6b4a2a);
        const iron = this.#material(0x8b939d);
        const hammer = new THREE.Group();
        hammer.add(this.#rod(0.026, -0.55, 0.85, wood));
        const head = this.#block(0.34, 0.16, 0.16, iron);
        head.position.y = 0.9;
        const spike = this.#geometryMesh('hammer-spike', () => new THREE.ConeGeometry(0.05, 0.14, 4).rotateZ(Math.PI / 2), iron);
        spike.position.set(-0.24, 0.9, 0);
        const collar = this.#rod(0.04, 0.82, 0.86, iron);
        hammer.add(head, spike, collar);
        return hammer;
    }

    #buildWand() {
        const wood = this.#material(0x6b4a2a);
        const gem = this.#material(0xd58bff, { emissive: 0x7a2fb0 });
        const wand = new this.#THREE.Group();
        const shaft = this.#block(0.03, 0.4, 0.03, wood);
        shaft.position.y = 0.12;
        const orb = this.#ball(0.05, gem);
        orb.position.y = 0.36;
        wand.add(shaft, orb);
        return wand;
    }

    /** Mage staff gripped a third of the way up: crystal cradled by a ring at the top. */
    #buildStaff() {
        const THREE = this.#THREE;
        const wood = this.#material(0x6b4a2a);
        const gem = this.#material(0x7fd3ff, { emissive: 0x2f7fb0 });
        const gold = this.#material(0xb08a2a);
        const staff = new THREE.Group();
        staff.add(this.#rod(0.026, -0.55, 0.85, wood));
        const ring = this.#geometryMesh('staff-ring', () => new THREE.TorusGeometry(0.075, 0.014, 5, 10), gold);
        ring.position.y = 0.93;
        const orb = this.#ball(0.07, gem);
        orb.position.y = 0.93;
        staff.add(ring, orb);
        return staff;
    }

    /** Bends the bowstring into a V whose nock sits `draw` (0..1) of the way back to the anchor. */
    #setDraw(bow, draw) {
        const nockY = BOW_BRACE + draw * BOW_DRAW;
        for (const half of this.#stringParts) {
            const dx = -half.userData.side * BOW_RADIUS;
            const dy = nockY - BOW_BRACE;
            half.position.set(half.userData.side * BOW_RADIUS / 2, BOW_BRACE + dy / 2, 0);
            half.scale.x = Math.hypot(dx, dy);
            half.rotation.z = Math.atan2(dy, dx);
        }
    }

    #buildBow({ bow: kind, bowColor }) {
        const royal = kind === 'royal';
        const wood = this.#material(royal ? 0xd8c27a : bowColor ?? 0x7a4a22);
        const string = this.#material(0xf0e8d0);
        const bow = new this.#THREE.Group();
        const arc = new this.#THREE.Mesh(
            this.#geometry('bow-arc', () => new this.#THREE.TorusGeometry(BOW_RADIUS, 0.024, 6, 18, Math.PI)),
            wood,
        );
        // Aimed (bow arm raised sideways) the limbs run along X, the belly points along -Y at
        // the target and the string faces the archer; the grip is the origin (the palm).
        arc.rotation.x = Math.PI;
        arc.scale.y = BOW_BRACE / BOW_RADIUS;
        arc.position.y = BOW_BRACE;
        bow.add(arc);
        const grip = this.#block(0.05, 0.03, 0.06, this.#material(0x3a2616));
        grip.position.y = 0.02;
        bow.add(grip);
        for (const side of [1, -1]) {
            if (kind === 'recurve') {
                const tip = this.#block(0.022, 0.13, 0.022, wood);
                tip.position.set(side * (BOW_RADIUS + 0.035), BOW_BRACE + 0.05, 0);
                tip.rotation.z = side * 0.55;
                bow.add(tip);
            }
            else if (royal) {
                const cap = this.#ball(0.04, this.#material(0xc8a030, { emissive: 0x3a2a08 }));
                cap.position.set(side * BOW_RADIUS, BOW_BRACE, 0);
                bow.add(cap);
            }
        }
        if (kind === 'greatbow') bow.scale.setScalar(1.22);
        this.#stringParts = [1, -1].map((side) => {
            const half = this.#block(1, 0.008, 0.008, string);
            half.userData.side = side;
            bow.add(half);
            return half;
        });
        this.#setDraw(bow, 0);
        return bow;
    }

    #buildFlask() {
        const glass = this.#material(0x62ef70, { emissive: 0x1d7a2a, transparent: true, opacity: 0.9 });
        const flask = new this.#THREE.Group();
        const body = this.#ball(0.09, glass);
        body.position.y = 0.06;
        flask.add(body);
        const neck = this.#block(0.05, 0.1, 0.05, glass);
        neck.position.y = 0.15;
        flask.add(neck);
        return flask;
    }

    #buildOrb() {
        const core = this.#material(0xffd27a, { emissive: 0xff7a1a });
        const glow = new this.#THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.35, depthWrite: false });
        this.#materials.push(core);
        const orb = new this.#THREE.Group();
        orb.add(this.#ball(0.16, core));
        const halo = this.#ball(0.26, glow);
        orb.add(halo);
        orb.userData.glow = glow;
        return orb;
    }

    /** Front-only energy shield: a glowing hexagonal plate with a bright rim, held ahead of the torso. */
    #buildShield() {
        const THREE = this.#THREE;
        const fill = new THREE.MeshBasicMaterial({
            color: 0x4fb8ff, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false,
        });
        const rim = new THREE.MeshBasicMaterial({
            color: 0xbfe8ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false,
        });
        const shield = new THREE.Group();
        shield.add(new THREE.Mesh(this.#geometry('shield', () => new THREE.CircleGeometry(0.46, 6)), fill));
        shield.add(new THREE.Mesh(this.#geometry('shield-rim', () => new THREE.RingGeometry(0.42, 0.46, 6)), rim));
        shield.userData.materials = [fill, rim];
        return shield;
    }

    #build(shadowTexture) {
        const THREE = this.#THREE;
        const look = this.#appearance;
        const skin = this.#material(look.skin);
        const tunic = this.#material(look.tunic);

        const shadow = new THREE.Mesh(
            this.#geometry('shadow', () => new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2)),
            new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.7 }),
        );
        shadow.position.y = 0.012;
        shadow.renderOrder = 1;
        this.root.add(shadow);
        this.#parts.shadow = shadow;

        const ring = new THREE.Mesh(
            this.#geometry('ring', () => new THREE.RingGeometry(0.42, 0.5, 24).rotateX(-Math.PI / 2)),
            new THREE.MeshBasicMaterial({ color: look.team, transparent: true, opacity: 0.85, depthWrite: false }),
        );
        ring.position.y = 0.02;
        ring.renderOrder = 2;
        this.root.add(ring);
        this.#parts.ring = ring;

        const figure = new THREE.Group();
        figure.scale.setScalar(FIGURE_SCALE);
        this.root.add(figure);
        const body = new THREE.Group();
        figure.add(body);
        this.#bones.figure = figure;
        this.#bones.body = body;

        const left = this.#buildLeg(1);
        const right = this.#buildLeg(-1);
        body.add(left.hip, right.hip);
        Object.assign(this.#bones, { lhip: left.hip, lknee: left.knee, rhip: right.hip, rknee: right.knee });
        body.add(this.#block(0.4, 0.16, 0.24, this.#material(look.pants)));

        const torso = new THREE.Group();
        torso.position.y = 0.07;
        body.add(torso);
        this.#bones.torso = torso;
        const chest = this.#geometryMesh('chest', () => new this.#THREE.CylinderGeometry(0.29, 0.22, 0.52, 8).scale(1, 1, 0.62), tunic);
        chest.position.y = 0.26;
        torso.add(chest);
        if (look.belt !== null) {
            const belt = this.#block(0.52, 0.07, 0.32, this.#material(look.belt));
            belt.position.y = 0.04;
            torso.add(belt);
        }
        if (look.armor !== null) {
            const plate = this.#geometryMesh('plate', () => new this.#THREE.CylinderGeometry(0.31, 0.25, 0.34, 8).scale(1, 1, 0.66), this.#material(look.armor));
            plate.position.y = 0.32;
            torso.add(plate);
        }
        if (look.shoulder !== null) {
            const padMaterial = this.#material(look.shoulder);
            for (const side of [1, -1]) {
                const pad = this.#ball(0.13, padMaterial);
                pad.position.set(side * 0.34, 0.52, 0);
                torso.add(pad);
            }
        }
        if (look.skirt !== null) {
            const skirt = this.#geometryMesh('skirt', () => new this.#THREE.CylinderGeometry(0.24, 0.36, 0.5, 8).translate(0, -0.25, 0).scale(1, 1, 0.8), this.#material(look.skirt));
            skirt.position.y = 0.02;
            body.add(skirt);
        }
        if (look.cape !== null) {
            const cape = this.#limb(0.44, 0.78, 0.03, this.#material(look.cape, { side: THREE.DoubleSide }));
            cape.position.set(0, 0.55, -0.18);
            torso.add(cape);
            this.#bones.cape = cape;
        }

        const head = new THREE.Group();
        head.position.y = 0.56;
        torso.add(head);
        this.#bones.head = head;
        this.#buildHead(head, look, skin);

        const leftArm = this.#buildArm(1);
        const rightArm = this.#buildArm(-1);
        torso.add(leftArm.shoulder, rightArm.shoulder);
        Object.assign(this.#bones, {
            lsh: leftArm.shoulder, lel: leftArm.elbow, rsh: rightArm.shoulder, rel: rightArm.elbow,
        });

        const melee = this.#buildMelee(look.weapon, look.bladeColor);
        const direction = new THREE.Vector3(...(TWO_HANDED.includes(look.weapon) ? POLEARM_DIRECTION : BLADE_DIRECTION)).normalize();
        melee.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        rightArm.hand.add(melee);
        const bow = this.#buildBow(look);
        leftArm.hand.add(bow);
        const flask = this.#buildFlask();
        rightArm.hand.add(flask);
        const orb = this.#buildOrb();
        orb.position.set(0, 0.62, 0.5);
        torso.add(orb);
        const shield = this.#buildShield();
        shield.position.set(0, 0.36, 0.5);
        torso.add(shield);
        Object.assign(this.#parts, { melee, bow, flask, orb, shield });
        this.#syncWeapons(null);

        const stars = new THREE.Group();
        const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffe066 });
        for (let i = 0; i < 3; i += 1) {
            const star = this.#ball(0.06, starMaterial);
            star.userData.angle = (i / 3) * TWO_PI;
            stars.add(star);
        }
        stars.position.y = 0.62;
        stars.visible = false;
        head.add(stars);
        this.#parts.stars = stars;

    }

    // --------------------------------------------------------------- replay input

    /**
     * Starts a new interpolation segment toward a replay frame.
     *
     * @param {Record<string, unknown>} gladiator Engine state for this fighter.
     * @param {{ x: number, z: number }} position Target world position.
     * @param {number} yaw Target yaw in radians.
     * @param {boolean} snap Jump straight there (first frame, seek, teleport).
     */
    setTarget(gladiator, position, yaw, snap) {
        this.state = gladiator;
        const current = this.root.position;
        const jump = snap || Math.hypot(position.x - current.x, position.z - current.z) > TELEPORT_DISTANCE;
        this.#from.x = jump ? position.x : current.x;
        this.#from.z = jump ? position.z : current.z;
        this.#to.x = position.x;
        this.#to.z = position.z;
        this.#to.yaw = yaw;
        if (jump) {
            current.set(position.x, 0, position.z);
            this.#yaw = yaw;
            this.#speed = 0;
        }
    }

    /** Clears transient animation state after a seek. */
    reset() {
        this.#action = null;
        this.#flinch = 0;
        this.#actionBlend = 0;
        this.#speed = 0;
        this.#moveWeight = 0;
        this.#combat = 0;
        this.#forward = 0;
        this.#lateral = 0;
    }

    /**
     * Begins the animation of an engine action id.
     *
     * @param {number} actionId Engine action id.
     */
    startAction(actionId) {
        const name = ACTION_BY_ID[actionId];
        if (!name) {
            this.releaseAction();
            return;
        }
        let spec = ACTION_SPECS[name];
        if (name === 'melee') {
            const styles = MELEE_STYLES[this.#appearance.weapon] ?? MELEE_STYLES.sword;
            spec = ACTION_SPECS[styles[this.#swings % styles.length]];
            this.#swings += 1;
        }
        if (name === 'melee' || name === 'assassinate') this.#weapon = 'melee';
        else if (name === 'ranged') this.#weapon = 'bow';
        if (COMBAT_ACTIONS.has(name)) this.#combat = COMBAT_SECONDS;
        this.#action = { name, spec, start: this.#clock, releasedAt: null, firedAt: null };
    }

    /** Releases a drawn bow or a charged spell when the engine reports the projectile. */
    fire() {
        const action = this.#action;
        if (action?.spec.holdAt === undefined || action.firedAt !== null) return;
        action.firedAt = Math.max(this.#clock, action.start + action.spec.holdAt);
    }

    /** Action time in game seconds; wind-ups with `holdAt` wait at full draw for `fire()`. */
    #actionTime(action) {
        const raw = this.#clock - action.start;
        const holdAt = action.spec.holdAt;
        if (holdAt === undefined || raw < holdAt) return raw;
        if (action.firedAt === null && raw > holdAt + MAX_HOLD_SECONDS) action.firedAt = this.#clock;
        return action.firedAt === null ? holdAt : holdAt + Math.max(0, this.#clock - action.firedAt);
    }

    /** Ends a sustained action (block, charge) so it eases out. */
    releaseAction() {
        const action = this.#action;
        if (action?.spec.hold && action.releasedAt === null) action.releasedAt = this.#clock - action.start;
    }

    /** @returns {{ name: string, spec: object, age: number }|null} The running action and its age in game seconds. */
    get activeAction() {
        return this.#action ? { name: this.#action.name, spec: this.#action.spec, age: this.#actionTime(this.#action) } : null;
    }

    /** Triggers the recoil and red flash of a landed hit. */
    hit() {
        // A fresh hit must not restart a flinch that is still playing (burn ticks, multi-hits).
        if (this.#flinch > 0.4) return;
        this.#flinch = 1;
        this.#combat = COMBAT_SECONDS;
    }

    /** @param {boolean} alive Whether the fighter is standing. */
    setAlive(alive) {
        this.#alive = alive;
        if (!alive) this.#action = null;
    }

    /**
     * Freezes the rig on a single action moment for visual debugging.
     *
     * @param {string|null} name Action name from ACTION_SPECS, or null to resume.
     * @param {number} [time] Seconds into the action.
     */
    freezeAction(name, time = 0) {
        this.#frozen = name ? { name, time } : null;
    }

    // ------------------------------------------------------------------ per frame

    /**
     * Advances the fighter.
     *
     * @param {{ realDt: number, gameDt: number, progress: number, elapsed: number, reducedMotion: boolean }} frame Frame timing.
     */
    update({ realDt, gameDt, progress, elapsed, reducedMotion }) {
        this.#clock += gameDt;
        const position = this.root.position;
        const previousX = position.x;
        const previousZ = position.z;
        position.x = this.#from.x + (this.#to.x - this.#from.x) * progress;
        position.z = this.#from.z + (this.#to.z - this.#from.z) * progress;
        position.y = terrainHeight(position.x, position.z);
        this.#yaw += angleDelta(this.#yaw, this.#to.yaw) * (1 - Math.exp(-YAW_SMOOTHING_PER_SECOND * realDt));
        this.root.rotation.y = this.#yaw;

        const moved = this.#alive ? Math.hypot(position.x - previousX, position.z - previousZ) : 0;
        const instantSpeed = realDt > 0 ? moved / realDt : 0;
        this.#speed += (instantSpeed - this.#speed) * (1 - Math.exp(-realDt / SPEED_SMOOTHING_SECONDS));
        const gait = gaitForSpeed(this.#speed);
        const sin = Math.sin(this.#to.yaw);
        const cos = Math.cos(this.#to.yaw);
        const dx = position.x - previousX;
        const dz = position.z - previousZ;
        const follow = realDt > 0 ? 1 - Math.exp(-realDt / SPEED_SMOOTHING_SECONDS) : 0;
        this.#forward += ((this.#alive && realDt > 0 ? (dx * sin + dz * cos) / realDt : 0) - this.#forward) * follow;
        this.#lateral += ((this.#alive && realDt > 0 ? (dx * cos - dz * sin) / realDt : 0) - this.#lateral) * follow;
        const travel = Math.abs(this.#forward) + Math.abs(this.#lateral);
        const share = travel > 0.2 ? this.#lateral / travel : 0;
        this.#strafe = smoothstep(0.3, 0.7, Math.abs(share)) * Math.sign(share);
        this.#back = travel > 0.2 ? smoothstep(0.1, 0.6, -this.#forward / travel) * (1 - Math.abs(this.#strafe)) : 0;
        this.#combat = Math.max(0, this.#combat - gameDt);
        if (this.#speed > 0.05) this.#phase = (this.#phase + (this.#back > 0.5 ? -moved : moved) / gait.cycleLength + 1) % 1;
        const moveTarget = smoothstep(0.25, 0.7, this.#speed);
        this.#moveWeight += (moveTarget - this.#moveWeight) * (1 - Math.exp(-realDt * 14));

        this.#composePose(gait, elapsed, gameDt);
        this.#applyPose(this.#finalPose, elapsed, reducedMotion);
        this.#animateDeath(realDt);
        this.#animateOrb();
        this.#animateShield(elapsed);
        this.#animateStatus(elapsed, realDt);
    }

    #composePose(gait, elapsed, gameDt) {
        const idle = this.#idlePose;
        Object.assign(idle, REST);
        idle.lean += Math.sin(elapsed * 1.7 + this.index) * 0.012;
        idle.lsh += Math.sin(elapsed * 1.7 + this.index + 1) * 0.02;
        locomotionPose(this.#locoPose, this.#phase, gait.amplitude * (1 - 0.25 * this.#back), gait.run * (1 - 0.6 * this.#back), this.#strafe, this.#back);
        blendPose(this.#basePose, idle, this.#locoPose, this.#moveWeight);
        applyCombatStance(this.#basePose, this.#stance(), smoothstep(0, 0.6, this.#combat), this.#moveWeight);

        let action = this.#action;
        let time = action ? this.#actionTime(action) : 0;
        if (this.#frozen) {
            action = { name: this.#frozen.name, spec: ACTION_SPECS[this.#frozen.name], releasedAt: null };
            time = this.#frozen.time;
        }
        if (action && !this.#frozen && time > actionDuration(action.spec) + 0.05) {
            this.#action = null;
            action = null;
        }
        else if (action && action.releasedAt !== null && time > action.releasedAt + action.spec.blendOut) {
            this.#action = null;
            action = null;
        }
        this.#activeSpec = action?.spec ?? null;
        this.#actionBlend = action ? actionWeight(action.spec, time, action.releasedAt ?? null) : 0;
        composePose(this.#finalPose, this.#basePose, action?.spec ?? null, time, action?.releasedAt ?? null, this.#keyPose);
        this.#syncWeapons(action?.spec ?? null);
        this.#flinch = Math.max(0, this.#flinch - gameDt / FLINCH_SECONDS);
    }

    /** Guard pose matching the carried gear: bow, two-handed weapon, or one-handed weapon. */
    #stance() {
        if (this.#weapon === 'bow') return COMBAT_STANCES.bow;
        return TWO_HANDED.includes(this.#appearance.weapon) ? COMBAT_STANCES.twoHand : COMBAT_STANCES.oneHand;
    }

    #applyPose(p, elapsed, reducedMotion) {
        const { body, torso, head } = this.#bones;
        // Recoil fades in fast and out smoothly, and yields to an action's own body motion.
        const attack = Math.min(1, (1 - this.#flinch) / 0.2);
        const recoil = attack * smoothstep(0, 0.6, this.#flinch);
        const armRecoil = recoil * (1 - this.#actionBlend);
        const bodyRecoil = recoil * (1 - 0.6 * this.#actionBlend);
        const lean = p.lean - bodyRecoil * 0.35;
        const stunned = Number(this.state.buffs?.stun?.timeleft) > 0 && this.#alive;
        this.#bones.lhip.rotation.x = p.lhip;
        this.#bones.rhip.rotation.x = p.rhip;
        this.#bones.lhip.rotation.z = p.lhz;
        this.#bones.rhip.rotation.z = p.rhz;
        this.#bones.lknee.rotation.x = p.lknee;
        this.#bones.rknee.rotation.x = p.rknee;
        body.position.y = hipHeight(p) + p.y;
        body.position.z = p.z - bodyRecoil * 0.14;
        torso.rotation.set(lean, p.twist, p.roll + (stunned ? Math.sin(elapsed * 6) * 0.12 : 0));
        head.rotation.set(p.hx + (stunned ? 0.25 + Math.sin(elapsed * 5) * 0.1 : 0), p.hy - p.twist * 0.6, 0);
        this.#bones.lsh.rotation.set(p.lsh - armRecoil * 0.4, 0, p.lsz);
        this.#bones.rsh.rotation.set(p.rsh - armRecoil * 0.4, 0, p.rsz);
        this.#bones.lel.rotation.x = p.lel;
        this.#poseBow(p);
        this.#bones.rel.rotation.x = p.rel;
        if (this.#bones.cape) this.#bones.cape.rotation.x = 0.12 + Math.max(0, lean) * 0.6 + this.#speed * 0.035 * (reducedMotion ? 0 : 1);
    }

    /** Carried bow hangs along the forearm; aiming turns it upright and draws the string. */
    #poseBow(p) {
        const bow = this.#parts.bow;
        if (!bow?.visible) return;
        const aim = this.#activeSpec === ACTION_SPECS.ranged ? this.#actionBlend : 0;
        // Carried, the bow stands upright with its belly toward the front whatever the arm does.
        const carry = 1 - aim;
        bow.rotation.set(-(p.lean + p.lsh + p.lel) * carry, -carry * Math.PI / 2, carry * Math.PI / 2);
        this.#setDraw(bow, p.draw);
    }

    /** Shows only the equipment relevant to the action being performed. */
    #syncWeapons(spec) {
        const held = this.#weapon;
        const extra = spec?.weapon;
        const { melee, bow, flask, orb, shield } = this.#parts;
        // Casting needs both hands free, so the carried weapon is stowed for the cast only.
        const casting = extra === 'orb';
        melee.visible = held === 'melee' && !casting;
        bow.visible = held === 'bow' && !casting;
        flask.visible = extra === 'flask';
        orb.visible = extra === 'orb';
    }

    #animateDeath(realDt) {
        const target = this.#alive ? 0 : 1;
        this.#dead += Math.sign(target - this.#dead) * Math.min(Math.abs(target - this.#dead), realDt / DEATH_SECONDS);
        const eased = smoothstep(0, 1, this.#dead);
        this.#bones.figure.rotation.x = -eased * (Math.PI / 2);
        this.#bones.figure.position.y = eased * 0.2;
        this.#parts.shadow.scale.setScalar(1 + eased * 0.3);
        this.#parts.ring.visible = this.#dead < 0.9;
    }

    /** Pops the shield in when a block starts and pulses it while held. */
    #animateShield(elapsed) {
        const shield = this.#parts.shield;
        const left = Number(this.state.buffs?.resist?.timeleft) || 0;
        // The shield stays up while the resist buff lasts, not only during the block action.
        shield.visible = this.#alive && (left > 0 || this.#activeSpec?.weapon === 'shield');
        if (!shield.visible) return;
        const blocking = this.#activeSpec?.weapon === 'shield';
        const time = this.#frozen ? this.#frozen.time : (blocking && this.#action ? this.#actionTime(this.#action) : 1);
        const fade = blocking || !left ? 1 : Math.min(1, left / 0.5);
        shield.scale.setScalar(Math.max(0.01, smoothstep(0, 0.16, time) * fade * (1 + Math.sin(elapsed * 8) * 0.03)));
        shield.userData.materials[0].opacity = 0.26 + Math.sin(elapsed * 6) * 0.07;
    }

    /** Grows the fireball between the hands until the cast is released. */
    #animateOrb() {
        const orb = this.#parts.orb;
        if (!orb.visible) return;
        const spec = this.#activeSpec;
        const time = this.#frozen ? this.#frozen.time : (this.#action ? this.#actionTime(this.#action) : 0);
        const release = spec?.contact ?? 0.5;
        const charge = smoothstep(0.05, 0.4, time) * (1 - smoothstep(release, release + 0.06, time));
        orb.scale.setScalar(Math.max(0.001, charge));
    }

    #animateStatus(elapsed, realDt) {
        const buffs = this.state.buffs ?? {};
        const invisible = Number(buffs.invisible?.timeleft) > 0;
        const stunned = Number(buffs.stun?.timeleft) > 0 && this.#alive;
        const burning = Number(buffs.burn?.timeleft) > 0 && this.#alive;

        this.#parts.stars.visible = stunned;
        if (stunned) {
            this.#parts.stars.children.forEach((star) => {
                const angle = star.userData.angle + elapsed * 5;
                star.position.set(Math.cos(angle) * 0.3, Math.sin(angle * 2) * 0.03, Math.sin(angle) * 0.3);
            });
        }

        const ambushing = this.#action?.name === 'ambush' || this.#frozen?.name === 'ambush';
        const opacity = invisible || ambushing ? 0.06 : 1;
        const flash = this.#flinch * this.#flinch;
        const burn = burning ? 0.35 + Math.sin(elapsed * 14) * 0.15 : 0;
        const key = `${opacity}|${flash.toFixed(2)}|${burn.toFixed(2)}`;
        if (key === this.#emissiveKey) return;
        this.#emissiveKey = key;
        for (const material of this.#materials) {
            if (material.userData.baseEmissive === undefined) material.userData.baseEmissive = material.emissive.getHex();
            material.emissive.setHex(material.userData.baseEmissive);
            if (flash > 0.01) material.emissive.r += flash * 0.75;
            if (burn > 0) material.emissive.setRGB(material.emissive.r + burn, material.emissive.g + burn * 0.35, material.emissive.b);
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

    /** @returns {import('three').Vector3} World-space anchor above the head, reused between calls. */
    getWorldAnchor() {
        return this.#anchor.set(this.root.position.x, ANCHOR_HEIGHT, this.root.position.z);
    }

    /** @returns {{ x: number, z: number }} Current interpolated position. */
    get position() {
        return this.root.position;
    }

    /** Releases geometry and material GPU resources owned by this fighter. */
    destroy() {
        this.#geometries.forEach((geometry) => geometry.dispose());
        this.#materials.forEach((material) => material.dispose());
        this.#parts.shadow?.material.dispose();
        this.#parts.ring?.material.dispose();
        this.#parts.stars?.children[0]?.material.dispose();
        this.#parts.shield?.userData.materials.forEach((material) => material.dispose());
        this.#parts.orb?.userData.glow.dispose();
        this.root.removeFromParent();
    }
}

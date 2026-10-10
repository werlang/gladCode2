import { BLADE_DIRECTION, FIGURE_SCALE, FOOT_HEIGHT, LEG_SEGMENT, POLEARM_DIRECTION, TWO_HANDED, hipHeight } from './motion.js';

const BOW_RADIUS = 0.38;
const BOW_BRACE = 0.25;
const BOW_DRAW = 0.43;

/**
 * Body built entirely from primitive meshes (no external assets).
 *
 * Model contract shared with `SyntyModel`: `figure` (scaled root that Fighter rotates on death), `mounts`
 * ({ torso, head } groups in figure space for effects), `applyPose`, `setWeapons`, `setLook`, `dispose`.
 */
export class ProceduralModel {
    #THREE;
    #look;
    #materials = [];
    #geometries = new Map();
    #bones = {};
    #parts = {};
    #stringParts = [];
    #emissiveKey = '';

    /** @param {{ THREE: typeof import('three'), look: Record<string, any> }} options Dependencies and resolved appearance. */
    constructor({ THREE, look }) {
        this.#THREE = THREE;
        this.#look = look;
        this.#build();
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
        const { pants, boots } = this.#look;
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
        const { skin, tunic, shoulder: pauldron, gloves, longSleeves, shield } = this.#look;
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


    #build() {
        const THREE = this.#THREE;
        const look = this.#look;
        const skin = this.#material(look.skin);
        const tunic = this.#material(look.tunic);

        const figure = new THREE.Group();
        figure.scale.setScalar(FIGURE_SCALE);
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
        this.#parts = { melee, bow, flask };
        this.mounts = { torso, head };
        this.figure = figure;
        this.setWeapons('melee', null);
    }

    /**
     * Applies a composed pose to the joint groups.
     *
     * @param {Record<string, number>} p Final pose from `motion.js`.
     * @param {{ armRecoil: number, bodyRecoil: number, stunned: boolean, elapsed: number, speed: number, reducedMotion: boolean, aim: number }} o Per-frame modifiers.
     */
    applyPose(p, o) {
        const { body, torso, head } = this.#bones;
        const lean = p.lean - o.bodyRecoil * 0.35;
        this.#bones.lhip.rotation.x = p.lhip;
        this.#bones.rhip.rotation.x = p.rhip;
        this.#bones.lhip.rotation.z = p.lhz;
        this.#bones.rhip.rotation.z = p.rhz;
        this.#bones.lknee.rotation.x = p.lknee;
        this.#bones.rknee.rotation.x = p.rknee;
        body.position.y = hipHeight(p) + p.y;
        body.position.z = p.z - o.bodyRecoil * 0.14;
        torso.rotation.set(lean, p.twist, p.roll + (o.stunned ? Math.sin(o.elapsed * 6) * 0.12 : 0));
        head.rotation.set(p.hx + (o.stunned ? 0.25 + Math.sin(o.elapsed * 5) * 0.1 : 0), p.hy - p.twist * 0.6, 0);
        this.#bones.lsh.rotation.set(p.lsh - o.armRecoil * 0.4, 0, p.lsz);
        this.#bones.rsh.rotation.set(p.rsh - o.armRecoil * 0.4, 0, p.rsz);
        this.#bones.lel.rotation.x = p.lel;
        this.#poseBow(p, o.aim);
        this.#bones.rel.rotation.x = p.rel;
        if (this.#bones.cape) this.#bones.cape.rotation.x = 0.12 + Math.max(0, lean) * 0.6 + o.speed * 0.035 * (o.reducedMotion ? 0 : 1);
    }

    /** Carried bow hangs along the forearm; aiming turns it upright and draws the string. */
    #poseBow(p, aim) {
        const bow = this.#parts.bow;
        if (!bow.visible) return;
        // Carried, the bow stands upright with its belly toward the front whatever the arm does.
        const carry = 1 - aim;
        bow.rotation.set(-(p.lean + p.lsh + p.lel) * carry, -carry * Math.PI / 2, carry * Math.PI / 2);
        this.#setDraw(bow, p.draw);
    }

    /**
     * Shows only the equipment relevant to the action being performed.
     *
     * @param {'melee'|'bow'} held Persistent weapon.
     * @param {string|null} extra Action-specific prop (`orb`, `flask`, `shield`).
     */
    setWeapons(held, extra) {
        const { melee, bow, flask } = this.#parts;
        // Casting needs both hands free, so the carried weapon is stowed for the cast only.
        const casting = extra === 'orb';
        melee.visible = held === 'melee' && !casting;
        bow.visible = held === 'bow' && !casting;
        flask.visible = extra === 'flask';
    }

    /**
     * Tints and fades every body material.
     *
     * @param {{ opacity: number, flash: number, burn: number }} look Fade and emissive amounts.
     */
    setLook({ opacity, flash, burn }) {
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

    /** Releases geometry and material GPU resources. */
    dispose() {
        this.#geometries.forEach((geometry) => geometry.dispose());
        this.#materials.forEach((material) => material.dispose());
    }
}

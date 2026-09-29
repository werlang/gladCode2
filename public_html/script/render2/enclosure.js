import { ARENA_SIZE } from './battle-state.js';
import { createRandom, fbm, smooth, valueNoise } from './noise.js';

const HALF = ARENA_SIZE / 2;
const STONE_SEED = 4242;
const STONE_WIDTH = 1024;
const STONE_HEIGHT = 256;
const STONE_ROWS = 4;
const MORTAR = 3;

/** Random block edges per row; every row starts at x = 0 so the horizontal repeat seam lands on mortar. */
function layoutBlocks(random) {
    return Array.from({ length: STONE_ROWS }, () => {
        const edges = [0];
        while (edges[edges.length - 1] < STONE_WIDTH) {
            const next = edges[edges.length - 1] + 170 + random() * 150;
            edges.push(STONE_WIDTH - next < 130 ? STONE_WIDTH : next);
        }
        return edges;
    });
}

/**
 * Weathered ashlar written per pixel: irregular blocks with beveled edges, per-block tone,
 * grime, chips and moss creeping up from the base. Bevels are baked into the colour.
 */
function createStoneTexture(THREE) {
    const random = createRandom(STONE_SEED);
    const rows = layoutBlocks(random);
    const rowHeight = STONE_HEIGHT / STONE_ROWS;
    const tones = rows.map((edges) => edges.slice(0, -1).map(() => 0.78 + random() * 0.4));
    const make = () => {
        const canvas = document.createElement('canvas');
        canvas.width = STONE_WIDTH;
        canvas.height = STONE_HEIGHT;
        return canvas;
    };
    const albedo = make();
    const albedoImage = albedo.getContext('2d').createImageData(STONE_WIDTH, STONE_HEIGHT);

    for (let y = 0; y < STONE_HEIGHT; y += 1) {
        const row = Math.min(STONE_ROWS - 1, Math.floor(y / rowHeight));
        const edges = rows[row];
        const dy = Math.min(y - row * rowHeight, (row + 1) * rowHeight - y);
        const moss = smooth(0.35, 0.85, fbm(y * 0.02 + 3, 5, 2, STONE_SEED)) * smooth(0.5, 1, y / STONE_HEIGHT);
        for (let x = 0; x < STONE_WIDTH; x += 1) {
            let col = 0;
            while (edges[col + 1] <= x) col += 1;
            const dx = Math.min(x - edges[col], edges[col + 1] - x);
            const depth = Math.min(dx, dy);
            const face = smooth(MORTAR, MORTAR + 7, depth);
            const grime = fbm(x * 0.03, y * 0.05, 3, STONE_SEED + 1);
            const grain = valueNoise(x * 0.45, y * 0.45, STONE_SEED + 2);
            const chip = smooth(0.78, 0.92, valueNoise(x * 0.09, y * 0.09, STONE_SEED + 3)) * (1 - face * 0.5);
            const stain = smooth(0.55, 0.9, fbm(x * 0.012 + 9, y * 0.09, 2, STONE_SEED + 4));
            const tone = tones[row][col] * (0.72 + grime * 0.5) * (0.9 + grain * 0.2) * (1 - chip * 0.3) * (1 - stain * 0.18);
            const shade = mixColor(tone, face);
            const mossy = moss * face * smooth(0.45, 0.8, grime);
            const i = (y * STONE_WIDTH + x) * 4;
            albedoImage.data[i] = shade[0] * (1 - mossy * 0.45);
            albedoImage.data[i + 1] = shade[1] * (1 - mossy * 0.05) + mossy * 22;
            albedoImage.data[i + 2] = shade[2] * (1 - mossy * 0.5);
            albedoImage.data[i + 3] = 255;
        }
    }
    albedo.getContext('2d').putImageData(albedoImage, 0, 0);

    const texture = new THREE.CanvasTexture(albedo);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
}

/** Warm sandstone at `tone`, falling to dark mortar where `face` is 0. */
function mixColor(tone, face) {
    const mortar = 0.32;
    const level = mortar + (tone - mortar) * face;
    return [170 * level, 158 * level, 138 * level];
}

/** Base colour palettes for the crowd. */
const CLOTH = [0xc0392b, 0x2e86c1, 0xd4ac0d, 0x27ae60, 0x8e44ad, 0xe6e0d4, 0x7f6a54, 0x34495e];
const SKIN = [0xf0c8a0, 0xd9a577, 0xb07850, 0x82563a, 0x5c3b28];
const BANNER = [0x8e1f1f, 0x1f3f7a, 0xb8891a, 0x2e6a3c];

/**
 * Walls, corner braziers, banners and spectator stands. All static, shared-material meshes
 * (crowd and battlements are instanced), so the enclosure costs a handful of draw calls.
 */
export class Enclosure {
    #THREE;
    #own;
    #add;
    #flames = [];
    #materials = {};

    /**
     * @param {{ THREE: typeof import('three'), add: Function, own: Function }} options Scene helpers from the arena.
     * @returns {Enclosure}
     */
    constructor({ THREE, add, own }) {
        this.#THREE = THREE;
        this.#own = own;
        this.#add = add;
        const map = own(createStoneTexture(THREE));
        map.repeat.set(8, 1);
        this.#materials.stone = own(new THREE.MeshLambertMaterial({ map }));
        this.#materials.step = own(new THREE.MeshLambertMaterial({ map, color: 0xb8b0a4 }));
        this.#materials.trim = own(new THREE.MeshLambertMaterial({ color: 0xb4a88c }));
        this.#buildWalls();
        this.#buildBraziers();
        this.#buildBanners();
        this.#buildStands();
    }

    #buildWalls() {
        const THREE = this.#THREE;
        const thickness = 1;
        const height = 1.6;
        const span = ARENA_SIZE + thickness * 2;
        const wallGeometry = this.#own(new THREE.BoxGeometry(span, height, thickness));
        const trimGeometry = this.#own(new THREE.BoxGeometry(span, 0.14, thickness + 0.2));
        const plinthGeometry = this.#own(new THREE.BoxGeometry(span + 0.4, 0.28, thickness + 0.3));
        const merlonGeometry = this.#own(new THREE.BoxGeometry(0.5, 0.36, thickness * 0.7));
        const merlons = [];
        const sides = [[0, -HALF - thickness / 2, 0], [0, HALF + thickness / 2, 0], [-HALF - thickness / 2, 0, Math.PI / 2], [HALF + thickness / 2, 0, Math.PI / 2]];
        for (const [x, z, rotation] of sides) {
            const wall = this.#add(new THREE.Mesh(wallGeometry, this.#materials.stone));
            wall.position.set(x, height / 2 - 0.06, z);
            wall.rotation.y = rotation;
            const plinth = this.#add(new THREE.Mesh(plinthGeometry, this.#materials.trim));
            plinth.position.set(x, 0.08, z);
            plinth.rotation.y = rotation;
            const cap = this.#add(new THREE.Mesh(trimGeometry, this.#materials.trim));
            cap.position.set(x, height - 0.06, z);
            cap.rotation.y = rotation;
            for (let along = -span / 2 + 1.4; along < span / 2 - 1; along += 1.1) {
                merlons.push({ x: x + Math.cos(rotation) * along, z: z - Math.sin(rotation) * along, rotation });
            }
        }
        const merlon = this.#add(new THREE.InstancedMesh(merlonGeometry, this.#materials.stone, merlons.length));
        const matrix = new THREE.Matrix4();
        merlons.forEach((item, index) => {
            matrix.makeRotationY(item.rotation).setPosition(item.x, height + 0.13, item.z);
            merlon.setMatrixAt(index, matrix);
        });
        merlon.instanceMatrix.needsUpdate = true;
    }

    /** Fluted corner columns with a capital, an iron bowl and layered flames. */
    #buildBraziers() {
        const THREE = this.#THREE;
        const own = this.#own;
        const trim = this.#materials.trim;
        const shaft = own(new THREE.CylinderGeometry(0.42, 0.5, 2.1, 12));
        const base = own(new THREE.CylinderGeometry(0.72, 0.8, 0.3, 12));
        const capital = own(new THREE.CylinderGeometry(0.66, 0.44, 0.28, 12));
        const bowl = own(new THREE.CylinderGeometry(0.5, 0.26, 0.34, 12, 1, true));
        const iron = own(new THREE.MeshLambertMaterial({ color: 0x2b2926, side: THREE.DoubleSide }));
        const embers = own(new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
        const outer = own(new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.85 }));
        const inner = own(new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.95 }));
        const glow = own(new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
        const outerGeometry = own(new THREE.ConeGeometry(0.3, 0.85, 8));
        const innerGeometry = own(new THREE.ConeGeometry(0.16, 0.55, 6));
        const glowGeometry = own(new THREE.SphereGeometry(1.15, 12, 8));
        for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
                const x = sx * (HALF + 1);
                const z = sz * (HALF + 1);
                const put = (geometry, material, y) => {
                    const mesh = this.#add(new THREE.Mesh(geometry, material));
                    mesh.position.set(x, y, z);
                    return mesh;
                };
                put(base, trim, 0.1);
                put(shaft, trim, 1.2);
                put(capital, trim, 2.4);
                put(bowl, iron, 2.66);
                const coals = put(new THREE.CircleGeometry(0.46, 12).rotateX(-Math.PI / 2), embers, 2.62);
                own(coals.geometry);
                put(glowGeometry, glow, 3.05).renderOrder = 4;
                this.#flames.push(put(outerGeometry, outer, 3.05), put(innerGeometry, inner, 2.95));
            }
        }
    }

    /** Cloth banners hung from the top of the inner wall, gently waved by vertex offsets. */
    #buildBanners() {
        const THREE = this.#THREE;
        const geometry = this.#own(new THREE.PlaneGeometry(0.75, 1.15, 1, 4));
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i += 1) {
            position.setZ(i, Math.sin(position.getY(i) * 5) * 0.03);
        }
        geometry.computeVertexNormals();
        const cloth = this.#own(new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        const spacing = 4.2;
        const slots = [];
        for (let side = 0; side < 4; side += 1) {
            for (let along = -HALF + spacing / 2 + 1; along < HALF - 1; along += spacing) slots.push({ side, along });
        }
        const banners = this.#add(new THREE.InstancedMesh(geometry, cloth, slots.length));
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();
        slots.forEach((slot, index) => {
            const angle = (slot.side * Math.PI) / 2;
            const x = slot.along * Math.cos(angle) + (HALF - 0.04) * Math.sin(angle);
            const z = -slot.along * Math.sin(angle) + (HALF - 0.04) * Math.cos(angle);
            matrix.makeRotationY(angle + Math.PI).setPosition(x, 1.05, z);
            banners.setMatrixAt(index, matrix);
            banners.setColorAt(index, color.setHex(BANNER[(index * 7 + slot.side) % BANNER.length]));
        });
        banners.instanceMatrix.needsUpdate = true;
        banners.frustumCulled = false;
    }

    /** Stepped terraces with a seeded instanced crowd: body, head and varied clothing, three draw calls. */
    #buildStands() {
        const THREE = this.#THREE;
        const own = this.#own;
        const random = createRandom(STONE_SEED + 9);
        const tiers = 4;
        const rise = 0.9;
        const depth = 1.7;
        const inner = HALF + 1.6;
        const spots = [];
        for (let side = 0; side < 4; side += 1) {
            const group = new THREE.Group();
            group.rotation.y = (side * Math.PI) / 2;
            for (let tier = 0; tier < tiers; tier += 1) {
                const span = ARENA_SIZE + 6 + tier * 2 * depth;
                const step = new THREE.Mesh(own(new THREE.BoxGeometry(span, rise * (tier + 1), depth)), this.#materials.step);
                step.position.set(0, (rise * (tier + 1)) / 2 - 0.06, inner + depth * (tier + 0.5));
                group.add(step);
                for (let x = -span / 2 + 0.6; x < span / 2 - 0.4; x += 0.62) {
                    if (random() < 0.22) continue;
                    spots.push({ side, x: x + (random() - 0.5) * 0.2, y: rise * (tier + 1), z: inner + depth * (tier + 0.5) + (random() - 0.5) * 0.3, scale: 0.9 + random() * 0.25 });
                }
            }
            this.#add(group);
        }
        const bodyGeometry = own(new THREE.CapsuleGeometry(0.15, 0.3, 3, 6).translate(0, 0.32, 0));
        const headGeometry = own(new THREE.SphereGeometry(0.11, 8, 6).translate(0, 0.72, 0));
        const bodies = this.#add(new THREE.InstancedMesh(bodyGeometry, own(new THREE.MeshLambertMaterial({ color: 0xffffff })), spots.length));
        const heads = this.#add(new THREE.InstancedMesh(headGeometry, own(new THREE.MeshLambertMaterial({ color: 0xffffff })), spots.length));
        const matrix = new THREE.Matrix4();
        const scale = new THREE.Matrix4();
        const color = new THREE.Color();
        spots.forEach((spot, index) => {
            const angle = (spot.side * Math.PI) / 2;
            const px = spot.x * Math.cos(angle) + spot.z * Math.sin(angle);
            const pz = -spot.x * Math.sin(angle) + spot.z * Math.cos(angle);
            matrix.makeRotationY(angle + Math.PI + (random() - 0.5) * 0.5).setPosition(px, spot.y, pz);
            matrix.multiply(scale.makeScale(spot.scale, spot.scale, spot.scale));
            bodies.setMatrixAt(index, matrix);
            heads.setMatrixAt(index, matrix);
            bodies.setColorAt(index, color.setHex(CLOTH[Math.floor(random() * CLOTH.length)]));
            heads.setColorAt(index, color.setHex(SKIN[Math.floor(random() * SKIN.length)]));
        });
        [bodies, heads].forEach((mesh) => {
            mesh.instanceMatrix.needsUpdate = true;
            mesh.frustumCulled = false;
        });
    }

    /** @param {number} elapsed Animation seconds; flames flicker with it. */
    animate(elapsed) {
        this.#flames.forEach((flame, index) => {
            const flicker = 1 + Math.sin(elapsed * 9 + index * 1.7) * 0.12 + Math.sin(elapsed * 23 + index * 3.1) * 0.06;
            flame.scale.set(1 + (flicker - 1) * 0.5, flicker, 1 + (flicker - 1) * 0.5);
        });
    }
}

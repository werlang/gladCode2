import { ARENA_SIZE } from './battle-state.js';
import { Enclosure } from './enclosure.js';
import { clamp01, createRandom, fbm, mix, smooth, valueNoise } from './noise.js';
import { PODIUM, SyntyColiseum } from './synty-coliseum.js';
import { FireSystem } from './fire.js';

const HALF = ARENA_SIZE / 2;
/** The sand runs past the combat square up to the coliseum podium wall. */
const FLOOR_SIZE = Math.ceil(PODIUM * 2 + 1);
/** Gas plane over the combat square and its curb (the procedural walls stand right behind it). */
const GAS_SIZE = ARENA_SIZE + 2;
/** Distance from the arena center to a corner: the safe radius before poison starts. */
export const CORNER_RADIUS = Math.hypot(HALF, HALF);


/** Seed of the procedural ground: same seed, same mud, dips and debris on every replay. */
const FLOOR_SEED = 1337;
const RELIEF_EDGE = 1.6;

/**
 * Wetness at a world position, 0 (dry) to 1 (standing mud). Driven by a low-frequency
 * noise field, so puddles, the darker soil and the dips in the relief always coincide.
 */
export function wetness(x, z) {
    return smooth(0.56, 0.7, fbm(x * 0.16 + 31, z * 0.16 - 17, 3, FLOOR_SEED + 5));
}

/**
 * Ground height at a world position: rolling swells and fine lumps, sunk where the soil
 * is wet, flattened against the wall so the border stays level. Fighters and effects follow it.
 *
 * @param {number} x World X.
 * @param {number} z World Z.
 * @returns {number} Height above the nominal floor.
 */
export function terrainHeight(x, z) {
    const edge = Math.min(HALF - Math.abs(x), HALF - Math.abs(z));
    const fade = clamp01(edge / RELIEF_EDGE);
    const swell = (fbm(x * 0.17, z * 0.17, 3, FLOOR_SEED + 11) - 0.5) * 0.2;
    const lumps = (fbm(x * 0.8, z * 0.8, 2, FLOOR_SEED + 23) - 0.5) * 0.05;
    return (swell + lumps - wetness(x, z) * 0.045) * fade;
}

const DIRT = Object.freeze({
    loam: [104, 76, 48], clay: [156, 116, 70], sand: [176, 148, 104], mud: [52, 38, 28], puddle: [62, 60, 56],
});

/** World coordinates of a texture pixel (canvas y grows toward +z). */
const toWorld = (pixel, size) => (pixel / size) * FLOOR_SIZE - FLOOR_SIZE / 2;

/** Packed-earth albedo written per pixel from layered noise: loam, clay and sand patches, mud where wet, fine grain. */
function paintSoil(ctx, size) {
    const image = ctx.createImageData(size, size);
    const data = image.data;
    for (let py = 0; py < size; py += 1) {
        const z = toWorld(py, size);
        for (let px = 0; px < size; px += 1) {
            const x = toWorld(px, size);
            const patch = fbm(x * 0.22, z * 0.22, 4, FLOOR_SEED + 1);
            const clay = smooth(0.42, 0.62, patch);
            const sand = smooth(0.6, 0.78, fbm(x * 0.3 + 9, z * 0.3 + 4, 3, FLOOR_SEED + 2));
            const mottle = 0.72 + fbm(x * 1.6, z * 1.6, 3, FLOOR_SEED + 3) * 0.55;
            const grain = 0.86 + valueNoise(x * 24, z * 24, FLOOR_SEED + 4) * 0.28;
            const wet = wetness(x, z);
            const index = (py * size + px) * 4;
            for (let c = 0; c < 3; c += 1) {
                let value = mix(DIRT.loam[c], DIRT.clay[c], clay);
                value = mix(value, DIRT.sand[c], sand * 0.55);
                value *= mottle * grain;
                value = mix(value, DIRT.mud[c] * (0.8 + grain * 0.3), wet * 0.9);
                value = mix(value, DIRT.puddle[c], smooth(0.85, 1, wet) * 0.5);
                data[index + c] = value;
            }
            data[index + 3] = 255;
        }
    }
    ctx.putImageData(image, 0, 0);
}

/** Debris drawn over the soil: cracks on dry ground, pebbles, twigs, leaf litter and scuffs. */
function paintDebris(ctx, size) {
    const random = createRandom(FLOOR_SEED);
    const between = (min, max) => min + random() * (max - min);
    const k = size / 2048;
    const dryAt = (x, y) => wetness(toWorld(x, size), toWorld(y, size)) < 0.08;
    ctx.lineCap = 'round';
    for (let i = 0; i < 120; i += 1) {
        const x = between(0, size);
        const y = between(0, size);
        if (!dryAt(x, y)) continue;
        ctx.strokeStyle = `rgba(40, 28, 16, ${between(0.15, 0.35)})`;
        ctx.lineWidth = between(0.6, 1.6) * k * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        let cx = x;
        let cy = y;
        for (let s = 0; s < 4; s += 1) {
            cx += between(-26, 26) * k;
            cy += between(-26, 26) * k;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }
    for (let i = 0; i < 1400; i += 1) {
        const x = between(0, size);
        const y = between(0, size);
        const tone = between(80, 165);
        const rx = between(1.2, 5) * k * 1.4;
        const ry = rx * between(0.6, 1);
        ctx.fillStyle = 'rgba(20, 12, 6, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x + rx * 0.3, y + ry * 0.4, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgb(${tone}, ${tone * 0.93}, ${tone * 0.82})`;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, between(0, 3), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = 'rgba(58, 40, 22, 0.75)';
    for (let i = 0; i < 160; i += 1) {
        const x = between(0, size);
        const y = between(0, size);
        const angle = between(0, Math.PI * 2);
        const length = between(8, 26) * k * 1.6;
        ctx.lineWidth = between(0.8, 1.8) * k * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
    }
    const leafColors = ['#6b7a2c', '#8a6b1f', '#a8501f', '#5a4a1c', '#7c8a3a', '#4c5a22'];
    for (let cluster = 0; cluster < 40; cluster += 1) {
        const cx = between(0, size);
        const cy = between(0, size);
        const count = Math.floor(between(3, 14));
        for (let i = 0; i < count; i += 1) {
            ctx.save();
            ctx.translate(cx + between(-70, 70) * k, cy + between(-70, 70) * k);
            ctx.rotate(between(0, Math.PI * 2));
            ctx.fillStyle = leafColors[Math.floor(random() * leafColors.length)];
            ctx.globalAlpha = between(0.6, 0.95);
            const length = between(6, 12) * k * 1.6;
            ctx.beginPath();
            ctx.ellipse(0, 0, length, length * 0.48, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(30, 24, 8, 0.55)';
            ctx.lineWidth = k * 1.4;
            ctx.beginPath();
            ctx.moveTo(-length, 0);
            ctx.lineTo(length, 0);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.strokeStyle = 'rgba(48, 32, 18, 0.16)';
    for (let i = 0; i < 90; i += 1) {
        const x = between(0, size);
        const y = between(0, size);
        ctx.lineWidth = between(2, 7) * k * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + between(-90, 90) * k, y + between(-90, 90) * k, x + between(-160, 160) * k, y + between(-160, 160) * k);
        ctx.stroke();
    }
}

/** Grayscale maps at low resolution: `bump` gives the soil micro-relief, `wet` drives the glossy highlights. */
function createRelief(THREE) {
    const size = 512;
    const make = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
    };
    const bumpCanvas = make();
    const wetCanvas = make();
    const bumpImage = bumpCanvas.getContext('2d').createImageData(size, size);
    const wetImage = wetCanvas.getContext('2d').createImageData(size, size);
    for (let py = 0; py < size; py += 1) {
        for (let px = 0; px < size; px += 1) {
            const x = toWorld(px, size);
            const z = toWorld(py, size);
            const wet = wetness(x, z);
            const rough = fbm(x * 2.5, z * 2.5, 3, FLOOR_SEED + 6) * 0.6 + valueNoise(x * 18, z * 18, FLOOR_SEED + 7) * 0.4;
            const bump = 255 * clamp01(mix(rough, 0.35, wet * 0.85));
            const gloss = 255 * smooth(0.35, 0.95, wet) * (0.75 + 0.25 * valueNoise(x * 6, z * 6, FLOOR_SEED + 8));
            const index = (py * size + px) * 4;
            bumpImage.data.set([bump, bump, bump, 255], index);
            wetImage.data.set([gloss, gloss, gloss, 255], index);
        }
    }
    bumpCanvas.getContext('2d').putImageData(bumpImage, 0, 0);
    wetCanvas.getContext('2d').putImageData(wetImage, 0, 0);
    return { bumpMap: new THREE.CanvasTexture(bumpCanvas), wetMap: new THREE.CanvasTexture(wetCanvas) };
}

/** Procedural packed-earth floor: soil, mud, debris and its bump/gloss maps, all derived from one seed. */
function createFloorTexture(THREE) {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    paintSoil(ctx, size);
    paintDebris(ctx, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { texture, ...createRelief(THREE) };
}

/**
 * Coliseum floor, the stone enclosure (see `Enclosure`) and the shrinking poison zone.
 * Everything is a handful of static meshes, so it costs almost nothing per frame.
 */
export class Arena {
    #THREE;
    #poison;
    #poisonUniform;
    #gasTime;
    #enclosure;
    #enclosureGroup;
    #scene;
    #own;
    /** Fires of the Synty coliseum: braziers and gate torches (see `fire.js`). */
    #fires = null;
    /** Sand floor mesh; its procedural material gives way to the Meadow Forest terrain when the Synty set loads. */
    #floor;
    #crowd = null;
    #crowdDensity = 1;
    #lastElapsed = null;
    #destroyed = false;
    #disposables = [];

    /**
     * @param {{ THREE: typeof import('three'), scene: import('three').Scene }} options Arena dependencies.
     */
    constructor({ THREE, scene }) {
        this.#THREE = THREE;
        const own = (resource) => {
            this.#disposables.push(resource);
            return resource;
        };
        const add = (mesh) => {
            scene.add(mesh);
            return mesh;
        };

        const ground = add(new THREE.Mesh(
            own(new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2)),
            own(new THREE.MeshLambertMaterial({ color: 0x5e4e3a })),
        ));
        ground.position.y = -0.3;

        const { texture, wetMap, bumpMap } = createFloorTexture(THREE);
        own(texture);
        own(wetMap);
        own(bumpMap);
        const floorGeometry = own(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE, 130, 130).rotateX(-Math.PI / 2));
        const vertices = floorGeometry.attributes.position;
        for (let i = 0; i < vertices.count; i += 1) vertices.setY(i, terrainHeight(vertices.getX(i), vertices.getZ(i)));
        floorGeometry.computeVertexNormals();
        this.#floor = add(new THREE.Mesh(
            floorGeometry,
            own(new THREE.MeshPhongMaterial({ map: texture, bumpMap, bumpScale: 1.2, specularMap: wetMap, specular: 0xa9bccb, shininess: 55 })),
        ));

        this.#scene = scene;
        this.#own = own;
        this.#enclosureGroup = add(new THREE.Group());
        this.#enclosure = new Enclosure({ THREE, add: (mesh) => this.#enclosureGroup.add(mesh) && mesh, own });
        this.#buildPoison(add, own);
    }

    /** Two drifting noise layers at different heights outside the safe circle read as volumetric gas. */
    #buildPoison(add, own) {
        const THREE = this.#THREE;
        this.#poisonUniform = { value: CORNER_RADIUS };
        this.#gasTime = { value: 0 };
        const geometry = own(new THREE.PlaneGeometry(GAS_SIZE, GAS_SIZE).rotateX(-Math.PI / 2));
        const fragmentShader = `
            uniform float radius; uniform float time; uniform float layer; varying vec2 vPos;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }
            float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
            void main() {
                float depth = length(vPos) - radius;
                // radius is the engine safe radius: poisoned exactly where length(pos) >= radius.
                if (depth < 0.0) discard;
                vec2 drift = vec2(cos(layer * 2.1), sin(layer * 2.1)) * time * (0.35 + layer * 0.12);
                float cloud = fbm(vPos * (0.16 + layer * 0.05) + drift);
                float swirl = noise(vPos * 0.4 - drift * 1.6 + cloud * 2.0);
                float density = smoothstep(0.3, 0.8, cloud * 0.65 + swirl * 0.5);
                // Full density right at the boundary, with a bright rim marking it.
                float edge = 0.55 + 0.45 * smoothstep(0.0, 1.2, depth);
                float rim = 1.0 - smoothstep(0.0, 0.12, depth);
                float alpha = (0.14 + density * 0.5) * edge * (0.85 - layer * 0.12) + rim * (1.0 - layer) * 0.55;
                vec3 color = mix(mix(vec3(0.13, 0.42, 0.09), vec3(0.62, 0.95, 0.3), density * 0.85), vec3(0.75, 1.0, 0.45), rim * (1.0 - layer));
                gl_FragColor = vec4(color, alpha);
            }`;
        this.#poison = new THREE.Group();
        [0, 1].forEach((layer) => {
            const mesh = new THREE.Mesh(geometry, own(new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                uniforms: { radius: this.#poisonUniform, time: this.#gasTime, layer: { value: layer } },
                vertexShader: 'varying vec2 vPos; void main() { vPos = (modelMatrix * vec4(position, 1.0)).xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
                fragmentShader,
            })));
            mesh.position.y = 0.05 + layer * 0.45;
            mesh.renderOrder = 1 + layer;
            this.#poison.add(mesh);
        });
        add(this.#poison);
        this.updateSafeZone(CORNER_RADIUS);
    }

    /** @param {number} radius Current safe radius in world units. */
    updateSafeZone(radius) {
        // The engine sends the radius once poison starts (and 0 once it covers everything).
        const value = Number(radius);
        const safe = Number.isFinite(value) ? Math.max(0, value) : CORNER_RADIUS;
        const visible = safe < CORNER_RADIUS - 0.01;
        this.#poison.visible = visible;
        this.#poisonUniform.value = safe;
    }

    /**
     * Replaces the whole procedural enclosure with the Synty coliseum (see `SyntyColiseum`):
     * stands, podium, gates, statues and braziers. Only the brazier flames are billboards,
     * textured with the Synty particle pack.
     *
     * @param {import('./synty-arena.js').SyntyArenaKit} kit Loaded Ancient Empire pieces.
     */
    applySynty(kit) {
        const THREE = this.#THREE;
        const own = this.#own;
        this.#disposables.push(kit);
        const coliseum = new SyntyColiseum(THREE, kit);
        this.#enclosureGroup.visible = false;
        this.#scene.add(coliseum.group);
        // The sand runs on to the podium wall here, and so does the gas (the wall hides the edge of the plane).
        this.#poison.scale.set(FLOOR_SIZE / GAS_SIZE, 1, FLOOR_SIZE / GAS_SIZE);
        this.#loadCrowd(coliseum.plan, coliseum.posts, coliseum.throne);
        this.#loadFloor();
        this.#disposables.push({ dispose: () => coliseum.group.removeFromParent() });
        // Particle fires in the brazier bowls and the gate torches (`size` < 1).
        this.#fires = own(new FireSystem(THREE));
        coliseum.flames.forEach((at) => this.#fires.add(at));
        this.#scene.add(this.#fires.group);
    }

    /** @param {number} elapsed Animation seconds; flames flicker with it. */
    animate(elapsed) {
        this.#gasTime.value = elapsed;
        const dt = this.#lastElapsed === null ? 0 : Math.max(0, Math.min(0.1, elapsed - this.#lastElapsed));
        this.#lastElapsed = elapsed;
        this.#crowd?.update(elapsed, dt);
        this.#enclosure.animate(elapsed);
        this.#fires?.update(elapsed, dt);
    }

    /** Re-dresses the sand with the Meadow Forest terrain textures and rocks (see `synty-floor.js`); the procedural soil stays if the pack is missing. */
    #loadFloor() {
        import('./synty-floor.js')
            .then(({ loadSyntyFloor }) => loadSyntyFloor(this.#THREE, { wetness, terrainHeight, size: FLOOR_SIZE, wall: PODIUM }))
            .then((floor) => {
                if (this.#destroyed) {
                    floor.dispose();
                    return;
                }
                this.#floor.material = floor.material;
                this.#scene.add(floor.props);
                this.#disposables.push(floor);
            })
            .catch((error) => console.warn('Synty floor unavailable; keeping the procedural soil.', error));
    }

    /** Fills the stands once the crowd is baked (a few seconds after the arena shows); the arena works without it. */
    #loadCrowd(plan, posts, throne) {
        import('./synty-crowd.js')
            .then(({ loadSyntyCrowd }) => loadSyntyCrowd(this.#THREE, plan, posts, throne))
            .then((crowd) => {
                if (this.#destroyed) {
                    crowd.dispose();
                    return;
                }
                this.#crowd = crowd;
                crowd.setDensity(this.#crowdDensity);
                this.#scene.add(crowd.group);
                this.#disposables.push(crowd);
            })
            .catch((error) => console.warn('Synty crowd unavailable; the stands stay empty.', error));
    }

    /** @param {number} density Share of the spectators shown, 0 to 1 (the settings crowd slider). */
    setCrowdDensity(density) {
        this.#crowdDensity = Math.max(0, Math.min(1, Number(density) || 0));
        this.#crowd?.setDensity(this.#crowdDensity);
    }

    /** @param {number} intensity How much the crowd rises to a moment of the fight, 0 to 1. */
    reactCrowd(intensity) {
        this.#crowd?.react(intensity);
    }

    destroy() {
        this.#destroyed = true;
        this.#disposables.forEach((resource) => resource.dispose());
        this.#disposables = [];
    }
}

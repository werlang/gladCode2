import { ARENA_SIZE } from './battle-state.js';
import { clamp01, fbm, smooth } from './noise.js';
import { PODIUM, SyntyColiseum } from './synty-coliseum.js';
import { FireSystem } from './fire.js';
import { GasClouds } from './gas.js';

const HALF = ARENA_SIZE / 2;
/**
 * Marks a group that never moves as static: its world matrices are computed once and the render loop skips it
 * (three otherwise walks every node of the coliseum and the crowd each frame). Instance matrices still update.
 *
 * @param {import('three').Object3D} group Static group, already placed.
 * @returns {import('three').Object3D} The group.
 */
function freeze(group) {
    group.updateMatrixWorld(true);
    group.traverse((node) => {
        node.matrixAutoUpdate = false;
    });
    group.matrixWorldAutoUpdate = false;
    return group;
}

/** The sand runs past the combat square up to the coliseum podium wall. */
const FLOOR_SIZE = Math.ceil(PODIUM * 2 + 1);
/** Gas plane over the combat square and its curb. */
const GAS_SIZE = ARENA_SIZE + 2;
/** Distance from the arena center to a corner: the safe radius before poison starts. */
export const CORNER_RADIUS = Math.hypot(HALF, HALF);


/** Seed of the ground relief and wetness: same seed, same mud and dips on every replay. */
const FLOOR_SEED = 1337;
/** Plain sand colour shown until the Meadow Forest terrain loads (or if the pack is missing). */
const SAND = 0x9c7f58;
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

/**
 * Coliseum floor, ancient empire coliseum (see `SyntyColiseum`) and the shrinking poison zone.
 * Everything is a handful of static meshes, so it costs almost nothing per frame.
 */
export class Arena {
    #THREE;
    #poison;
    #poisonUniform;
    #gasTime;
    #scene;
    #own;
    /** Fires of the Synty coliseum: braziers and gate torches (see `fire.js`). */
    #fires = null;
    /** @type {Array<{ x: number, y: number, z: number, size: number }>} Flame positions, once the coliseum is up. */
    #flames = [];
    /** Billowing poison clouds over the poisoned ground (see `gas.js`). */
    #clouds = null;
    /** Sand floor mesh; its plain sand material gives way to the Meadow Forest terrain when the Synty set loads. */
    #floor;
    #crowd = null;
    /** Countryside beyond the walls (see `synty-landscape.js`), once loaded. */
    #landscape = null;
    /** Renderer the floor is baked with (null keeps the live splat). */
    #renderer = null;
    /** Graphics tier (see quality.js): floor bake size and whether the scenery beyond the walls shows. */
    #quality;
    #scenery = true;
    #ready = Promise.resolve();
    #crowdDensity = 1;
    #lastElapsed = null;
    #destroyed = false;
    #disposables = [];

    /**
     * @param {{ THREE: typeof import('three'), scene: import('three').Scene, renderer?: import('three').WebGLRenderer, quality?: { scenery: boolean, smallBake: boolean } }} options
     *   Arena dependencies; the renderer bakes the floor's terrain blend once (see `synty-floor.js`), the quality tier
     *   sizes that bake and decides whether the trees, fields and town beyond the walls are drawn.
     */
    constructor({ THREE, scene, renderer = null, quality = { scenery: true, smallBake: false } }) {
        this.#THREE = THREE;
        this.#renderer = renderer;
        this.#quality = quality;
        this.#scenery = quality.scenery;
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

        const floorGeometry = own(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE, 130, 130).rotateX(-Math.PI / 2));
        const vertices = floorGeometry.attributes.position;
        for (let i = 0; i < vertices.count; i += 1) vertices.setY(i, terrainHeight(vertices.getX(i), vertices.getZ(i)));
        floorGeometry.computeVertexNormals();
        this.#floor = add(new THREE.Mesh(
            floorGeometry,
            own(new THREE.MeshLambertMaterial({ color: SAND })),
        ));
        this.#floor.name = 'arena-floor';

        this.#scene = scene;
        this.#own = own;
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
        this.#clouds = new GasClouds(THREE, GAS_SIZE / 2);
        own(this.#clouds);
        add(this.#clouds.group);
        this.#poison = new THREE.Group();
        this.#poison.name = 'poison';
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
        // The sand runs on to the podium wall, and so does the gas (the wall hides the edge of the plane).
        this.#poison.scale.set(FLOOR_SIZE / GAS_SIZE, 1, FLOOR_SIZE / GAS_SIZE);
        this.#clouds.setExtent(FLOOR_SIZE / 2);
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
        this.#clouds?.setRadius(visible ? safe : Infinity);
        this.#poisonUniform.value = safe;
    }

    /**
     * Installs the Synty coliseum (see `SyntyColiseum`): stands, podium, gates, statues and braziers.
     * Only the brazier flames are billboards, textured with the Synty particle pack.
     *
     * @param {import('./synty-arena.js').SyntyArenaKit} kit Loaded Ancient Empire pieces.
     */
    applySynty(kit) {
        const THREE = this.#THREE;
        const own = this.#own;
        this.#disposables.push(kit);
        const coliseum = new SyntyColiseum(THREE, kit);
        this.#scene.add(freeze(coliseum.group));
        // The crowd, the floor bake and the countryside load in the background; `ready` settles when all three have.
        this.#ready = Promise.all([this.#loadCrowd(coliseum.plan, coliseum.posts, coliseum.throne), this.#loadFloor(), this.#loadLandscape()]);
        this.#disposables.push({ dispose: () => coliseum.group.removeFromParent() });
        // Particle fires in the brazier bowls and the gate torches (`size` < 1).
        this.#fires = own(new FireSystem(THREE));
        coliseum.flames.forEach((at) => this.#fires.add(at));
        this.#flames = coliseum.flames;
        this.#scene.add(this.#fires.group);
    }

    /**
     * Settles once the background loads (crowd, floor bake, countryside) have finished or failed; resolves at once
     * when the Synty coliseum never loaded. The renderer warms up and reveals the battle after it.
     *
     * @returns {Promise<unknown>} Settles when the arena is complete.
     */
    get ready() {
        return this.#ready;
    }

    /** @returns {Array<{ x: number, y: number, z: number, size: number }>} Brazier, torch and incense flames (empty until the coliseum loads). */
    get flames() {
        return this.#flames;
    }

    /** @param {number} elapsed Animation seconds; flames flicker with it. */
    animate(elapsed) {
        this.#gasTime.value = elapsed;
        const dt = this.#lastElapsed === null ? 0 : Math.max(0, Math.min(0.1, elapsed - this.#lastElapsed));
        this.#lastElapsed = elapsed;
        this.#crowd?.update(elapsed, dt);
        this.#clouds?.update(elapsed, dt);
        this.#fires?.update(elapsed, dt);
        this.#landscape?.update(dt);
    }

    /** Re-dresses the sand with the Meadow Forest terrain textures and rocks (see `synty-floor.js`); the plain sand stays if the pack is missing. */
    #loadFloor() {
        return import('./synty-floor.js')
            .then(({ loadSyntyFloor }) => loadSyntyFloor(this.#THREE, { wetness, terrainHeight, size: FLOOR_SIZE, wall: PODIUM, renderer: this.#renderer, small: this.#quality.smallBake }))
            .then((floor) => {
                if (this.#destroyed) {
                    floor.dispose();
                    return;
                }
                this.#floor.material = floor.material;
                this.#scene.add(floor.props);
                this.#disposables.push(floor);
            })
            .catch((error) => console.warn('Synty floor unavailable; keeping the plain sand.', error));
    }

    /** Lays out the countryside beyond the walls (see `synty-landscape.js`); the open sky stays if the pack is missing. */
    #loadLandscape() {
        return import('./synty-landscape.js')
            .then(({ loadSyntyLandscape }) => loadSyntyLandscape(this.#THREE))
            .then((landscape) => {
                if (this.#destroyed) {
                    landscape.dispose();
                    return;
                }
                this.#landscape = landscape;
                landscape.setScenery(this.#scenery);
                this.#scene.add(landscape.group);
                this.#disposables.push(landscape);
            })
            .catch((error) => console.warn('Synty landscape unavailable; the coliseum stands on bare ground.', error));
    }

    /** Fills the stands once the crowd is baked (a few seconds after the arena shows); the arena works without it. */
    #loadCrowd(plan, posts, throne) {
        return import('./synty-crowd.js')
            .then(({ loadSyntyCrowd }) => loadSyntyCrowd(this.#THREE, plan, posts, throne))
            .then((crowd) => {
                if (this.#destroyed) {
                    crowd.dispose();
                    return;
                }
                this.#crowd = crowd;
                crowd.setDensity(this.#crowdDensity);
                this.#scene.add(freeze(crowd.group));
                this.#disposables.push(crowd);
            })
            .catch((error) => console.warn('Synty crowd unavailable; the stands stay empty.', error));
    }

    /** @param {number} density Share of the spectators shown, 0 to 1 (the settings crowd slider). */
    setCrowdDensity(density) {
        this.#crowdDensity = Math.max(0, Math.min(1, Number(density) || 0));
        this.#crowd?.setDensity(this.#crowdDensity);
    }

    /** @param {{ x: number, z: number }|null} at Where the fight is; the spectators turn to follow it. */
    setCrowdFocus(at) {
        this.#crowd?.setFocus(at);
    }

    /**
     * Shows or hides the scenery beyond the walls (trees, fields, farms, the town); the ground, sky, mountains and
     * clouds stay. Low tiers start without it, and the renderer drops it when a slow CPU needs the time.
     *
     * @param {boolean} visible Whether the scenery is drawn.
     */
    setScenery(visible) {
        this.#scenery = visible;
        this.#landscape?.setScenery(visible);
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

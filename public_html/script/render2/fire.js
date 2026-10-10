import { ARENA_SIZE } from './battle-state.js';
import { ParticleLayer } from './particles.js';

const TEXTURES = '/assets/synty/special-effects/Textures/';
const SHAPE = `${TEXTURES}PolygonParticles_Smoke_01.png`;
const SOFT = `${TEXTURES}PolygonParticles_Soft_Spot.png`;

/** Particles per fire of size 1 (a brazier); smaller fires (torches) keep the counts and shrink. */
const FLAMES = 26;
const SMOKE = 6;
const EMBERS = 5;

/** Flame colour over its life: white-hot core, yellow, orange, then a dull red tip. */
const FLAME_RAMP = [[0, 0xffe58a], [0.3, 0xffb02e], [0.6, 0xf2600f], [1, 0xa3260a]];

/**
 * Open fires (braziers, torches): low-poly flame shards that rise, shrink and cool from white to red, a soft glow
 * that breathes with them, grey smoke drifting off the top and the odd ember. Particles are recycled in place, each
 * fire keeps its own phases, and all fires share three draw calls.
 */
export class FireSystem {
    group;
    #THREE;
    #fires = [];
    #layers;
    #ramp;
    #color;
    #disposables = [];

    /** @param {typeof import('three')} THREE Three namespace. */
    constructor(THREE) {
        this.#THREE = THREE;
        this.group = new THREE.Group();
        this.group.name = 'fires';
        const loader = new THREE.TextureLoader();
        const shape = loader.load(SHAPE);
        const soft = loader.load(SOFT);
        this.#disposables.push(shape, soft);
        // Fires on the wall fade like the stone when they stand between the camera and the combat square.
        const view = { seeThrough: ARENA_SIZE / 2 + 1.5 };
        this.#layers = {
            smoke: new ParticleLayer(THREE, shape, 64 * SMOKE, false, view),
            glow: new ParticleLayer(THREE, soft, 64 * (1 + EMBERS), true, view),
            flame: new ParticleLayer(THREE, shape, 64 * FLAMES, false, view),
        };
        this.#layers.smoke.mesh.renderOrder = 10;
        this.#layers.glow.mesh.renderOrder = 11;
        this.#layers.flame.mesh.renderOrder = 12;
        Object.values(this.#layers).forEach((layer) => this.group.add(layer.mesh));
        this.#ramp = FLAME_RAMP.map(([at, hex]) => [at, new THREE.Color(hex)]);
        this.#color = new THREE.Color();
    }

    /**
     * Lights a fire.
     *
     * @param {{ x: number, y: number, z: number, size?: number }} at Base of the flames (the bowl's rim) and scale.
     */
    add({ x, y, z, size = 1 }) {
        const seeded = (n) => Array.from({ length: n }, () => ({ age: Math.random(), life: 1, seed: Math.random() }));
        this.#fires.push({ x, y, z, size, flames: seeded(FLAMES), smoke: seeded(SMOKE), embers: seeded(EMBERS), phase: Math.random() * 10 });
    }

    #ramped(t) {
        const ramp = this.#ramp;
        for (let i = 1; i < ramp.length; i += 1) {
            if (t <= ramp[i][0]) {
                const k = (t - ramp[i - 1][0]) / (ramp[i][0] - ramp[i - 1][0]);
                return this.#color.copy(ramp[i - 1][1]).lerp(ramp[i][1], k);
            }
        }
        return this.#color.copy(ramp[ramp.length - 1][1]);
    }

    /**
     * @param {number} elapsed Animation seconds.
     * @param {number} dt Seconds since the previous frame (0 holds the fire still).
     */
    update(elapsed, dt) {
        const { smoke, glow, flame } = this.#layers;
        smoke.begin();
        glow.begin();
        flame.begin();
        const respawn = (p, life) => {
            p.age = 0;
            p.life = life;
            p.seed = Math.random();
        };
        for (const fire of this.#fires) {
            const s = fire.size;
            const t = elapsed + fire.phase;
            // A gust leans the whole fire for a moment.
            const lean = Math.sin(t * 1.3) * 0.12 + Math.sin(t * 3.7) * 0.05;
            const flicker = 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23 + 1.7) * 0.07;
            glow.push(fire.x, fire.y + 0.3 * s, fire.z, 2.2 * s * flicker, 0, 1, 0.42, 0.1, 0.35);

            for (const p of fire.flames) {
                p.age += dt / p.life;
                if (p.age >= 1) respawn(p, 0.45 + Math.random() * 0.35);
                const u = p.age;
                const angle = p.seed * Math.PI * 2;
                // Born across the bowl, drawn in to a point as they rise.
                const spread = 0.22 * s * (1 - u * 0.8);
                const rise = (0.05 + 1.05 * u + 0.5 * u * u) * s;
                const sway = Math.sin(t * 6 + p.seed * 9) * 0.06 * s * u;
                // Full size at the bowl, tapering as they climb: together they draw a tongue of flame.
                const size = 0.29 * s * Math.min(1, u * 6) * Math.pow(1 - u, 1.3) * (0.8 + p.seed * 0.4);
                const color = this.#ramped(u);
                flame.push(
                    fire.x + Math.cos(angle) * spread + (lean * u + sway) * s,
                    fire.y + rise,
                    fire.z + Math.sin(angle) * spread,
                    size, p.seed * 6 + u * 2.5, color.r, color.g, color.b, Math.min(1, (1 - u) * 1.6),
                );
            }
            for (const p of fire.smoke) {
                p.age += dt / p.life;
                if (p.age >= 1) respawn(p, 1.6 + Math.random() * 1.2);
                const u = p.age;
                const drift = (lean + 0.15) * u * 1.4 * s;
                const shade = 0.22 + p.seed * 0.12;
                smoke.push(
                    fire.x + drift + (p.seed - 0.5) * 0.3 * s,
                    fire.y + (1.2 + 2.2 * u) * s,
                    fire.z + (p.seed - 0.5) * 0.3 * s,
                    (0.35 + 0.9 * u) * s, p.seed * 6 + u, shade, shade, shade, 0.32 * Math.sin(Math.PI * u),
                );
            }
            for (const p of fire.embers) {
                p.age += dt / p.life;
                if (p.age >= 1) respawn(p, 1 + Math.random() * 0.8);
                const u = p.age;
                const angle = p.seed * Math.PI * 2;
                glow.push(
                    fire.x + Math.cos(angle) * 0.4 * s * u + lean * u * s,
                    fire.y + (0.4 + 2.4 * u) * s,
                    fire.z + Math.sin(angle) * 0.4 * s * u,
                    0.07 * s, 0, 1, 0.55, 0.15, 1 - u,
                );
            }
        }
        smoke.end();
        glow.end();
        flame.end();
    }

    dispose() {
        this.group.removeFromParent();
        Object.values(this.#layers).forEach((layer) => layer.dispose());
        this.#disposables.forEach((item) => item.dispose());
    }
}

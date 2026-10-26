import { ParticleLayer } from './particles.js';

const TEXTURES = '/assets/synty/special-effects/Textures/';
const PUFFS = 240;
const WISPS = 40;

/**
 * Billowing poison clouds over the poisoned ground: low-poly puffs that swell, drift with a slow wind, sink back
 * and fade, thickest just past the boundary, with brighter wisps curling on top. Puffs are only ever born outside
 * the engine's safe radius (by their own size), so the clouds never cover safe ground; the exact boundary is
 * still drawn by the gas planes in `arena.js`. Two draw calls.
 */
export class GasClouds {
    group;
    #layers;
    #puffs = [];
    #wisps = [];
    #radius = Infinity;
    #half = 1;
    #textures;

    /**
     * @param {typeof import('three')} THREE Three namespace.
     * @param {number} half Half-width of the floor the gas can cover.
     */
    constructor(THREE, half) {
        this.#half = half;
        this.group = new THREE.Group();
        this.group.name = 'gas-clouds';
        const loader = new THREE.TextureLoader();
        this.#textures = [loader.load(`${TEXTURES}PolygonParticles_Smoke_01.png`), loader.load(`${TEXTURES}PolygonParticles_Soft_Spot.png`)];
        this.#layers = {
            puffs: new ParticleLayer(THREE, this.#textures[0], PUFFS, false),
            wisps: new ParticleLayer(THREE, this.#textures[1], WISPS, true),
        };
        this.#layers.puffs.mesh.renderOrder = 4;
        this.#layers.wisps.mesh.renderOrder = 5;
        Object.values(this.#layers).forEach((layer) => this.group.add(layer.mesh));
        const seed = (n) => Array.from({ length: n }, () => ({ age: Math.random(), life: 1, x: 0, z: 0, size: 1, seed: Math.random(), alive: false }));
        this.#puffs = seed(PUFFS);
        this.#wisps = seed(WISPS);
    }

    /** @param {number} half Half-width of the floor the gas can cover (the coliseum sand runs further). */
    setExtent(half) {
        this.#half = half;
    }

    /** @param {number} radius Engine safe radius (distance from the arena centre); Infinity hides the clouds. */
    setRadius(radius) {
        this.#radius = radius;
        this.group.visible = Number.isFinite(radius);
    }

    /** Places a particle at a random poisoned spot, most of them in a band just past the boundary. */
    #spawn(p, size, life) {
        const radius = this.#radius;
        const half = this.#half;
        p.size = size * (0.7 + Math.random() * 0.6);
        p.life = life * (0.7 + Math.random() * 0.6);
        p.age = 0;
        p.seed = Math.random();
        // The centre keeps the puff's own half-width away from the safe circle.
        const inner = radius + p.size * 0.6;
        for (let tries = 0; tries < 12; tries += 1) {
            const angle = Math.random() * Math.PI * 2;
            const band = Math.random() < 0.65 ? inner + Math.random() * 3 : inner + Math.random() * half * 1.5;
            const x = Math.cos(angle) * band;
            const z = Math.sin(angle) * band;
            if (Math.abs(x) <= half - 0.3 && Math.abs(z) <= half - 0.3) {
                p.x = x;
                p.z = z;
                p.alive = true;
                return;
            }
        }
        p.alive = false;
    }

    /**
     * @param {number} elapsed Animation seconds.
     * @param {number} dt Seconds since the previous frame.
     */
    update(elapsed, dt) {
        const { puffs, wisps } = this.#layers;
        puffs.begin();
        wisps.begin();
        if (this.group.visible) {
            const radius = this.#radius;
            const windX = Math.cos(elapsed * 0.07) * 0.18;
            const windZ = Math.sin(elapsed * 0.05) * 0.18;
            for (const p of this.#puffs) {
                p.age += dt / p.life;
                if (p.age >= 1 || !p.alive) this.#spawn(p, 1.6, 4.5);
                if (!p.alive) continue;
                p.x += windX * dt;
                p.z += windZ * dt;
                const u = p.age;
                const swell = p.size * (0.75 + 0.5 * u);
                // A drifting puff that reaches safe ground dissolves instead of crossing it (the shape fills ~0.45 of its quad).
                const clearance = Math.hypot(p.x, p.z) - radius - swell * 0.45;
                const fade = Math.sin(Math.PI * u) * Math.min(1, Math.max(0, clearance / 0.6));
                if (fade <= 0.01) continue;
                const y = 0.25 + p.seed * 0.9 + Math.sin(u * Math.PI) * 0.35;
                const shade = 0.55 + p.seed * 0.45;
                puffs.push(p.x, y, p.z, swell, p.seed * 6 + u * 0.8, 0.07 * shade, 0.26 * shade, 0.03 * shade, 0.36 * fade);
            }
            for (const p of this.#wisps) {
                p.age += dt / p.life;
                if (p.age >= 1 || !p.alive) this.#spawn(p, 2.2, 3);
                if (!p.alive) continue;
                p.x += windX * dt * 1.5;
                p.z += windZ * dt * 1.5;
                const clearance = Math.hypot(p.x, p.z) - radius - p.size * 0.3;
                const fade = Math.sin(Math.PI * p.age) * Math.min(1, Math.max(0, clearance / 0.6));
                if (fade <= 0.01) continue;
                wisps.push(p.x, 0.6 + p.seed * 0.8, p.z, p.size, 0, 0.35, 0.75, 0.12, 0.16 * fade);
            }
        }
        puffs.end();
        wisps.end();
    }

    dispose() {
        this.group.removeFromParent();
        Object.values(this.#layers).forEach((layer) => layer.dispose());
        this.#textures.forEach((texture) => texture.dispose());
    }
}

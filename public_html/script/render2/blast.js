import { ParticleLayer } from './particles.js';

const TEXTURES = '/assets/synty/special-effects/Textures/';
const SHAPE = `${TEXTURES}PolygonParticles_Smoke_01.png`;
const SOFT = `${TEXTURES}PolygonParticles_Soft_Spot.png`;

/** Particles of one blast of radius 1. */
const FIRE = 46;
const SMOKE = 18;
const SPARKS = 26;
const DEBRIS = 10;
const MAX_BLASTS = 6;
const GRAVITY = 9;

/** Fire colour as it burns out: white flash, yellow, orange, deep red, then soot. */
const FIRE_RAMP = [[0, 0xfffbe6], [0.12, 0xffe07a], [0.32, 0xff9a2a], [0.6, 0xd2400f], [1, 0x3a1a0e]];

/**
 * Fireball explosions as particles: a white flash and a real light that bathes the arena for a moment, low-poly
 * fire shards thrown out in a sphere that slow down, cool from white to red and turn to soot, a dark smoke column
 * that rolls up and spreads, sparks and grit arcing out under gravity. Every blast shares four draw calls.
 */
export class BlastSystem {
    group;
    #THREE;
    #blasts = [];
    #layers;
    #ramp;
    #color;
    #light;
    #textures;

    /** @param {typeof import('three')} THREE Three namespace. */
    constructor(THREE) {
        this.#THREE = THREE;
        this.group = new THREE.Group();
        this.group.name = 'blasts';
        const loader = new THREE.TextureLoader();
        this.#textures = [loader.load(SHAPE), loader.load(SOFT)];
        const [shape, soft] = this.#textures;
        const capacity = MAX_BLASTS;
        this.#layers = {
            smoke: new ParticleLayer(THREE, shape, capacity * SMOKE, false),
            fire: new ParticleLayer(THREE, shape, capacity * FIRE, false),
            glow: new ParticleLayer(THREE, soft, capacity * (SPARKS + 2), true),
            debris: new ParticleLayer(THREE, shape, capacity * DEBRIS, false),
        };
        this.#layers.debris.mesh.renderOrder = 20;
        this.#layers.smoke.mesh.renderOrder = 21;
        this.#layers.fire.mesh.renderOrder = 22;
        this.#layers.glow.mesh.renderOrder = 23;
        Object.values(this.#layers).forEach((layer) => this.group.add(layer.mesh));
        // One light, always in the scene (adding lights recompiles materials); it flares with the newest blast.
        this.#light = new THREE.PointLight(0xff9a40, 0, 9, 1.6);
        this.group.add(this.#light);
        this.#ramp = FIRE_RAMP.map(([at, hex]) => [at, new THREE.Color(hex)]);
        this.#color = new THREE.Color();
    }

    #ramped(t) {
        const ramp = this.#ramp;
        for (let i = 1; i < ramp.length; i += 1) {
            if (t <= ramp[i][0]) return this.#color.copy(ramp[i - 1][1]).lerp(ramp[i][1], (t - ramp[i - 1][0]) / (ramp[i][0] - ramp[i - 1][0]));
        }
        return this.#color.copy(ramp[ramp.length - 1][1]);
    }

    /**
     * Sets off an explosion.
     *
     * @param {{ x: number, y: number, z: number }} at Centre of the blast.
     * @param {number} [radius] Size of the fireball in metres.
     */
    explode(at, radius = 1) {
        const direction = () => {
            // Uniform on a sphere, flattened a little and biased upward: the ground stops the lower half.
            const u = Math.random() * 2 - 1;
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(1 - u * u);
            return { x: Math.cos(angle) * r, y: Math.abs(u) * 0.8 + 0.15, z: Math.sin(angle) * r };
        };
        const particles = (count, make) => Array.from({ length: count }, make);
        const blast = {
            x: at.x, y: at.y, z: at.z, radius, age: 0,
            fire: particles(FIRE, () => ({ dir: direction(), speed: (2.2 + Math.random() * 3.2) * radius, life: 0.45 + Math.random() * 0.5, size: 0.5 + Math.random() * 0.7, spin: Math.random() * 6 })),
            smoke: particles(SMOKE, () => ({ dir: direction(), speed: (0.8 + Math.random() * 1.2) * radius, delay: 0.12 + Math.random() * 0.25, life: 1.6 + Math.random() * 1.2, size: 0.7 + Math.random() * 0.6, spin: Math.random() * 6, shade: 0.12 + Math.random() * 0.1 })),
            sparks: particles(SPARKS, () => ({ dir: direction(), speed: (4.5 + Math.random() * 5) * radius, life: 0.5 + Math.random() * 0.6 })),
            debris: particles(DEBRIS, () => ({ dir: direction(), speed: (3 + Math.random() * 3) * radius, life: 0.8 + Math.random() * 0.5, size: 0.06 + Math.random() * 0.08, spin: Math.random() * 6, shade: 0.18 + Math.random() * 0.15 })),
        };
        this.#blasts.push(blast);
        if (this.#blasts.length > MAX_BLASTS) this.#blasts.shift();
    }

    /** Clears every blast (a seek). */
    clear() {
        this.#blasts.length = 0;
    }

    /** @param {number} dt Seconds since the previous frame (0 holds the blasts still). */
    update(dt) {
        const { smoke, fire, glow, debris } = this.#layers;
        for (const layer of [smoke, fire, glow, debris]) layer.begin();
        let light = 0;
        let lightAt = null;
        for (const blast of this.#blasts) {
            blast.age += dt;
            const { x, y, z, radius, age } = blast;
            // Flash: a white burst that collapses in a tenth of a second, then a warm glow that fades.
            const flash = Math.max(0, 1 - age / 0.12);
            const warm = Math.max(0, 1 - age / 0.7);
            if (flash > 0) glow.push(x, y, z, radius * (2.5 + 4 * (1 - flash)), 0, 1, 0.95, 0.8, flash);
            if (warm > 0) glow.push(x, y + 0.2 * radius, z, radius * 4.2, 0, 1, 0.45, 0.12, warm * warm * 0.7);
            if (warm > light) {
                light = warm;
                lightAt = blast;
            }
            for (const p of blast.fire) {
                const u = age / p.life;
                if (u >= 1) continue;
                // Thrown out fast, then held back by the air (distance grows like 1 - e^-t) and lifted by the heat.
                const travel = p.speed * (1 - Math.exp(-age * 4.5)) / 4.5;
                const lift = 0.9 * radius * age * age;
                const color = this.#ramped(u);
                const size = radius * p.size * (0.35 + 0.9 * Math.min(1, u * 4)) * (1 - u * 0.4);
                fire.push(x + p.dir.x * travel, y + p.dir.y * travel + lift, z + p.dir.z * travel, size, p.spin + u * 2, color.r, color.g, color.b, Math.min(1, (1 - u) * 2.2));
            }
            for (const p of blast.smoke) {
                const t = age - p.delay;
                if (t <= 0) continue;
                const u = t / p.life;
                if (u >= 1) continue;
                // Rolls up into a column and spreads as it climbs.
                const travel = p.speed * (1 - Math.exp(-t * 2)) / 2;
                const rise = radius * (0.6 * t + 0.35 * t * t);
                const shade = p.shade * (1 - 0.5 * Math.max(0, 1 - t * 4));
                smoke.push(x + p.dir.x * travel, y + p.dir.y * travel * 0.5 + rise, z + p.dir.z * travel, radius * p.size * (0.6 + 1.6 * u), p.spin + u, shade * 1.1, shade, shade * 0.9, 0.75 * Math.sin(Math.PI * Math.min(1, u * 1.4 + 0.05)) * (1 - u));
            }
            for (const p of blast.sparks) {
                const u = age / p.life;
                if (u >= 1) continue;
                const px = x + p.dir.x * p.speed * age;
                const py = Math.max(0.02, y + p.dir.y * p.speed * age - 0.5 * GRAVITY * age * age);
                const pz = z + p.dir.z * p.speed * age;
                glow.push(px, py, pz, 0.08 * radius * (1 - u * 0.5), 0, 1, 0.75 - u * 0.4, 0.3 - u * 0.25, 1 - u);
            }
            for (const p of blast.debris) {
                const u = age / p.life;
                if (u >= 1) continue;
                const px = x + p.dir.x * p.speed * age * 0.7;
                const py = Math.max(0.03, y + p.dir.y * p.speed * age - 0.5 * GRAVITY * age * age);
                const pz = z + p.dir.z * p.speed * age * 0.7;
                debris.push(px, py, pz, radius * p.size, p.spin + age * 8, p.shade * 1.2, p.shade, p.shade * 0.8, Math.min(1, (1 - u) * 3));
            }
        }
        this.#blasts = this.#blasts.filter((blast) => blast.age < 3.5);
        for (const layer of [smoke, fire, glow, debris]) layer.end();
        this.#light.intensity = light * light * 60;
        if (lightAt) this.#light.position.set(lightAt.x, lightAt.y + 0.6, lightAt.z);
    }

    dispose() {
        this.group.removeFromParent();
        Object.values(this.#layers).forEach((layer) => layer.dispose());
        this.#textures.forEach((texture) => texture.dispose());
    }
}

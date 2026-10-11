/** Seeded noise and random helpers shared by the arena relief and the Synty floor mask. */

export const clamp01 = (value) => Math.min(1, Math.max(0, value));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (edge0, edge1, value) => {
    const t = clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};

export function hash2(ix, iy, seed) {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise in 0..1. */
export function valueNoise(x, y, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    return mix(mix(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), u), mix(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), u), v);
}

/** Fractal noise in roughly 0..1: `octaves` layers of doubling frequency. */
export function fbm(x, y, octaves, seed = 1337) {
    let sum = 0;
    let amplitude = 0.5;
    let total = 0;
    for (let i = 0; i < octaves; i += 1) {
        sum += valueNoise(x, y, seed + i * 17) * amplitude;
        total += amplitude;
        x *= 2.03;
        y *= 2.03;
        amplitude *= 0.5;
    }
    return sum / total;
}

/** Deterministic random stream for scattered debris. */
export function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

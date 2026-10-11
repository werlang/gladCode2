import { STAND_PROFILE, STANDS } from './synty-coliseum.js';
import { createRandom, fbm, smooth } from './noise.js';

/**
 * The countryside around the coliseum, as pure layout (see `synty-landscape.js` for the meshes): a paved plaza
 * round the building, two roads leaving it (east-west through the gates, north-south past the honour box) lined
 * with cypresses, farmland and farmsteads on the plain, wooded hills rising toward the horizon, a Roman hill town with
 * its temple to the north (assembled from Ancient Empire modular pieces) and painted mountain ranges (POLYGON Mini
 * Fantasy) closing the horizon. Distances are metres at the scale of
 * the arena's people (about half Synty's native human size), so Synty props are placed at roughly half scale.
 */

/** Seed of the countryside: the same hills, roads and town on every replay. */
export const LANDSCAPE_SEED = 2718;
/** Outer edge of the terrain (inside the sky dome). */
export const LAND_RADIUS = 880;
/** Outer face of the coliseum, as a distance from its core square (see `footprintDistance`). */
export const FOOTPRINT = STAND_PROFILE.walkway[1];
/** Edge of the paved plaza round the coliseum, on the same measure. */
export const PLAZA = FOOTPRINT + 9;
/** Half the width of a road's paving. */
export const ROAD_HALF = 1.7;
/** Scale that brings Synty's native props to the size of the arena's people. */
export const PROP_SCALE = 0.55;

/** Hill town on the northern heights, its temple at the top. */
export const TOWN = Object.freeze({ x: 70, z: -390, radius: 62 });
/** Scale of the temple on the town's crown (houses use `PROP_SCALE`): a monument a size above the houses. */
export const TEMPLE_SCALE = 0.75;
/** Distance of the mountain backdrops that close the horizon (inside the sky, in the haze). */
export const MOUNTAINS = 760;

/**
 * Distance from the coliseum's core square (its straight sides span ±STANDS): the stands' outer face is at
 * `FOOTPRINT`, the plaza ends at `PLAZA`. Rounded at the corners like the building.
 *
 * @param {number} x World X.
 * @param {number} z World Z.
 * @returns {number} Distance in metres (negative inside the core square).
 */
export function footprintDistance(x, z) {
    const qx = Math.abs(x) - STANDS;
    const qz = Math.abs(z) - STANDS;
    return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
}

/**
 * Sideways offset of a road from its axis at `along` metres from the centre: straight across the plain, then
 * winding gently through the hills.
 *
 * @param {number} along Distance along the road's axis (signed).
 * @param {number} phase Per-road phase, so the two roads wind differently.
 * @returns {number} Offset in metres.
 */
export function roadOffset(along, phase = 0) {
    const out = Math.abs(along) - 110;
    return out > 0 ? 9 * Math.sin(out / 65 + phase) * smooth(0, 60, out) : 0;
}

/** Phase of the north-south road's winding (the east-west road uses 0). */
export const NORTH_ROAD_PHASE = 1.3;

/**
 * Distance to the nearest road's centreline, outside the plaza (inside it the paving is the plaza's).
 *
 * @param {number} x World X.
 * @param {number} z World Z.
 * @returns {number} Metres.
 */
export function roadDistance(x, z) {
    const eastWest = Math.abs(z - roadOffset(x));
    const northSouth = Math.abs(x - roadOffset(z, NORTH_ROAD_PHASE));
    return Math.min(eastWest, northSouth);
}

/**
 * Ground height of the countryside: level round the coliseum, gently rolling on the plain, rising into hills
 * toward the horizon. The arena and the plaza sit at 0.
 *
 * @param {number} x World X.
 * @param {number} z World Z.
 * @returns {number} Height in metres.
 */
export function landHeight(x, z) {
    const r = Math.hypot(x, z);
    const rolling = smooth(60, 150, r) * (fbm(x * 0.018, z * 0.018, 3, LANDSCAPE_SEED) - 0.5) * 5;
    const hills = smooth(160, 470, r) * (12 + 85 * fbm(x * 0.0055 + 7, z * 0.0055 - 3, 4, LANDSCAPE_SEED + 1));
    // The roads keep to the valleys a little: hills are lowered along them.
    const cut = 0.55 + 0.45 * smooth(6, 40, roadDistance(x, z));
    // The town's hill is raised into a crown.
    const town = 26 * Math.exp(-((x - TOWN.x) ** 2 + (z - TOWN.z) ** 2) / (2 * 75 ** 2));
    return rolling + hills * cut + town;
}

/** Ancient Empire building grid: a wall panel is one cell wide and one storey tall (native metres). */
const CELL = 2.5;
const STOREY = 3;
/** Stucco tints of the town's houses: white, cream, ochre, pink and pale orange plaster. */
export const STUCCO_TINTS = Object.freeze([0xffffff, 0xf6ead4, 0xf0d6a4, 0xf2cfc0, 0xf4d2a8]);

/**
 * The Ancient Empire pieces of a Roman house, in its own frame (native metres, front facing +Z, centred on the
 * origin): stucco walls a cell wide round a `cells` footprint, a door in the front, windows elsewhere, a course of
 * wall below ground so a slope never shows under it, and terracotta gable tiles with their ridges along X.
 *
 * @param {{ cells: [number, number], storeys: number }} house Footprint in cells (along X, along Z) and storeys.
 * @param {() => number} random Random source (door place, window mix).
 * @returns {Array<{ name: string, x: number, y: number, z: number, ry: number }>} Pieces, pivots as authored.
 */
export function housePieces({ cells: [n, m], storeys }, random) {
    const pieces = [];
    const width = n * CELL;
    const depth = m * CELL;
    const door = Math.floor(random() * n);
    const panel = (storey, front, index) => {
        if (storey < 0) return 'wall';
        if (front && storey === 0 && index === door) return 'wallDoor';
        return random() < 0.55 ? 'wallWindow' : 'wall';
    };
    for (let storey = -1; storey < storeys; storey += 1) {
        const y = storey * STOREY;
        for (let i = 0; i < n; i += 1) {
            pieces.push({ name: panel(storey, true, i), x: -width / 2 + CELL * i, y, z: depth / 2, ry: 0 });
            pieces.push({ name: panel(storey, false, i), x: -width / 2 + CELL * (i + 1), y, z: -depth / 2, ry: Math.PI });
        }
        for (let j = 0; j < m; j += 1) {
            pieces.push({ name: panel(storey, false, j), x: -width / 2, y, z: depth / 2 - CELL * j, ry: Math.PI / 2 });
            pieces.push({ name: panel(storey, false, j), x: width / 2, y, z: depth / 2 - CELL * (j + 1), ry: -Math.PI / 2 });
        }
    }
    // A gable tile per cell, turned so its ridge runs along X (as authored it covers +X / -Z from its pivot).
    for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < m; j += 1) pieces.push({ name: 'roofTile', x: -width / 2 + CELL * (i + 1), y: storeys * STOREY, z: depth / 2 - CELL * j, ry: Math.PI / 2 });
    }
    return pieces;
}

/**
 * A temple in its own frame (native metres, entrance toward +X): a marble podium, a peristyle of tall columns, a
 * walled cella inside it, a marble entablature on the columns and a tiled gable roof whose stucco ends read as
 * pediments. `scaled` pieces carry their own size factors (`sx`, `sy`, `sz`) and are centred on their bounds.
 *
 * @returns {Array<{ name: string, x: number, y: number, z: number, ry: number, sx?: number, sy?: number, sz?: number }>} Pieces.
 */
export function templePieces() {
    const length = 15;
    const width = 7.5;
    const podium = 1.5;
    const column = 6;
    const pieces = [{ name: 'slab', x: 0, y: 0, z: 0, ry: 0, sx: (length + 1.5) / 5, sy: podium / 0.4, sz: (width + 1.5) / 0.9 }];
    for (let i = 0; i < 7; i += 1) {
        for (const z of [-width / 2 + 0.4, width / 2 - 0.4]) pieces.push({ name: 'templeColumn', x: -length / 2 + 0.4 + (i * (length - 0.8)) / 6, y: podium, z, ry: 0 });
    }
    for (let k = 1; k < 3; k += 1) {
        for (const x of [-length / 2 + 0.4, length / 2 - 0.4]) pieces.push({ name: 'templeColumn', x, y: podium, z: -width / 2 + 0.4 + (k * (width - 0.8)) / 3, ry: 0 });
    }
    // Cella: brick walls inside the colonnade, open toward the entrance.
    for (const x of [-5, 0]) {
        pieces.push({ name: 'cellaWall', x, y: podium, z: 2.2, ry: 0 });
        pieces.push({ name: 'cellaWall', x: x + 5, y: podium, z: -2.2, ry: Math.PI });
    }
    pieces.push({ name: 'cellaWall', x: -5, y: podium, z: -2.2, ry: -Math.PI / 2, sx: 4.4 / 5 });
    // Entablature round the top of the columns, then the roof.
    const top = podium + column + 0.5;
    for (const x of [-length / 2, 0]) {
        pieces.push({ name: 'beam', x, y: top, z: width / 2 - 0.25, ry: 0 });
        pieces.push({ name: 'beam', x: x + length / 2, y: top, z: -width / 2 + 0.25, ry: Math.PI });
    }
    // Along the short sides: turned a quarter, a beam runs from its pivot toward -Z (left end) or +Z (right end).
    for (const x of [-length / 2 + 0.25, length / 2 - 0.25]) pieces.push({ name: 'beam', x, y: top, z: x < 0 ? width / 2 : -width / 2, ry: x < 0 ? Math.PI / 2 : -Math.PI / 2 });
    for (const x of [0, length / 2]) pieces.push({ name: 'roofTile', x, y: top + 0.5, z: width / 2, ry: Math.PI / 2, sx: 3, sy: 1.5, sz: 3 });
    return pieces;
}

/**
 * Lays out the countryside.
 *
 * @param {() => number} [random] Random source (seeded by default, so the land is the same on every replay).
 * @returns {{ props: Map<string, Array<{ x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number }>> }}
 *   Placements of the Synty pieces by name: trees, fields, props, buildings and the mountain backdrops.
 */
export function planLandscape(random = createRandom(LANDSCAPE_SEED)) {
    const props = new Map();
    const taken = [];
    const between = (a, b) => a + random() * (b - a);
    const free = (x, z, radius) => taken.every((c) => Math.hypot(c.x - x, c.z - z) > c.radius + radius);
    const clear = (x, z, radius) => footprintDistance(x, z) > PLAZA + radius + 1.5
        && roadDistance(x, z) > ROAD_HALF + radius + 1
        && Math.hypot(x, z) < LAND_RADIUS - 40
        && free(x, z, radius);
    const put = (name, x, z, scale, { ry = random() * Math.PI * 2, radius = 0, stretch = 1, sink = 0.05 } = {}) => {
        if (!props.has(name)) props.set(name, []);
        props.get(name).push({ x, y: landHeight(x, z) - sink, z, ry, sx: scale, sy: scale * stretch, sz: scale });
        if (radius) taken.push({ x, z, radius });
    };

    // Cypress avenues: both roads lined on both sides, out across the plain.
    for (const [axis, phase] of [['x', 0], ['z', NORTH_ROAD_PHASE]]) {
        for (const sign of [-1, 1]) {
            for (let along = STANDS + PLAZA + 3; along < 260; along += between(6.5, 8.5)) {
                for (const side of [-1, 1]) {
                    const t = sign * along;
                    const offset = roadOffset(t, phase) + side * (ROAD_HALF + 2.6);
                    const [x, z] = axis === 'x' ? [t, offset] : [offset, t];
                    put(random() < 0.5 ? 'cypress1' : 'cypress2', x, z, PROP_SCALE * between(1.05, 1.3), { radius: 1 });
                }
            }
        }
    }
    // A ring of cypresses round the plaza, broken where the roads leave it.
    for (let angle = 0; angle < Math.PI * 2; angle += 0.07) {
        const reach = PLAZA + 3 + STANDS;
        const x = Math.cos(angle) * reach * 1.05;
        const z = Math.sin(angle) * reach * 1.05;
        if (roadDistance(x, z) < ROAD_HALF + 4 || footprintDistance(x, z) < PLAZA + 1.5) continue;
        put(random() < 0.5 ? 'cypress1' : 'cypress2', x, z, PROP_SCALE * between(1.1, 1.35), { radius: 1.2 });
    }

    // Ancient Empire buildings, placed by their own frame: the pieces turn and scale with the building, and stand
    // on the lowest ground under its footprint (the wall course below ground hides the slope).
    const build = (pieces, at, scale, radius, tint = 0xffffff) => {
        const cos = Math.cos(at.ry);
        const sin = Math.sin(at.ry);
        let base = Infinity;
        for (const [u, v] of [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius], [0, 0]]) base = Math.min(base, landHeight(at.x + u * 0.7, at.z + v * 0.7));
        for (const piece of pieces) {
            if (!props.has(piece.name)) props.set(piece.name, []);
            const s = scale;
            props.get(piece.name).push({
                x: at.x + (piece.x * cos + piece.z * sin) * s,
                y: base + piece.y * s,
                z: at.z + (-piece.x * sin + piece.z * cos) * s,
                ry: at.ry + piece.ry,
                sx: s * (piece.sx ?? 1), sy: s * (piece.sy ?? 1), sz: s * (piece.sz ?? 1),
                color: piece.name.startsWith('roof') || piece.name === 'slab' || piece.name === 'templeColumn' || piece.name === 'beam' ? 0xffffff : tint,
            });
        }
        taken.push({ x: at.x, z: at.z, radius });
    };
    const house = (x, z, ry, cells, storeys) => {
        const radius = (Math.hypot(cells[0], cells[1]) * 2.5 * PROP_SCALE) / 2 + 0.6;
        if (!clear(x, z, radius)) return false;
        build(housePieces({ cells, storeys }, random), { x, z, ry }, PROP_SCALE, radius, STUCCO_TINTS[Math.floor(random() * STUCCO_TINTS.length)]);
        return true;
    };

    // The hill town: Roman houses packed round the crown on streets turned to the slope, the temple on top.
    const grid = 0.35;
    const crown = { x: TOWN.x + 6, z: TOWN.z + 4, ry: grid };
    build(templePieces(), crown, TEMPLE_SCALE, 8);
    for (let built = 0, attempt = 0; built < 70 && attempt < 1200; attempt += 1) {
        const angle = random() * Math.PI * 2;
        const reach = Math.sqrt(random()) * TOWN.radius;
        const cells = [2 + Math.floor(random() * 3), 1 + Math.floor(random() * 2)];
        if (house(TOWN.x + Math.cos(angle) * reach, TOWN.z + Math.sin(angle) * reach, grid + Math.floor(random() * 4) * (Math.PI / 2), cells, random() < 0.45 ? 2 : 1)) built += 1;
    }

    // Farmsteads among the fields: a long single-storey farmhouse with a cypress beside it.
    for (let made = 0, attempt = 0; made < 9 && attempt < 400; attempt += 1) {
        const angle = random() * Math.PI * 2;
        const reach = between(85, 300);
        const x = Math.cos(angle) * reach;
        const z = Math.sin(angle) * reach;
        const ry = random() * Math.PI * 2;
        if (!house(x, z, ry, [3 + Math.floor(random() * 2), 2], 1)) continue;
        put('cypress1', x - Math.cos(ry) * 5, z + Math.sin(ry) * 5, PROP_SCALE * 1.2, { radius: 1 });
        made += 1;
    }

    // Mountains close the horizon all round: the pack's painted ranges stood up as backdrops facing the arena.
    for (let angle = 0; angle < Math.PI * 2; angle += between(0.12, 0.2)) {
        const reach = MOUNTAINS + between(-30, 30);
        const x = Math.cos(angle) * reach;
        const z = Math.sin(angle) * reach;
        // A backdrop's face is its XY plane: turned so it faces the centre. Kept low (about 80 m), so the ranges stay
        // in the haze along the horizon instead of rising grey into the blue.
        put(`mountain${1 + Math.floor(random() * 3)}`, x, z, between(13, 18), { ry: Math.atan2(-x, -z), stretch: between(0.3, 0.42), sink: 4 });
    }

    // Fields on the plain: straw ready for harvest and rows of crops, fenced along their edges.
    for (let made = 0, attempt = 0; made < 10 && attempt < 500; attempt += 1) {
        const angle = random() * Math.PI * 2;
        const reach = between(70, 260);
        const cx = Math.cos(angle) * reach;
        const cz = Math.sin(angle) * reach;
        const width = between(22, 38);
        const depth = between(16, 28);
        const radius = Math.hypot(width, depth) / 2;
        if (!clear(cx, cz, radius)) continue;
        taken.push({ x: cx, z: cz, radius });
        const ry = Math.round(random()) * (Math.PI / 2) + (random() - 0.5) * 0.3;
        const cos = Math.cos(ry);
        const sin = Math.sin(ry);
        const at = (u, v) => [cx + u * cos + v * sin, cz - u * sin + v * cos];
        const straw = random() < 0.5;
        if (straw) {
            const tile = 5.8 * PROP_SCALE * 1.4;
            for (let u = -width / 2 + tile / 2; u < width / 2; u += tile) {
                for (let v = -depth / 2 + tile / 2; v < depth / 2; v += tile) {
                    const [x, z] = at(u, v);
                    put(`straw${1 + Math.floor(random() * 2)}`, x, z, PROP_SCALE * 1.4, { ry: ry + Math.floor(random() * 4) * (Math.PI / 2), sink: 0.3 });
                }
            }
        }
        else {
            const row = 9.6 * PROP_SCALE * 1.2;
            for (let u = -width / 2 + 0.6; u < width / 2; u += 1.1) {
                for (let v = -depth / 2; v + row <= depth / 2 + 0.1; v += row) {
                    const [x, z] = at(u, v);
                    put('crops', x, z, PROP_SCALE * 1.2, { ry, sink: 0 });
                }
            }
        }
        if (made % 3 === 0) {
            const rail = 2.6 * PROP_SCALE * 1.1;
            for (const [u0, v0, du, dv, turn] of [[-width / 2, -depth / 2, 1, 0, 0], [-width / 2, depth / 2, 1, 0, 0], [-width / 2, -depth / 2, 0, 1, -Math.PI / 2], [width / 2, -depth / 2, 0, 1, -Math.PI / 2]]) {
                const length = du ? width : depth;
                for (let s = 0; s + rail <= length + 0.01; s += rail) {
                    const [x, z] = at(u0 + du * s, v0 + dv * s);
                    put('fence', x, z, PROP_SCALE * 1.1, { ry: ry + turn, sink: 0 });
                }
            }
        }
        made += 1;
    }

    // Woods: clumps on the hills, scattered trees and bushes on the plain, thinning toward the town and the roads.
    const broadleaf = ['tree1', 'tree2', 'tree3', 'tree4'];
    const lightTrees = ['tree2', 'tree3', 'tree4', 'cypress1'];
    // Two passes, so the plain round the coliseum gets its share and the wide far ring does not take every tree.
    for (const [near, far, attempts] of [[60, 260, 1700], [260, LAND_RADIUS - 60, 800]]) for (let attempt = 0; attempt < attempts; attempt += 1) {
        const angle = random() * Math.PI * 2;
        // Even over the ring's area, not bunched at its inner edge.
        const reach = Math.sqrt(between(near * near, far * far));
        const x = Math.cos(angle) * reach;
        const z = Math.sin(angle) * reach;
        // Woods grow in patches: a noise field decides where, and the hills are more wooded than the plain.
        const wood = fbm(x * 0.012 + 40, z * 0.012 - 20, 3, LANDSCAPE_SEED + 5) + smooth(150, 400, reach) * 0.25;
        if (random() > smooth(0.42, 0.75, wood)) continue;
        if (Math.hypot(x - TOWN.x, z - TOWN.z) < TOWN.radius + 10) continue;
        const roll = random();
        // Far off only the light trees grow (a tree there is a few pixels; the clumps would cost thousands of triangles).
        if (reach > 260) {
            if (clear(x, z, 3)) put(lightTrees[Math.floor(random() * lightTrees.length)], x, z, PROP_SCALE * between(1.1, 1.5), { radius: 3, sink: 0.3 });
        }
        else if (reach > 170 && roll < 0.25) {
            if (clear(x, z, 6)) put(random() < 0.5 ? 'cluster1' : 'cluster2', x, z, PROP_SCALE * between(0.9, 1.2), { radius: 6, sink: 0.4 });
        }
        else if (roll < 0.8) {
            if (clear(x, z, 2.2)) put(broadleaf[Math.floor(random() * broadleaf.length)], x, z, PROP_SCALE * between(0.85, 1.15), { radius: 2.2, sink: 0.2 });
        }
        else if (roll < 0.88) {
            if (clear(x, z, 4)) put(random() < 0.5 ? 'treeLarge1' : 'treeLarge2', x, z, PROP_SCALE * between(0.8, 1), { radius: 4, sink: 0.3 });
        }
        else if (clear(x, z, 2.5)) put(random() < 0.5 ? 'bush1' : 'bush2', x, z, PROP_SCALE * between(0.5, 0.8), { radius: 2.5, sink: 0.4 });
    }

    // Carts on the roads near the plaza, a well on the plaza's edge.
    for (const [t, side, axis] of [[48, 1, 'x'], [-63, -1, 'x'], [-52, 1, 'z']]) {
        const offset = side * (ROAD_HALF - 0.6);
        const [x, z] = axis === 'x' ? [t, offset] : [offset, t];
        put('cart', x, z, PROP_SCALE * 1.1, { ry: axis === 'x' ? Math.PI / 2 + (random() - 0.5) * 0.3 : (random() - 0.5) * 0.3, sink: 0 });
    }
    put('well', STANDS + PLAZA * 0.72, STANDS + PLAZA * 0.72, PROP_SCALE * 1.1, { sink: 0 });

    return { props };
}

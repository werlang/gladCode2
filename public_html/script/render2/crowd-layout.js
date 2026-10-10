
import { GATE_SIDES, HONOUR_BOX, HONOUR_SIDE, LIFT, STAND_PROFILE, STANDS, STRIP, turn } from './synty-coliseum.js';

/** Spacing between two neighbours on a bench, in metres. */
export const SEAT_SPACING = 0.42;
/** Lowest tread a spectator uses: the first ones sit behind the podium wall and its cap. */
const FIRST_ROW = 2;
/** Most spectators at full density. */
export const MAX_SPECTATORS = 340;
/** Spectators a seed of a cluster of friends brings along the bench. */
const CLUSTER = [2, 7];

/**
 * What a spectator does while seated or on its feet, with how often it is picked. Seated spectators sit on the
 * front edge of their tread with their feet on the one below; standing ones stand on it.
 */
export const SEATED_MOTIONS = Object.freeze([['sit', 5], ['sitClap', 3], ['sitFist', 1.5], ['sitWave', 1.5]]);
export const STANDING_MOTIONS = Object.freeze([['stand', 2], ['standCheer', 2], ['standPump', 1.5], ['jumpCheer', 1]]);

/** Picks an entry of `[value, weight]` pairs. */
export function weighted(entries, random) {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = random() * total;
    for (const [value, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return value;
    }
    return entries[entries.length - 1][0];
}

/** Yaw (rotation about +Y) that turns a figure facing +Z toward `(dx, dz)`. */
const yawToward = (dx, dz) => Math.atan2(dx, dz);

/** World position of a point given in a seating piece's own frame (see synty-coliseum `turn`). */
function place(piece, lx, lz) {
    const cos = Math.cos(piece.ry ?? 0);
    const sin = Math.sin(piece.ry ?? 0);
    return { x: piece.x + lx * cos + lz * sin, z: piece.z - lx * sin + lz * cos };
}

/**
 * Every free seat of the stands: along the benches of the straight strips and around the 45° corner wedges,
 * each facing the arena. `row` 0 is the lowest tread used.
 *
 * @param {Map<string, { placements: Array<{ x: number, y?: number, z: number, ry?: number }> }>} plan Coliseum plan.
 * @returns {Array<{ x: number, y: number, z: number, yaw: number, row: number, side: number }>} Seats.
 */
export function seats(plan) {
    const out = [];
    const { first, depth, rise, treads } = STAND_PROFILE;
    // Seated on the front edge of the tread, so the feet rest on the one below.
    const edge = (row) => first + row * depth + 0.14;
    const upper = (name) => (plan.get(name)?.placements ?? []).filter((p) => (p.y ?? 0) >= LIFT - 1e-6);
    const sideOf = (x, z) => (Math.abs(z) >= Math.abs(x) ? (z < 0 ? 0 : 2) : (x > 0 ? 1 : 3));
    for (const strip of upper('seatsStraight')) {
        for (let row = FIRST_ROW; row < treads; row += 1) {
            // The strip's last 0.75 m is a staircase aisle; benches stop short of it.
            for (let lx = -SEAT_SPACING / 2; lx > -(STRIP - STAND_PROFILE.aisle); lx -= SEAT_SPACING) {
                const at = place(strip, lx, -edge(row));
                const facing = place({ ...strip, x: 0, z: 0 }, 0, 1);
                out.push({ ...at, y: LIFT + (row + 1) * rise, yaw: yawToward(facing.x, facing.z), row: row - FIRST_ROW, side: sideOf(at.x, at.z) });
            }
        }
    }
    for (const wedge of upper('seats')) {
        for (let row = FIRST_ROW; row < treads; row += 1) {
            const radius = edge(row);
            const step = SEAT_SPACING / radius;
            for (let angle = step / 2; angle < Math.PI / 4; angle += step) {
                const at = place(wedge, Math.sin(angle) * radius, -Math.cos(angle) * radius);
                out.push({ ...at, y: LIFT + (row + 1) * rise, yaw: yawToward(wedge.x - at.x, wedge.z - at.z), row: row - FIRST_ROW, side: sideOf(at.x, at.z) });
            }
        }
    }
    return out;
}

/**
 * A fresh crowd: spectators in clusters of friends, denser near the sand and on the honour side, each with a
 * seated and a standing motion; guards posted on the structure (gate tops, front tread, walkway corners), patrols on the front tread and the walkway,
 * and the editor of the games in the honour box with two guards.
 *
 * @param {Map<string, object>} plan Coliseum plan (see SyntyColiseum).
 * @param {() => number} random Random source in [0, 1).
 * @param {Array<{ x: number, y: number, z: number }>} [posts] Lookout points on the structure (gates, honour box).
 * @param {{ x: number, y: number, z: number, yaw: number }|null} [throne] Seat of the editor of the games.
 * @returns {{ spectators: object[], guards: object[], patrols: object[], notable: object }} Layout in world space.
 */
export function planCrowd(plan, random = Math.random, posts = [], throne = null) {
    const free = seats(plan);
    const rows = STAND_PROFILE.treads - FIRST_ROW;
    const taken = new Set();
    const key = (seat) => `${seat.x.toFixed(2)}|${seat.z.toFixed(2)}`;

    // The honour box: middle of the honour side, a few rows up.
    const box = turn(HONOUR_SIDE, { x: 0, z: -(STANDS + STAND_PROFILE.first + 4 * STAND_PROFILE.depth + 0.14) });
    // The honour box is kept for the editor of the games (the honour side is north, so its frame is the world's).
    const tread = (seat) => seat.row + FIRST_ROW;
    const nearBox = (seat) => seat.side === HONOUR_SIDE && Math.abs(seat.x) < HONOUR_BOX.half + 0.3 && tread(seat) >= HONOUR_BOX.rows[0] - 1 && tread(seat) <= HONOUR_BOX.rows[1] + 4;
    // The editor sits on the throne of the honour box, or failing that on the bench nearest its middle.
    const notable = throne ?? free.reduce((best, seat) => (!best || Math.hypot(seat.x - box.x, seat.z - box.z) < Math.hypot(best.x - box.x, best.z - box.z) ? seat : best), null);

    const spectators = [];
    const appeal = (seat) => (1 - 0.55 * (seat.row / rows)) * (seat.side === HONOUR_SIDE ? 1.25 : 1);
    let guard = 0;
    while (spectators.length < MAX_SPECTATORS && guard < MAX_SPECTATORS * 40) {
        guard += 1;
        const seed = free[Math.floor(random() * free.length)];
        if (taken.has(key(seed)) || nearBox(seed) || random() > appeal(seed)) continue;
        // A cluster: friends fill the neighbouring seats of the same bench, with the odd gap.
        const size = CLUSTER[0] + Math.floor(random() * (CLUSTER[1] - CLUSTER[0] + 1));
        const bench = free.filter((seat) => seat.row === seed.row && Math.hypot(seat.x - seed.x, seat.z - seed.z) < SEAT_SPACING * (size + 0.5));
        bench.sort((a, b) => Math.hypot(a.x - seed.x, a.z - seed.z) - Math.hypot(b.x - seed.x, b.z - seed.z));
        for (const seat of bench.slice(0, size)) {
            if (spectators.length >= MAX_SPECTATORS || taken.has(key(seat)) || nearBox(seat) || random() < 0.12) continue;
            taken.add(key(seat));
            spectators.push({
                ...seat,
                jitter: (random() - 0.5) * 0.08,
                seated: weighted(SEATED_MOTIONS, random),
                standing: weighted(STANDING_MOTIONS, random),
                // Some never sit down: the rowdy ones.
                upright: random() < 0.12,
                phase: random(),
                rate: 0.85 + random() * 0.3,
                type: random(),
                variant: random(),
            });
        }
    }
    // Shuffled, so a lower density keeps an even spread (the first `count` are drawn).
    for (let i = spectators.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [spectators[i], spectators[j]] = [spectators[j], spectators[i]];
    }

    // Guards hold the structure, never the sand: gate tops, the front tread overlooking the arena, the corners of
    // the walkway on the rim, and either side of the honour box.
    const guards = [];
    const facingArena = (p) => yawToward(-p.x, -p.z);
    const post = (at, y) => guards.push({ x: at.x, y, z: at.z, yaw: facingArena(at), type: random(), variant: random(), phase: random() });
    for (const lookout of posts) post(lookout, lookout.y);
    // Front tread: free (spectators start two rows up), just behind the podium wall.
    const front = -(STANDS + STAND_PROFILE.first + STAND_PROFILE.depth * 0.5);
    const frontY = LIFT + STAND_PROFILE.rise;
    for (let side = 0; side < 4; side += 1) {
        for (const x of [-7.5, 7.5]) if (random() < 0.7) post(turn(side, { x: x + (random() - 0.5) * 1.5, z: front }), frontY);
    }
    // Walkway corners: on the arc of the corner wedges, looking over the whole bowl.
    const walkwayRadius = (STAND_PROFILE.walkway[0] + STAND_PROFILE.walkway[1]) / 2;
    const walkwayY = LIFT + STAND_PROFILE.walkwayY;
    for (let side = 0; side < 4; side += 1) {
        if (random() < 0.8) post(turn(side, { x: STANDS + Math.sin(Math.PI / 4) * walkwayRadius, z: -STANDS - Math.cos(Math.PI / 4) * walkwayRadius }), walkwayY);
    }
    if (notable && !throne) {
        for (const sign of [-1, 1]) {
            const at = place({ x: notable.x, z: notable.z, ry: notable.yaw }, sign * SEAT_SPACING * 2, 0);
            guards.push({ x: at.x, y: notable.y, z: at.z, yaw: notable.yaw, type: random(), variant: random(), phase: random() });
        }
    }

    // Patrols walk the front tread (a stretch beside a gate, or along a whole long side) and the rim walkway.
    const patrols = [];
    const walkway = -(STANDS + walkwayRadius);
    for (let side = 0; side < 4; side += 1) {
        if (random() > 0.6) continue;
        const gate = GATE_SIDES.includes(side);
        const sign = random() < 0.5 ? -1 : 1;
        const [from, to] = gate ? [sign * (STRIP + 0.6), sign * (STANDS - 0.5)] : [-(STANDS - 0.5), STANDS - 0.5];
        patrols.push({ a: turn(side, { x: from, z: front }), b: turn(side, { x: to, z: front }), y: frontY, progress: random(), type: random(), variant: random() });
    }
    for (const side of [0, 1, 2, 3].filter(() => random() < 0.5).slice(0, 2)) {
        patrols.push({ a: turn(side, { x: -(STANDS - 0.5), z: walkway }), b: turn(side, { x: STANDS - 0.5, z: walkway }), y: walkwayY, progress: random(), type: random(), variant: random() });
    }

    if (notable) taken.add(key(notable));
    return { spectators, guards, patrols, notable };
}

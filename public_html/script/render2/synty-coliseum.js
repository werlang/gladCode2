import { ARENA_SIZE } from './battle-state.js';

const HALF = ARENA_SIZE / 2;
const DEG = Math.PI / 180;

/** Width of one straight seating strip (`SM_Bld_Amphitheatre_End_01`). */
export const STRIP = 2.5;
/** Seats start this far from the pivot of a strip or wedge, and the promenade ends at RIM. */
const SEAT_INNER = 6.23;
const RIM = 21.6;
/**
 * Distance from the centre to the pivot line of the straight stands: a side holds 2 * STANDS / STRIP whole strips (7),
 * and the corner wedges pivot on (±STANDS, ±STANDS). As small as it goes while the corner arcs of the podium still
 * clear the corners of the combat square, so the wall stands 2.5 m from the curb.
 */
export const STANDS = 8.75;
/** Strips (and wall segments) a gate replaces in the middle of its side; the gate arch spans two of them. */
const GATE_STRIPS = 3;
const GATE_HALF = (GATE_STRIPS * STRIP) / 2;
/** Half-width of the sand floor: where the podium wall stands. */
export const PODIUM = STANDS + SEAT_INNER;
/** Height the seating is lifted onto the podium. */
export const LIFT = 2;
const WALL_HEIGHT = LIFT + 0.5;
/** Sides whose middle two strips give way to a monumental gate: east and west. */
export const GATE_SIDES = [1, 3];
/** Side holding the honour box (north). */
export const HONOUR_SIDE = 0;
/**
 * The honour box (pulvinar) in the middle of the honour side, in the north frame: half its width, and the treads
 * it spans (front and back row, counted like `STAND_PROFILE` treads). Spectators keep out of it.
 */
export const HONOUR_BOX = Object.freeze({ half: 2.7, rows: [2, 8] });
/** Share of the gate arch's height (`SM_Env_Wall_Archway_01`) that is open under its crown. */
const ARCH_OPENING = 0.7;

/**
 * Step profile of the seating (measured on `SM_Bld_Amphitheatre_End_01`; the 45° wedges share it radially):
 * tread `k` runs from `first + k * depth` to `first + (k + 1) * depth` away from the pivot, at `(k + 1) * rise`
 * above the seating's base; the walkway behind the last tread runs from `walkway[0]` to `walkway[1]` at `walkwayY`. Each
 * straight strip ends in a staircase aisle `aisle` wide on its -x side.
 */
export const STAND_PROFILE = Object.freeze({ first: 6.65, depth: 0.66, rise: 0.225, treads: 18, walkway: [20.1, 22.4], walkwayY: 4.55, aisle: 0.8 });

/**
 * Rotates a north-frame point onto side `side` (0 north at -z, 1 east, 2 south, 3 west).
 * Everything is laid out once for the north side and its north-east corner, then turned.
 *
 * @param {number} side Side index.
 * @param {{ x: number, z: number, ry?: number }} p Placement in the north frame.
 * @returns {{ x: number, z: number, ry: number }} Placement in the world.
 */
export function turn(side, p) {
    const angle = -side * 90 * DEG;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { ...p, x: p.x * cos + p.z * sin, z: -p.x * sin + p.z * cos, ry: (p.ry ?? 0) + angle };
}

/**
 * Point on the north-east corner arc at `angle` (0 = facing north, 90° = facing east) and
 * `radius` from the corner pivot, with the rotation that lays a piece's X axis along the arc.
 */
function onArc(angle, radius) {
    return { x: STANDS + Math.sin(angle) * radius, z: -STANDS - Math.cos(angle) * radius, ry: -angle };
}

/**
 * Coliseum built only from Synty Ancient Empire pieces: amphitheatre seating raised on a
 * podium wall all around a rounded-square bowl, two monumental gates cut through the east and
 * west stands, a ring of columns on the rim, and a stone curb marking the 25 m combat square.
 * Every piece is instanced, so the whole bowl is a few dozen draw calls.
 */
export class SyntyColiseum {
    /** @type {import('three').Group} */
    group;
    /** Flame anchors on top of the braziers, in world space. */
    flames = [];
    /** Lookout points on the structure (gate tops), in world space. */
    posts = [];
    /** Seat of the editor of the games on the throne of the honour box, in world space, facing the arena. */
    throne = null;

    /**
     * @param {typeof import('three')} THREE Three namespace.
     * @param {import('./synty-arena.js').SyntyArenaKit} kit Loaded pieces.
     */
    constructor(THREE, kit) {
        this.group = new THREE.Group();
        this.group.name = 'synty-coliseum';
        /** @type {Map<string, { placements: object[], center: boolean }>} */
        this.plan = new Map();
        this.kit = kit;
        this.#stands();
        this.#podium();
        this.#gates();
        this.#combatSquare();
        this.#decor();
        for (const [name, { placements, center }] of this.plan) this.group.add(kit.instances(name, placements, { center }));
    }

    /** Queues copies of `name` on every side in `sides`, turning north-frame placements. */
    #put(name, placements, { sides = [0, 1, 2, 3], center = true } = {}) {
        if (!this.plan.has(name)) this.plan.set(name, { placements: [], center });
        const list = this.plan.get(name).placements;
        for (const side of sides) placements.forEach((p) => list.push(turn(side, p)));
    }

    /** Straight strips along each side and two 45° wedges per corner, doubled underneath to close the podium hollow. */
    #stands() {
        const native = { center: false };
        for (let side = 0; side < 4; side += 1) {
            const strips = [];
            for (let i = 0; i < (STANDS * 2) / STRIP; i += 1) {
                const right = -STANDS + STRIP * (i + 1);
                // Over a gate the stands carry on; only the copy closing the hollow underneath gives way to the tunnel.
                const overGate = GATE_SIDES.includes(side) && Math.abs(right - STRIP / 2) < GATE_HALF;
                for (const y of overGate ? [LIFT] : [0, LIFT]) strips.push({ x: right, y, z: -STANDS });
            }
            this.#put('seatsStraight', strips, { ...native, sides: [side] });
        }
        const wedges = [];
        for (const y of [0, LIFT]) wedges.push({ x: STANDS, y, z: -STANDS }, { x: STANDS, y, z: -STANDS, ry: -45 * DEG });
        this.#put('seats', wedges, native);
    }

    /** Stucco podium wall in front of the first row, polygonal around the corners, capped in marble. */
    #podium() {
        const box = this.kit.box('wall');
        const depth = PODIUM - 0.14;
        const sy = WALL_HEIGHT / (box.max.y - box.min.y);
        const width = box.max.x - box.min.x;
        const capBox = this.kit.box('wallCap');
        const capWidth = capBox.max.x - capBox.min.x;
        for (let side = 0; side < 4; side += 1) {
            const walls = [];
            const caps = [];
            for (let i = 0; i < (STANDS * 2) / STRIP; i += 1) {
                const x = -STANDS + STRIP * (i + 0.5);
                // The gate arch takes the place of two wall segments and their cap.
                if (GATE_SIDES.includes(side) && Math.abs(x) < GATE_HALF) continue;
                walls.push({ x, z: -depth, sx: STRIP / width, sy });
                caps.push({ x, y: WALL_HEIGHT, z: -depth + 0.1, sx: STRIP / capWidth, sy: 0.6 });
            }
            this.#put('wall', walls, { sides: [side] });
            this.#put('wallCap', caps, { sides: [side] });
        }
        const segments = 5;
        const step = 90 / segments;
        const radius = SEAT_INNER - 0.14;
        const chord = 2 * radius * Math.sin((step / 2) * DEG);
        const walls = [];
        const caps = [];
        for (let i = 0; i < segments; i += 1) {
            const mid = onArc((i + 0.5) * step * DEG, radius * Math.cos((step / 2) * DEG));
            walls.push({ ...mid, sx: (chord + 0.05) / width, sy });
            const cap = onArc((i + 0.5) * step * DEG, (radius - 0.1) * Math.cos((step / 2) * DEG));
            caps.push({ ...cap, y: WALL_HEIGHT, sx: (chord + 0.25) / capWidth, sy: 0.6 });
        }
        this.#put('wall', walls);
        this.#put('wallCap', caps);
        // A golden brazier burns on the cap at the middle of each corner, clear of the stands and the sand.
        const capTop = WALL_HEIGHT + (capBox.max.y - capBox.min.y) * 0.6;
        const brazierScale = 0.8;
        const bowl = onArc(45 * DEG, (radius - 0.12) * Math.cos((step / 2) * DEG));
        this.#put('brazier', [{ ...bowl, y: capTop, sx: brazierScale, sy: brazierScale, sz: brazierScale }]);
        const brazierTop = capTop + (this.kit.box('brazier').max.y - this.kit.box('brazier').min.y) * brazierScale;
        for (let side = 0; side < 4; side += 1) {
            const { x, z } = turn(side, bowl);
            // A fire as wide as the bowl, rising from just below its rim.
            this.flames.push({ x, y: brazierTop - 0.08, z, size: 1.8 });
        }
    }

    /**
     * Gates in the east and west podium, as in a real amphitheatre: the stands run on over them and a passage
     * goes in underneath. A stone round arch fills the gap in the wall up to its cap, a closed portcullis stands
     * in it, a dark tunnel runs back under the seats, and wall torches burn either side; lions and weapon racks
     * keep their places on the sand.
     */
    #gates() {
        const sides = GATE_SIDES;
        const size = (name) => {
            const box = this.kit.box(name);
            return { x: box.max.x - box.min.x, y: box.max.y - box.min.y, z: box.max.z - box.min.z };
        };
        const span = STRIP * 2;
        const arch = size('gateArch');
        // Uniform scale: the arch keeps its proportions and rises a little above the wall, framing the gate.
        const archScale = (span + 0.3) / arch.x;
        const archTop = arch.y * archScale;
        this.#put('gateArch', [{ x: 0, z: -PODIUM + 0.05, sx: archScale, sy: archScale, sz: archScale }], { sides });
        // Narrow stretches of podium wall close the rest of the gap either side of the arch.
        const filler = GATE_HALF - span / 2;
        const wall = size('wall');
        const cap = size('wallCap');
        const fillers = [-1, 1].map((sign) => ({ x: sign * (span / 2 + filler / 2), z: -PODIUM + 0.14, sx: filler / wall.x, sy: WALL_HEIGHT / wall.y }));
        this.#put('wall', fillers, { sides });
        this.#put('wallCap', fillers.map((p) => ({ x: p.x, y: WALL_HEIGHT, z: p.z + 0.1, sx: filler / cap.x, sy: 0.6 })), { sides });
        const bars = size('portcullis');
        this.#put('portcullis', [{ x: 0, z: -PODIUM - 0.12, sx: (span * 0.72) / bars.x, sy: (archTop * 0.7) / bars.y }], { sides });
        const tunnel = size('tunnel');
        // A short, dark passage as tall as the arch: it reads as a tunnel through the bars and stays inside the
        // bulk of the arch and the stands.
        const length = 1.8;
        const opening = archTop * ARCH_OPENING;
        const back = -PODIUM + 0.05 - (arch.z * archScale) / 2;
        this.#put('tunnel', [{ x: 0, z: back + 0.02 - length / 2, sx: span / tunnel.x, sy: opening / tunnel.y, sz: length / tunnel.z }], { sides });
        const end = size('tunnelEnd');
        this.#put('tunnelEnd', [{ x: 0, z: back - length, sx: (span + 0.4) / end.x, sy: opening / end.y }], { sides });
        const torchY = WALL_HEIGHT * 0.55;
        // Sconces on the wall face either side of the arch: the back plate against the stone, the cup reaching out.
        const sconce = size('torch');
        const wallFace = -PODIUM + 0.14;
        const torches = [-1, 1].map((sign) => ({ x: sign * (span / 2 + 0.6), y: torchY, z: wallFace + sconce.z / 2 + 0.02 }));
        this.#put('torch', torches, { sides });
        const torchTop = torchY + sconce.y;
        for (const side of sides) {
            for (const torch of torches) {
                // The flame burns in the cup at the outer end of the sconce.
                const { x, z } = turn(side, { x: torch.x, z: wallFace + sconce.z - 0.12 });
                this.flames.push({ x, y: torchTop - 0.02, z, size: 0.55 });
            }
        }
        // Guards keep watch from the front tread right above each gate (`posts`, used by the crowd).
        const tread = { z: -(STANDS + STAND_PROFILE.first + STAND_PROFILE.depth * 0.5), y: LIFT + STAND_PROFILE.rise };
        for (const side of sides) for (const sign of [-1, 1]) this.posts.push({ ...turn(side, { x: sign * 1.3, z: tread.z }), y: tread.y, kind: 'gate' });
        const lions = [-1, 1].map((sign) => ({ x: sign * (GATE_HALF + 0.85), z: -PODIUM + 1.1, sx: 0.75, sy: 0.75, sz: 0.75 }));
        this.#put('lion', lions, { sides });
        this.#put('rack', [{ x: -6.6, z: -PODIUM + 0.55 }], { sides });
        this.#put('rackFull', [{ x: 6.6, z: -PODIUM + 0.55 }], { sides });
    }

    /** Low stone curb around the 25 m combat square. */
    #combatSquare() {
        const box = this.kit.box('curb');
        const length = box.max.x - box.min.x;
        const count = Math.round(ARENA_SIZE / length);
        const curbs = [];
        for (let i = 0; i < count; i += 1) curbs.push({ x: -HALF + (ARENA_SIZE / count) * (i + 0.5), z: -HALF - 0.16, sx: ARENA_SIZE / count / length });
        this.#put('curb', curbs);
    }

    /** Statues on plinths along the north and south podium, banners and drapery on it. */
    #decor() {
        const plinthTop = this.kit.box('plinth').max.y;
        const statueAt = [-6.75, -3.9, 3.9, 6.75];
        [0, 2].forEach((side, row) => statueAt.forEach((x, i) => {
            this.#put(`statue${2 + ((row * statueAt.length + i) % 6)}`, [{ x, y: plinthTop, z: -PODIUM + 0.75 }], { sides: [side] });
        }));
        this.#put('plinth', statueAt.map((x) => ({ x, z: -PODIUM + 0.75 })), { sides: [0, 2] });
        this.#put('banner', [{ x: 0, y: WALL_HEIGHT - 1.3, z: -PODIUM + 0.32 }], { sides: [0, 2] });
        const drapes = [-6.25, 6.25].map((x) => ({ x, y: WALL_HEIGHT - 0.55, z: -PODIUM + 0.32 }));
        this.#put('drapery', drapes, { sides: [0, 2] });
        this.#put('drapery', [-6.25, 6.25].map((x) => ({ x, y: WALL_HEIGHT - 0.55, z: -PODIUM + 0.32 })), { sides: GATE_SIDES });
        this.#honourBox();

        this.#portico();
    }

    /**
     * The imperial box (pulvinar), fit for the editor of the games: a marble stair climbs from the front row to a
     * raised dais laid over the treads, a red runner leads up to the throne between two banqueting couches, four
     * fluted columns carry a marble architrave crowned by a pediment, purple banners hang between the columns and
     * incense burns at the head of the stair. The throne and the guard posts are published for the crowd.
     */
    #honourBox() {
        const sides = [HONOUR_SIDE];
        const { half, rows } = HONOUR_BOX;
        const { first, depth, rise } = STAND_PROFILE;
        const size = (name) => {
            const box = this.kit.box(name);
            return { x: box.max.x - box.min.x, y: box.max.y - box.min.y, z: box.max.z - box.min.z };
        };
        // Front edge of a tread (toward the arena) and its top.
        const edge = (row) => -(STANDS + first + row * depth);
        const top = (row) => LIFT + (row + 1) * rise;
        const width = half * 2;
        // Stair from the front of the box to the dais; the dais floor is level with the back tread.
        const floorY = top(rows[1]) + 0.1;
        const stairFront = edge(rows[0]);
        const stairBack = edge(rows[0] + 3);
        const stairBase = top(rows[0] - 1);
        const steps = size('royalSteps');
        this.#put('royalSteps', [-1, 1].map((sign) => ({
            x: sign * (width / 4), y: stairBase, z: (stairFront + stairBack) / 2,
            sx: (width / 2) / steps.x, sy: (floorY - stairBase) / steps.y, sz: (stairFront - stairBack) / steps.z,
        })), { sides });
        // Dais: a marble slab from the head of the stair to the back of the box.
        const daisBack = edge(rows[1] + 1);
        const slab = size('wallCap');
        const slabThick = 0.8;
        this.#put('wallCap', [{ x: 0, y: floorY - slabThick, z: (stairBack + daisBack) / 2, sx: (width + 0.2) / slab.x, sy: slabThick / slab.y, sz: (stairBack - daisBack + 0.05) / slab.z }], { sides });
        // Runner across the dais to the throne.
        const throneZ = daisBack + 0.55;
        const rug = size('rug');
        this.#put('rug', [{ x: 0, y: floorY, z: (stairBack + throneZ) / 2, sx: 0.9 / rug.x, sz: (stairBack - throneZ) / rug.z, sy: 0.4 }], { sides });
        // Furniture at the scale of the crowd (its people stand about 0.9 m tall).
        const furniture = 0.55;
        this.#put('throne', [{ x: 0, y: floorY, z: throneZ, sx: furniture * 1.15, sy: furniture * 1.15, sz: furniture * 1.15 }], { sides });
        this.#put('kline', [-1, 1].map((sign) => ({ x: sign * (half - 0.9), y: floorY, z: throneZ + 0.25, ry: sign * 0.35, sx: furniture, sy: furniture, sz: furniture })), { sides });
        // Colonnade, architrave and pediment.
        const roofY = floorY + 2.3;
        const column = size('column');
        const thickness = 0.5 / column.x;
        const columnZ = [stairBack - 0.15, daisBack + 0.2];
        const columns = [];
        for (const sign of [-1, 1]) for (const z of columnZ) columns.push({ x: sign * (half - 0.2), y: floorY, z, sx: thickness, sz: thickness, sy: (roofY - floorY) / column.y });
        this.#put('column', columns, { sides });
        const beam = size('beam');
        const beams = [
            { x: 0, y: roofY, z: columnZ[0], sx: (width + 0.7) / beam.x, sy: 0.55, sz: 0.75 },
            { x: 0, y: roofY, z: columnZ[1], sx: (width + 0.7) / beam.x, sy: 0.55, sz: 0.75 },
        ];
        for (const sign of [-1, 1]) beams.push({ x: sign * (half - 0.2), y: roofY, z: (columnZ[0] + columnZ[1]) / 2, ry: Math.PI / 2, sx: (columnZ[0] - columnZ[1] + 0.7) / beam.x, sy: 0.55, sz: 0.75 });
        this.#put('beam', beams, { sides });
        const beamTop = roofY + beam.y * 0.55;
        const roof = size('boxRoof');
        this.#put('boxRoof', [{ x: 0, y: beamTop - 0.05, z: (columnZ[0] + columnZ[1]) / 2, sx: (width + 0.6) / roof.x, sz: (columnZ[0] - columnZ[1] + 0.6) / roof.z }], { sides });
        const gable = size('pediment');
        this.#put('pediment', [{ x: 0, y: beamTop, z: columnZ[0], ry: Math.PI / 2, sz: (width + 0.7) / gable.z, sy: 0.85, sx: 1.2 }], { sides });
        // A back wall closes the box behind the throne, up to the architrave.
        const back = size('wall');
        this.#put('wall', [{ x: 0, y: floorY, z: columnZ[1] - 0.15, sx: (width - 0.2) / back.x, sy: (roofY - floorY) / back.y }], { sides });
        // Purple banners hanging from the architrave between the columns, incense at the head of the stair.
        const banner = size('royalBanner');
        this.#put('royalBanner', [-1, 1].map((sign) => ({ x: sign * (half - 0.75), y: roofY - banner.y * 0.75, z: columnZ[0] + 0.12, sx: 0.75, sy: 0.75, sz: 0.75 })), { sides });
        const censerScale = 0.5;
        const censers = [-1, 1].map((sign) => ({ x: sign * (half - 0.75), y: floorY, z: stairBack - 0.35, sx: censerScale, sy: censerScale, sz: censerScale }));
        this.#put('censer', censers, { sides });
        const censerTop = floorY + size('censer').y * censerScale;
        for (const censer of censers) {
            const { x, z } = turn(HONOUR_SIDE, censer);
            this.flames.push({ x, y: censerTop - 0.04, z, size: 0.16 });
        }
        // Where the editor sits and where his guard stands (used by the crowd).
        const seat = turn(HONOUR_SIDE, { x: 0, z: throneZ + 0.05 });
        this.throne = { x: seat.x, y: floorY + 0.25 * furniture * 1.15, z: seat.z, yaw: seat.ry ?? 0 };
        for (const sign of [-1, 1]) this.posts.push({ ...turn(HONOUR_SIDE, { x: sign * (half - 0.75), z: stairBack - 0.9 }), y: floorY, kind: 'royal' });
    }

    /** Colonnade crowning the top of the stands, a marble beam laid from column to column all the way round. */
    #portico() {
        const columnBox = this.kit.box('column');
        const height = 6;
        const scale = height / (columnBox.max.y - columnBox.min.y);
        const rimY = LIFT + this.kit.box('seats').max.y;
        const ring = [];
        for (let side = 0; side < 4; side += 1) {
            for (const x of [-7.5, -2.5, 2.5, 7.5]) ring.push(turn(side, { x, z: -STANDS - RIM }));
            for (let angle = 0; angle < 90; angle += 15) ring.push(turn(side, onArc(angle * DEG, RIM)));
        }
        this.#put('column', ring.map(({ x, z }) => ({ x, y: rimY, z, sx: scale, sy: scale, sz: scale })), { sides: [0] });
        const beamBox = this.kit.box('beam');
        const beamLength = beamBox.max.x - beamBox.min.x;
        const beams = ring.map((from, index) => {
            const to = ring[(index + 1) % ring.length];
            const dx = to.x - from.x;
            const dz = to.z - from.z;
            return { x: (from.x + to.x) / 2, y: rimY + height, z: (from.z + to.z) / 2, ry: -Math.atan2(dz, dx), sx: (Math.hypot(dx, dz) + 0.9) / beamLength };
        });
        this.#put('beam', beams, { sides: [0] });
    }
}

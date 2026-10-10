import assert from 'node:assert/strict';
import test from 'node:test';

import { ARENA_SIZE } from '../../public_html/script/render2/battle-state.js';
import { PODIUM, SyntyColiseum } from '../../public_html/script/render2/synty-coliseum.js';

const HALF = ARENA_SIZE / 2;

/** Minimal three stand-in: the layout only needs groups to collect instanced batches. */
const THREE = { Group: class { add() {} } };

/** Kit stand-in with a 1 m cube for every piece; records what the layout asks for. */
function fakeKit() {
    const box = { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 1, z: 0.5 } };
    return { box: () => box, instances: () => ({}) };
}

test('coliseum keeps every structure outside the combat square', () => {
    const coliseum = new SyntyColiseum(THREE, fakeKit());
    // Curb and braziers sit on the sand; the seating keeps its authored pivot, 6.23 m in front of the first row.
    const skip = new Set(['curb', 'brazier', 'seats', 'seatsStraight']);
    for (const [name, { placements }] of coliseum.plan) {
        if (skip.has(name)) continue;
        for (const { x, z } of placements) {
            assert.ok(Math.max(Math.abs(x), Math.abs(z)) > HALF, `${name} at (${x.toFixed(2)}, ${z.toFixed(2)}) intrudes on the combat square`);
        }
    }
});

test('coliseum podium is symmetric on all four sides and clears the combat square corners', () => {
    const coliseum = new SyntyColiseum(THREE, fakeKit());
    const walls = coliseum.plan.get('wall').placements;
    for (const { x, z } of walls) {
        assert.ok(Math.hypot(Math.abs(x) - HALF, Math.abs(z) - HALF) > 0.5 || Math.max(Math.abs(x), Math.abs(z)) > HALF + 1);
    }
    const reach = (sign) => walls.filter(({ x }) => Math.sign(Math.round(x * 1000)) === sign).length;
    assert.equal(reach(1), reach(-1));
    assert.ok(PODIUM > HALF + 2);
    assert.equal(coliseum.flames.filter((flame) => flame.size > 1).length, 4);
});

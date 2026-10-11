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
    // The curb sits on the sand; the seating keeps its authored pivot, 6.23 m in front of the first row.
    const skip = new Set(['curb', 'seats', 'seatsStraight']);
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
    assert.equal(coliseum.flames.filter((flame) => flame.size > 1).length, 8);
});

test('braziers stand on the sand in the corner bends, clear of the combat square and the wall', () => {
    const coliseum = new SyntyColiseum(THREE, fakeKit());
    const braziers = coliseum.plan.get('brazier').placements;
    assert.equal(braziers.length, 8);
    for (const { x, y = 0, z } of braziers) {
        assert.equal(y, 0);
        // At least 0.8 m outside the square, so a fighter at the curb never brushes one.
        assert.ok(Math.max(Math.abs(x), Math.abs(z)) > HALF + 0.8, `brazier at (${x.toFixed(2)}, ${z.toFixed(2)})`);
        // Inside the bowl: closer to the corner pivot than the curved wall, which runs 6.09 m from it.
        const pivot = Math.hypot(Math.abs(x) - 8.75, Math.abs(z) - 8.75);
        assert.ok(pivot < 6.09 - 0.8, `brazier at (${x.toFixed(2)}, ${z.toFixed(2)}) is against the wall`);
    }
});

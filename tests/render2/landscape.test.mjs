import assert from 'node:assert/strict';
import test from 'node:test';

import {
    FOOTPRINT, LAND_RADIUS, PLAZA, ROAD_HALF, footprintDistance, housePieces, landHeight, planLandscape, roadDistance,
} from '../../public_html/script/render2/landscape-layout.js';

const plan = planLandscape();
const vegetation = [...plan.props].filter(([name]) => /^(cypress|tree|cluster|bush)/.test(name)).flatMap(([, placements]) => placements);

test('the countryside is the same on every replay', () => {
    const again = planLandscape();
    assert.deepEqual([...again.props.keys()], [...plan.props.keys()]);
    assert.deepEqual(again.props.get('wall'), plan.props.get('wall'));
});

test('the plaza round the coliseum is level and nothing grows on it or on the roads', () => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
        for (let r = FOOTPRINT; r < PLAZA + 8; r += 2) {
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            if (footprintDistance(x, z) < PLAZA) assert.ok(Math.abs(landHeight(x, z)) < 0.01);
        }
    }
    assert.ok(vegetation.length > 300);
    for (const { x, z } of vegetation) {
        assert.ok(footprintDistance(x, z) > PLAZA, `tree on the plaza at (${x.toFixed(1)}, ${z.toFixed(1)})`);
        assert.ok(roadDistance(x, z) > ROAD_HALF + 0.5, `tree on a road at (${x.toFixed(1)}, ${z.toFixed(1)})`);
        assert.ok(Math.hypot(x, z) < LAND_RADIUS);
    }
});

test('every house is closed by walls on all sides, with one door and a roof tile per cell', () => {
    for (const [cells, storeys] of [[[2, 1], 1], [[4, 2], 2]]) {
        const pieces = housePieces({ cells, storeys }, () => 0.3);
        const walls = pieces.filter((p) => p.name.startsWith('wall'));
        // Every storey plus the course below ground, all round the footprint.
        assert.equal(walls.length, 2 * (cells[0] + cells[1]) * (storeys + 1));
        assert.equal(pieces.filter((p) => p.name === 'wallDoor').length, 1);
        assert.equal(pieces.filter((p) => p.name === 'roofTile').length, cells[0] * cells[1]);
    }
});

test('buildings keep off the roads and the plaza', () => {
    const doors = plan.props.get('wallDoor');
    assert.ok(doors.length > 40);
    for (const { x, z } of doors) {
        assert.ok(roadDistance(x, z) > ROAD_HALF, `door on a road at (${x.toFixed(1)}, ${z.toFixed(1)})`);
        assert.ok(footprintDistance(x, z) > PLAZA);
    }
    assert.equal(plan.props.get('slab').length, 1, 'one temple');
});

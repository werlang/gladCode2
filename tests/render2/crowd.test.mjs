import assert from 'node:assert/strict';
import test from 'node:test';

import { createRandom } from '../../public_html/script/render2/noise.js';
import { MAX_SPECTATORS, planCrowd, seats } from '../../public_html/script/render2/crowd-layout.js';
import { PODIUM, SyntyColiseum } from '../../public_html/script/render2/synty-coliseum.js';

const THREE = { Group: class { add() {} } };
const box = { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 1, z: 0.5 } };
const plan = new SyntyColiseum(THREE, { box: () => box, instances: () => ({}) }).plan;

test('every seat is in the stands, behind the podium wall, facing the sand', () => {
    const all = seats(plan);
    assert.ok(all.length > MAX_SPECTATORS);
    for (const seat of all) {
        assert.ok(Math.max(Math.abs(seat.x), Math.abs(seat.z)) > PODIUM - 0.2 || Math.hypot(seat.x, seat.z) > PODIUM, `seat at ${seat.x}, ${seat.z}`);
        // Facing the centre: the yaw points roughly back toward the origin.
        const facing = { x: Math.sin(seat.yaw), z: Math.cos(seat.yaw) };
        assert.ok(facing.x * -seat.x + facing.z * -seat.z > 0);
    }
});

test('each crowd is a fresh arrangement with no two spectators on one seat', () => {
    const a = planCrowd(plan, createRandom(1));
    const b = planCrowd(plan, createRandom(2));
    const key = (s) => `${s.x.toFixed(2)}|${s.z.toFixed(2)}`;
    assert.equal(new Set(a.spectators.map(key)).size, a.spectators.length);
    assert.ok(a.spectators.length > MAX_SPECTATORS * 0.8);
    const overlap = a.spectators.filter((s) => new Set(b.spectators.map(key)).has(key(s))).length;
    assert.ok(overlap < a.spectators.length * 0.6, 'two crowds sit differently');
    assert.ok(a.guards.length >= 6 && a.patrols.length >= 1 && a.notable);
});

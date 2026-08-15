import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ACTIONS,
    ARENA_SIZE,
    deriveStepEvents,
    expandSimulation,
    getPlaybackIntervalMs,
    headingToRadians,
    isOutsideSafeZone,
    toArenaPosition,
} from '../../public_html/script/render2/battle-state.js';

const EMPTY_BUFFS = {
    burn: { value: 0, timeleft: 0 },
    movement: { value: 0, timeleft: 0 },
    resist: { value: 0, timeleft: 0 },
    invisible: { value: 0, timeleft: 0 },
    stun: { value: 0, timeleft: 0 },
};

function createSimulationPatchFixture() {
    return [
        {
            simtime: 0.1,
            glads: [
                {
                    id: 0,
                    name: 'Ada#Lovelace',
                    user: 'Equipe#Azul',
                    x: 2.5,
                    y: 12.5,
                    head: 90,
                    hp: 100,
                    maxhp: 100,
                    ap: 50,
                    maxap: 50,
                    lvl: 1,
                    xp: 0,
                    action: ACTIONS.none,
                    code: '',
                    message: '',
                    buffs: structuredClone(EMPTY_BUFFS),
                },
                {
                    id: 1,
                    name: 'Grace',
                    user: 'Equipe Vermelha',
                    x: 22.5,
                    y: 12.5,
                    head: 270,
                    hp: 120,
                    maxhp: 120,
                    ap: 40,
                    maxap: 40,
                    lvl: 1,
                    xp: 0,
                    action: ACTIONS.none,
                    code: '',
                    message: '',
                    buffs: structuredClone(EMPTY_BUFFS),
                },
            ],
            projectiles: [],
            poison: 17.68,
        },
        {
            simtime: 0.2,
            glads: [
                { x: 2.75, action: ACTIONS.movement, code: 'stepForward()' },
                { head: 260 },
            ],
            projectiles: [
                { id: 7, owner: 0, type: 0, x: 3.1, y: 12.5, head: 90 },
            ],
        },
        {
            simtime: 0.3,
            glads: [
                { hp: 88, buffs: { burn: { value: 2, timeleft: 1.4 } } },
                { lvl: 2, xp: 2 },
            ],
            projectiles: [],
            poison: 12,
        },
    ];
}

test('keeps every numeric action id emitted by the C engine', () => {
    assert.deepEqual(Object.values(ACTIONS), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test('expands incremental simlog patches without mutating the source log', () => {
    const simulation = createSimulationPatchFixture();
    const sourceSnapshot = structuredClone(simulation);
    const steps = expandSimulation(simulation);

    assert.deepEqual(simulation, sourceSnapshot);
    assert.equal(steps.length, 3);
    assert.equal(steps[0].glads[0].name, 'Ada Lovelace');
    assert.equal(steps[0].glads[0].user, 'Equipe Azul');
    assert.equal(steps[1].glads[0].y, 12.5);
    assert.equal(steps[1].glads[1].hp, 120);
    assert.equal(steps[2].glads[0].buffs.burn.timeleft, 1.4);
    assert.equal(steps[2].glads[0].buffs.stun.timeleft, 0);
    assert.deepEqual(steps[2].projectiles, []);
    assert.equal(steps[1].poison, 17.68);
});

test('treats an empty gladiator array as the engine no-op marker for a dead fighter', () => {
    const simulation = createSimulationPatchFixture();
    simulation.push({
        simtime: 0.4,
        glads: [[], { hp: 0 }],
        projectiles: [],
    });

    const steps = expandSimulation(simulation);
    assert.equal(steps[3].glads[0].name, 'Ada Lovelace');
    assert.equal(steps[3].glads[0].buffs.burn.timeleft, 1.4);
    assert.equal(steps[3].glads[0].hp, 88);
    assert.equal(steps[3].glads[1].hp, 0);
});

test('maps the 25 by 25 simulation plane directly into centered Three.js world coordinates', () => {
    assert.equal(ARENA_SIZE, 25);
    assert.deepEqual(toArenaPosition({ x: 0, y: 0 }), { x: -12.5, y: 0, z: -12.5 });
    assert.deepEqual(toArenaPosition({ x: 12.5, y: 12.5 }, 1.25), { x: 0, y: 1.25, z: 0 });
    assert.deepEqual(toArenaPosition({ x: 25, y: 25 }), { x: 12.5, y: 0, z: 12.5 });
});

test('maps clockwise engine headings into Three.js rotations and preserves the safe-zone boundary', () => {
    assert.equal(headingToRadians(0), 0);
    assert.equal(headingToRadians(90), -Math.PI / 2);
    assert.equal(headingToRadians(180), -Math.PI);
    assert.equal(headingToRadians(270), -Math.PI * 1.5);
    assert.equal(isOutsideSafeZone({ x: 12.5, y: 12.5 }, 0), true);
    assert.equal(isOutsideSafeZone({ x: 12.5, y: 12.5 }, 0.01), false);
    assert.equal(isOutsideSafeZone({ x: 0, y: 0 }, 17.68), false);
    assert.equal(isOutsideSafeZone({ x: 0, y: 0 }, 17.67), true);
});

test('derives one-shot combat events from adjacent expanded frames', () => {
    const [first, second, third] = expandSimulation(createSimulationPatchFixture());
    const movementEvents = deriveStepEvents(first, second);
    const impactEvents = deriveStepEvents(second, third);

    assert.deepEqual(
        movementEvents.filter(({ type }) => type === 'action').map(({ gladId, action }) => ({ gladId, action })),
        [{ gladId: 0, action: ACTIONS.movement }],
    );
    assert.deepEqual(
        movementEvents.filter(({ type }) => type === 'projectile-spawn').map(({ projectile }) => projectile.id),
        [7],
    );
    assert.deepEqual(
        impactEvents.filter(({ type }) => type === 'damage').map(({ gladId, amount }) => ({ gladId, amount })),
        [{ gladId: 0, amount: 12 }],
    );
    assert.deepEqual(
        impactEvents.filter(({ type }) => type === 'level-up').map(({ gladId, level }) => ({ gladId, level })),
        [{ gladId: 1, level: 2 }],
    );
    assert.deepEqual(
        impactEvents.filter(({ type }) => type === 'projectile-impact').map(({ projectile }) => projectile.id),
        [7],
    );
});

test('matches the legacy 100 ms replay cadence at every signed speed', () => {
    assert.equal(getPlaybackIntervalMs(1), 100);
    assert.equal(getPlaybackIntervalMs(-1), 100);
    assert.equal(getPlaybackIntervalMs(2), 50);
    assert.equal(getPlaybackIntervalMs(-5), 20);
    assert.equal(getPlaybackIntervalMs(10), 10);
});

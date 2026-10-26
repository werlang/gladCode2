// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { battleStats, expandSteps } from '../../public_html/script/helpers/battle-stats.js';
import { snapValue } from '../../public_html/script/components/slider.js';
import { toBackendDate } from '../../public_html/script/models/stats.js';

/**
 * A gladiator's state in one step.
 */
function glad(hp, action, extra = {}) {
    return { hp, action, lvl: 1, STR: 1, AGI: 1, INT: 1, ...extra };
}

test('incremental steps expand into complete steps', () => {
    const steps = expandSteps([
        { simtime: 0, glads: [{ hp: 10, x: 1 }], projectiles: { 1: { x: 0 } } },
        { simtime: 0.1, glads: [{ x: 2 }] },
    ]);
    assert.deepEqual(steps[1], { simtime: 0.1, glads: [{ hp: 10, x: 2 }], projectiles: {} });
    assert.deepEqual(steps[0].glads, [{ hp: 10, x: 1 }]);
});

test('battle statistics count abilities, winners and potions', () => {
    const steps = [
        { simtime: 0, glads: [glad(10, 0), glad(10, 2, { STR: 5 })] },
        // glad 1 charges, then its next action closes the charge
        { simtime: 0.1, glads: [{ action: 6 }, { action: 2 }] },
        { simtime: 0.2, glads: [{ action: 11, code: 'useItem("pot-hp-1")' }, { action: 6 }] },
        { simtime: 0.3, glads: [{ hp: 0, action: 9 }, { lvl: 3, action: 0 }] },
    ];
    const stats = battleStats(steps);

    assert.equal(stats.uses.fireball, 2);
    assert.equal(stats.uses.melee, 1);
    assert.equal(stats.uses.charge, 1);
    assert.deepEqual(stats.win, ['charge', 'melee', 'fireball', 'STR']);
    assert.deepEqual(stats.high, { STR: 1, AGI: 0, INT: 1 });
    assert.equal(stats.winnerlvl, 3);
    assert.equal(stats.avglvl, 2);
    assert.equal(stats.duration, 0.3);
    assert.deepEqual(stats.potionuse, ['pot-hp-1']);
    assert.deepEqual(stats.potionwin, []);
});

test('slider values snap to steps inside the range', () => {
    const range = { min: 0, max: 4000, step: 100 };
    assert.equal(snapValue(1234, range), 1200);
    assert.equal(snapValue(1250, range), 1300);
    assert.equal(snapValue(-50, range), 0);
    assert.equal(snapValue(9000, range), 4000);
    assert.equal(snapValue(0.30000000000000004, { min: 0, max: 1, step: 0.1 }), 0.3);
});

test('date inputs convert to the backend day-first format', () => {
    assert.equal(toBackendDate('2025-01-31'), '31/01/2025');
    assert.equal(toBackendDate(''), '');
});

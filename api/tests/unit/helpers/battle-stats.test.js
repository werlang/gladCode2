import { expect, test } from 'vitest';
import { battleStats, expandSteps } from '../../../helpers/battle-stats.js';

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
    expect(steps[1]).toEqual({ simtime: 0.1, glads: [{ hp: 10, x: 2 }], projectiles: {} });
    expect(steps[0].glads).toEqual([{ hp: 10, x: 1 }]);
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

    expect(stats.uses.fireball).toBe(2);
    expect(stats.uses.melee).toBe(1);
    expect(stats.uses.charge).toBe(1);
    expect(stats.win).toEqual(['charge', 'melee', 'fireball', 'STR']);
    expect(stats.high).toEqual({ STR: 1, AGI: 0, INT: 1 });
    expect(stats.winnerlvl).toBe(3);
    expect(stats.avglvl).toBe(2);
    expect(stats.duration).toBe(0.3);
    expect(stats.potionuse).toEqual(['pot-hp-1']);
    expect(stats.potionwin).toEqual([]);
});

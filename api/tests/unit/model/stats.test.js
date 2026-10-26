import { describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({ Mysql: { select: vi.fn() } }));
const { Mysql } = await import('../../../helpers/mysql.js');
const { Stats } = await import('../../../model/stats.js');

const row = (fields) => ({
    fireball: 0, teleport: 0, charge: 0, block: 0, assassinate: 0, ambush: 0, ranged: 0, melee: 0,
    win: '[]', duration: null, highSTR: null, highAGI: null, highINT: null, avglvl: null, winnerlvl: null,
    potionuse: null, potionwin: null, ...fields,
});

describe('Stats', () => {
    test('an empty period has no ability averages', async () => {
        Mysql.select.mockResolvedValueOnce([]);
        const summary = await Stats.summary({ minMmr: 0, maxMmr: 4000 });
        expect(summary.average).toEqual({});
        expect(summary.battles).toEqual({ total: 0, detailed: 0 });
    });

    test('abilities, attributes, levels and potions are summarised per battle', async () => {
        Mysql.select.mockResolvedValueOnce([
            row({ fireball: 4, ranged: 10, win: '["fireball","AGI"]', duration: 60, highSTR: 1, highAGI: 3, highINT: 0, avglvl: 5, winnerlvl: 7, potionuse: '[1,2]', potionwin: '[2]' }),
            row({ fireball: 2, win: '["STR"]', duration: 100, highSTR: 2, highAGI: 2, highINT: 2, avglvl: 3, winnerlvl: 9 }),
        ]);
        const summary = await Stats.summary({ start: '2026-01-01', end: '2026-01-31', minMmr: 500, maxMmr: 2000 });
        expect(Mysql.select.mock.calls.at(-1)[1]).toEqual(['2026-01-01', '2026-01-31', '2026-01-31', 500, 2000]);
        expect(summary.average.Fireball).toBe(3);
        expect(summary.usage.Fireball).toBe(100);
        expect(summary.usage.Ranged).toBe(50);
        expect(summary.winRate.Fireball).toBe(50);
        expect(summary.duration).toBe(80);
        expect(summary.attributes.avg).toEqual({ STR: 30, AGI: 50, INT: 20, lvl: 4 });
        expect(summary.attributes.winner).toEqual({ STR: 50, AGI: 50, INT: 0, lvl: 8 });
        expect(summary.potions).toEqual({ use: { 1: 1, 2: 1 }, win: { 2: 1 }, battles: 1 });
    });
});

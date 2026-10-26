import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({ Mysql: { findOne: vi.fn(), count: vi.fn() } }));
const { Mysql } = await import('../../../helpers/mysql.js');
const { Gladiator, gladiatorLimit } = await import('../../../model/gladiator.js');
const { VERSION } = await import('../../../helpers/version.js');

const glad = { name: 'Zed', vstr: 10, vagi: 18, vint: 0, code: 'loop(){}' };
const master = { id: 7, lvl: 25 };

describe('Gladiator', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        Mysql.findOne.mockResolvedValue(null);
        Mysql.count.mockResolvedValue(0);
    });

    test('masters get one more gladiator every ten levels, up to six', () => {
        expect([1, 9, 10, 25, 60].map(gladiatorLimit)).toEqual([1, 1, 2, 3, 6]);
    });

    test('a valid new gladiator can be saved', async () => {
        await expect(Gladiator.assertSavable(glad, master)).resolves.toBeUndefined();
    });

    test('names, attributes and test-only functions are checked', async () => {
        await expect(Gladiator.assertSavable({ ...glad, name: 'Zed<script>' }, master)).rejects.toMatchObject({ code: 'INVALID_NAME' });
        await expect(Gladiator.assertSavable({ ...glad, vstr: 30 }, master)).rejects.toMatchObject({ code: 'INVALID_ATTRIBUTES' });
        await expect(Gladiator.assertSavable({ ...glad, code: 'loop(){ setPosition(1,1); }' }, master))
            .rejects.toMatchObject({ code: 'BANNED_FUNCTIONS', data: { functions: ['setPosition'] } });
    });

    test('a taken name and a full roster are refused', async () => {
        Mysql.findOne.mockResolvedValueOnce({ cod: 3 });
        await expect(Gladiator.assertSavable(glad, master)).rejects.toMatchObject({ status: 409, code: 'NAME_TAKEN' });
        Mysql.count.mockResolvedValueOnce(3);
        await expect(Gladiator.assertSavable(glad, master)).rejects.toMatchObject({ status: 403, code: 'GLADIATOR_LIMIT', data: { limit: 3 } });
        Mysql.count.mockResolvedValueOnce(3);
        await expect(Gladiator.assertSavable({ ...glad, id: 4 }, master)).resolves.toBeUndefined();
    });

    test('serialises its code raw and flags other versions as outdated', () => {
        const json = new Gladiator({ cod: 4, name: 'Zed', code: 'a < b', blocks: '<xml/>', version: '1.0', mmr: 1000 }).toJSON('Bo');
        expect(json).toMatchObject({ id: 4, code: 'a < b', blocks: '<xml/>', master: 'Bo', outdated: true });
        expect(new Gladiator({ version: VERSION }).toJSON().outdated).toBe(false);
    });
});

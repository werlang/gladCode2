import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: { findOne: vi.fn(), count: vi.fn(), select: vi.fn(), insert: vi.fn(), update: vi.fn(), withTransaction: vi.fn(operation => operation({ connection: 'tx' })) },
}));
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

    test('names fit the 49 bytes the engine keeps', async () => {
        await expect(Gladiator.assertSavable({ ...glad, name: 'a'.repeat(49) }, master)).resolves.toBeUndefined();
        await expect(Gladiator.assertSavable({ ...glad, name: 'a'.repeat(50) }, master)).rejects.toMatchObject({ code: 'INVALID_NAME' });
        // accented letters take two bytes each
        await expect(Gladiator.assertSavable({ ...glad, name: 'é'.repeat(25) }, master)).rejects.toMatchObject({ code: 'INVALID_NAME' });
    });

    test('saving checks again under the master\'s lock, so parallel saves cannot pass the limit', async () => {
        Mysql.insert.mockResolvedValue({ insertId: 51 });
        await new Gladiator({ master: 7 }).saveChecked({ ...glad, skin: '', blocks: '' }, master);
        expect(Mysql.select).toHaveBeenCalledWith('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [7], { connection: 'tx' });
        expect(Mysql.count).toHaveBeenCalledWith('gladiators', { master: 7 }, { connection: 'tx' });
        expect(Mysql.insert).toHaveBeenCalledWith('gladiators', expect.objectContaining({ name: 'Zed', master: 7 }), { connection: 'tx' });

        // the other request saved first: the limit is reached now and nothing is written
        Mysql.insert.mockClear();
        Mysql.count.mockResolvedValueOnce(3);
        await expect(new Gladiator({ master: 7 }).saveChecked({ ...glad, skin: '', blocks: '' }, master)).rejects.toMatchObject({ code: 'GLADIATOR_LIMIT' });
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('a master only finds their own gladiators', async () => {
        await expect(Gladiator.findOwned(4, 7)).rejects.toMatchObject({ status: 404, code: 'GLADIATOR_NOT_FOUND' });
        expect(Mysql.findOne).toHaveBeenCalledWith('gladiators', { filter: { cod: 4, master: 7 } });
    });

    test('serialises its code raw, results and the current version state', () => {
        const json = new Gladiator({ cod: 4, name: 'Zed', code: 'a < b', blocks: '<xml/>', version: '1.0', mmr: 1000, battles: 11, wins: 8, losses: 3, draws: 0 }).toJSON('Bo');
        expect(json).toMatchObject({ id: 4, code: 'a < b', blocks: '<xml/>', master: 'Bo', outdated: true, broken: false, battles: 11, wins: 8, losses: 3, draws: 0 });
        expect(new Gladiator({ version: VERSION }).toJSON().outdated).toBe(false);
        expect(new Gladiator({ version: 'broken' }).toJSON().broken).toBe(true);
    });

    test('the roster read brings each gladiator win and loss record', async () => {
        Mysql.select.mockResolvedValue([{ cod: 4, name: 'Zed', version: VERSION, battles: 11, wins: 8, losses: 3, draws: 0 }]);
        const [glad] = await Gladiator.listByMaster(7);
        expect(Mysql.select.mock.calls[0][1]).toEqual([7]);
        expect(Mysql.select.mock.calls[0][0]).toContain('AS battles');
        expect(Mysql.select.mock.calls[0][0]).toContain("r.result = 'win'");
        expect(Mysql.select.mock.calls[0][0]).toContain("r.result = 'loss'");
        expect(Mysql.select.mock.calls[0][0]).toContain("r.result = 'draw'");
        expect(glad.toJSON()).toMatchObject({ battles: 11, wins: 8, losses: 3, draws: 0 });
    });
});

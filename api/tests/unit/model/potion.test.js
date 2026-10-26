import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        findOne: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
        insert: vi.fn(),
        withTransaction: vi.fn(operation => operation({ connection: 'tx' })),
        raw: sql => ({ toSqlString: () => sql }),
    },
}));
const { Mysql } = await import('../../../helpers/mysql.js');
const { Potion, unlockedSlots } = await import('../../../model/potion.js');

const POTION = { id: 3, identifier: 'hp-1', lvl: 2, price: 100 };

/** @param {Record<string, number>} user @param {number} used */
function given(user, used = 0) {
    Mysql.findOne.mockImplementation(async table => (table === 'items' ? POTION : user));
    Mysql.select.mockResolvedValue([{ used }]);
}

describe('Potion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Mysql.insert.mockResolvedValue({ insertId: 40 });
    });

    test('slots unlock at levels 5, 15, 25 and 35', () => {
        expect([1, 5, 14, 25, 60].map(unlockedSlots)).toEqual([0, 1, 1, 3, 4]);
    });

    test('buying locks the master, spends silver and brews for the apothecary\'s time', async () => {
        given({ silver: 500, lvl: 30, apothecary: 3 }, 1);
        expect(await Potion.buy(7, 'hp-1')).toEqual({ slotId: 40, silver: 400 });
        expect(Mysql.findOne.mock.calls[1][1].opt).toEqual({ forUpdate: true });
        expect(Mysql.update).toHaveBeenCalledWith('usuarios', { silver: { dec: 100 } }, { id: 7 }, { connection: 'tx' });
        expect(Mysql.insert.mock.calls[0][1].expire.toSqlString()).toBe('NOW() + INTERVAL 12 HOUR');
    });

    test('purchases need a free slot, the apothecary level and enough silver', async () => {
        given({ silver: 500, lvl: 5, apothecary: 3 }, 1);
        await expect(Potion.buy(7, 'hp-1')).rejects.toMatchObject({ code: 'NO_FREE_SLOT' });
        given({ silver: 500, lvl: 30, apothecary: 1 });
        await expect(Potion.buy(7, 'hp-1')).rejects.toMatchObject({ code: 'APOTHECARY_LEVEL' });
        given({ silver: 50, lvl: 30, apothecary: 3 });
        await expect(Potion.buy(7, 'hp-1')).rejects.toMatchObject({ code: 'NOT_ENOUGH_SILVER' });
        expect(Mysql.update).not.toHaveBeenCalled();
    });

    test('the apothecary upgrades for its price until level five', async () => {
        Mysql.findOne.mockResolvedValue({ silver: 6000, apothecary: 2 });
        expect(await Potion.upgradeApothecary(7)).toEqual({ apothecary: 3, silver: 1000 });
        Mysql.findOne.mockResolvedValue({ silver: 99999, apothecary: 5 });
        await expect(Potion.upgradeApothecary(7)).rejects.toMatchObject({ code: 'APOTHECARY_MAX_LEVEL' });
    });

    test('only the master\'s own slot can be cancelled', async () => {
        Mysql.update.mockResolvedValue(0);
        await expect(Potion.cancel(7, 9)).rejects.toMatchObject({ status: 404, code: 'SLOT_NOT_FOUND' });
        expect(Mysql.update.mock.calls[0][2]).toEqual({ id: 9, user: 7 });
    });
});

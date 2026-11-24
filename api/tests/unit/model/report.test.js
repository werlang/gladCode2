import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        select: vi.fn(),
        update: vi.fn(),
    },
}));
const { Mysql } = await import('../../../helpers/mysql.js');
const { Report } = await import('../../../model/report.js');

/** @param {string} sql */
function queryOf(sql) {
    return String(sql);
}

describe('Report', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Mysql.update.mockResolvedValue({ affectedRows: 1 });
    });

    test('a page carries the placing, battle size, result and opponents and marks the page read', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{
                id: 9,
                time: '2026-11-23 20:00:00',
                name: 'Aurora',
                isread: 0,
                hash: 'log-hash',
                reward: 12.5,
                placement: 0,
                result: 'win',
                battleSize: 3,
                opponents: 'Spartacus, Arcanista',
                favorite: 1,
                comment: 'Boa briga',
                expired: 0,
            }]);

        const page = await Report.list(7, { offset: 10, markRead: true });

        expect(page.total).toBe(1);
        expect(page.reports[0]).toMatchObject({
            place: 1,
            total: 3,
            result: 'win',
            opponents: ['Spartacus', 'Arcanista'],
            favorite: true,
            read: false,
        });
        expect(Mysql.update).toHaveBeenCalledWith('reports', { isread: 1 }, { id: [9] });
    });

    test('the placing is one-based and an absent placing stays null', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ total: 2 }])
            .mockResolvedValueOnce([
                { id: 1, isread: 1, placement: 4, battleSize: 5, favorite: 0, expired: 1, hash: 'gone', result: 'loss' },
                { id: 2, isread: 1, placement: null, battleSize: 0, favorite: 0, expired: 0, hash: 'live', result: null },
            ]);

        const page = await Report.list(7, { offset: 0 });

        expect(page.reports[0]).toMatchObject({ place: 5, total: 5, hash: null, expired: true });
        expect(page.reports[1]).toMatchObject({ place: null, total: 0, result: null, hash: 'live' });
    });

    test('favorites and unread filters reach the query', async () => {
        Mysql.select.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);

        await Report.list(7, { offset: 0, favorites: true, unreadOnly: true });

        const [countSql, countParams] = Mysql.select.mock.calls[0];
        expect(queryOf(countSql)).toContain('r.favorite = 1');
        expect(queryOf(countSql)).toContain('r.isread = 0');
        expect(countParams).toEqual([7]);
    });

    test('toggling the star keeps an existing comment when the request carries none', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 4 }]);

        await Report.setFavorite(7, 4, false, '');

        expect(Mysql.update).toHaveBeenCalledWith('reports', { favorite: 0 }, { id: 4 });
    });

    test('a comment passed with the star is stored', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 4 }]);

        await Report.setFavorite(7, 4, true, 'Boa briga');

        expect(Mysql.update).toHaveBeenCalledWith('reports', { favorite: 1, comment: 'Boa briga' }, { id: 4 });
    });

    test('the summary returns the ten results, the seven-day renown and the unread count', async () => {
        Mysql.select
            .mockImplementationOnce(async () => [{ result: 'win' }, { result: 'loss' }, { result: 'draw' }])
            .mockImplementationOnce(async () => [{ renown: '46.5' }])
            .mockImplementationOnce(async () => [{ unread: '3' }]);

        await expect(Report.summary(7)).resolves.toEqual({
            results: ['win', 'loss', 'draw'],
            renown: 46.5,
            unread: 3,
        });
    });
});

import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: { select: vi.fn(), find: vi.fn(), update: vi.fn(), insert: vi.fn(), contains: text => `%${text}%` },
}));
const { Mysql } = await import('../../../helpers/mysql.js');
const { Ranking, hashtags, windowBounds, windowSize } = await import('../../../model/ranking.js');
const { VERSION } = await import('../../../helpers/version.js');

describe('Ranking', () => {
    beforeEach(() => vi.resetAllMocks());

    test('the window size is odd and stays between three and twenty-one', () => {
        expect([2, 3, 4, 9, 20, 21, 30].map(windowSize)).toEqual([3, 3, 5, 9, 21, 21, 21]);
    });

    test('the window bounds clamp at the top, the bottom and an empty ranking', () => {
        expect(windowBounds(20, 1, 9)).toEqual({ position: 1, start: 1, last: 9 });
        expect(windowBounds(20, 10, 9)).toEqual({ position: 10, start: 6, last: 14 });
        expect(windowBounds(20, 20, 9)).toEqual({ position: 20, start: 12, last: 20 });
        expect(windowBounds(20, 99, 9)).toEqual({ position: 20, start: 12, last: 20 });
        expect(windowBounds(4, 2, 9)).toEqual({ position: 2, start: 1, last: 4 });
        expect(windowBounds(0, 10, 9)).toEqual({ position: 0, start: 1, last: 0 });
    });

    test('the general list keeps global positions and reads 7-day renown', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{
                id: 4, gladiator: 'Magnus', mmr: 1482.9, master: 'Spartacus_C',
                change24h: 3, change7d: 9, position: 128,
            }]);

        const data = await Ranking.general({ offset: 0, search: 'Mag', scope: 'friends', userId: 7 });

        expect(data).toEqual({
            total: 1,
            ranking: [{ id: 4, gladiator: 'Magnus', mmr: 1482, master: 'Spartacus_C', change24h: 3, change7d: 9, position: 128 }],
        });
        const [countSql, countValues] = Mysql.select.mock.calls[0];
        expect(countSql).toContain('g.version = ?');
        expect(countValues).toEqual([VERSION, '%Mag%', '%Mag%', 7, 7]);
        const [rowsSql, rowsValues] = Mysql.select.mock.calls[1];
        expect(rowsSql).toContain('ROW_NUMBER() OVER (ORDER BY g.mmr DESC, g.cod ASC)');
        expect(rowsSql).toContain('WHERE g.version = ?');
        expect(rowsSql).toContain('ranked.position');
        expect(rowsValues).toEqual([VERSION, '%Mag%', '%Mag%', 7, 7, 10, 0]);
    });

    test('a gladiator window resolves its position and returns the centred rows', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ total: 20 }])
            .mockResolvedValueOnce([{ id: 4, name: 'Magnus', mmr: 1482 }])
            .mockResolvedValueOnce([{ above: 4 }])
            .mockResolvedValueOnce([{
                id: 4, gladiator: 'Magnus', mmr: 1482, master: 'Spartacus_C', change24h: 3, change7d: 9, position: 5,
            }]);

        const window = await Ranking.window({ gladiatorId: 4, size: 9 });

        expect(window).toMatchObject({ total: 20, position: 5, page: 1, pageSize: 10, around: 'Magnus' });
        expect(window.rows[0]).toMatchObject({ id: 4, position: 5, change7d: 9 });
        expect(Mysql.select.mock.calls[2][1]).toEqual([VERSION, 1482, 1482, 4]);
        expect(Mysql.select.mock.calls[3][1]).toEqual([VERSION, 1, 9]);
    });

    test('a position window clamps to the last row and a missing gladiator is refused', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ total: 20 }])
            .mockResolvedValueOnce([{ id: 20, gladiator: 'Last', mmr: 1000, master: 'M', change24h: 0, change7d: 0, position: 20 }]);
        const bottom = await Ranking.window({ position: 99, size: 9 });
        expect(bottom).toMatchObject({ position: 20, around: 'Last' });
        expect(Mysql.select.mock.calls[1][1]).toEqual([VERSION, 12, 20]);

        Mysql.select.mockReset();
        Mysql.select.mockResolvedValueOnce([{ total: 20 }]).mockResolvedValueOnce([]);
        await expect(Ranking.window({ gladiatorId: 99 })).rejects.toMatchObject({ code: 'GLADIATOR_NOT_FOUND' });

        Mysql.select.mockReset();
        Mysql.select.mockResolvedValueOnce([{ total: 0 }]);
        await expect(Ranking.window({ position: 5 })).resolves.toEqual({
            total: 0, position: 0, page: 1, pageSize: 10, around: null, rows: [],
        });
    });

    test('my gladiators carry the reason they are outside the current ranking', async () => {
        Mysql.select.mockResolvedValueOnce([
            { id: 1, name: 'Aurora', mmr: 1487, version: VERSION, skin: 's1', position: 2 },
            { id: 2, name: 'Old', mmr: 900, version: '2.9.0', skin: '', position: null },
            { id: 3, name: 'Broken', mmr: 800, version: 'broken', skin: '', position: null },
            { id: 4, name: 'No battle', mmr: 0, version: VERSION, skin: '', position: null },
        ]);
        expect((await Ranking.mine(7)).gladiators).toEqual([
            { id: 1, name: 'Aurora', mmr: 1487, position: 2, state: 'ranked', skin: 's1' },
            { id: 2, name: 'Old', mmr: 900, position: null, state: 'outdated', skin: '' },
            { id: 3, name: 'Broken', mmr: 800, position: null, state: 'broken', skin: '' },
            { id: 4, name: 'No battle', mmr: 0, position: null, state: 'unranked', skin: '' },
        ]);
        expect(Mysql.select.mock.calls[0][1]).toEqual([VERSION, 7]);
    });

    test('the best current offset uses the ranking tie-break', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ mmr: 1482, cod: 4 }])
            .mockResolvedValueOnce([{ above: 3 }]);
        expect(await Ranking.bestOffset(7)).toBe(3);
        expect(Mysql.select.mock.calls[1][1]).toEqual([VERSION, 1482, 1482, 4]);
        Mysql.select.mockReset();
        Mysql.select.mockResolvedValueOnce([]);
        expect(await Ranking.bestOffset(7)).toBe(0);
    });

    test('hashtags are read from text, lowercased', () => {
        expect(hashtags('Turma #CAT1 e #live_2, sem #')).toEqual(['cat1', 'live_2']);
    });

    test('tabs join training tags, drop closed ones and keep followed ones', async () => {
        Mysql.select.mockResolvedValue([{ description: '#b #a' }, { description: '#c' }]);
        Mysql.find.mockResolvedValue([{ name: 'c', watch: 0 }, { name: 'z', watch: 1 }]);
        expect(await Ranking.tabs(7)).toEqual(['a', 'b', 'z']);
    });

    test('following a tab is for tutor accounts with credits', async () => {
        await expect(Ranking.watchTab({ id: 7, premium: null, credits: 5 }, 'a', true)).rejects.toMatchObject({ code: 'TUTOR_ONLY' });
        await expect(Ranking.watchTab({ id: 7, premium: '2020-01-01', credits: -1 }, 'a', true)).rejects.toMatchObject({ code: 'NO_CREDITS' });
        Mysql.update.mockResolvedValue(0);
        await Ranking.watchTab({ id: 7, premium: '2020-01-01', credits: 1 }, 'a', true);
        expect(Mysql.insert).toHaveBeenCalledWith('user_tabs', { name: 'a', owner: 7, watch: 1 });
    });

    test('hashtag rankings award 10, 6, 4, 3, 2 points per training times its weight', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ id: 1, weight: 1 }, { id: 2, weight: 2 }])
            .mockResolvedValueOnce([
                { master: 10, apelido: 'Ana', score: 9, time: 1040 },
                { master: 11, apelido: 'Bo', score: 5, time: 30 },
                { master: 12, apelido: 'Cy', score: 0, time: null },
            ])
            .mockResolvedValueOnce([
                { master: 11, apelido: 'Bo', score: 8, time: 50 },
                { master: 10, apelido: 'Ana', score: 2, time: 20 },
            ]);
        const ranking = await Ranking.hashtag('cat1');
        expect(ranking).toEqual([
            { id: 11, nick: 'Bo', score: 6 + 20, time: 40, position: 1 },
            { id: 10, nick: 'Ana', score: 10 + 12, time: 30, position: 2 },
        ]);
        expect(Mysql.select.mock.calls[0][1]).toEqual(['%#cat1%']);
    });

    test('a search keeps the full ranking\'s positions', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 1, weight: 1 }]).mockResolvedValueOnce([
            { master: 10, apelido: 'Ana', score: 9, time: 10 },
            { master: 11, apelido: 'Bo', score: 5, time: 10 },
        ]);
        expect(await Ranking.hashtag('x', 'BO')).toEqual([{ id: 11, nick: 'Bo', score: 6, time: 10, position: 2 }]);
    });
});

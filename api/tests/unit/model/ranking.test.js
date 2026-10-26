import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: { select: vi.fn(), find: vi.fn(), update: vi.fn(), insert: vi.fn(), contains: text => `%${text}%` },
}));
const { Mysql } = await import('../../../helpers/mysql.js');
const { Ranking, hashtags } = await import('../../../model/ranking.js');

describe('Ranking', () => {
    beforeEach(() => vi.resetAllMocks());

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

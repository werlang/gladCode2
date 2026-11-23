import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        select: vi.fn(),
        contains: text => `%${text}%`,
    },
}));

const { Mysql } = await import('../../../helpers/mysql.js');
const { Search, SEARCH_LIMIT } = await import('../../../model/search.js');

describe('global search model', () => {
    beforeEach(() => vi.resetAllMocks());

    test('searches gladiators and masters with a bounded parameterised query', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ id: 42, name: 'Relâmpago', master: 'bytewolf', picture: '/p.png', mmr: 1482 }])
            .mockResolvedValueOnce([{ id: 7, nick: 'relic_hunter', picture: '', level: 18 }]);

        const result = await Search.query('rel');

        expect(result).toEqual({
            gladiators: [{ id: 42, name: 'Relâmpago', master: 'bytewolf', picture: '/p.png', mmr: 1482 }],
            masters: [{ id: 7, nick: 'relic_hunter', picture: '', level: 18 }],
        });
        expect(Mysql.select.mock.calls[0][1]).toEqual(['%rel%', '%rel%', SEARCH_LIMIT]);
        expect(Mysql.select.mock.calls[1][1]).toEqual(['%rel%', SEARCH_LIMIT]);
        expect(Mysql.select.mock.calls[0][0]).toContain('LIKE ?');
    });
});

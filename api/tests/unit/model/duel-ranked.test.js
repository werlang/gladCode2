import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: { select: vi.fn(), findOne: vi.fn(), count: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), raw: sql => ({ toSqlString: () => sql }) },
}));
vi.mock('../../../helpers/email.js', () => ({ sendMail: vi.fn() }));
const run = vi.fn();
vi.mock('../../../model/battle.js', () => ({
    Battle: class {
        constructor(options) { this.options = options; }
        async addGladiators(ids) { this.ids = ids; return this; }
        run() { return run(this); }
    },
}));
vi.mock('../../../model/gladiator.js', () => ({ Gladiator: { findOwned: vi.fn(async (id, master) => ({ cod: id, master, version: 'current', mmr: 1000 })) } }));
vi.mock('../../../helpers/version.js', () => ({ VERSION: 'current' }));

const { Mysql } = await import('../../../helpers/mysql.js');
const { sendMail } = await import('../../../helpers/email.js');
const { signJwt } = await import('../../../helpers/jwt.js');
const { Duel } = await import('../../../model/duel.js');
const { RankedBattle } = await import('../../../model/ranked-battle.js');

describe('duels', () => {
    beforeEach(() => vi.clearAllMocks());

    test('only friends can be challenged, once per gladiator', async () => {
        Mysql.select.mockResolvedValueOnce([]);
        await expect(Duel.challenge({ id: 7, apelido: 'Ana' }, 9, 4)).rejects.toMatchObject({ code: 'NOT_FRIENDS' });
        Mysql.select.mockResolvedValueOnce([{ cod: 1, pendente: 0 }]);
        Mysql.count.mockResolvedValueOnce(1);
        await expect(Duel.challenge({ id: 7, apelido: 'Ana' }, 9, 4)).rejects.toMatchObject({ code: 'DUEL_EXISTS' });
    });

    test('a challenge is stored and emailed', async () => {
        Mysql.select.mockResolvedValueOnce([{ cod: 1, pendente: 0 }]);
        Mysql.count.mockResolvedValueOnce(0);
        Mysql.findOne.mockResolvedValueOnce({ apelido: 'Bo', email: 'bo@example.com', pref_duel: 1 });
        await Duel.challenge({ id: 7, apelido: 'Ana' }, 9, 4);
        expect(Mysql.insert).toHaveBeenCalledWith('duels', expect.objectContaining({ user1: 7, gladiator1: 4, user2: 9 }));
        expect(sendMail).toHaveBeenCalledWith('duel', expect.objectContaining({ subject: 'Desafio para duelo contra Ana' }));
    });

    test('answering a duel fights both gladiators and stores the log', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 3, gladiator1: 11, user2: 7 });
        Mysql.count.mockResolvedValueOnce(0);
        run.mockResolvedValueOnce({ log: { hash: 'abc' }, error: '' });
        expect(await Duel.fight({ id: 7 }, 3, 4)).toEqual({ hash: 'abc', error: '' });
        expect(run.mock.calls[0][0]).toMatchObject({ ids: [4, 11], options: { origin: 'duel' } });
        expect(Mysql.update).toHaveBeenCalledWith('duels', expect.objectContaining({ log: 'abc', gladiator2: 4 }), { id: 3, user2: 7 });
    });

    test('a duel against an outdated gladiator does not run', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 3, gladiator1: 11, user2: 7 });
        Mysql.count.mockResolvedValueOnce(1);
        await expect(Duel.fight({ id: 7 }, 3, 4)).rejects.toMatchObject({ code: 'GLADIATOR_OUTDATED' });
        expect(run).not.toHaveBeenCalled();
    });
});

describe('ranked battles', () => {
    beforeEach(() => vi.clearAllMocks());

    test('a match lists the opponents and signs who fights whom', async () => {
        Mysql.select.mockResolvedValueOnce([{ cod: 20, name: 'Zed', apelido: 'Bo', skin: '[]', vstr: 1, vagi: 1, vint: 1, mmr: 1200.7 }]);
        const { opponents, match } = await RankedBattle.match({ id: 7 }, 4);
        expect(opponents).toEqual([{ name: 'Zed', master: 'Bo', skin: '[]', vstr: 1, vagi: 1, vint: 1, mmr: 1200 }]);
        expect(typeof match).toBe('string');
    });

    test('a match only fights for the master it was made for', async () => {
        const match = await signJwt({ kind: 'ranked-match', user: 8, gladiator: 4, opponents: [20] }, { expiresInSeconds: 60 });
        await expect(RankedBattle.fight({ id: 7 }, match)).rejects.toMatchObject({ code: 'MATCH_INVALID' });
        await expect(RankedBattle.fight({ id: 7 }, 'forged')).rejects.toMatchObject({ code: 'MATCH_INVALID' });
        const session = await signJwt({ id: 7 });
        await expect(RankedBattle.fight({ id: 7 }, session)).rejects.toMatchObject({ code: 'MATCH_INVALID' });
        expect(run).not.toHaveBeenCalled();
    });

    test('a battle without a log reports its error and changes nothing', async () => {
        const match = await signJwt({ kind: 'ranked-match', user: 7, gladiator: 4, opponents: [20, 21] }, { expiresInSeconds: 60 });
        run.mockResolvedValueOnce({ log: null, simulation: null, error: 'NO_OUTPUT' });
        expect(await RankedBattle.fight({ id: 7 }, match)).toEqual({ hash: null, error: 'NO_OUTPUT' });
        expect(run.mock.calls[0][0].ids).toEqual([20, 21, 4]);
        expect(Mysql.update).not.toHaveBeenCalled();
    });
});

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: { select: vi.fn(), findOne: vi.fn(), count: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), raw: sql => ({ toSqlString: () => sql }), withTransaction: vi.fn(operation => operation({ connection: 'tx' })) },
}));
vi.mock('../../../helpers/email.js', () => ({ sendMail: vi.fn() }));
const run = vi.fn();
vi.mock('../../../model/battle.js', () => ({
    Battle: class {
        constructor(options) { this.options = options; }
        async addGladiators(ids) { this.ids = ids; return this; }
        run() { return run(this); }
        savedGladiator(name) { return { Zed: { id: 20, master: 8 }, Max: { id: 4, master: 7 }, Ava: { id: 5, master: 9 }, Nox: { id: 6, master: 10 }, G0: { id: 20, master: 8 }, G1: { id: 21, master: 9 }, G2: { id: 22, master: 10 }, G3: { id: 23, master: 11 }, G4: { id: 4, master: 7 } }[name]; }
    },
}));
vi.mock('../../../model/stats.js', () => ({ Stats: { record: vi.fn() } }));
vi.mock('../../../model/gladiator.js', () => ({ Gladiator: { findOwned: vi.fn(async (id, master) => ({ cod: id, master, version: 'current', mmr: 1000 })) } }));
vi.mock('../../../helpers/version.js', () => ({ VERSION: 'current' }));

const { Mysql } = await import('../../../helpers/mysql.js');
const { sendMail } = await import('../../../helpers/email.js');
const { Gladiator } = await import('../../../model/gladiator.js');
const { Stats } = await import('../../../model/stats.js');
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
        Mysql.update.mockResolvedValueOnce(1);
        expect(await Duel.fight({ id: 7 }, 3, 4)).toEqual({ hash: 'abc', error: '' });
        expect(run.mock.calls[0][0]).toMatchObject({ ids: [4, 11], options: { origin: 'duel' } });
        expect(Mysql.update).toHaveBeenCalledWith('duels', expect.objectContaining({ log: 'abc', gladiator2: 4 }), { id: 3, user2: 7, log: null });
    });

    test('a duel answered twice at once keeps the first battle only', async () => {
        const remove = vi.fn();
        Mysql.findOne.mockResolvedValueOnce({ id: 3, gladiator1: 11, user2: 7 });
        Mysql.count.mockResolvedValueOnce(0);
        run.mockResolvedValueOnce({ log: { hash: 'late', delete: remove }, error: '' });
        Mysql.update.mockResolvedValueOnce(0);
        await expect(Duel.fight({ id: 7 }, 3, 4)).rejects.toMatchObject({ status: 409, code: 'DUEL_ANSWERED' });
        expect(remove).toHaveBeenCalledTimes(1);
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

    test('a match lists the opponents and is kept on the server for ten minutes', async () => {
        Mysql.select.mockResolvedValueOnce([{ cod: 20, name: 'Zed', apelido: 'Bo', skin: '[]', vstr: 1, vagi: 1, vint: 1, mmr: 1200.7 }]);
        const { opponents, match } = await RankedBattle.match({ id: 7 }, 4);
        expect(opponents).toEqual([{ name: 'Zed', master: 'Bo', skin: '[]', vstr: 1, vagi: 1, vint: 1, mmr: 1200 }]);
        expect(match).toMatch(/^[a-f0-9]{32}$/);
        const [table, row] = Mysql.insert.mock.calls[0];
        expect(table).toBe('ranked_matches');
        expect(row).toMatchObject({ id: match, user: 7, gladiator: 4, opponents: '[20]' });
        expect(row.expires.toSqlString()).toBe('NOW() + INTERVAL 600 SECOND');
        // a master keeps one pending match: a new one replaces the earlier ones
        expect(Mysql.delete).toHaveBeenCalledWith('ranked_matches', { user: 7 });
    });

    test('a match needs opponents on the current version', async () => {
        Mysql.select.mockResolvedValueOnce([]);
        await expect(RankedBattle.match({ id: 7 }, 4)).rejects.toMatchObject({ status: 409, code: 'NO_OPPONENTS' });
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('a match is claimed under a lock, only by its master, and only once', async () => {
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4, opponents: '[20,21]' }]);
        run.mockResolvedValueOnce({ log: null, simulation: null, error: 'NO_OUTPUT' });
        await RankedBattle.fight({ id: 7 }, 'a'.repeat(32));
        const [sql, values, context] = Mysql.select.mock.calls[0];
        expect(sql).toMatch(/FROM ranked_matches WHERE id = \? AND user = \? AND expires > NOW\(\) FOR UPDATE/);
        expect(values).toEqual(['a'.repeat(32), 7]);
        expect(Mysql.delete).toHaveBeenCalledWith('ranked_matches', { id: 'a'.repeat(32) }, context);

        // the row is gone: the same match again (or someone else's) finds nothing
        Mysql.select.mockResolvedValueOnce([]);
        await expect(RankedBattle.fight({ id: 7 }, 'a'.repeat(32))).rejects.toMatchObject({ status: 400, code: 'MATCH_INVALID' });
        expect(run).toHaveBeenCalledTimes(1);
    });

    test('a match whose gladiator was changed since does not run', async () => {
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4, opponents: '[20]' }]);
        Gladiator.findOwned.mockResolvedValueOnce({ cod: 4, master: 7, version: 'old', mmr: 1000 });
        await expect(RankedBattle.fight({ id: 7 }, 'b'.repeat(32))).rejects.toMatchObject({ code: 'GLADIATOR_OUTDATED' });
        expect(run).not.toHaveBeenCalled();
    });

    test('a battle without a log reports its error and changes nothing', async () => {
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4, opponents: '[20,21]' }]);
        run.mockResolvedValueOnce({ log: null, simulation: null, error: 'NO_OUTPUT' });
        expect(await RankedBattle.fight({ id: 7 }, 'c'.repeat(32))).toEqual({ hash: null, error: 'NO_OUTPUT' });
        expect(run.mock.calls[0][0].ids).toEqual([20, 21, 4]);
        expect(Mysql.update).not.toHaveBeenCalled();
    });
});

describe('ranked rewards', () => {
    beforeEach(() => vi.clearAllMocks());

    test('rewards lock the masters, then the gladiators, and are written with the stats in one transaction', async () => {
        const simulation = [
            { simtime: 1, glads: [{ name: 'Zed', user: 'Bo', hp: 9 }, { name: 'Max', user: 'Ana', hp: 9 }] },
            { simtime: 20, glads: [{ name: 'Zed', user: 'Bo', hp: 0 }, { name: 'Max', user: 'Ana', hp: 9 }] },
            { simtime: 25, glads: [{}, { name: 'Max', user: 'Ana', hp: 4 }] },
            // delta log: the survivor has no hp in the final step; deathOrder keeps the 4
            { simtime: 30, glads: [{}, {}] },
        ];
        Mysql.select
            .mockResolvedValueOnce([{ gladiator: 4, opponents: '[20]' }])
            .mockResolvedValueOnce([{ id: 7 }, { id: 8 }])
            .mockResolvedValueOnce([{ cod: 20, mmr: 1000, master: 8, lvl: 3, xp: 0 }, { cod: 4, mmr: 1000, master: 7, lvl: 3, xp: 0 }])
            .mockResolvedValueOnce([{ battles: 0 }])
            .mockResolvedValueOnce([{ lvl: 3, xp: 10, silver: 50, cod: 4, name: 'Max', skin: '', vstr: 1, vagi: 1, vint: 1, mmr: 1010 }]);
        run.mockResolvedValueOnce({ log: { id: 9, hash: 'abc' }, simulation, error: '' });

        expect((await RankedBattle.fight({ id: 7 }, 'd'.repeat(32))).hash).toBe('abc');
        expect(Mysql.select.mock.calls[1]).toEqual(['SELECT id FROM usuarios WHERE id IN (?,?) ORDER BY id FOR UPDATE', [7, 8], { connection: 'tx' }]);
        const [sql, ids, context] = Mysql.select.mock.calls[2];
        expect(sql).toMatch(/WHERE g\.cod IN \(\?,\?\) FOR UPDATE$/);
        expect([ids, context]).toEqual([[4, 20], { connection: 'tx' }]);
        expect(Stats.record).toHaveBeenCalledWith(simulation, 9, [20, 4], { connection: 'tx' });
        expect(Mysql.update).toHaveBeenCalledWith('usuarios', expect.objectContaining({ silver: { inc: expect.any(Number) } }), { id: 7 }, { connection: 'tx' });
        const [, reports] = Mysql.insert.mock.calls.find(([table]) => table === 'reports');
        expect(reports.find(report => report.gladiator === 4).result).toBe('win');
        expect(reports.find(report => report.gladiator === 20).result).toBe('loss');
    });

    test('a runner-up that still gains renown is persisted as second place, not a win', async () => {
        // the winner lasted to 100, the master's gladiator died at 99 (positive renown), then 10 and 0
        const simulation = [
            { simtime: 0, glads: [{ name: 'Zed', user: 'Bo', hp: 9 }, { name: 'Max', user: 'Ana', hp: 9 }, { name: 'Ava', user: 'Cid', hp: 9 }, { name: 'Nox', user: 'Dia', hp: 0 }] },
            { simtime: 10, glads: [{ name: 'Zed', user: 'Bo', hp: 9 }, { name: 'Max', user: 'Ana', hp: 9 }, { name: 'Ava', user: 'Cid', hp: 0 }, {}] },
            { simtime: 99, glads: [{ name: 'Zed', user: 'Bo', hp: 9 }, { name: 'Max', user: 'Ana', hp: 0 }, {}, {}] },
            { simtime: 100, glads: [{ hp: 8 }, {}, {}, {}] },
            { simtime: 101, glads: [{}, {}, {}, {}] },
        ];
        Mysql.select
            .mockResolvedValueOnce([{ gladiator: 4, opponents: '[20,5,6]' }])
            .mockResolvedValueOnce([{ id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }])
            .mockResolvedValueOnce([
                { cod: 20, mmr: 1000, master: 8, lvl: 3, xp: 0 },
                { cod: 4, mmr: 1000, master: 7, lvl: 3, xp: 0 },
                { cod: 5, mmr: 1000, master: 9, lvl: 3, xp: 0 },
                { cod: 6, mmr: 1000, master: 10, lvl: 3, xp: 0 },
            ])
            .mockResolvedValueOnce([{ battles: 0 }])
            .mockResolvedValueOnce([{ lvl: 3, xp: 10, silver: 50, cod: 4, name: 'Max', skin: '', vstr: 1, vagi: 1, vint: 1, mmr: 1003 }]);
        run.mockResolvedValueOnce({ log: { id: 9, hash: 'abc' }, simulation, error: '' });

        await RankedBattle.fight({ id: 7 }, 'e'.repeat(32));

        const [, reports] = Mysql.insert.mock.calls.find(([table]) => table === 'reports');
        const mine = reports.find(report => report.gladiator === 4);
        expect(mine.placement).toBe(1);
        expect(mine.reward).toBeGreaterThan(0);
        expect(mine.result).toBe('loss');
        expect(reports.find(report => report.gladiator === 20).placement).toBe(0);
        expect(reports.find(report => report.gladiator === 20).result).toBe('win');
    });

    test('a real ranked delta log persists the survivor as a win, not a draw', async () => {
        const simulation = JSON.parse(readFileSync(new URL('../../fixtures/simlog_ranked_delta.json', import.meta.url), 'utf8'));
        Mysql.select
            .mockResolvedValueOnce([{ gladiator: 4, opponents: '[20,21,22,23]' }])
            .mockResolvedValueOnce([{ id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }, { id: 11 }])
            .mockResolvedValueOnce([
                { cod: 20, mmr: 1000, master: 8, lvl: 3, xp: 0 },
                { cod: 21, mmr: 1000, master: 9, lvl: 3, xp: 0 },
                { cod: 22, mmr: 1000, master: 10, lvl: 3, xp: 0 },
                { cod: 23, mmr: 1000, master: 11, lvl: 3, xp: 0 },
                { cod: 4, mmr: 1000, master: 7, lvl: 3, xp: 0 },
            ])
            .mockResolvedValueOnce([{ battles: 0 }])
            .mockResolvedValueOnce([{ lvl: 3, xp: 10, silver: 50, cod: 4, name: 'G4', skin: '', vstr: 1, vagi: 1, vint: 1, mmr: 1000 }]);
        run.mockResolvedValueOnce({ log: { id: 99, hash: 'real' }, simulation, error: '' });

        await RankedBattle.fight({ id: 7 }, '9'.repeat(32));

        const [, reports] = Mysql.insert.mock.calls.find(([table]) => table === 'reports');
        expect(reports.map(report => report.result)).toEqual(['win', 'loss', 'loss', 'loss', 'loss']);
        expect(reports.find(report => report.gladiator === 4).result).toBe('win');
    });

    test('a battle with no survivor is a draw for every gladiator', async () => {
        const simulation = [
            { simtime: 0, glads: [{ name: 'Zed', user: 'Bo', hp: 9 }, { name: 'Max', user: 'Ana', hp: 9 }] },
            { simtime: 10, glads: [{ name: 'Zed', user: 'Bo', hp: 0 }, { name: 'Max', user: 'Ana', hp: 5 }] },
            { simtime: 20, glads: [{ name: 'Zed', user: 'Bo', hp: 0 }, { name: 'Max', user: 'Ana', hp: 0 }] },
        ];
        Mysql.select
            .mockResolvedValueOnce([{ gladiator: 4, opponents: '[20]' }])
            .mockResolvedValueOnce([{ id: 7 }, { id: 8 }])
            .mockResolvedValueOnce([{ cod: 20, mmr: 1000, master: 8, lvl: 3, xp: 0 }, { cod: 4, mmr: 1000, master: 7, lvl: 3, xp: 0 }])
            .mockResolvedValueOnce([{ battles: 0 }])
            .mockResolvedValueOnce([{ lvl: 3, xp: 10, silver: 50, cod: 4, name: 'Max', skin: '', vstr: 1, vagi: 1, vint: 1, mmr: 1000 }]);
        run.mockResolvedValueOnce({ log: { id: 9, hash: 'abc' }, simulation, error: '' });

        await RankedBattle.fight({ id: 7 }, 'f'.repeat(32));

        const [, reports] = Mysql.insert.mock.calls.find(([table]) => table === 'reports');
        expect(reports.map(report => report.result)).toEqual(['draw', 'draw']);
        expect(reports.map(report => report.placement)).toEqual([0, 1]);
    });
});

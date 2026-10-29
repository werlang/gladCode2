import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        select: vi.fn(), findOne: vi.fn(), count: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
        raw: sql => ({ toSqlString: () => sql }),
        contains: text => `%${text}%`,
        withTransaction: vi.fn(operation => operation({ connection: 'tx' })),
    },
}));
vi.mock('node:fs/promises', () => ({ readFile: vi.fn(), rm: vi.fn(), writeFile: vi.fn() }));

const { Mysql } = await import('../../../helpers/mysql.js');
const { rm, writeFile } = await import('node:fs/promises');
const { DevTournament, TEST_MARKER } = await import('../../../model/dev-tournament.js');

const tx = { connection: 'tx' };

describe('dev tools tournaments', () => {
    beforeEach(() => vi.clearAllMocks());

    test('a test tournament needs a manager and enough gladiators', async () => {
        await expect(DevTournament.bootstrap({ name: 'Copa', teams: 2, maxTime: '10 min', managerId: 7 })).rejects.toMatchObject({ code: 'INVALID_MAX_TIME' });
        Mysql.findOne.mockResolvedValueOnce(null);
        await expect(DevTournament.bootstrap({ name: 'Copa', teams: 2, maxTime: '00:10:00', managerEmail: 'x@example.com' })).rejects.toMatchObject({ code: 'MANAGER_NOT_FOUND' });
        Mysql.findOne.mockResolvedValueOnce({ id: 7, apelido: 'Ana' });
        Mysql.count.mockResolvedValueOnce(0);
        Mysql.select.mockResolvedValueOnce([{ cod: 1, name: 'A', apelido: 'Bo' }]);
        await expect(DevTournament.bootstrap({ name: 'Copa', teams: 2, maxTime: '00:10:00', managerId: 7 })).rejects.toMatchObject({ code: 'FEW_GLADIATORS' });
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('a test tournament gets full teams of random gladiators and the marker', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 7, apelido: 'Ana' });
        Mysql.count.mockResolvedValueOnce(0);
        Mysql.select.mockResolvedValueOnce(Array.from({ length: 6 }, (_, index) => ({ cod: index + 1, name: `G${index}`, apelido: `M${index}` })));
        Mysql.insert.mockResolvedValueOnce({ insertId: 40 }).mockResolvedValueOnce({ insertId: 41 }).mockResolvedValueOnce({}).mockResolvedValueOnce({ insertId: 42 }).mockResolvedValueOnce({});

        const created = await DevTournament.bootstrap({ name: 'Copa', teams: 2, maxTime: '00:10:00', managerId: 7 });
        expect(created).toMatchObject({ id: 40, manager: 'Ana', teams: [{ id: 41, name: 'Team A' }, { id: 42, name: 'Team B' }] });
        expect(Mysql.insert.mock.calls[0][1].description).toContain(TEST_MARKER);
        expect(Mysql.insert.mock.calls[2]).toEqual(['gladiator_teams', [1, 2, 3].map(gladiator => ({ gladiator, team: 41, visible: 1 })), tx]);
    });

    test('only test tournaments are deleted', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 131, name: 'Copa', description: 'Real one' }]);
        await expect(DevTournament.remove(131)).rejects.toMatchObject({ code: 'NOT_A_TEST_TOURNAMENT' });
        expect(Mysql.delete).not.toHaveBeenCalled();
    });

    test('deleting a tournament keeps the battle logs another tournament still shows', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ id: 134, name: 'Copa', description: `${TEST_MARKER} x` }])
            .mockResolvedValueOnce([{ id: 1, round: 1, log: 90 }, { id: 2, round: 2, log: 91 }])
            .mockResolvedValueOnce([{ log: 90 }])
            .mockResolvedValueOnce([{ id: 5 }]);
        Mysql.delete.mockResolvedValue(1);

        await DevTournament.remove(134);
        expect(Mysql.delete).toHaveBeenCalledWith('logs', { id: [91] }, tx);
        expect(rm).toHaveBeenCalledTimes(1);
        expect(rm.mock.calls[0][0]).toMatch(/91$/);
        expect(Mysql.delete).toHaveBeenLastCalledWith('tournament', { id: 134 }, tx);
        Mysql.delete.mockReset();
    });

    test('a reset needs a started tournament and an existing round', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 134, hash: '' }]);
        await expect(DevTournament.reset(134, 1)).rejects.toMatchObject({ code: 'TOURNAMENT_NOT_STARTED' });
        Mysql.select.mockResolvedValueOnce([{ id: 134, hash: 'abc' }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ maxRound: 2 }]);
        await expect(DevTournament.reset('abc', 3)).rejects.toMatchObject({ code: 'ROUND_NOT_FOUND' });
        expect(Mysql.update).not.toHaveBeenCalled();
    });

    test('a reset clears the round, drops later ones and revives their dead', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ id: 134, name: 'Copa', hash: 'abc', maxtime: '00:05:00' }])
            .mockResolvedValueOnce([{ id: 1, round: 1, log: 90 }, { id: 2, round: 2, log: 91 }])
            .mockResolvedValueOnce([{ maxRound: 2 }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ id: 5 }, { id: 6 }]);
        Mysql.update.mockResolvedValue(3);

        const result = await DevTournament.reset('abc', 1);
        expect(result).toMatchObject({ round: 1, maxRound: 2, stats: { roundsRemoved: 1, groupsDeleted: 1, logsDeleted: 2, revived: 3 } });
        expect(Mysql.delete).toHaveBeenCalledWith('groups', { id: [2] }, tx);
        const cleared = Mysql.update.mock.calls.find(([table]) => table === 'groups');
        expect(cleared[1].deadline.toSqlString()).toBe("ADDTIME(NOW(), '00:05:00')");
        expect(Mysql.update).toHaveBeenCalledWith('gladiator_teams', { dead: 0 }, { team: [5, 6], dead: { '>=': 1 } }, tx);
        Mysql.update.mockReset();
    });

    test('an import refuses files that are not exports and names already taken', async () => {
        await expect(DevTournament.import({ teams: [] }, { mode: 'create' })).rejects.toMatchObject({ code: 'INVALID_EXPORT' });
        Mysql.count.mockResolvedValueOnce(1);
        await expect(DevTournament.import({ tournaments: [{ name: 'Copa' }], teams: [] }, { mode: 'create' })).rejects.toMatchObject({ code: 'TOURNAMENT_EXISTS' });
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('a failed import removes the log files it wrote', async () => {
        Mysql.count.mockResolvedValueOnce(0);
        Mysql.insert.mockResolvedValueOnce({ insertId: 50 }).mockResolvedValueOnce({ insertId: 70 }).mockRejectedValueOnce(new Error('bad group'));
        Mysql.select.mockResolvedValueOnce([]);
        const data = { tournaments: [{ name: 'Copa', hash: '' }], teams: [], logs: [{ id: 9, hash: 'abc', file_content: '[]' }], groups: [{ id: 1, round: 1, log: 9 }] };

        await expect(DevTournament.import(data, { mode: 'create' })).rejects.toThrow('bad group');
        expect(writeFile.mock.calls[0][0]).toMatch(/70$/);
        expect(rm.mock.calls[0][0]).toMatch(/70$/);
    });

    test('an import reuses only tournament logs, and a taken hash gets a new one', async () => {
        Mysql.count.mockResolvedValueOnce(0);
        Mysql.insert.mockResolvedValueOnce({ insertId: 50 }).mockResolvedValueOnce({ insertId: 71 });
        Mysql.select.mockResolvedValueOnce([{ id: 5, origin: 'ranked' }]).mockResolvedValueOnce([{ id: 6, origin: 'tourn' }]);
        const data = { tournaments: [{ name: 'Copa', hash: '' }], teams: [], logs: [{ id: 9, hash: 'abc', origin: 'ranked' }, { id: 10, hash: 'def' }] };

        await DevTournament.import(data, { mode: 'create' });
        const logInserts = Mysql.insert.mock.calls.filter(([table]) => table === 'logs');
        expect(logInserts).toHaveLength(1);
        expect(logInserts[0][1]).toMatchObject({ origin: 'tourn' });
        expect(logInserts[0][1].hash).toMatch(/^[a-f0-9]{16}$/);
        expect(logInserts[0][1].hash).not.toBe('abc');
    });

    test('importing over a tournament never takes another tournament\'s hash', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 15, name: 'Copa', description: `${TEST_MARKER} x` }]).mockResolvedValue([]);
        Mysql.count.mockResolvedValueOnce(1);
        await DevTournament.import({ tournaments: [{ name: 'Copa', hash: 'h12' }], teams: [] }, { mode: 'update', tournamentId: 15 });
        expect(Mysql.count).toHaveBeenCalledWith('tournament', { hash: 'h12', id: { not: 15 } }, tx);
        const update = Mysql.update.mock.calls.find(([table]) => table === 'tournament');
        expect(update[1].hash).toMatch(/^[a-f0-9]{16}$/);
        Mysql.select.mockReset();
    });
});

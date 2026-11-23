import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        select: vi.fn(), findOne: vi.fn(), count: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
        raw: sql => ({ toSqlString: () => sql }),
        withTransaction: vi.fn(operation => operation({ connection: 'tx' })),
    },
}));
vi.mock('../../../helpers/email.js', () => ({ sendMail: vi.fn() }));
vi.mock('../../../helpers/version.js', () => ({ VERSION: 'current' }));
// the tests hand over expanded steps directly
vi.mock('../../../helpers/battle-stats.js', () => ({ expandSteps: steps => steps }));
const run = vi.fn();
vi.mock('../../../model/battle.js', () => ({
    Battle: class {
        constructor(options) { this.options = options; }
        async addGladiators(ids) { this.ids = ids; return this; }
        run() { return run(this); }
    },
}));
const simulation = vi.fn();
vi.mock('../../../model/battle-log.js', () => ({
    BattleLog: class {
        constructor({ id }) { this.id = id; }
        simulation() { return simulation(this.id); }
    },
}));

const { Mysql } = await import('../../../helpers/mysql.js');
const { sendMail } = await import('../../../helpers/email.js');
const { Tournament, createGroups, shuffle, teamWord } = await import('../../../model/tournament.js');
const { TournamentRound } = await import('../../../model/tournament-round.js');

/** A step of a group battle: each gladiator's name, master and hp. */
const step = (simtime, ...glads) => ({ simtime, glads: glads.map(([name, user, hp]) => ({ name, user, hp })) });

describe('tournament helpers', () => {
    test('team words are three consonant-vowel pairs', () => {
        for (let index = 0; index < 20; index++) expect(teamWord()).toMatch(/^([bcdfghjklmnprstvwxz][aeiouy]){3}$/);
    });

    test('shuffling keeps every item', () => {
        expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    });

    test('groups take the round time only in HH:MM:SS', async () => {
        await expect(createGroups(1, 1, "00:05:00'), (1, NOW())#", {})).rejects.toMatchObject({ code: 'INVALID_ROUND_TIME' });
        expect(Mysql.insert).not.toHaveBeenCalled();

        Mysql.insert.mockResolvedValueOnce({ insertId: 8 }).mockResolvedValueOnce({ insertId: 9 });
        expect(await createGroups(2, 2, '00:05:00', { connection: 'tx' })).toEqual([8, 9]);
        expect(Mysql.insert.mock.calls[0][1].deadline.toSqlString()).toBe("ADDTIME(NOW(), '00:05:00')");
    });
});

describe('tournaments before the start', () => {
    beforeEach(() => vi.clearAllMocks());

    test('the next tournament read returns the live round with the server clock', async () => {
        Mysql.select.mockResolvedValueOnce([{ name: 'Copa', hash: 'ab12', round: 2, deadline: '2026-01-01 10:00:00', now: '2026-01-01 08:00:00' }]);
        expect(await Tournament.next(7)).toEqual({ name: 'Copa', hash: 'ab12', round: 2, deadline: '2026-01-01 10:00:00', now: '2026-01-01 08:00:00' });
        Mysql.select.mockResolvedValueOnce([]);
        expect(await Tournament.next(7)).toBeNull();
    });

    test('a private tournament needs its password, except for its manager', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 1, manager: 9, password: 'secret' });
        await expect(Tournament.access(7, 1, 'guess')).rejects.toMatchObject({ status: 404, code: 'TOURNAMENT_NOT_FOUND' });
        Mysql.findOne.mockResolvedValueOnce({ id: 1, manager: 9, password: 'secret' });
        expect(await Tournament.access(7, 1, 'secret')).toMatchObject({ id: 1 });
        Mysql.findOne.mockResolvedValueOnce({ id: 1, manager: 7, password: 'secret' });
        expect(await Tournament.access(7, 1)).toMatchObject({ id: 1 });
    });

    test('joining a team takes its word and a free place', async () => {
        const team = { id: 5, password: 'bakoti', tournament: 1, flex: 0, hash: '', gladiators: 1 };
        Mysql.count.mockResolvedValue(1);
        Mysql.select.mockResolvedValueOnce([team]).mockResolvedValueOnce([]);
        await expect(Tournament.joinTeam(7, 5, { word: 'bakota', gladiator: 4, showCode: false })).rejects.toMatchObject({ code: 'WRONG_WORD' });
        Mysql.select.mockResolvedValueOnce([{ ...team, gladiators: 3 }]).mockResolvedValueOnce([]);
        await expect(Tournament.joinTeam(7, 5, { word: 'bakoti', gladiator: 4, showCode: false })).rejects.toMatchObject({ code: 'TEAM_FULL' });
        Mysql.select.mockResolvedValueOnce([{ ...team, hash: 'f00' }]);
        await expect(Tournament.joinTeam(7, 5, { word: 'bakoti', gladiator: 4, showCode: false })).rejects.toMatchObject({ code: 'TOURNAMENT_STARTED' });
        expect(Mysql.insert).not.toHaveBeenCalled();

        Mysql.select.mockResolvedValueOnce([team]).mockResolvedValueOnce([]);
        await Tournament.joinTeam(7, 5, { word: 'bakoti', gladiator: 4, showCode: true });
        expect(Mysql.insert).toHaveBeenCalledWith('gladiator_teams', { gladiator: 4, team: 5, visible: 1 }, { connection: 'tx' });
        Mysql.count.mockReset();
    });

    test('only gladiators of the master join', async () => {
        Mysql.count.mockResolvedValueOnce(0);
        await expect(Tournament.joinTeam(7, 5, { word: 'bakoti', gladiator: 40, showCode: false })).rejects.toMatchObject({ code: 'GLADIATOR_NOT_FOUND' });
        expect(Mysql.withTransaction).not.toHaveBeenCalled();
    });

    test('only the manager deletes a tournament', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 1, manager: 9, hash: '' });
        await expect(Tournament.remove(7, 1)).rejects.toMatchObject({ status: 403, code: 'MANAGER_ONLY' });
        expect(Mysql.delete).not.toHaveBeenCalled();
    });

    test('a tournament starts once every team has three gladiators', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 1, maxtime: '00:10:00' }]).mockResolvedValueOnce([{ id: 11, gladiators: 3 }, { id: 12, gladiators: 2 }]);
        await expect(Tournament.start(7, 1)).rejects.toMatchObject({ code: 'FEW_GLADIATORS' });
        expect(Mysql.update).not.toHaveBeenCalled();
    });

    test('starting shuffles the teams into groups of five and emails the masters', async () => {
        const teams = Array.from({ length: 6 }, (_, index) => ({ id: 11 + index, gladiators: 3 }));
        Mysql.select
            .mockResolvedValueOnce([{ id: 1, maxtime: '00:10:00' }])
            .mockResolvedValueOnce(teams)
            .mockResolvedValueOnce([{ email: 'ana@example.com', apelido: 'Ana' }])
            .mockResolvedValueOnce([{ round: 1, name: 'Copa', deadline: '26/10/2026 às 10:00:00' }]);
        Mysql.insert.mockResolvedValueOnce({ insertId: 60 }).mockResolvedValueOnce({ insertId: 61 });

        const hash = await Tournament.start(7, 1);
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
        expect(Mysql.update).toHaveBeenCalledWith('tournament', { hash }, { id: 1 }, { connection: 'tx' });
        const members = Mysql.insert.mock.calls.find(([table]) => table === 'group_teams')[1];
        expect(members.map(member => member.team).sort()).toEqual(teams.map(team => team.id));
        expect(members.filter(member => member.groupid === 60)).toHaveLength(3);
        expect(sendMail).toHaveBeenCalledWith('tournament', expect.objectContaining({ vars: expect.objectContaining({ round: 1, hash }) }));
    });
});

describe('tournament rounds', () => {
    beforeEach(() => vi.clearAllMocks());

    const manager = { id: 1, manager: 7, hash: 'h', maxtime: '00:05:00' };

    test('only the manager runs a group', async () => {
        Mysql.findOne.mockResolvedValueOnce({ ...manager, manager: 9 });
        await expect(TournamentRound.fight('h', 2, 7)).rejects.toMatchObject({ status: 403, code: 'MANAGER_ONLY' });
        expect(run).not.toHaveBeenCalled();
    });

    test('a group fights once every team chose', async () => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4 }, { gladiator: null }]);
        await expect(TournamentRound.fight('h', 2, 7)).rejects.toMatchObject({ code: 'GROUP_NOT_READY' });
        expect(run).not.toHaveBeenCalled();
    });

    test('a running or fought group does not fight again unless forced', async () => {
        for (const group of [{ log: null, busy: 1 }, { log: 30, busy: 0 }]) {
            Mysql.findOne.mockResolvedValueOnce(manager);
            Mysql.select.mockResolvedValueOnce([{ gladiator: 4, round: 2 }, { gladiator: 5, round: 2 }]).mockResolvedValueOnce([{ round: 2 }]).mockResolvedValueOnce([group]);
            await expect(TournamentRound.fight('h', 2, 7)).rejects.toMatchObject({ code: 'GROUP_BUSY' });
        }
        expect(run).not.toHaveBeenCalled();

        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4, round: 2 }, { gladiator: 5, round: 2 }]).mockResolvedValueOnce([{ round: 2 }]).mockResolvedValueOnce([{ log: 30, busy: 0 }]).mockResolvedValueOnce([{ gladiator: 4 }, { gladiator: 5 }]);
        run.mockResolvedValueOnce({ log: { id: 31, hash: 'def' }, error: '' });
        expect(await TournamentRound.fight('h', 2, 7, true)).toEqual({ hash: 'def', error: '' });
    });

    test('a group fights without potions under a lock it always releases', async () => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4, round: 2 }, { gladiator: 5, round: 2 }]).mockResolvedValueOnce([{ round: 2 }]).mockResolvedValueOnce([{ log: null, busy: 0 }]).mockResolvedValueOnce([{ gladiator: 4 }, { gladiator: 5 }]);
        run.mockResolvedValueOnce({ log: { id: 30, hash: 'abc' }, error: '' });
        expect(await TournamentRound.fight('h', 2, 7)).toEqual({ hash: 'abc', error: '' });
        // the group is claimed under a row lock, so two managers' clicks never both fight it
        expect(Mysql.select.mock.calls.at(-2)).toEqual([expect.stringMatching(/FROM `groups` WHERE id = \? FOR UPDATE$/), expect.arrayContaining([2]), { connection: 'tx' }]);
        // the gladiators are read again under that lock, so a late choice cannot slip in between
        expect(Mysql.select.mock.calls.at(-1)).toEqual(['SELECT gladiator FROM group_teams WHERE groupid = ? ORDER BY id', [2], { connection: 'tx' }]);
        expect(run.mock.calls[0][0]).toMatchObject({ ids: [4, 5], options: { origin: 'tourn', noitems: true } });
        expect(Mysql.update).toHaveBeenCalledWith('groups', { log: 30 }, { id: 2 });
        expect(Mysql.update).toHaveBeenLastCalledWith('groups', { locked: null }, { id: 2 });

        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4, round: 2 }, { gladiator: 5, round: 2 }]).mockResolvedValueOnce([{ round: 2 }]).mockResolvedValueOnce([{ log: null, busy: 0 }]).mockResolvedValueOnce([{ gladiator: 4 }, { gladiator: 5 }]);
        run.mockRejectedValueOnce(new Error('runner down'));
        await expect(TournamentRound.fight('h', 2, 7)).rejects.toThrow('runner down');
        expect(Mysql.update).toHaveBeenLastCalledWith('groups', { locked: null }, { id: 2 });
    });

    test('a group fights the choices it holds under its lock', async () => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        // a team switched to gladiator 9 between the first read and the lock
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4, round: 2 }, { gladiator: 5, round: 2 }]).mockResolvedValueOnce([{ round: 2 }])
            .mockResolvedValueOnce([{ log: null, busy: 0 }]).mockResolvedValueOnce([{ gladiator: 4 }, { gladiator: 9 }]);
        run.mockResolvedValueOnce({ log: { id: 30, hash: 'abc' }, error: '' });
        await TournamentRound.fight('h', 2, 7);
        expect(run.mock.calls[0][0].ids).toEqual([4, 9]);
    });

    test('a round waits for every group', async () => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select.mockResolvedValueOnce([]).mockResolvedValueOnce([{ round: 1 }]).mockResolvedValueOnce([{ id: 3, log: null }]);
        expect(await TournamentRound.advance('h', 7)).toEqual({ status: 'waiting' });
        expect(Mysql.select).toHaveBeenCalledWith('SELECT id FROM tournament WHERE id = ? FOR UPDATE', [manager.id], { connection: 'tx' });
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('a group with an unreadable log fights again', async () => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select.mockResolvedValueOnce([]).mockResolvedValueOnce([{ round: 1 }]).mockResolvedValueOnce([{ id: 3, log: 9 }]);
        simulation.mockRejectedValueOnce(new Error('missing file'));
        expect(await TournamentRound.advance('h', 7)).toEqual({ status: 'rerun' });
        expect(Mysql.update).toHaveBeenCalledWith('groups', { log: null, locked: null }, { id: 3 }, { connection: 'tx' });
    });

    test('the dead leave and the living meet in the next round, best placed first', async () => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ round: 2 }])
            .mockResolvedValueOnce([{ id: 3, log: 9 }, { id: 4, log: 10 }])
            .mockResolvedValueOnce([{ grt: 31, glt: 41, name: 'Zed', apelido: 'Ana', team: 100 }, { grt: 32, glt: 42, name: 'Rex', apelido: 'Bo', team: 200 }])
            .mockResolvedValueOnce([{ grt: 33, glt: 43, name: 'Max', apelido: 'Cy', team: 300 }, { grt: 34, glt: 44, name: 'Ivy', apelido: 'Di', team: 400 }])
            .mockResolvedValueOnce([{ id: 100 }, { id: 300 }]);
        simulation
            .mockResolvedValueOnce([step(1, ['Zed', 'Ana', 9], ['Rex', 'Bo', 9]), step(2, ['Zed', 'Ana', 9], ['Rex', 'Bo', 0])])
            .mockResolvedValueOnce([step(1, ['Max', 'Cy', 9], ['Ivy', 'Di', 9]), step(5, ['Max', 'Cy', 9], ['Ivy', 'Di', 0])]);
        Mysql.insert.mockResolvedValueOnce({ insertId: 70 });

        expect(await TournamentRound.advance('h', 7)).toEqual({ status: 'next' });
        expect(Mysql.update).toHaveBeenCalledWith('gladiator_teams', { dead: 2 }, { id: 42 }, { connection: 'tx' });
        expect(Mysql.update).toHaveBeenCalledWith('gladiator_teams', { dead: 2 }, { id: 44 }, { connection: 'tx' });
        expect(Mysql.update).toHaveBeenCalledWith('group_teams', { lasttime: 1005 }, { id: 33 }, { connection: 'tx' });
        expect(Mysql.insert.mock.calls[0]).toEqual(['groups', expect.objectContaining({ round: 3 }), { connection: 'tx' }]);
        expect(Mysql.insert).toHaveBeenLastCalledWith('group_teams', [{ team: 300, groupid: 70 }, { team: 100, groupid: 70 }], { connection: 'tx' });
    });

    test('a round with one team left ends the tournament', async () => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ round: 2 }])
            .mockResolvedValueOnce([{ id: 3, log: 9 }])
            .mockResolvedValueOnce([{ grt: 31, glt: 41, name: 'Zed', apelido: 'Ana', team: 100 }, { grt: 32, glt: 42, name: 'Rex', apelido: 'Bo', team: 200 }])
            .mockResolvedValueOnce([{ id: 100 }]);
        simulation.mockResolvedValueOnce([step(1, ['Zed', 'Ana', 9], ['Rex', 'Bo', 0])]);
        expect(await TournamentRound.advance('h', 7)).toEqual({ status: 'end' });
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('only the latest round\'s groups fight', async () => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select.mockResolvedValueOnce([{ gladiator: 4, round: 1 }, { gladiator: 5, round: 1 }]).mockResolvedValueOnce([{ round: 2 }]);
        await expect(TournamentRound.fight('h', 2, 7, true)).rejects.toMatchObject({ status: 409, code: 'ROUND_OVER' });
        expect(run).not.toHaveBeenCalled();
    });

    /** Advance with one fought group whose members are `members` and log is `steps`. */
    const advanceOne = (members, steps) => {
        Mysql.findOne.mockResolvedValueOnce(manager);
        Mysql.select
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ round: 2 }])
            .mockResolvedValueOnce([{ id: 3, log: 9 }])
            .mockResolvedValueOnce(members)
            .mockResolvedValueOnce([{ id: 100 }]);
        simulation.mockResolvedValueOnce(steps);
        return TournamentRound.advance('h', 7);
    };

    test('a gladiator renamed since its battle keeps its result, read in fight order', async () => {
        const members = [{ grt: 31, glt: 41, name: 'Zed II', apelido: 'Ana', team: 100 }, { grt: 32, glt: 42, name: 'Rex', apelido: 'Bob', team: 200 }];
        expect(await advanceOne(members, [step(1, ['Zed', 'Ana', 9], ['Rex', 'Bo', 0])])).toEqual({ status: 'end' });
        expect(Mysql.select.mock.calls[3][0]).toMatch(/ORDER BY grt\.id$/);
        expect(Mysql.update).toHaveBeenCalledWith('group_teams', { lasttime: 1001 }, { id: 31 }, { connection: 'tx' });
        expect(Mysql.update).toHaveBeenCalledWith('gladiator_teams', { dead: 2 }, { id: 42 }, { connection: 'tx' });
    });

    test('a log that fits neither names nor the group stops the round instead of dropping a team', async () => {
        const members = [{ grt: 31, glt: 41, name: 'Zed II', apelido: 'Ana', team: 100 }];
        await expect(advanceOne(members, [step(1, ['Zed', 'Ana', 9], ['Rex', 'Bo', 0])])).rejects.toMatchObject({ code: 'GROUP_LOG_MISMATCH' });
        expect(Mysql.insert).not.toHaveBeenCalled();
        Mysql.select.mockReset(); // drop the answers the stopped round never read
    });

    test('recording a group again replaces its earlier deaths', async () => {
        const members = [{ grt: 31, glt: 41, name: 'Zed', apelido: 'Ana', team: 100 }, { grt: 32, glt: 42, name: 'Rex', apelido: 'Bo', team: 200 }];
        await advanceOne(members, [step(1, ['Zed', 'Ana', 9], ['Rex', 'Bo', 0])]);
        const updates = Mysql.update.mock.calls.filter(([table]) => table === 'gladiator_teams');
        expect(updates).toEqual([
            ['gladiator_teams', { dead: 0 }, { id: [41, 42], dead: 2 }, { connection: 'tx' }],
            ['gladiator_teams', { dead: 2 }, { id: 42 }, { connection: 'tx' }],
        ]);
    });

    test('a choice waits for the group\'s lock and is refused while it fights', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ dead: 0, version: 'current', team: 100 }])
            .mockResolvedValueOnce([{ round: 2 }])
            .mockResolvedValueOnce([{ id: 3 }])
            .mockResolvedValueOnce([{ log: null, busy: 1 }]);
        await expect(TournamentRound.choose('h', 7, 4)).rejects.toMatchObject({ status: 409, code: 'GROUP_DONE' });
        expect(Mysql.select.mock.calls[3]).toEqual([expect.stringMatching(/FROM `groups` WHERE id = \? FOR UPDATE$/), [150, 3], { connection: 'tx' }]);
        expect(Mysql.update).not.toHaveBeenCalled();

        Mysql.select
            .mockResolvedValueOnce([{ dead: 0, version: 'current', team: 100 }])
            .mockResolvedValueOnce([{ round: 2 }])
            .mockResolvedValueOnce([{ id: 3 }])
            .mockResolvedValueOnce([{ log: null, busy: 0 }]);
        await TournamentRound.choose('h', 7, 4);
        expect(Mysql.update).toHaveBeenCalledWith('group_teams', { gladiator: 4 }, { groupid: 3, team: 100 }, { connection: 'tx' });
    });
});

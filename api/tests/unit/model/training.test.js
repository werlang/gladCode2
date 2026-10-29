import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        select: vi.fn(), findOne: vi.fn(), count: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
        raw: sql => ({ toSqlString: () => sql }),
        withTransaction: vi.fn(operation => operation({ connection: 'tx' })),
    },
}));
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
const { Training, invitationCode } = await import('../../../model/training.js');
const { TrainingRound } = await import('../../../model/training-round.js');

const tx = { connection: 'tx' };
/** A step of a group battle: each gladiator's name, master and hp. */
const step = (simtime, ...glads) => ({ simtime, glads: glads.map(([name, user, hp]) => ({ name, user, hp })) });
/** The training row `TrainingRound` reads by code. */
const running = { id: 5, name: 'Turma', description: '', manager: 7, players: 2, deadline: '2026-10-26 12:00:00', now: '2026-10-26 11:00:00.000', ended: 0 };

describe('trainings before the start', () => {
    beforeEach(() => vi.clearAllMocks());

    test('invitation codes are four letters or digits', () => {
        for (let index = 0; index < 20; index++) expect(invitationCode()).toMatch(/^[0-9A-Z]{4}$/);
    });

    test('only tutors with credits create trainings', async () => {
        await expect(Training.create({ id: 7, premium: null, credits: 10 }, {})).rejects.toMatchObject({ status: 403, code: 'TUTOR_ONLY' });
        await expect(Training.create({ id: 7, premium: '2020-01-01', credits: 0 }, {})).rejects.toMatchObject({ status: 402, code: 'NO_CREDITS' });
        expect(Mysql.insert).not.toHaveBeenCalled();

        Mysql.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
        Mysql.insert.mockResolvedValueOnce({ insertId: 9 });
        const training = await Training.create({ id: 7, premium: '2020-01-01', credits: 5 }, { name: 'Turma A', description: '', maxMinutes: 30, players: 3, weight: 1 });
        expect(training).toEqual({ id: 9, hash: expect.stringMatching(/^[0-9A-Z]{4}$/) });
        // a code in use is drawn again
        expect(Mysql.count).toHaveBeenCalledTimes(2);
    });

    test('a started or joined training answers before an expired invitation', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 5, name: 'Turma', expired: 1 }]).mockResolvedValueOnce([{ started: 1 }]);
        expect(await Training.invitation(7, 'AB12')).toEqual({ id: 5, name: 'Turma', status: 'started' });
        Mysql.select.mockResolvedValueOnce([{ id: 5, name: 'Turma', expired: 1 }]).mockResolvedValueOnce([{ started: 0 }]).mockResolvedValueOnce([{ joined: 1 }]);
        expect(await Training.invitation(7, 'AB12')).toEqual({ id: 5, name: 'Turma', status: 'joined' });
        Mysql.select.mockResolvedValueOnce([{ id: 5, name: 'Turma', expired: 1 }]).mockResolvedValueOnce([{ started: 0 }]).mockResolvedValueOnce([{ joined: 0 }]);
        await expect(Training.invitation(7, 'AB12')).rejects.toMatchObject({ status: 410, code: 'INVITATION_EXPIRED' });
        Mysql.select.mockResolvedValueOnce([]);
        await expect(Training.invitation(7, 'ZZZZ')).rejects.toMatchObject({ status: 404, code: 'TRAINING_NOT_FOUND' });
    });

    test('a master joins once, with their own gladiator, before the start', async () => {
        Mysql.count.mockResolvedValueOnce(0);
        await expect(Training.join(7, 'AB12', 40)).rejects.toMatchObject({ code: 'GLADIATOR_NOT_FOUND' });

        Mysql.count.mockResolvedValueOnce(1);
        Mysql.select.mockResolvedValueOnce([{ id: 5, name: 'Turma', expired: 0 }]).mockResolvedValueOnce([{ started: 0 }]).mockResolvedValueOnce([{ joined: 1 }]);
        await expect(Training.join(7, 'AB12', 4)).rejects.toMatchObject({ code: 'ALREADY_JOINED' });
        Mysql.count.mockResolvedValueOnce(1);
        Mysql.select.mockResolvedValueOnce([{ id: 5, name: 'Turma', expired: 0 }]).mockResolvedValueOnce([{ started: 1 }]);
        await expect(Training.join(7, 'AB12', 4)).rejects.toMatchObject({ code: 'TRAINING_STARTED' });
        expect(Mysql.insert).not.toHaveBeenCalled();

        Mysql.count.mockResolvedValueOnce(1);
        Mysql.select.mockResolvedValueOnce([{ id: 5, name: 'Turma', expired: 0 }]).mockResolvedValueOnce([{ started: 0 }]).mockResolvedValueOnce([{ joined: 0 }]);
        expect(await Training.join(7, 'AB12', 4)).toEqual({ id: 5, name: 'Turma' });
        expect(Mysql.insert).toHaveBeenCalledWith('gladiator_training', { gladiator: 4, training: 5, score: 0 }, tx);
    });

    test('only the manager changes a training, and only before the start', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 5, manager: 9 });
        await expect(Training.update(7, 5, { name: 'Outro nome' })).rejects.toMatchObject({ status: 403, code: 'MANAGER_ONLY' });
        Mysql.findOne.mockResolvedValueOnce({ id: 5, manager: 7 });
        Mysql.select.mockResolvedValueOnce([{ started: 1 }]);
        await expect(Training.kick(7, 5, 4)).rejects.toMatchObject({ code: 'TRAINING_STARTED' });
        expect(Mysql.update).not.toHaveBeenCalled();
        expect(Mysql.delete).not.toHaveBeenCalled();
    });

    test('a participant sees the room without the invitation', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ id: 5, name: 'Turma', description: 'd', manager: 9, maxtime: 30, players: 3, hash: 'AB12', expired: 0 }])
            .mockResolvedValueOnce([{ started: 0 }])
            .mockResolvedValueOnce([{ joined: 1 }])
            .mockResolvedValueOnce([{ cod: 4, name: 'Zed', master: 7, apelido: 'Ana' }, { cod: 8, name: 'Rex', master: 9, apelido: 'Bo' }]);
        const room = await Training.room(7, 5);
        expect(room).toEqual({
            status: 'participate', name: 'Turma', description: 'd', maxMinutes: 30, players: 3,
            gladiators: [{ gladiator: 'Zed', master: 'Ana', mine: true }, { gladiator: 'Rex', master: 'Bo', mine: false }],
        });
    });

    test('starting deals the masters round-robin into groups of the battle size', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 5, manager: 7, players: 2, maxtime: 30, hash: 'AB12' });
        Mysql.select.mockResolvedValueOnce([{ started: 0 }]).mockResolvedValueOnce([{ id: 1 }]);
        await expect(Training.start(7, 5)).rejects.toMatchObject({ code: 'FEW_PLAYERS' });

        Mysql.findOne.mockResolvedValueOnce({ id: 5, manager: 7, players: 2, maxtime: 30, hash: 'AB12' });
        Mysql.select.mockResolvedValueOnce([{ started: 0 }]).mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
        Mysql.insert.mockResolvedValueOnce({ insertId: 70 }).mockResolvedValueOnce({ insertId: 71 }).mockResolvedValueOnce({ insertId: 72 });
        expect(await Training.start(7, 5)).toBe('AB12');

        const placed = Mysql.update.mock.calls.filter(([table]) => table === 'gladiator_training').map(([, { groupid }]) => groupid);
        expect(placed.sort()).toEqual([70, 70, 71, 71, 72]);
        const deadline = Mysql.update.mock.calls.find(([table]) => table === 'training')[1].deadline;
        expect(deadline.toSqlString()).toBe('NOW(3) + INTERVAL 30 MINUTE');
    });
});

describe('training rounds', () => {
    beforeEach(() => vi.clearAllMocks());

    /** Queues the reads `advance` makes before it picks a group. */
    const advanceReads = (groups, training = running) => Mysql.select
        .mockResolvedValueOnce([training])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ round: 1 }])
        .mockResolvedValueOnce(groups);

    test('nothing fights once the training time is over', async () => {
        Mysql.select.mockResolvedValueOnce([{ ...running, ended: 1 }]);
        expect(await TrainingRound.advance('AB12')).toEqual({ status: 'end' });
        expect(Mysql.withTransaction).not.toHaveBeenCalled();
    });

    test('groups wait for the round time, and a fighting group is left alone', async () => {
        advanceReads([{ id: 3, log: null, due: 0, busy: 0 }, { id: 4, log: null, due: null, busy: 0 }]);
        expect(await TrainingRound.advance('AB12')).toEqual({ status: 'wait' });
        expect(Mysql.select).toHaveBeenCalledWith('SELECT id FROM training WHERE id = ? FOR UPDATE', [running.id], tx);
        advanceReads([{ id: 3, log: 30, due: 1, busy: 0 }, { id: 4, log: null, due: 1, busy: 1 }]);
        expect(await TrainingRound.advance('AB12')).toEqual({ status: 'busy' });
        expect(Mysql.update).not.toHaveBeenCalled();
        expect(run).not.toHaveBeenCalled();
    });

    test('a due group is locked, fought and scored by survival', async () => {
        advanceReads([{ id: 3, log: 30, due: 1, busy: 0 }, { id: 4, log: null, due: 1, busy: 0 }]);
        Mysql.select.mockResolvedValueOnce([{ id: 41, cod: 4, name: 'Zed', apelido: 'Ana' }, { id: 42, cod: 8, name: 'Rex', apelido: 'Bo' }, { id: 43, cod: 9, name: 'Max', apelido: 'Cy' }]);
        run.mockResolvedValueOnce({ log: { id: 31, hash: 'abc' }, error: '' });
        simulation.mockResolvedValueOnce([
            step(1, ['Zed', 'Ana', 9], ['Rex', 'Bo', 9], ['Max', 'Cy', 9]),
            step(20, ['Zed', 'Ana', 9], ['Rex', 'Bo', 0], ['Max', 'Cy', 9]),
            step(50, ['Zed', 'Ana', 5], ['Rex', 'Bo', 0], ['Max', 'Cy', 0]),
        ]);

        expect(await TrainingRound.advance('AB12')).toEqual({ status: 'fought', group: 4, hash: 'abc', error: '' });
        expect(Mysql.update).toHaveBeenCalledWith('training_groups', { locked: expect.anything() }, { id: 4 }, tx);
        expect(run.mock.calls[0][0]).toMatchObject({ ids: [4, 8, 9], options: { origin: 'train' } });
        expect(Mysql.update).toHaveBeenCalledWith('gladiator_training', { score: 10, lasttime: 1050 }, { id: 41 }, tx);
        expect(Mysql.update).toHaveBeenCalledWith('gladiator_training', { score: 6, lasttime: 20 }, { id: 43 }, tx);
        expect(Mysql.update).toHaveBeenCalledWith('gladiator_training', { score: 0, lasttime: 1 }, { id: 42 }, tx);
        expect(Mysql.update).toHaveBeenLastCalledWith('training_groups', { log: 31, locked: null }, { id: 4 }, tx);
    });

    test('a failed battle keeps its group locked so the pages retry it later', async () => {
        advanceReads([{ id: 4, log: null, due: 1, busy: 0 }]);
        Mysql.select.mockResolvedValueOnce([{ id: 41, cod: 4, name: 'Zed', apelido: 'Ana' }]);
        run.mockResolvedValueOnce({ log: null, error: 'NO_OUTPUT' });
        expect(await TrainingRound.advance('AB12')).toEqual({ status: 'fought', group: 4, hash: null, error: 'NO_OUTPUT' });
        expect(Mysql.update).toHaveBeenCalledTimes(1);
    });

    test('once every group fought, the next round groups the best scores together', async () => {
        advanceReads([{ id: 3, log: 30, due: 1, busy: 0 }, { id: 4, log: 31, due: 1, busy: 0 }], { ...running, players: 3 });
        Mysql.select.mockResolvedValueOnce([{ gladiator: 11 }, { gladiator: 12 }, { gladiator: 13 }, { gladiator: 14 }, { gladiator: 15 }]);
        Mysql.insert.mockResolvedValueOnce({ insertId: 80 }).mockResolvedValueOnce({}).mockResolvedValueOnce({ insertId: 81 }).mockResolvedValueOnce({});

        expect(await TrainingRound.advance('AB12')).toEqual({ status: 'next' });
        const entries = Mysql.insert.mock.calls.filter(([table]) => table === 'gladiator_training').map(([, rows]) => rows);
        expect(entries).toEqual([
            [{ gladiator: 11, groupid: 80, training: 5 }, { gladiator: 12, groupid: 80, training: 5 }, { gladiator: 13, groupid: 80, training: 5 }],
            [{ gladiator: 14, groupid: 81, training: 5 }, { gladiator: 15, groupid: 81, training: 5 }],
        ]);
        expect(Mysql.insert).toHaveBeenCalledWith('training_groups', { round: 2 }, tx);
    });

    test('a round reads as waiting, counting down, due, fighting or done', async () => {
        const status = async (rows, training = running) => {
            Mysql.select.mockResolvedValueOnce([training]).mockResolvedValueOnce(rows).mockResolvedValueOnce([{ round: 1 }]);
            return (await TrainingRound.status('AB12', 1)).status;
        };
        const row = (groupid, fields) => ({ id: groupid * 10, score: 0, lasttime: 0, groupid, deadline: '2026-10-26 11:05:00', due: 1, log: null, busy: 0, ...fields });
        expect(await status([row(3, { deadline: null, due: null })])).toBe('wait');
        expect(await status([row(3, { due: 0 })])).toBe('open');
        expect(await status([row(3, { log: 'abc' }), row(4)])).toBe('run');
        expect(await status([row(3, { log: 'abc' }), row(4, { busy: 1 })])).toBe('busy');
        expect(await status([row(3, { log: 'abc' }), row(4, { log: 'def' })])).toBe('done');
        expect(await status([row(3, { log: 'abc' }), row(4)], { ...running, ended: 1 })).toBe('end');
    });

    test('fought groups report the winner apart from its survival bonus', async () => {
        Mysql.select
            .mockResolvedValueOnce([running])
            .mockResolvedValueOnce([
                { id: 41, score: 10, lasttime: 1122.30004, groupid: 3, deadline: 'x', due: 1, log: 'abc', busy: 0 },
                { id: 42, score: 6, lasttime: 122.19999, groupid: 3, deadline: 'x', due: 1, log: 'abc', busy: 0 },
            ])
            .mockResolvedValueOnce([{ round: 1 }]);
        const { groups } = await TrainingRound.status('AB12', 1);
        expect(groups).toEqual([{ id: 3, log: 'abc', locked: false, teams: [{ id: 41, score: 10, time: 122.3, winner: true }, { id: 42, score: 6, time: 122.2, winner: false }] }]);
    });

    test('round 0 is the ranking once the time is over, and the round opened too late goes there', async () => {
        Mysql.select.mockResolvedValueOnce([running]).mockResolvedValueOnce([{ round: 3 }]);
        expect(await TrainingRound.view('AB12', 0, 7)).toEqual({ status: 'redirect', round: 3 });

        Mysql.select.mockResolvedValueOnce([{ ...running, ended: 1 }]).mockResolvedValueOnce([{ round: 3 }]).mockResolvedValueOnce([{ fought: 0 }]);
        expect(await TrainingRound.view('AB12', 3, 7)).toEqual({ status: 'redirect', round: 0 });

        Mysql.select
            .mockResolvedValueOnce([{ ...running, ended: 1 }])
            .mockResolvedValueOnce([{ round: 3 }])
            .mockResolvedValueOnce([{ name: 'Zed', apelido: 'Ana', score: '20', time: 138.70001220703125 }])
            .mockResolvedValueOnce([{ round: 2 }]);
        expect(await TrainingRound.view('AB12', 0, 7)).toEqual({ status: 'end', name: 'Turma', lastRound: 2, ranking: [{ gladiator: 'Zed', master: 'Ana', score: 20, time: 138.7 }] });
    });

    test('only the manager sets the round time, ends the training or reruns a group', async () => {
        Mysql.select.mockResolvedValue([running]);
        await expect(TrainingRound.setDeadline('AB12', 1, 5, 9)).rejects.toMatchObject({ code: 'MANAGER_ONLY' });
        await expect(TrainingRound.end('AB12', 9)).rejects.toMatchObject({ code: 'MANAGER_ONLY' });
        await expect(TrainingRound.rerun('AB12', 3, 9)).rejects.toMatchObject({ code: 'MANAGER_ONLY' });
        expect(Mysql.update).not.toHaveBeenCalled();
        Mysql.select.mockReset();

        Mysql.select.mockResolvedValueOnce([running]).mockResolvedValueOnce([{ round: 2 }]).mockResolvedValueOnce([{ round: 2 }]);
        await TrainingRound.rerun('AB12', 3, 7);
        expect(Mysql.update).toHaveBeenCalledWith('training_groups', expect.objectContaining({ locked: null, log: null }), { id: 3 }, tx);
        expect(Mysql.update).toHaveBeenCalledWith('gladiator_training', { score: 0, lasttime: 0 }, { groupid: 3 }, tx);
    });

    test('only the latest round\'s groups fight again', async () => {
        // round 3 opened as soon as round 2's last group fought: round 2 would never fight again
        Mysql.select.mockResolvedValueOnce([running]).mockResolvedValueOnce([{ round: 2 }]).mockResolvedValueOnce([{ round: 3 }]);
        await expect(TrainingRound.rerun('AB12', 3, 7)).rejects.toMatchObject({ status: 409, code: 'ROUND_OVER' });
        Mysql.select.mockResolvedValueOnce([running]).mockResolvedValueOnce([]);
        await expect(TrainingRound.rerun('AB12', 99, 7)).rejects.toMatchObject({ status: 404, code: 'GROUP_NOT_FOUND' });
        expect(Mysql.update).not.toHaveBeenCalled();
    });
});

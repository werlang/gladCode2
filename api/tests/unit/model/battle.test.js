import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/runner.js', () => ({ runBattle: vi.fn() }));
vi.mock('../../../helpers/mysql.js', () => ({ Mysql: { select: vi.fn(), find: vi.fn() } }));
vi.mock('../../../model/battle-log.js', () => ({ BattleLog: { create: vi.fn(async () => ({ hash: 'abc' })) } }));

const { runBattle } = await import('../../../helpers/runner.js');
const { Mysql } = await import('../../../helpers/mysql.js');
const { BattleLog } = await import('../../../model/battle-log.js');
const { Battle, battleError, crashedGladiators } = await import('../../../model/battle.js');

const SOURCE = name => `setup(){\n    setName("${name}");\n    setSTR(10);\n    setAGI(18);\n    setINT(0);\n    setSkin("[1]");\n}\n\nloop(){}`;
const LOG = [{ glads: [{ name: 'A', user: 'user0' }, { name: 'B#C', user: 'Ana' }] }, { glads: [{}, { crashed: 1 }] }];

describe('Battle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Mysql.find.mockResolvedValue([]);
    });

    test('counted battles are judged by the log, editor runs keep any error', () => {
        expect(battleError(true, [{}], 'stderr')).toBe('');
        expect(battleError(true, null, 'boom')).toBe('boom');
        expect(battleError(false, [{}], 'warning')).toBe('warning');
    });

    test('crashed gladiators are read from the log, ignoring injected indexes', () => {
        expect(crashedGladiators([{ glads: [{}, {}] }, { glads: [{}, { crashed: 1 }, { crashed: 1 }] }])).toEqual([1]);
    });

    test('a battle with a broken setup does not run', async () => {
        const result = await new Battle({ origin: 'editor', sandbox: true }).addSource('setup(){ setSTR(30); }').run();
        expect(result.error).toBe('INVALID_ATTR');
        expect(runBattle).not.toHaveBeenCalled();
    });

    test('a battle runs, gets its skins and stores its log', async () => {
        runBattle.mockResolvedValue({ simlog: JSON.stringify(LOG), error: '' });
        const battle = new Battle({ origin: 'editor', sandbox: true }).addSource(SOURCE('A')).addSource(SOURCE('B C').replace('setSkin("[1]")', 'setSkin("[2]");\n    setUser("Ana")'), { edited: true });
        const { log, error } = await battle.run();
        expect(error).toBe('');
        expect(log.hash).toBe('abc');
        const [stored, origin] = BattleLog.create.mock.calls[0];
        expect(origin).toBe('editor');
        expect(stored[0].glads.map(glad => glad.skin)).toEqual(['[1]', '[2]']);
        expect(runBattle.mock.calls[0][1]).toEqual({ sandbox: true, noitems: false });
    });

    test('editor runs fail on engine errors and on an empty log', async () => {
        runBattle.mockResolvedValueOnce({ simlog: '', error: 'code1.c: error' });
        expect((await new Battle({ origin: 'editor', sandbox: true }).addSource(SOURCE('A')).run()).error).toBe('code1.c: error');
        runBattle.mockResolvedValueOnce({ simlog: '[]', error: '' });
        expect((await new Battle({ origin: 'ranked' }).addSource(SOURCE('A')).run()).error).toBe('NO_OUTPUT');
        expect(BattleLog.create).not.toHaveBeenCalled();
    });

    test('saved gladiators get a setup with their master\'s potions, unless items are off', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ cod: 4, name: 'Zed', vstr: 10, vagi: 18, vint: 0, skin: '[3]', code: 'loop(){}', master: 9, apelido: 'Bo' }])
            .mockResolvedValueOnce([{ item: 5 }, { item: 7 }]);
        runBattle.mockResolvedValue({ simlog: '', error: '' });
        await (await new Battle({ origin: 'ranked' }).addGladiators([4])).run();
        expect(runBattle.mock.calls[0][0][0]).toContain('setSlots("5,7,0,0");');

        Mysql.select.mockResolvedValueOnce([{ cod: 4, name: 'Zed', vstr: 10, vagi: 18, vint: 0, skin: '[3]', code: 'loop(){}', master: 9, apelido: 'Bo' }]);
        await (await new Battle({ origin: 'tourn', noitems: true }).addGladiators([4])).run();
        expect(runBattle.mock.calls[1][0][0]).toContain('setSlots("0,0,0,0");');
        expect(runBattle.mock.calls[1][1]).toEqual({ sandbox: false, noitems: true });
    });

    test('a save test runs without storing a log', async () => {
        runBattle.mockResolvedValue({ simlog: JSON.stringify(LOG), error: '' });
        const result = await new Battle({ origin: 'editor', sandbox: true })
            .addDraft({ name: 'Zed', nick: 'Bo', vstr: 10, vagi: 18, vint: 0, skin: '[1]', code: 'loop(){}' })
            .run({ store: false });
        expect(result).toMatchObject({ log: null, error: '' });
        expect(BattleLog.create).not.toHaveBeenCalled();
    });
});

import { afterAll, describe, expect, test, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({ cp: vi.fn(), mkdir: vi.fn(), rm: vi.fn(async () => {}), writeFile: vi.fn() }));
vi.stubEnv('RUNNER_CONCURRENCY', '2');
/** @type {Array<(value: unknown) => void>} */
const answers = [];
vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => answers.push(resolve))));

const { oneBattlePerClient, runBattle } = await import('../../../helpers/runner.js');

/** Lets pending promise callbacks run. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const ok = { ok: true, json: async () => ({ simlog: '[]', error: '' }) };

describe('runner client', () => {
    afterAll(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    test('only RUNNER_CONCURRENCY battles run at once, the others wait their turn', async () => {
        const battles = [1, 2, 3].map(() => runBattle(['loop(){}']));
        await settle();
        expect(fetch).toHaveBeenCalledTimes(2);

        answers.shift()(ok);
        await battles[0];
        await settle();
        expect(fetch).toHaveBeenCalledTimes(3);

        answers.splice(0).forEach(answer => answer(ok));
        await expect(Promise.all(battles)).resolves.toHaveLength(3);
    });

    test('a client runs one battle at a time, others are not held back', async () => {
        let finish;
        const first = oneBattlePerClient('ip:1.2.3.4', () => new Promise(resolve => { finish = resolve; }));
        await expect(oneBattlePerClient('ip:1.2.3.4', async () => 'second')).rejects.toMatchObject({ status: 429, code: 'BATTLE_RUNNING' });
        await expect(oneBattlePerClient('user:7', async () => 'other')).resolves.toBe('other');

        finish('first');
        await expect(first).resolves.toBe('first');
        await expect(oneBattlePerClient('ip:1.2.3.4', async () => 'again')).resolves.toBe('again');
    });

    test('a failed battle frees its client', async () => {
        await expect(oneBattlePerClient('user:8', async () => { throw new Error('runner down'); })).rejects.toThrow('runner down');
        await expect(oneBattlePerClient('user:8', async () => 'next')).resolves.toBe('next');
    });
});

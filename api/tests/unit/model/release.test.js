import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({ Mysql: { select: vi.fn(), update: vi.fn() } }));
vi.mock('../../../helpers/version.js', () => ({ VERSION: '2.10.0' }));
vi.mock('../../../helpers/email.js', () => ({ sendMail: vi.fn() }));

const { Mysql } = await import('../../../helpers/mysql.js');
const { sendMail } = await import('../../../helpers/email.js');
const { Release } = await import('../../../model/release.js');

describe('releases', () => {
    beforeEach(() => vi.clearAllMocks());

    test('the current version leads the gladiators-by-version list', async () => {
        Mysql.select.mockResolvedValueOnce([{ version: '2.9.1', count: 900 }, { version: '2.10.0', count: 665 }, { version: 'broken', count: '5' }]);
        expect(await Release.current()).toEqual({
            version: '2.10.0',
            announcing: false,
            gladiators: [{ version: '2.10.0', count: 665 }, { version: '2.9.1', count: 900 }, { version: 'broken', count: 5 }],
        });
    });

    test('only older versions are carried forward, never broken gladiators', async () => {
        await expect(Release.carryForward('2.10.0')).rejects.toMatchObject({ code: 'INVALID_FROM' });
        await expect(Release.carryForward('broken')).rejects.toMatchObject({ code: 'INVALID_FROM' });
        Mysql.update.mockResolvedValueOnce(9);
        expect(await Release.carryForward('2.9.1')).toBe(9);
        expect(Mysql.update).toHaveBeenCalledWith('gladiators', { version: '2.10.0' }, { version: '2.9.1' });
    });

    test('the announcement goes out once at a time and marks each master it reached', async () => {
        let finish;
        sendMail.mockImplementationOnce(async (template, { recipients, onSent }) => {
            await onSent(recipients[0]);
            await new Promise(resolve => {
                finish = resolve;
            });
            return { sent: 1, failed: 1 };
        });
        Mysql.select.mockResolvedValueOnce([{ id: 3, apelido: 'Ana', email: 'ana@example.com' }, { id: 4, apelido: 'Bo', email: 'bo@example.com' }]);
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        expect(await Release.announce({ changes: '<b>novo</b>', postLink: 'https://gladcode.dev/post/x' })).toBe(2);
        expect(sendMail).toHaveBeenCalledWith('update', expect.objectContaining({
            vars: { version: '2.10.0', changes: '<b>novo</b>', postlink: 'https://gladcode.dev/post/x' },
            raw: ['changes'],
        }));
        expect(Mysql.update).toHaveBeenCalledWith('usuarios', { email_update: '2.10.0' }, { id: 3 });
        await expect(Release.announce({ changes: 'x', postLink: 'https://x' })).rejects.toMatchObject({ code: 'ANNOUNCEMENT_RUNNING' });

        finish();
        Mysql.select.mockResolvedValue([]);
        await vi.waitFor(async () => expect((await Release.current()).announcing).toBe(false), { timeout: 500 });
        log.mockRestore();
    });

    test('nobody left to tell sends nothing', async () => {
        Mysql.select.mockResolvedValueOnce([]);
        expect(await Release.announce({ changes: 'x', postLink: 'https://x' })).toBe(0);
        expect(sendMail).not.toHaveBeenCalled();
    });
});

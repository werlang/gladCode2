import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({ Mysql: { select: vi.fn(), update: vi.fn(), raw: sql => ({ toSqlString: () => sql }) } }));

const { Mysql } = await import('../../../helpers/mysql.js');
const { Notification } = await import('../../../model/notification.js');
const { VERSION } = await import('../../../helpers/version.js');

describe('notification counts', () => {
    beforeEach(() => vi.resetAllMocks());

    test('the gladiator badge knows the used and total places', async () => {
        Mysql.select.mockResolvedValue([{
            messages: 2, friends: 1, gladiators: 4, outdated: 1,
            rankedReports: 3, duelReports: 1, duels: 1, news: 5,
        }]);

        const counts = await Notification.counts({ id: 7, lvl: 10, xp: 10, silver: 1250 });

        expect(counts.gladiators).toEqual({ used: 4, limit: 2, remaining: -2, outdated: 1 });
        expect(counts.version).toBe(VERSION);
        expect(counts.bell).toBeUndefined();
        expect(counts.user).toEqual({ level: 10, xp: 10, silver: 1250 });
    });

    test('marking the passive groups read clears news and finished reports/duels', async () => {
        Mysql.select.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]).mockResolvedValueOnce([{ id: 3 }]);
        Mysql.update.mockResolvedValue(1);

        expect(await Notification.markRead(7)).toEqual({ read: 3, news: true });
        expect(Mysql.update).toHaveBeenNthCalledWith(1, 'usuarios', { read_news: expect.any(Object) }, { id: 7 });
        expect(Mysql.update).toHaveBeenNthCalledWith(2, 'reports', { isread: 1 }, { id: [1, 2] });
        expect(Mysql.update).toHaveBeenNthCalledWith(3, 'duels', { isread: 1 }, { id: [3] });
    });
});

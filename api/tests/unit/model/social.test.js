import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        select: vi.fn(), findOne: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(),
        raw: sql => ({ toSqlString: () => sql }), contains: text => `%${text}%`,
    },
}));
vi.mock('../../../helpers/email.js', async original => ({ ...(await original()), sendMail: vi.fn() }));

const { Mysql } = await import('../../../helpers/mysql.js');
const { sendMail, fillTemplate } = await import('../../../helpers/email.js');
const { Friendship } = await import('../../../model/friendship.js');
const { Message, storedMessage } = await import('../../../model/message.js');
const { Report } = await import('../../../model/report.js');
const { Duel } = await import('../../../model/duel.js');

const ana = { id: 7, apelido: 'Ana' };

describe('social models', () => {
    beforeEach(() => vi.resetAllMocks());

    test('mail templates escape values unless trusted', () => {
        expect(fillTemplate('<p>{{nick}} %7B%7Bhtml%7D%7D</p>', { nick: '<b>x</b>', html: '<i>ok</i>' }, ['html'])).toBe('<p>&#60;b&#62;x&#60;/b&#62; <i>ok</i></p>');
        expect(fillTemplate('{{unknown}}', {})).toBe('{{unknown}}');
    });

    test('a friend request is stored and emailed when the master wants it', async () => {
        Mysql.findOne.mockResolvedValue({ id: 9, apelido: 'Bo', email: 'bo@example.com', pref_friend: 1 });
        Mysql.select.mockResolvedValue([]);
        await Friendship.request(ana, 9);
        expect(Mysql.insert).toHaveBeenCalledWith('amizade', { usuario1: 7, usuario2: 9 });
        expect(sendMail).toHaveBeenCalledWith('friend', expect.objectContaining({ recipients: [{ email: 'bo@example.com', name: 'Bo' }] }));
    });

    test('friend requests to oneself, unknown masters or existing friends are refused', async () => {
        Mysql.findOne.mockResolvedValueOnce(null);
        await expect(Friendship.request(ana, 9)).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
        Mysql.findOne.mockResolvedValueOnce({ id: 7 });
        await expect(Friendship.request(ana, 7)).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
        Mysql.findOne.mockResolvedValueOnce({ id: 9, pref_friend: 0 });
        Mysql.select.mockResolvedValueOnce([{ cod: 1, pendente: 1 }]);
        await expect(Friendship.request(ana, 9)).rejects.toMatchObject({ code: 'FRIENDSHIP_EXISTS' });
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('only requests made to the master can be answered', async () => {
        Mysql.update.mockResolvedValue(0);
        await expect(Friendship.answer(7, 3, true)).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND' });
        expect(Mysql.update).toHaveBeenCalledWith('amizade', { pendente: 0 }, { cod: 3, usuario2: 7, pendente: 1 });
    });

    test('messages are stored escaped and replies quote the original', async () => {
        Mysql.findOne
            .mockResolvedValueOnce({ cod: 5, sender: 9, message: 'oi &amp; tchau' })
            .mockResolvedValueOnce({ id: 9, apelido: 'Bo', email: 'bo@example.com', pref_message: 0 });
        await Message.reply(ana, 5, '<b>ok</b>');
        const [, row] = Mysql.insert.mock.calls[0];
        expect(row).toMatchObject({ sender: 7, receiver: 9, message: '<quote>oi &amp; tchau</quote>&#60;b&#62;ok&#60;/b&#62;' });
        expect(sendMail).not.toHaveBeenCalled();
    });

    test('the bell can read unread finished duels without marking them', async () => {
        Mysql.select.mockResolvedValue([{
            id: 3, time: '2026-01-01 10:00:00', log: 'ab12', isread: 0,
            glad1: 'Magnus', glad2: 'Arcaness', nick1: 'Ana', nick2: 'Bo', user1: 7,
        }]);
        expect(await Duel.unreadReports(9)).toEqual([{
            id: 3, time: '2026-01-01 10:00:00', log: 'ab12', read: false,
            glad: 'Arcaness', enemy: 'Magnus', user: 'Ana',
        }]);
        expect(Mysql.update).not.toHaveBeenCalled();
        expect(Mysql.select.mock.calls[0][0]).toContain('d.isread = 0');
    });

    test('a reply always keeps its own text, quoting only what still fits', () => {
        // a long thread: the original already quotes an older message and fills the column
        const original = `<quote>${'o'.repeat(500)}</quote>${'a'.repeat(1530)}&#60;b&#62;`;
        const stored = storedMessage('NEW REPLY', original);
        expect(stored.endsWith('NEW REPLY')).toBe(true);
        expect(stored.length).toBeLessThanOrEqual(2048);
        expect(stored).toBe(`<quote>${'a'.repeat(1530)}&#60;b&#62;</quote>NEW REPLY`);

        const cut = storedMessage('x'.repeat(2026), `${'a'.repeat(5)}&#60;bb`);
        expect(cut).toBe(`<quote>aaaaa</quote>${'x'.repeat(2026)}`);
        expect(storedMessage('x'.repeat(2040), 'quoted')).toBe('x'.repeat(2040));
        expect(() => storedMessage('x'.repeat(2049), null)).toThrow(expect.objectContaining({ code: 'MESSAGE_TOO_LONG' }));
    });

    test('a reply needs a message the master received', async () => {
        Mysql.findOne.mockResolvedValueOnce(null);
        await expect(Message.reply(ana, 5, 'x')).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
    });

    test('someone else\'s report cannot be made a favorite', async () => {
        Mysql.select.mockResolvedValue([]);
        await expect(Report.setFavorite(7, 99, true, 'mine')).rejects.toMatchObject({ status: 404, code: 'REPORT_NOT_FOUND' });
        expect(Mysql.update).not.toHaveBeenCalled();
    });

    test('masters only remove their own messages, friendships and duels', async () => {
        Mysql.delete.mockResolvedValue(0);
        await expect(Message.remove(7, 5)).rejects.toMatchObject({ status: 404, code: 'MESSAGE_NOT_FOUND' });
        expect(Mysql.delete).toHaveBeenCalledWith('messages', { cod: 5, receiver: 7 });

        Mysql.select.mockResolvedValue([]);
        await expect(Friendship.remove(7, 6)).rejects.toMatchObject({ status: 404, code: 'FRIENDSHIP_NOT_FOUND' });
        expect(Mysql.select.mock.calls.at(-1)).toEqual(['SELECT cod FROM amizade WHERE cod = ? AND (usuario1 = ? OR usuario2 = ?)', [6, 7, 7]]);
        await expect(Duel.remove(7, 8)).rejects.toMatchObject({ status: 404, code: 'DUEL_NOT_FOUND' });
        expect(Mysql.select.mock.calls.at(-1)).toEqual(['SELECT id FROM duels WHERE id = ? AND (user1 = ? OR user2 = ?)', [8, 7, 7]]);
        expect(Mysql.delete).toHaveBeenCalledTimes(1);
    });

    test('a report page can be marked as read', async () => {
        Mysql.select.mockResolvedValueOnce([{ total: 2 }]).mockResolvedValueOnce([
            { id: 1, time: 't', name: 'Zed', isread: 0, hash: 'h1', reward: 3, favorite: 0, comment: '', expired: 0 },
            { id: 2, time: 't', name: 'Zed', isread: 1, hash: 'h2', reward: -1, favorite: 1, comment: 'c', expired: 1 },
        ]);
        const page = await Report.list(7, { offset: 0, markRead: true });
        expect(page.reports.map(report => [report.read, report.hash, report.favorite])).toEqual([[false, 'h1', false], [true, null, true]]);
        expect(Mysql.update).toHaveBeenCalledWith('reports', { isread: 1 }, { id: [1, 2] });
    });
});

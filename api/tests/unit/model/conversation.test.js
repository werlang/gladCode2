import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../helpers/mysql.js', () => ({
    Mysql: {
        select: vi.fn(), findOne: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(),
        raw: sql => ({ toSqlString: () => sql }), contains: text => `%${text}%`,
    },
}));
vi.mock('../../../helpers/email.js', async original => ({ ...(await original()), sendMail: vi.fn() }));

const { Mysql } = await import('../../../helpers/mysql.js');
const { sendMail } = await import('../../../helpers/email.js');
const { Conversation, ONLINE_MINUTES } = await import('../../../model/conversation.js');
const { Message, decodeMessageText, decodeStoredMessage, messageView } = await import('../../../model/message.js');

const ana = { id: 7, apelido: 'Ana' };

describe('conversations', () => {
    beforeEach(() => vi.resetAllMocks());

    test('the list groups existing messages by the other master, newest first', async () => {
        Mysql.select.mockResolvedValue([{
            cod: 12, sender: 9, receiver: 7, time: '2026-11-24 10:00:00',
            message: 'Oi &amp; tchau', isread: 0, otherId: 9, nick: 'Bo', picture: '/profpics/bo.png',
            level: 12, idle: 2, unread: 3,
        }]);
        const { conversations } = await Conversation.list(7);
        expect(conversations).toHaveLength(1);
        expect(conversations[0]).toMatchObject({
            user: { id: 9, nick: 'Bo', picture: '/profpics/bo.png', level: 12, online: true },
            unread: 3,
            last: { id: 12, sender: 9, mine: false, body: 'Oi & tchau', read: false },
        });
        expect(Mysql.select.mock.calls[0][1]).toEqual([7, 7, 7, 7]);
        expect(Mysql.select.mock.calls[0][0]).toContain('LEAST(sender, receiver)');
        expect(Mysql.select.mock.calls[0][0]).toContain('TIMESTAMPDIFF(MINUTE, other.ativo, NOW())');
    });

    test('presence is online only inside the documented window', async () => {
        Mysql.select.mockResolvedValue([{
            cod: 12, sender: 9, receiver: 7, time: 't', message: 'x', isread: 1,
            otherId: 9, nick: 'Bo', picture: '', level: 1, idle: ONLINE_MINUTES, unread: 0,
        }]);
        expect((await Conversation.list(7)).conversations[0].user.online).toBe(true);

        Mysql.select.mockResolvedValue([{
            cod: 12, sender: 9, receiver: 7, time: 't', message: 'x', isread: 1,
            otherId: 9, nick: 'Bo', picture: '', level: 1, idle: ONLINE_MINUTES + 1, unread: 0,
        }]);
        expect((await Conversation.list(7)).conversations[0].user.online).toBe(false);
    });

    test('a thread pages a master\'s messages and never their full inbox', async () => {
        Mysql.select
            .mockResolvedValueOnce([{ id: 9, apelido: 'Bo', foto: '', lvl: 12, idle: 0 }])
            .mockResolvedValueOnce([{ total: 45 }])
            .mockResolvedValueOnce([{
                cod: 12, sender: 7, receiver: 9, time: '2026-11-24 10:00:00', message: 'oi', isread: 1,
            }]);
        const thread = await Conversation.thread(7, 9, 60);
        expect(thread).toMatchObject({
            user: { id: 9, nick: 'Bo', level: 12, online: true },
            total: 45,
            offset: 44,
            pageSize: 30,
        });
        expect(thread.messages).toEqual([{
            id: 12, sender: 7, mine: true, time: '2026-11-24 10:00:00', body: 'oi', quote: '', read: true,
        }]);
        expect(Mysql.select.mock.calls[1][1]).toEqual([7, 9, 9, 7]);
        expect(Mysql.select.mock.calls[2][1]).toEqual([7, 9, 9, 7, 30, 44]);
    });

    test('a conversation must be with another known master', async () => {
        await expect(Conversation.thread(7, 7)).rejects.toMatchObject({ status: 400, code: 'INVALID_CONVERSATION' });
        Mysql.select.mockResolvedValueOnce([]);
        await expect(Conversation.thread(7, 9)).rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
    });

    test('marking a conversation read only touches messages from that master to the master', async () => {
        Mysql.update.mockResolvedValue(2);
        Mysql.select.mockResolvedValueOnce([{ unreadTotal: 5 }]);
        await expect(Conversation.markRead(7, 9)).resolves.toEqual({ userId: 9, read: 2, unreadTotal: 5 });
        expect(Mysql.update).toHaveBeenCalledWith(
            'messages',
            { isread: 1 },
            { sender: 9, receiver: 7, isread: 0 },
        );
    });

    test('stored messages decode to the plain text a thread shows with textContent', () => {
        expect(decodeMessageText('&#60;b&#62;oi&#60;/b&#62; &amp; &#39;x&#39;')).toBe('<b>oi</b> & \'x\'');
        expect(decodeMessageText('&#x3C;x&#x3E;')).toBe('<x>');
        expect(decodeMessageText('plain')).toBe('plain');
        expect(decodeStoredMessage('<quote>oi &amp; tchau &#60;3</quote>novo')).toEqual({
            quote: 'oi & tchau <3',
            body: 'novo',
        });
        expect(decodeStoredMessage('sem citação')).toEqual({ quote: '', body: 'sem citação' });
    });

    test('a sent message answers with the same view a thread uses', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 9, apelido: 'Bo', email: 'bo@example.com', pref_message: 0 });
        Mysql.insert.mockResolvedValueOnce({ insertId: 12 });
        Mysql.select.mockResolvedValueOnce([{
            cod: 12, sender: 7, receiver: 9, time: '2026-11-24 10:00:00', message: '&#60;i&#62;oi', isread: 0,
        }]);
        const view = await Message.send(ana, 9, '<i>oi');
        expect(view).toEqual({
            id: 12, sender: 7, mine: true, time: '2026-11-24 10:00:00', body: '<i>oi', quote: '', read: false,
        });
        expect(Mysql.insert).toHaveBeenCalledWith('messages', {
            time: expect.anything(), sender: 7, receiver: 9, message: '&#60;i&#62;oi',
        });
        expect(sendMail).not.toHaveBeenCalled();
    });

    test('a master cannot start a conversation with themselves', async () => {
        Mysql.findOne.mockResolvedValueOnce({ id: 7, apelido: 'Ana', email: 'ana@example.com', pref_message: 0 });
        await expect(Message.send(ana, 7, 'oi')).rejects.toMatchObject({ status: 400, code: 'INVALID_RECIPIENT' });
        expect(Mysql.insert).not.toHaveBeenCalled();
    });

    test('a message view marks the master\'s own messages by sender id', () => {
        const row = { cod: '4', sender: '9', time: 't', message: 'x', isread: '1' };
        expect(messageView(row, 7)).toMatchObject({ id: 4, sender: 9, mine: false, read: true });
        expect(messageView(row, 9)).toMatchObject({ mine: true });
    });
});

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

let currentUser = null;
vi.mock('../../../middleware/auth.js', () => ({
    auth: () => (req, res, next) => {
        if (!currentUser) return res.status(401).send({ code: 'NOT_SIGNED_IN' });
        req.user = currentUser;
        return next();
    },
}));
vi.mock('../../../model/conversation.js', () => ({
    Conversation: { list: vi.fn(), thread: vi.fn(), markRead: vi.fn() },
}));
vi.mock('../../../model/message.js', () => ({ Message: { send: vi.fn() } }));

const { Conversation } = await import('../../../model/conversation.js');
const { Message } = await import('../../../model/message.js');
const { errorMiddleware } = await import('../../../middleware/error.js');
const { conversationsRouter } = await import('../../../route/conversations.js');

const app = express();
app.use(express.json());
app.use('/conversations', conversationsRouter);
app.use(errorMiddleware);

const ana = { id: 7, apelido: 'Ana' };

describe('conversation routes', () => {
    beforeEach(() => {
        currentUser = ana;
        vi.resetAllMocks();
    });

    test('visitors cannot read or write conversations', async () => {
        currentUser = null;
        expect((await request(app).get('/conversations')).status).toBe(401);
        expect((await request(app).post('/conversations/9/messages').send({ message: 'x' })).status).toBe(401);
    });

    test('the list answers the signed-in master conversations', async () => {
        Conversation.list.mockResolvedValue({ conversations: [{ user: { id: 9 }, last: null, unread: 2 }] });
        const res = await request(app).get('/conversations');
        expect(res.body).toEqual({ conversations: [{ user: { id: 9 }, last: null, unread: 2 }] });
        expect(Conversation.list).toHaveBeenCalledWith(7);
    });

    test('a thread validates the other master and pages with the signed-in id', async () => {
        Conversation.thread.mockResolvedValue({ user: { id: 9 }, messages: [], total: 0, offset: 30, pageSize: 30 });
        const res = await request(app).get('/conversations/9').query({ offset: 30 });
        expect(res.body).toEqual({ user: { id: 9 }, messages: [], total: 0, offset: 30, pageSize: 30 });
        expect(Conversation.thread).toHaveBeenCalledWith(7, 9, 30);

        expect((await request(app).get('/conversations/0')).status).toBe(400);
        expect((await request(app).get('/conversations/9').query({ offset: -1 })).status).toBe(400);
        expect(Conversation.thread).toHaveBeenCalledTimes(1);
    });

    test('a message is stored for the signed-in sender and answers 201 with its view', async () => {
        const view = { id: 12, sender: 7, mine: true, time: 't', body: 'Olá', quote: '', read: false };
        Message.send.mockResolvedValue(view);
        const res = await request(app).post('/conversations/9/messages').send({ message: 'Olá' });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ message: view });
        expect(Message.send).toHaveBeenCalledWith(ana, 9, 'Olá');
        expect((await request(app).post('/conversations/9/messages').send({ message: '' })).status).toBe(400);
    });

    test('a read answers how many messages were marked and the new total', async () => {
        Conversation.markRead.mockResolvedValue({ userId: 9, read: 2, unreadTotal: 3 });
        const res = await request(app).post('/conversations/9/read');
        expect(res.body).toEqual({ userId: 9, read: 2, unreadTotal: 3 });
        expect(Conversation.markRead).toHaveBeenCalledWith(7, 9);
    });
});

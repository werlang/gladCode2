import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

let currentUser = null;
vi.mock('../../../middleware/auth.js', () => ({
    auth: ({ optional = false } = {}) => (req, res, next) => {
        if (!currentUser && !optional) return res.status(401).send({ code: 'NOT_SIGNED_IN' });
        req.user = currentUser;
        return next();
    },
}));
vi.mock('../../../model/news.js', () => ({ News: { list: vi.fn(), markAllRead: vi.fn() } }));

const { News } = await import('../../../model/news.js');
const { errorMiddleware } = await import('../../../middleware/error.js');
const { newsRouter } = await import('../../../route/news.js');

const app = express();
app.use(express.json());
app.use('/news', newsRouter);
app.use(errorMiddleware);

describe('news routes', () => {
    beforeEach(() => {
        currentUser = null;
        vi.resetAllMocks();
        News.list.mockResolvedValue([]);
    });

    test('the listing does not advance the read marker by default', async () => {
        currentUser = { id: 7, read_news: '2026-01-01 00:00:00', markNewsRead: vi.fn() };
        await request(app).get('/news?offset=5');
        expect(News.list).toHaveBeenCalledWith(5, { readBefore: '2026-01-01 00:00:00' });
        expect(currentUser.markNewsRead).not.toHaveBeenCalled();
    });

    test('the old explicit markRead=true still marks the list read', async () => {
        currentUser = { id: 7, read_news: null, markNewsRead: vi.fn(async () => {}) };
        await request(app).get('/news?markRead=true');
        expect(currentUser.markNewsRead).toHaveBeenCalledOnce();
    });

    test('marking all read answers the count and needs a session', async () => {
        News.markAllRead.mockResolvedValue({ read: 4, unread: 0 });
        currentUser = { id: 7 };
        expect((await request(app).post('/news/read')).body).toEqual({ read: 4, unread: 0 });
        expect(News.markAllRead).toHaveBeenCalledWith(currentUser);
        currentUser = null;
        expect((await request(app).post('/news/read')).status).toBe(401);
    });
});

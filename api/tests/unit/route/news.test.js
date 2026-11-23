import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

let currentUser = null;
vi.mock('../../../middleware/auth.js', () => ({
    auth: () => (req, res, next) => {
        req.user = currentUser;
        next();
    },
}));
vi.mock('../../../helpers/mysql.js', () => ({ Mysql: { select: vi.fn() } }));

const { Mysql } = await import('../../../helpers/mysql.js');
const { errorMiddleware } = await import('../../../middleware/error.js');
const { newsRouter } = await import('../../../route/news.js');

const app = express();
app.use('/news', newsRouter);
app.use(errorMiddleware);

const row = { hash: 'ab12', title: 'Hello', time: '2026-10-26 10:00:00.000', post: '<b>hi</b>' };

describe('news routes', () => {
    beforeEach(() => {
        currentUser = null;
        Mysql.select.mockReset();
    });

    test('lists posts from the offset and clears a reader\'s counter', async () => {
        Mysql.select.mockResolvedValue([row]);
        currentUser = { markNewsRead: vi.fn() };
        const res = await request(app).get('/news?offset=5');
        expect(res.body).toEqual({ posts: [{ hash: 'ab12', title: 'Hello', time: row.time, body: '<b>hi</b>' }] });
        expect(Mysql.select.mock.calls[0][1]).toEqual([5, 5]);
        expect(currentUser.markNewsRead).toHaveBeenCalled();
    });

    test('the shell feed can read posts without clearing the counter', async () => {
        Mysql.select.mockResolvedValue([row]);
        currentUser = { markNewsRead: vi.fn() };
        await request(app).get('/news?markRead=false');
        expect(currentUser.markNewsRead).not.toHaveBeenCalled();
    });

    test('a post comes with its neighbours', async () => {
        Mysql.select.mockResolvedValueOnce([row]).mockResolvedValueOnce([{ hash: '0001' }]).mockResolvedValueOnce([]);
        const res = await request(app).get('/news/ab12');
        expect(res.body).toMatchObject({ post: { hash: 'ab12' }, previous: '0001', next: null });
    });

    test('unknown and malformed hashes are refused', async () => {
        Mysql.select.mockResolvedValue([]);
        expect((await request(app).get('/news/ffff')).body.code).toBe('NEWS_NOT_FOUND');
        expect((await request(app).get('/news/xyz!')).body.code).toBe('INVALID_HASH');
        expect((await request(app).get('/news?offset=-1')).body.code).toBe('INVALID_OFFSET');
    });
});

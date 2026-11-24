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
vi.mock('../../../model/ranking.js', () => ({
    Ranking: {
        general: vi.fn(),
        window: vi.fn(),
        mine: vi.fn(),
        bestOffset: vi.fn(),
        tabs: vi.fn(),
        watchTab: vi.fn(),
        hashtag: vi.fn(),
    },
    windowSize: value => {
        const parsed = Number(value) || 9;
        const clamped = Math.max(3, Math.min(21, Math.trunc(parsed)));
        return clamped % 2 === 0 ? clamped + 1 : clamped;
    },
}));

const { Ranking } = await import('../../../model/ranking.js');
const { errorMiddleware } = await import('../../../middleware/error.js');
const { rankingRouter } = await import('../../../route/ranking.js');

const app = express();
app.use(express.json());
app.use('/ranking', rankingRouter);
app.use(errorMiddleware);

describe('ranking routes', () => {
    beforeEach(() => {
        currentUser = null;
        vi.resetAllMocks();
        Ranking.general.mockResolvedValue({ total: 0, ranking: [] });
        Ranking.window.mockResolvedValue({ total: 0, position: 0, page: 1, pageSize: 10, around: null, rows: [] });
        Ranking.mine.mockResolvedValue({ gladiators: [] });
    });

    test('the general list passes the search and the friend scope when signed in', async () => {
        currentUser = { id: 7 };
        await request(app).get('/ranking?offset=20&search=Mag&scope=friends');
        expect(Ranking.general).toHaveBeenCalledWith({ offset: 20, search: 'Mag', scope: 'friends', userId: 7 });
    });

    test('the friend scope needs a session', async () => {
        expect((await request(app).get('/ranking?scope=friends')).status).toBe(401);
        expect(Ranking.general).not.toHaveBeenCalled();
    });

    test('position on the list route is an alias of the window', async () => {
        await request(app).get('/ranking?position=128&size=8');
        expect(Ranking.window).toHaveBeenCalledWith({ position: 128, size: 9 });
    });

    test('the window needs exactly one of gladiatorId and position', async () => {
        expect((await request(app).get('/ranking/window')).body.code).toBe('INVALID_RANKING_WINDOW');
        expect((await request(app).get('/ranking/window?gladiatorId=4&position=2')).body.code).toBe('INVALID_RANKING_WINDOW');
        await request(app).get('/ranking/window?gladiatorId=4&size=2');
        expect(Ranking.window).toHaveBeenCalledWith({ gladiatorId: 4, size: 3 });
        await request(app).get('/ranking/window?position=9&size=20');
        expect(Ranking.window).toHaveBeenLastCalledWith({ position: 9, size: 21 });
    });

    test('my gladiators need a session and use its id', async () => {
        expect((await request(app).get('/ranking/mine')).status).toBe(401);
        currentUser = { id: 7 };
        await request(app).get('/ranking/mine');
        expect(Ranking.mine).toHaveBeenCalledWith(7);
    });
});

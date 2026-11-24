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
vi.mock('../../../model/report.js', () => ({
    Report: { list: vi.fn(), summary: vi.fn(), setFavorite: vi.fn() },
}));

const { Report } = await import('../../../model/report.js');
const { errorMiddleware } = await import('../../../middleware/error.js');
const { reportsRouter } = await import('../../../route/reports.js');

const app = express();
app.use(express.json());
app.use('/reports', reportsRouter);
app.use(errorMiddleware);

describe('reports routes', () => {
    beforeEach(() => {
        currentUser = { id: 7 };
        vi.resetAllMocks();
        Report.list.mockResolvedValue({ total: 0, reports: [] });
        Report.summary.mockResolvedValue({ results: [], renown: 0, unread: 0 });
    });

    test('the header summary answers the last results, renown and unread count', async () => {
        Report.summary.mockResolvedValue({ results: ['win', 'loss'], renown: 12.5, unread: 2 });

        const response = await request(app).get('/reports/summary');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ results: ['win', 'loss'], renown: 12.5, unread: 2 });
        expect(Report.summary).toHaveBeenCalledWith(7);
    });

    test('the list passes the page flags and never marks read unless asked', async () => {
        await request(app).get('/reports?offset=20&favorites=true&unreadOnly=true');

        expect(Report.list).toHaveBeenCalledWith(7, {
            offset: 20,
            favorites: true,
            unreadOnly: true,
            markRead: false,
        });
    });

    test('summary and list need a session', async () => {
        currentUser = null;

        expect((await request(app).get('/reports/summary')).status).toBe(401);
        expect((await request(app).get('/reports')).status).toBe(401);
    });
});

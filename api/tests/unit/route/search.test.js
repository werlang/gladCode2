import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../middleware/auth.js', () => ({
    auth: ({ optional = false } = {}) => (req, res, next) => {
        if (!optional) return res.status(401).send({ code: 'NOT_SIGNED_IN' });
        req.user = null;
        return next();
    },
}));
vi.mock('../../../model/search.js', () => ({ Search: { query: vi.fn() } }));

const { Search } = await import('../../../model/search.js');
const { errorMiddleware } = await import('../../../middleware/error.js');
const { searchRouter } = await import('../../../route/search.js');

const app = express();
app.use('/search', searchRouter);
app.use(errorMiddleware);

describe('global search route', () => {
    beforeEach(() => Search.query.mockReset());

    test('validates and caps the query before searching', async () => {
        Search.query.mockResolvedValue({ gladiators: [], masters: [] });
        expect((await request(app).get('/search?q=a')).body.code).toBe('INVALID_Q');
        expect((await request(app).get(`/search?q=${'a'.repeat(41)}`)).body.code).toBe('INVALID_Q');
        expect((await request(app).get('/search')).body.code).toBe('INVALID_Q');
        expect(Search.query).not.toHaveBeenCalled();
    });

    test('returns both groups for a valid term', async () => {
        Search.query.mockResolvedValue({ gladiators: [{ id: 42 }], masters: [{ id: 7 }] });
        const res = await request(app).get('/search?q=%20rel%20');
        expect(res.body).toEqual({ gladiators: [{ id: 42 }], masters: [{ id: 7 }] });
        expect(Search.query).toHaveBeenCalledWith('rel');
    });
});

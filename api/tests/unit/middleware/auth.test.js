import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const findById = vi.fn();
vi.mock('../../../model/user.js', () => ({ User: { findById } }));

const { signJwt } = await import('../../../helpers/jwt.js');
const { auth } = await import('../../../middleware/auth.js');
const { errorMiddleware } = await import('../../../middleware/error.js');

/** @param {Parameters<typeof auth>[0]} options */
function appWith(options) {
    const app = express();
    app.get('/', auth(options), (req, res) => res.send({ user: req.user?.id ?? null }));
    app.use(errorMiddleware);
    return app;
}

describe('auth middleware', () => {
    beforeEach(() => {
        findById.mockReset().mockImplementation(async id => ({ id, email: 'player@example.com', isAdmin: id === 1 }));
    });

    test('requires a session by default', async () => {
        const res = await request(appWith()).get('/');
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('NOT_SIGNED_IN');
    });

    test('loads the user named by the session cookie', async () => {
        const token = await signJwt({ id: 42 });
        const res = await request(appWith()).get('/').set('Cookie', `app_session=${token}`);
        expect(res.body).toEqual({ user: 42 });
        expect(findById).toHaveBeenCalledWith(42);
    });

    test('optional sessions let anonymous visitors through', async () => {
        const res = await request(appWith({ optional: true })).get('/');
        expect(res.body).toEqual({ user: null });
    });

    test('admin routes refuse other users', async () => {
        const player = await signJwt({ id: 42 });
        const admin = await signJwt({ id: 1 });
        expect((await request(appWith({ admin: true })).get('/').set('Cookie', `app_session=${player}`)).body.code).toBe('ADMIN_ONLY');
        expect((await request(appWith({ admin: true })).get('/').set('Cookie', `app_session=${admin}`)).body).toEqual({ user: 1 });
    });
});

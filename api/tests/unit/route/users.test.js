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
vi.mock('../../../helpers/uploads.js', () => ({ saveProfilePicture: vi.fn(async folder => `/profpics/${folder}.png?v=1`) }));
vi.mock('../../../helpers/google-auth.js', () => ({ GoogleAuth: { verify: vi.fn() } }));
vi.mock('../../../model/user.js', () => ({
    LANGUAGES: ['c', 'python', 'blocks'], GLAD_VIEWS: ['sprite', '3d'], User: { signInWithGoogle: vi.fn() },
}));

const { GoogleAuth } = await import('../../../helpers/google-auth.js');
const { User } = await import('../../../model/user.js');
const { errorMiddleware } = await import('../../../middleware/error.js');
const { authRouter } = await import('../../../route/auth.js');
const { usersRouter } = await import('../../../route/users.js');

const app = express();
app.use(express.json());
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use(errorMiddleware);

/** A signed-in user double. */
function player() {
    return {
        id: 7, pasta: 'abc',
        touch: vi.fn(),
        saveProfile: vi.fn(async changes => ({ id: 7, ...changes })),
        toJSON() { return { id: 7 }; },
    };
}

describe('auth and users routes', () => {
    beforeEach(() => {
        currentUser = null;
    });

    test('visitors get a null user', async () => {
        expect((await request(app).get('/users/me')).body).toEqual({ user: null });
    });

    test('the signed-in user is returned and marked active', async () => {
        currentUser = player();
        const res = await request(app).get('/users/me');
        expect(res.body).toEqual({ user: { id: 7 } });
        expect(currentUser.touch).toHaveBeenCalled();
    });

    test('Google sign-in sets an HttpOnly session cookie', async () => {
        GoogleAuth.verify.mockResolvedValue({ email: 'ana@example.com', givenName: 'Ana', familyName: '', sub: 'g' });
        User.signInWithGoogle.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });
        const res = await request(app).post('/auth/google').send({ credential: 'token' });
        expect(res.body).toEqual({ user: { id: 7 } });
        expect(res.headers['set-cookie'][0]).toMatch(/^app_session=.+HttpOnly; SameSite=Lax/);
    });

    test('logout clears the cookie', async () => {
        const res = await request(app).post('/auth/logout');
        expect(res.headers['set-cookie'][0]).toMatch(/^app_session=;/);
    });

    test('profile updates are validated before saving', async () => {
        currentUser = player();
        expect((await request(app).put('/users/me').send({ nickname: 'x' })).body.code).toBe('INVALID_NICKNAME');
        expect((await request(app).put('/users/me').send({ language: 'java' })).body.code).toBe('INVALID_LANGUAGE');
        expect((await request(app).put('/users/me').send({ preferences: { friend: 'yes' } })).body.code).toBe('INVALID_PREFERENCES');
        // the style is case-sensitive: `3D` is not one of the choices
        expect((await request(app).put('/users/me').send({ gladView: '3D' })).body.code).toBe('INVALID_GLAD_VIEW');
        expect(currentUser.saveProfile).not.toHaveBeenCalled();
    });

    test('the gladiator style is saved, and a profile save may omit it', async () => {
        currentUser = player();
        await request(app).put('/users/me').send({ gladView: 'sprite' });
        expect(currentUser.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ gladView: 'sprite' }));
        await request(app).put('/users/me').send({ nickname: 'Ana' });
        expect(currentUser.saveProfile).toHaveBeenLastCalledWith(expect.objectContaining({ gladView: undefined }));
    });

    test('a new picture is stored and its URL saved', async () => {
        currentUser = player();
        await request(app).put('/users/me').send({ nickname: ' Ana ', picture: 'data:image/png;base64,AAAA' });
        expect(currentUser.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ nickname: 'Ana', picture: '/profpics/abc.png?v=1' }));
    });

    test('changes need a session', async () => {
        expect((await request(app).put('/users/me').send({})).status).toBe(401);
    });
});

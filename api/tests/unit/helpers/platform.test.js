import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test } from 'vitest';
import { csrfOriginMiddleware } from '../../../helpers/platform.js';
import { errorMiddleware } from '../../../middleware/error.js';

const WEB = 'http://localhost:8085';

describe('CSRF origin check', () => {
    const app = express();
    app.use(csrfOriginMiddleware);
    app.all('/', (req, res) => res.send({ ok: true }));
    app.use(errorMiddleware);

    beforeEach(() => {
        process.env.WEB_URL = 'http://localhost';
        process.env.WEB_PORT = '8085';
    });

    test.each(['post', 'put', 'delete'])('a signed-in %s needs the web origin', async method => {
        const signed = () => request(app)[method]('/').set('Cookie', 'app_session=token');
        for (const origin of [undefined, 'null', 'http://evil.example', `${WEB}.evil.example`, 'http://localhost']) {
            const req = signed();
            if (origin) req.set('Origin', origin);
            const res = await req;
            expect([origin, res.status, res.body.code]).toEqual([origin, 403, 'CSRF_ORIGIN_DENIED']);
        }
        expect((await signed().set('Origin', WEB)).status).toBe(200);
    });

    test('reads and requests without the session cookie are not affected', async () => {
        expect((await request(app).get('/').set('Cookie', 'app_session=token')).status).toBe(200);
        expect((await request(app).post('/')).status).toBe(200);
        expect((await request(app).post('/').set('Cookie', 'other=1').set('Origin', 'http://evil.example')).status).toBe(200);
    });
});

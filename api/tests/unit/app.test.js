import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { app } from '../../app.js';

describe('app', () => {
    test('reports liveness and 404s unknown routes as JSON', async () => {
        expect((await request(app).get('/health')).body).toEqual({ status: 'alive' });
        const missing = await request(app).get('/nope');
        expect(missing.status).toBe(404);
        expect(missing.body.code).toBe('NOT_FOUND');
    });

    test('refuses browsers from other origins', async () => {
        process.env.WEB_URL = 'http://localhost';
        process.env.WEB_PORT = '8085';
        const res = await request(app).get('/health').set('Origin', 'http://evil.example');
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('CORS_ORIGIN_DENIED');
        const ok = await request(app).get('/health').set('Origin', 'http://localhost:8085');
        expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:8085');
        expect(ok.headers['access-control-allow-credentials']).toBe('true');
    });
});

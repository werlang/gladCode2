import { readdirSync, readFileSync } from 'node:fs';
import express from 'express';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';
import { CustomError } from '../../../helpers/error.js';
import { asyncRoute, errorMiddleware } from '../../../middleware/error.js';

describe('error middleware', () => {
    const app = express();
    app.get('/expected', asyncRoute(async () => {
        throw new CustomError(409, 'Nickname taken.', 'NICKNAME_TAKEN', { field: 'nickname' });
    }));
    app.get('/status/:status', asyncRoute(async req => {
        throw new CustomError(Number(req.params.status), 'Kept.', 'KEPT_CODE');
    }));
    app.get('/crash', asyncRoute(async () => {
        throw new Error('secret detail');
    }));
    app.get('/sql', asyncRoute(async () => {
        throw new CustomError(500, "Unknown column 'secret' in 'field list'", 'SQL_ERROR', { sql: 'SELECT secret' });
    }));
    app.use(errorMiddleware);

    test('expected errors keep their code, message and data', async () => {
        const res = await request(app).get('/expected');
        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: true, status: 409, type: 'Conflict', code: 'NICKNAME_TAKEN', message: 'Nickname taken.', data: { field: 'nickname' } });
    });

    test('every status the API throws reaches the client with its code', async () => {
        // scan the sources, so a new status cannot silently turn into a 500
        const thrown = new Set();
        for (const folder of ['helpers', 'middleware', 'model', 'route']) {
            const dir = new URL(`../../../${folder}/`, import.meta.url);
            for (const file of readdirSync(dir).filter(name => name.endsWith('.js'))) {
                for (const [, status] of readFileSync(new URL(file, dir), 'utf8').matchAll(/CustomError\((4\d\d)/g)) thrown.add(Number(status));
            }
        }
        expect([...thrown]).toEqual(expect.arrayContaining([402, 410]));
        for (const status of thrown) {
            const res = await request(app).get(`/status/${status}`);
            expect([res.status, res.body.code]).toEqual([status, 'KEPT_CODE']);
        }
    });

    test('unexpected errors hide their details', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).get('/crash');
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('An unexpected error occurred.');
        expect(JSON.stringify(res.body)).not.toContain('secret');
    });

    test('a 500 CustomError (such as SQL failures) hides its message and data too', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).get('/sql');
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: true, status: 500, type: 'Internal Server Error', code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
    });
});

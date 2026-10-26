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
    app.get('/crash', asyncRoute(async () => {
        throw new Error('secret detail');
    }));
    app.use(errorMiddleware);

    test('expected errors keep their code, message and data', async () => {
        const res = await request(app).get('/expected');
        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: true, status: 409, type: 'Conflict', code: 'NICKNAME_TAKEN', message: 'Nickname taken.', data: { field: 'nickname' } });
    });

    test('unexpected errors hide their details', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).get('/crash');
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('An unexpected error occurred.');
        expect(JSON.stringify(res.body)).not.toContain('secret');
    });
});

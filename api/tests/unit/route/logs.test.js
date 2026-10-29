import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const remove = vi.fn();
const findByHash = vi.fn();
vi.mock('../../../model/battle-log.js', () => ({ BattleLog: { findByHash } }));

const { errorMiddleware } = await import('../../../middleware/error.js');
const { logsRouter } = await import('../../../route/logs.js');

const app = express();
app.use('/logs', logsRouter);
app.use(errorMiddleware);

describe('log routes', () => {
    beforeEach(() => vi.clearAllMocks());

    test('only editor test battles can be deleted', async () => {
        for (const origin of ['ranked', 'duel', 'tourn', 'train']) {
            findByHash.mockResolvedValueOnce({ origin, delete: remove });
            const res = await request(app).delete('/logs/abc123');
            expect([origin, res.status, res.body.code]).toEqual([origin, 403, 'LOG_PROTECTED']);
        }
        expect(remove).not.toHaveBeenCalled();

        findByHash.mockResolvedValueOnce({ origin: 'editor', delete: remove });
        expect((await request(app).delete('/logs/abc123')).body).toEqual({ deleted: true });
        expect(remove).toHaveBeenCalledTimes(1);
    });

    test('hashes are hex only', async () => {
        expect((await request(app).delete('/logs/..%2Fetc')).status).toBe(400);
        expect(findByHash).not.toHaveBeenCalled();
    });
});

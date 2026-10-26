import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

let currentUser = { id: 7, apelido: 'Bo', lvl: 10 };
vi.mock('../../../middleware/auth.js', () => ({
    auth: ({ optional = false } = {}) => (req, res, next) => {
        if (!currentUser && !optional) return res.status(401).send({ code: 'NOT_SIGNED_IN' });
        req.user = currentUser;
        return next();
    },
}));
const run = vi.fn();
const added = [];
vi.mock('../../../model/battle.js', () => ({
    Battle: class {
        constructor(options) { this.options = options; }
        addSource(source, options) { added.push(['source', source, options]); return this; }
        addDraft(glad) { added.push(['draft', glad]); return this; }
        setBreakpoints(lines) { added.push(['breakpoints', lines]); return this; }
        async addGladiators(ids) { added.push(['ids', ids]); return this; }
        run(options) { return run(options); }
    },
}));
vi.mock('../../../model/sample-gladiator.js', () => ({
    SAVE_TEST_SAMPLES: ['Archie'],
    SampleGladiator: { find: vi.fn(async name => ({ name, code: `code of ${name}` })) },
}));
const save = vi.fn(async function save(fields) { return Object.assign(this, fields, { cod: this.cod ?? 50 }); });
vi.mock('../../../model/gladiator.js', () => ({
    Gladiator: Object.assign(class {
        constructor(fields) { Object.assign(this, fields); }
        save(fields) { return save.call(this, fields); }
        toJSON() { return { id: this.cod, name: this.name }; }
    }, {
        assertSavable: vi.fn(),
        findOwned: vi.fn(async (id, master) => {
            if (master !== 7) throw Object.assign(new Error('nope'), { status: 404, code: 'GLADIATOR_NOT_FOUND' });
            return { cod: id, name: 'Old', save(fields) { return save.call(this, fields); }, delete: vi.fn(), toJSON() { return { id: this.cod, name: this.name }; } };
        }),
        listByMaster: vi.fn(async () => []),
    }),
}));

const { Gladiator } = await import('../../../model/gladiator.js');
const { errorMiddleware } = await import('../../../middleware/error.js');
const { gladiatorsRouter } = await import('../../../route/gladiators.js');
const { battlesRouter } = await import('../../../route/battles.js');

const app = express();
app.use(express.json());
app.use('/gladiators', gladiatorsRouter);
app.use('/battles', battlesRouter);
app.use(errorMiddleware);

const body = { name: 'Zed', vstr: 10, vagi: 18, vint: 0, skin: '["male"]', code: 'loop(){}' };

describe('gladiator and battle routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        added.length = 0;
        currentUser = { id: 7, apelido: 'Bo', lvl: 10 };
    });

    test('a new gladiator is saved only after its test battle passes', async () => {
        run.mockResolvedValue({ log: null, error: '' });
        const res = await request(app).post('/gladiators').send(body);
        expect(res.status).toBe(201);
        expect(res.body.gladiator).toEqual({ id: 50, name: 'Zed' });
        expect(added).toEqual([['source', 'code of Archie', undefined], ['draft', expect.objectContaining({ name: 'Zed', nick: 'Bo' })]]);
        expect(run).toHaveBeenCalledWith({ store: false });
    });

    test('a failed test battle keeps the gladiator unsaved and returns the engine output', async () => {
        run.mockResolvedValue({ log: null, error: 'code1.c: error' });
        const res = await request(app).put('/gladiators/4').send(body);
        expect(res.status).toBe(422);
        expect(res.body).toMatchObject({ code: 'GLADIATOR_TEST_FAILED', data: { error: 'code1.c: error' } });
        expect(save).not.toHaveBeenCalled();
    });

    test('bodies are validated before anything runs', async () => {
        expect((await request(app).post('/gladiators').send({ ...body, vstr: 'x' })).body.code).toBe('INVALID_VSTR');
        expect((await request(app).post('/gladiators').send({ ...body, code: '' })).body.code).toBe('INVALID_CODE');
        expect(Gladiator.assertSavable).not.toHaveBeenCalled();
    });

    test('a test battle lines up samples, the edited gladiator and the master\'s own gladiators', async () => {
        run.mockResolvedValue({ log: { hash: 'abc' }, error: '' });
        const res = await request(app).post('/battles/test').send({ gladiator: { source: 'src' }, opponents: [{ id: 9 }, { sample: 'Archie' }], breakpoints: [3] });
        expect(res.body).toEqual({ hash: 'abc', error: '' });
        expect(added).toEqual([['source', 'code of Archie', undefined], ['source', 'src', { edited: true }], ['breakpoints', [3]], ['ids', [9]]]);
    });

    test('visitors may test against samples but not against saved gladiators', async () => {
        currentUser = null;
        run.mockResolvedValue({ log: null, error: 'boom' });
        expect((await request(app).post('/battles/test').send({ gladiator: { source: 's' }, opponents: [{ sample: 'Archie' }] })).body).toEqual({ hash: null, error: 'boom' });
        expect((await request(app).post('/battles/test').send({ gladiator: { source: 's' }, opponents: [{ id: 9 }] })).status).toBe(401);
        expect((await request(app).post('/battles/test').send({ gladiator: { source: 's' }, opponents: [] })).body.code).toBe('INVALID_OPPONENTS');
    });
});

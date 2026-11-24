import { Router } from 'express';
import { CustomError } from '../helpers/error.js';
import { oneBattlePerClient } from '../helpers/runner.js';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Battle } from '../model/battle.js';
import { Gladiator } from '../model/gladiator.js';
import { SAVE_TEST_SAMPLES, SampleGladiator } from '../model/sample-gladiator.js';

const router = Router();

/**
 * Reads and validates a gladiator sent for saving.
 *
 * @param {Record<string, unknown>} body
 * @returns {{ name: string, vstr: number, vagi: number, vint: number, skin: string, code: string, blocks: string }}
 */
function gladiatorBody(body = {}) {
    return {
        name: Validate.text(body.name, 'name', { max: 100 }),
        vstr: Validate.integer(body.vstr, 'vstr', { min: 0, max: 30 }),
        vagi: Validate.integer(body.vagi, 'vagi', { min: 0, max: 30 }),
        vint: Validate.integer(body.vint, 'vint', { min: 0, max: 30 }),
        skin: Validate.text(body.skin, 'skin', { max: 2000 }),
        code: Validate.text(body.code, 'code', { max: 60000 }),
        blocks: body.blocks === undefined ? '' : Validate.text(body.blocks, 'blocks', { min: 0, max: 60000 }),
    };
}

/**
 * Proves the code compiles and runs: a sandboxed battle against the strongest samples, whose log
 * is not kept.
 *
 * @param {ReturnType<typeof gladiatorBody>} glad
 * @param {{ id: number, apelido: string }} master
 * @throws {CustomError} 422 `GLADIATOR_TEST_FAILED` (data: `{ error }`, the engine output), 429
 *   `BATTLE_RUNNING` while another battle of the master runs.
 */
async function testBeforeSaving(glad, master) {
    const battle = new Battle({ origin: 'editor', sandbox: true });
    for (const name of SAVE_TEST_SAMPLES) battle.addSource((await SampleGladiator.find(name)).code);
    battle.addDraft({ ...glad, nick: master.apelido });
    const { error } = await oneBattlePerClient(`user:${master.id}`, () => battle.run({ store: false }));
    if (error) throw new CustomError(422, 'The gladiator failed its test battle.', 'GLADIATOR_TEST_FAILED', { error });
}

/**
 * GET /gladiators
 * The signed-in master's gladiators, each with its battle record (total, wins, losses and draws) and whether it is outdated or broken.
 */
router.get('/', auth(), asyncRoute(async (req, res) => {
    const gladiators = await Gladiator.listByMaster(req.user.id);
    res.send({ gladiators: gladiators.map(glad => glad.toJSON(req.user.apelido)) });
}));

/**
 * GET /gladiators/samples/:name
 * A sample opponent with its full source (`War Maker`, `Archie`, ...).
 */
router.get('/samples/:name', asyncRoute(async (req, res) => {
    res.send({ sample: await SampleGladiator.find(req.params.name) });
}));

/**
 * GET /gladiators/:id
 * One of the master's gladiators, to edit.
 */
router.get('/:id', auth(), asyncRoute(async (req, res) => {
    const id = Validate.integer(req.params.id, 'id', { min: 1 });
    const glad = await Gladiator.findOwned(id, req.user.id);
    res.send({ gladiator: glad.toJSON(req.user.apelido) });
}));

/**
 * POST /gladiators
 * Creates a gladiator: `{ name, vstr, vagi, vint, skin, code, blocks? }` where `code` is the user
 * code without setup(). It must pass a test battle first. Answers 201 `{ gladiator }`.
 */
router.post('/', auth(), asyncRoute(async (req, res) => {
    const glad = gladiatorBody(req.body);
    await Gladiator.assertSavable(glad, req.user);
    await testBeforeSaving(glad, req.user);
    const saved = await new Gladiator({ master: req.user.id }).saveChecked(glad, req.user);
    res.status(201).send({ gladiator: saved.toJSON(req.user.apelido) });
}));

/**
 * PUT /gladiators/:id
 * Saves changes to a gladiator (same body and checks as creating one).
 */
router.put('/:id', auth(), asyncRoute(async (req, res) => {
    const id = Validate.integer(req.params.id, 'id', { min: 1 });
    const existing = await Gladiator.findOwned(id, req.user.id);
    const glad = gladiatorBody(req.body);
    await Gladiator.assertSavable({ ...glad, id }, req.user);
    await testBeforeSaving(glad, req.user);
    const saved = await existing.saveChecked(glad, req.user);
    res.send({ gladiator: saved.toJSON(req.user.apelido) });
}));

/**
 * DELETE /gladiators/:id
 * Deletes one of the master's gladiators.
 */
router.delete('/:id', auth(), asyncRoute(async (req, res) => {
    const id = Validate.integer(req.params.id, 'id', { min: 1 });
    await (await Gladiator.findOwned(id, req.user.id)).delete();
    res.send({ deleted: true });
}));

export { router as gladiatorsRouter };

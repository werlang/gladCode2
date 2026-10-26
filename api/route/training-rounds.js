import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { TrainingRound } from '../model/training-round.js';

const router = Router();
router.use(auth());

const hash = req => Validate.text(req.params.hash, 'hash', { max: 32, pattern: /^[0-9A-Za-z]+$/ });
const round = req => Validate.integer(req.params.round, 'round', { min: 0 });

/**
 * GET /training-rounds/:hash/:round
 * A round's page (`status: 'round'`), the final ranking for round 0 once the training's time is
 * over (`'end'`), or the round to go to (`'redirect'`).
 */
router.get('/:hash/:round', asyncRoute(async (req, res) => {
    res.send(await TrainingRound.view(hash(req), round(req), req.user.id));
}));

/**
 * GET /training-rounds/:hash/:round/status
 * How the round stands: `{ status: 'wait'|'open'|'run'|'busy'|'done'|'end', end, maxRound, now,
 * deadline, trainDeadline, groups }`.
 */
router.get('/:hash/:round/status', asyncRoute(async (req, res) => {
    res.send(await TrainingRound.status(hash(req), round(req)));
}));

/**
 * POST /training-rounds/:hash/advance
 * Fights the latest round's next due group (`{ status: 'fought', group, hash, error }`) or opens
 * the next round once every group fought (`'next'`); otherwise says why not (`'wait'`, `'busy'`,
 * `'done'`, `'end'`).
 */
router.post('/:hash/advance', asyncRoute(async (req, res) => {
    res.send(await TrainingRound.advance(hash(req)));
}));

/**
 * PUT /training-rounds/:hash/:round/deadline
 * Sets when the round's battles start, `{ minutes }` from now (manager only): `{ deadline }`.
 */
router.put('/:hash/:round/deadline', asyncRoute(async (req, res) => {
    const minutes = Validate.integer(req.body?.minutes, 'minutes', { min: 0, max: 60 });
    res.send({ deadline: await TrainingRound.setDeadline(hash(req), round(req), minutes, req.user.id) });
}));

/**
 * POST /training-rounds/:hash/end
 * Ends the training now (manager only).
 */
router.post('/:hash/end', asyncRoute(async (req, res) => {
    await TrainingRound.end(hash(req), req.user.id);
    res.send({ ended: true });
}));

/**
 * POST /training-rounds/:hash/groups/:group/rerun
 * Makes a group fight again now, its scores cleared (manager only).
 */
router.post('/:hash/groups/:group/rerun', asyncRoute(async (req, res) => {
    await TrainingRound.rerun(hash(req), Validate.integer(req.params.group, 'group', { min: 1 }), req.user.id);
    res.send({ rerun: true });
}));

export { router as trainingRoundsRouter };

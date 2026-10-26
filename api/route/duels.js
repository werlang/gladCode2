import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Duel } from '../model/duel.js';

const router = Router();
router.use(auth());

/**
 * GET /duels
 * Challenges waiting for the master's answer: `{ duels }`.
 */
router.get('/', asyncRoute(async (req, res) => {
    res.send({ duels: await Duel.challenges(req.user.id) });
}));

/**
 * GET /duels/history?offset=0
 * A page of the master's duels: `{ total, duels }`.
 */
router.get('/history', asyncRoute(async (req, res) => {
    res.send(await Duel.history(req.user.id, Validate.integer(req.query.offset ?? 0, 'offset', { min: 0 })));
}));

/**
 * POST /duels
 * Challenges a friend: `{ friend, gladiator }`. The friend is emailed unless they opted out.
 */
router.post('/', asyncRoute(async (req, res) => {
    const friend = Validate.integer(req.body?.friend, 'friend', { min: 1 });
    const gladiator = Validate.integer(req.body?.gladiator, 'gladiator', { min: 1 });
    await Duel.challenge(req.user, friend, gladiator);
    res.status(201).send({ challenged: true });
}));

/**
 * POST /duels/:id/battle
 * Answers a challenge with one of the master's gladiators: `{ gladiator }`. Answers `{ hash, error }`.
 */
router.post('/:id/battle', asyncRoute(async (req, res) => {
    const gladiator = Validate.integer(req.body?.gladiator, 'gladiator', { min: 1 });
    res.send(await Duel.fight(req.user, Validate.integer(req.params.id, 'id', { min: 1 }), gladiator));
}));

/**
 * DELETE /duels/:id
 * Refuses a challenge, or withdraws one the master made.
 */
router.delete('/:id', asyncRoute(async (req, res) => {
    await Duel.remove(req.user.id, Validate.integer(req.params.id, 'id', { min: 1 }));
    res.send({ removed: true });
}));

export { router as duelsRouter };

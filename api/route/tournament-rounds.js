import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { TournamentRound } from '../model/tournament-round.js';

const router = Router();
const HASH = /^[a-f0-9]{1,16}$/;

const hash = req => Validate.text(req.params.hash, 'hash', { pattern: HASH });
const round = req => Validate.integer(req.params.round, 'round', { min: 0 });

/**
 * GET /tournament-rounds/:hash/:round
 * A round's page (`status: 'round'`), the final ranking for round 0 once one team is left
 * (`'end'`), or the round to go to (`'redirect'`). Open to visitors.
 */
router.get('/:hash/:round', auth({ optional: true }), asyncRoute(async (req, res) => {
    res.send(await TournamentRound.view(hash(req), round(req), req.user?.id ?? null));
}));

/**
 * GET /tournament-rounds/:hash/:round/status
 * Teams and groups of a round now: `{ status: 'open'|'next'|'end', teams, groups }`.
 */
router.get('/:hash/:round/status', asyncRoute(async (req, res) => {
    res.send(await TournamentRound.status(hash(req), round(req)));
}));

/**
 * GET /tournament-rounds/:hash/:round/gladiators
 * The master's team's gladiators for the round: `{ gladiators }`.
 */
router.get('/:hash/:round/gladiators', auth(), asyncRoute(async (req, res) => {
    res.send({ gladiators: await TournamentRound.teamGladiators(hash(req), round(req), req.user.id) });
}));

/**
 * PUT /tournament-rounds/:hash/choice
 * The master's team picks its gladiator for the latest round: `{ gladiator }`.
 */
router.put('/:hash/choice', auth(), asyncRoute(async (req, res) => {
    await TournamentRound.choose(hash(req), req.user.id, Validate.integer(req.body?.gladiator, 'gladiator', { min: 1 }));
    res.send({ chosen: true });
}));

/**
 * POST /tournament-rounds/:hash/groups/:group/battle
 * Runs a group's battle (manager only): `{ force? }`. Answers `{ hash, error }`.
 */
router.post('/:hash/groups/:group/battle', auth(), asyncRoute(async (req, res) => {
    const group = Validate.integer(req.params.group, 'group', { min: 1 });
    res.send(await TournamentRound.fight(hash(req), group, req.user.id, req.body?.force === true));
}));

/**
 * POST /tournament-rounds/:hash/advance
 * Records the latest round and creates the next one when every group fought (manager only).
 */
router.post('/:hash/advance', auth(), asyncRoute(async (req, res) => {
    res.send(await TournamentRound.advance(hash(req), req.user.id));
}));

/**
 * POST /tournament-rounds/:hash/end-turn
 * Ends the latest round's choosing time now (manager only).
 */
router.post('/:hash/end-turn', auth(), asyncRoute(async (req, res) => {
    await TournamentRound.endTurn(hash(req), req.user.id);
    res.send({ ended: true });
}));

export { router as tournamentRoundsRouter };

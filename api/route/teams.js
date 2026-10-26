import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Tournament } from '../model/tournament.js';

const router = Router();
router.use(auth());

const id = req => Validate.integer(req.params.id, 'id', { min: 1 });

/** @param {Record<string, unknown>} body */
function entry(body = {}) {
    return {
        word: Validate.text(body.word, 'word', { max: 10 }),
        gladiator: Validate.integer(body.gladiator, 'gladiator', { min: 1 }),
        showCode: Validate.boolean(body.showCode ?? false, 'showCode'),
    };
}

/**
 * GET /teams/:id
 * A tournament team: members see its word and gladiators, others the masters' nicks.
 */
router.get('/:id', asyncRoute(async (req, res) => {
    res.send({ team: await Tournament.team(req.user.id, id(req)) });
}));

/**
 * POST /teams/:id/members
 * Joins the team: `{ word, gladiator, showCode }`.
 */
router.post('/:id/members', asyncRoute(async (req, res) => {
    await Tournament.joinTeam(req.user.id, id(req), entry(req.body));
    res.status(201).send({ joined: true });
}));

/**
 * DELETE /teams/:id/members/me
 * Leaves the team with every gladiator of the master: `{ teamRemoved }`.
 */
router.delete('/:id/members/me', asyncRoute(async (req, res) => {
    res.send(await Tournament.leave(req.user.id, id(req)));
}));

/**
 * POST /teams/:id/gladiators
 * Adds another of the master's gladiators: `{ word, gladiator, showCode }`.
 */
router.post('/:id/gladiators', asyncRoute(async (req, res) => {
    await Tournament.addGladiator(req.user.id, id(req), entry(req.body));
    res.status(201).send({ added: true });
}));

/**
 * DELETE /teams/:id/gladiators/:gladiator
 * Takes one of the master's gladiators out: `{ teamRemoved }`.
 */
router.delete('/:id/gladiators/:gladiator', asyncRoute(async (req, res) => {
    res.send(await Tournament.leave(req.user.id, id(req), Validate.integer(req.params.gladiator, 'gladiator', { min: 1 })));
}));

export { router as teamsRouter };

import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Tournament } from '../model/tournament.js';

const router = Router();
router.use(auth());

const id = req => Validate.integer(req.params.id, 'id', { min: 1 });
const password = value => (value === undefined ? undefined : Validate.text(value, 'password', { min: 0, max: 32 }));

/**
 * GET /tournaments?mineOffset=0&openOffset=0
 * The open public tournaments and the master's own: `{ open, mine, pages }`.
 */
router.get('/', asyncRoute(async (req, res) => {
    res.send(await Tournament.list(req.user.id, {
        mine: Validate.integer(req.query.mineOffset ?? 0, 'mineOffset', { min: 0 }),
        open: Validate.integer(req.query.openOffset ?? 0, 'openOffset', { min: 0 }),
    }));
}));

/**
 * GET /tournaments/next
 * The next round the master's team is waiting for: `{ tournament: null }` or
 * `{ tournament: { name, hash, round, deadline, now } }`.
 */
router.get('/next', asyncRoute(async (req, res) => {
    res.send({ tournament: await Tournament.next(req.user.id) });
}));

/**
 * POST /tournaments
 * Creates a tournament: `{ name, password, description, maxTeams, maxMinutes, flex }` (an empty
 * password makes it public). Answers 201 `{ id }`.
 */
router.post('/', asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const tournamentId = await Tournament.create(req.user.id, {
        name: Validate.text(body.name, 'name', { min: 6, max: 50, pattern: /^[\w\s]+$/ }),
        password: password(body.password ?? '') ?? '',
        description: Validate.text(body.description ?? '', 'description', { min: 0, max: 2000 }),
        maxTeams: Validate.integer(body.maxTeams, 'maxTeams', { min: 2, max: 50 }),
        maxMinutes: Validate.integer(body.maxMinutes, 'maxMinutes', { min: 1, max: 23 * 60 + 59 }),
        flex: Validate.boolean(body.flex, 'flex'),
    });
    res.status(201).send({ id: tournamentId });
}));

/**
 * POST /tournaments/lookup
 * Finds a tournament by `{ name, password? }`: `{ tournament: { id, name, description, password, hash } }`.
 */
router.post('/lookup', asyncRoute(async (req, res) => {
    const name = Validate.text(req.body?.name, 'name', { max: 50 });
    res.send({ tournament: await Tournament.find(req.user.id, name, password(req.body?.password)) });
}));

/**
 * GET /tournaments/:id/teams?password=
 * The teams gathered so far, or `{ started: true, hash }`.
 */
router.get('/:id/teams', asyncRoute(async (req, res) => {
    res.send(await Tournament.teams(req.user.id, id(req), password(req.query.password)));
}));

/**
 * POST /tournaments/:id/teams
 * Creates a team: `{ password, name, gladiator, showCode }`. Answers 201 `{ id, word }`.
 */
router.post('/:id/teams', asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    res.status(201).send(await Tournament.createTeam(req.user.id, id(req), {
        password: password(body.password),
        name: Validate.text(body.name, 'name', { max: 200 }),
        gladiator: Validate.integer(body.gladiator, 'gladiator', { min: 1 }),
        showCode: Validate.boolean(body.showCode ?? false, 'showCode'),
    }));
}));

/**
 * DELETE /tournaments/:id/teams/:team
 * Removes a team (manager only).
 */
router.delete('/:id/teams/:team', asyncRoute(async (req, res) => {
    await Tournament.kick(req.user.id, id(req), Validate.integer(req.params.team, 'team', { min: 1 }));
    res.send({ removed: true });
}));

/**
 * POST /tournaments/:id/start
 * Starts the tournament (manager only): `{ hash }`. The masters are emailed.
 */
router.post('/:id/start', asyncRoute(async (req, res) => {
    res.send({ hash: await Tournament.start(req.user.id, id(req)) });
}));

/**
 * DELETE /tournaments/:id
 * Deletes a tournament without teams (manager only).
 */
router.delete('/:id', asyncRoute(async (req, res) => {
    await Tournament.remove(req.user.id, id(req));
    res.send({ deleted: true });
}));

export { router as tournamentsRouter };

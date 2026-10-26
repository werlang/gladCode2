import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Training } from '../model/training.js';

const router = Router();
router.use(auth());

/** Training weights the creation window offers. */
const WEIGHTS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 10];

const id = req => Validate.integer(req.params.id, 'id', { min: 1 });
const code = req => Validate.text(req.params.hash, 'hash', { max: 32, pattern: /^[0-9A-Za-z]+$/ });
const gladiator = value => Validate.integer(value, 'gladiator', { min: 1 });
const name = value => Validate.text(value, 'name', { min: 6, max: 50 });
const description = value => Validate.text(value, 'description', { min: 0, max: 2000 });

/**
 * GET /trainings?manageOffset=0&partOffset=0
 * The trainings the master manages and takes part in: `{ manage, part, pages }`.
 */
router.get('/', asyncRoute(async (req, res) => {
    res.send(await Training.list(req.user.id, {
        manage: Validate.integer(req.query.manageOffset ?? 0, 'manageOffset', { min: 0 }),
        part: Validate.integer(req.query.partOffset ?? 0, 'partOffset', { min: 0 }),
    }));
}));

/**
 * POST /trainings
 * Creates a training (tutor accounts): `{ name, description, maxMinutes, players, weight }`.
 * Answers 201 `{ id, hash }`, `hash` being its invitation code.
 */
router.post('/', asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    res.status(201).send(await Training.create(req.user, {
        name: name(body.name),
        description: description(body.description ?? ''),
        maxMinutes: Validate.integer(body.maxMinutes, 'maxMinutes', { min: 5, max: 120 }),
        players: Validate.integer(body.players, 'players', { min: 2, max: 5 }),
        weight: Validate.oneOf(body.weight, 'weight', WEIGHTS),
    }));
}));

/**
 * GET /trainings/invitations/:hash
 * The training an invitation code opens: `{ training: { id, name, status: 'open'|'joined'|'started' } }`.
 */
router.get('/invitations/:hash', asyncRoute(async (req, res) => {
    res.send({ training: await Training.invitation(req.user.id, code(req)) });
}));

/**
 * POST /trainings/invitations/:hash
 * Enters one of the master's gladiators: `{ gladiator }`. Answers 201 `{ id, name }`.
 */
router.post('/invitations/:hash', asyncRoute(async (req, res) => {
    res.status(201).send(await Training.join(req.user.id, code(req), gladiator(req.body?.gladiator)));
}));

/**
 * GET /trainings/:id
 * A training waiting to start, as its manager (`status: 'manage'`) or a participant
 * (`'participate'`) sees it, or `{ status: 'started', hash }`.
 */
router.get('/:id', asyncRoute(async (req, res) => {
    res.send(await Training.room(req.user.id, id(req)));
}));

/**
 * PUT /trainings/:id
 * Renames it or changes its description (manager only): `{ name?, description? }`.
 */
router.put('/:id', asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    await Training.update(req.user.id, id(req), {
        name: body.name === undefined ? undefined : name(body.name),
        description: body.description === undefined ? undefined : description(body.description),
    });
    res.send({ updated: true });
}));

/**
 * POST /trainings/:id/invitation
 * Issues a new invitation code, valid for an hour (manager only): `{ hash }`.
 */
router.post('/:id/invitation', asyncRoute(async (req, res) => {
    res.send({ hash: await Training.renew(req.user.id, id(req)) });
}));

/**
 * PUT /trainings/:id/members/me
 * Swaps the master's gladiator: `{ gladiator }`.
 */
router.put('/:id/members/me', asyncRoute(async (req, res) => {
    await Training.changeGladiator(req.user.id, id(req), gladiator(req.body?.gladiator));
    res.send({ changed: true });
}));

/**
 * DELETE /trainings/:id/members/me
 * Leaves the training.
 */
router.delete('/:id/members/me', asyncRoute(async (req, res) => {
    await Training.leave(req.user.id, id(req));
    res.send({ left: true });
}));

/**
 * DELETE /trainings/:id/gladiators/:gladiator
 * Removes a participant (manager only).
 */
router.delete('/:id/gladiators/:gladiator', asyncRoute(async (req, res) => {
    await Training.kick(req.user.id, id(req), gladiator(req.params.gladiator));
    res.send({ removed: true });
}));

/**
 * POST /trainings/:id/start
 * Starts the training (manager only): `{ hash }`, the code of its round pages.
 */
router.post('/:id/start', asyncRoute(async (req, res) => {
    res.send({ hash: await Training.start(req.user.id, id(req)) });
}));

/**
 * DELETE /trainings/:id
 * Deletes the training with its rounds and scores (manager only).
 */
router.delete('/:id', asyncRoute(async (req, res) => {
    await Training.remove(req.user.id, id(req));
    res.send({ deleted: true });
}));

export { router as trainingsRouter };

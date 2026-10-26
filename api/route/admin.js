import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { DevTournament } from '../model/dev-tournament.js';

const router = Router();
router.use(auth({ admin: true }));

/** A tournament id, or a started tournament's hash. */
const ref = req => Validate.text(req.params.ref, 'tournament', { max: 16, pattern: /^(\d+|[a-f0-9]{1,16})$/ });

/**
 * GET /admin/tournaments/test
 * The test tournaments (marked `[DEV-TEST]`): `{ tournaments }`.
 */
router.get('/tournaments/test', asyncRoute(async (req, res) => {
    res.send({ tournaments: await DevTournament.listTest() });
}));

/**
 * POST /admin/tournaments/test
 * Creates a test tournament of random full teams: `{ name, teams, maxTime, managerEmail? }` (the
 * manager defaults to the administrator). Answers 201 `{ id, name, manager, teams }`.
 */
router.post('/tournaments/test', asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    res.status(201).send(await DevTournament.bootstrap({
        name: Validate.text(body.name, 'name', { min: 6, max: 50 }),
        teams: Validate.integer(body.teams, 'teams', { min: 2, max: 50 }),
        maxTime: Validate.text(body.maxTime ?? '00:10:00', 'maxTime', { pattern: /^\d{2}:\d{2}:\d{2}$/ }),
        managerEmail: body.managerEmail ? Validate.text(body.managerEmail, 'managerEmail', { max: 255 }) : undefined,
        managerId: req.user.id,
    }));
}));

/**
 * DELETE /admin/tournaments/test?confirm=YES_DELETE_ALL
 * Deletes every test tournament: `{ deleted }`.
 */
router.delete('/tournaments/test', asyncRoute(async (req, res) => {
    Validate.oneOf(req.query.confirm, 'confirm', ['YES_DELETE_ALL']);
    res.send({ deleted: await DevTournament.removeAllTest() });
}));

/**
 * DELETE /admin/tournaments/test/:id
 * Deletes a test tournament with its teams, rounds and battle logs: `{ name, stats }`.
 */
router.delete('/tournaments/test/:id', asyncRoute(async (req, res) => {
    res.send(await DevTournament.remove(Validate.integer(req.params.id, 'id', { min: 1 })));
}));

/**
 * GET /admin/tournaments?page=1&limit=10
 * A page of the real tournaments: `{ tournaments, pagination }`.
 */
router.get('/tournaments', asyncRoute(async (req, res) => {
    res.send(await DevTournament.listReal({
        page: Validate.integer(req.query.page ?? 1, 'page', { min: 1 }),
        limit: Validate.integer(req.query.limit ?? 10, 'limit', { min: 1, max: 100 }),
    }));
}));

/**
 * POST /admin/tournaments/import
 * Imports an export: `{ data, mode: 'create'|'update', tournamentId? }`. Answers `{ id, name, mode, summary }`.
 */
router.post('/tournaments/import', asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const mode = Validate.oneOf(body.mode ?? 'create', 'mode', ['create', 'update']);
    const tournamentId = mode === 'update' ? Validate.integer(body.tournamentId, 'tournamentId', { min: 1 }) : undefined;
    res.send(await DevTournament.import(body.data, { mode, tournamentId }));
}));

/**
 * POST /admin/tournaments/:ref/reset
 * Takes a started tournament (id or hash) back to the start of `{ round }`: `{ id, name, hash, round, maxRound, stats }`.
 */
router.post('/tournaments/:ref/reset', asyncRoute(async (req, res) => {
    res.send(await DevTournament.reset(ref(req), Validate.integer(req.body?.round, 'round', { min: 1 })));
}));

/**
 * GET /admin/tournaments/:ref/export
 * Downloads a tournament (id or hash) with its teams, rounds, gladiators and battle logs as JSON.
 */
router.get('/tournaments/:ref/export', asyncRoute(async (req, res) => {
    const data = await DevTournament.export(ref(req));
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    res.attachment(`tournament_${data.export_info.tournament_id}_export_${stamp}.json`);
    res.type('application/json').send(JSON.stringify(data, null, 2));
}));

export { router as adminRouter };

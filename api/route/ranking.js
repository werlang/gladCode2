import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Ranking } from '../model/ranking.js';

const router = Router();
const TAG = /^[a-z0-9_]{1,50}$/;

/**
 * GET /ranking?offset=0&search=
 * A page of the gladiator ranking: `{ total, ranking: [{ gladiator, mmr, master, change24h, position }] }`.
 */
router.get('/', asyncRoute(async (req, res) => {
    const offset = Validate.integer(req.query.offset ?? 0, 'offset', { min: 0 });
    const search = Validate.text(req.query.search ?? '', 'search', { min: 0, max: 100 });
    res.send(await Ranking.general({ offset, search }));
}));

/**
 * GET /ranking/me
 * Where the signed-in master's best gladiator is: `{ offset }` (gladiators above it).
 */
router.get('/me', auth(), asyncRoute(async (req, res) => {
    res.send({ offset: await Ranking.bestOffset(req.user.id) });
}));

/**
 * GET /ranking/tabs
 * The signed-in master's hashtag tabs: `{ tags }`.
 */
router.get('/tabs', auth(), asyncRoute(async (req, res) => {
    res.send({ tags: await Ranking.tabs(req.user.id) });
}));

/**
 * PUT /ranking/tabs/:tag
 * Follows (`{ watch: true }`) or closes (`{ watch: false }`) a hashtag tab. Tutor accounts only.
 */
router.put('/tabs/:tag', auth(), asyncRoute(async (req, res) => {
    const tag = Validate.text(req.params.tag, 'tag', { pattern: TAG });
    const watch = Validate.boolean(req.body?.watch, 'watch');
    await Ranking.watchTab(req.user, tag, watch);
    res.send({ tag, watch });
}));

/**
 * GET /ranking/tabs/:tag?search=
 * The masters' ranking of a hashtag: `{ ranking: [{ id, nick, score, time, position }] }`.
 */
router.get('/tabs/:tag', asyncRoute(async (req, res) => {
    const tag = Validate.text(req.params.tag, 'tag', { pattern: TAG });
    const search = Validate.text(req.query.search ?? '', 'search', { min: 0, max: 100 });
    res.send({ ranking: await Ranking.hashtag(tag, search) });
}));

export { router as rankingRouter };

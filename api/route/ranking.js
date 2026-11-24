import { Router } from 'express';
import { CustomError } from '../helpers/error.js';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Ranking, windowSize } from '../model/ranking.js';

const router = Router();
const TAG = /^[a-z0-9_]{1,50}$/;

/**
 * GET /ranking?offset=0&search=&scope=all
 * A page of the current-version gladiator ranking:
 * `{ total, ranking: [{ id, gladiator, mmr, master, change24h, change7d, position }] }` (the table
 * shows the 7-day change; `change24h` stays for older clients).
 * `scope=friends` keeps only the signed-in master's friends (positions stay global). With
 * `position=N` the route answers the same window payload as `/ranking/window?position=N`.
 */
router.get('/', auth({ optional: true }), asyncRoute(async (req, res) => {
    if (req.query.position !== undefined) {
        return res.send(await Ranking.window({
            position: Validate.integer(req.query.position, 'position', { min: 1 }),
            size: windowSize(Validate.integer(req.query.size ?? 9, 'size', { min: 1, max: 1000 })),
        }));
    }
    const offset = Validate.integer(req.query.offset ?? 0, 'offset', { min: 0 });
    const search = Validate.text(req.query.search ?? '', 'search', { min: 0, max: 100 });
    const scope = Validate.oneOf(req.query.scope ?? 'all', 'scope', ['all', 'friends']);
    if (scope === 'friends' && !req.user) throw new CustomError(401, 'Sign in to see your friends.', 'NOT_SIGNED_IN');
    return res.send(await Ranking.general({ offset, search, scope, userId: req.user?.id ?? null }));
}));

/**
 * GET /ranking/window?gladiatorId=42&size=9 (or ?position=128&size=9)
 * A window of the current-version ranking centred on a gladiator or a 1-based position; exactly one
 * is required. Answers `{ total, position, page, pageSize, around, rows }`.
 */
router.get('/window', asyncRoute(async (req, res) => {
    const hasGladiator = req.query.gladiatorId !== undefined;
    const hasPosition = req.query.position !== undefined;
    if (hasGladiator === hasPosition) {
        throw new CustomError(400, 'Choose a gladiator or a position.', 'INVALID_RANKING_WINDOW');
    }
    const size = windowSize(Validate.integer(req.query.size ?? 9, 'size', { min: 1, max: 1000 }));
    if (hasGladiator) {
        return res.send(await Ranking.window({
            gladiatorId: Validate.integer(req.query.gladiatorId, 'gladiatorId', { min: 1 }),
            size,
        }));
    }
    return res.send(await Ranking.window({
        position: Validate.integer(req.query.position, 'position', { min: 1 }),
        size,
    }));
}));

/**
 * GET /ranking/mine
 * The signed-in master's gladiators with their position or unranked reason:
 * `{ gladiators: [{ id, name, mmr, position, state, skin }] }`.
 */
router.get('/mine', auth(), asyncRoute(async (req, res) => {
    res.send(await Ranking.mine(req.user.id));
}));

/**
 * GET /ranking/me
 * Where the signed-in master's best current gladiator is: `{ offset }` (gladiators above it).
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

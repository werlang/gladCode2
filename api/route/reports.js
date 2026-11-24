import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Report } from '../model/report.js';

const router = Router();
router.use(auth());

/**
 * GET /reports?offset=0&favorites=true&unreadOnly=true&markRead=true
 * A page of the master's ranked battle reports: `{ total, reports }`; each report carries `place`,
 * `total` (battle size), `result`, `opponents` and the favourite note.
 */
router.get('/', asyncRoute(async (req, res) => {
    const flag = name => req.query[name] === 'true';
    res.send(await Report.list(req.user.id, {
        offset: Validate.integer(req.query.offset ?? 0, 'offset', { min: 0 }),
        favorites: flag('favorites'),
        unreadOnly: flag('unreadOnly'),
        markRead: flag('markRead'),
    }));
}));

/**
 * GET /reports/summary
 * The report header: `{ results, renown, unread }` — the last ten known results, the renown in the
 * last seven days and the unread ranked count.
 */
router.get('/summary', asyncRoute(async (req, res) => {
    res.send(await Report.summary(req.user.id));
}));

/**
 * PUT /reports/:id/favorite
 * Keeps a report among the favorites, with a comment: `{ favorite, comment? }`.
 */
router.put('/:id/favorite', asyncRoute(async (req, res) => {
    const favorite = Validate.boolean(req.body?.favorite, 'favorite');
    const comment = Validate.text(req.body?.comment ?? '', 'comment', { min: 0, max: 1024 });
    await Report.setFavorite(req.user.id, Validate.integer(req.params.id, 'id', { min: 1 }), favorite, comment);
    res.send({ favorite });
}));

export { router as reportsRouter };

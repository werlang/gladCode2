import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { News } from '../model/news.js';

const router = Router();

/**
 * GET /news?offset=0&markRead=false
 * The latest posts, five at a time, with their presentation fields and the reader's read state.
 * Reading the list does not advance the read marker; `markRead=true` keeps the old opt-in that does.
 */
router.get('/', auth({ optional: true }), asyncRoute(async (req, res) => {
    const offset = Validate.integer(req.query.offset ?? 0, 'offset', { min: 0 });
    const posts = await News.list(offset, { readBefore: req.user?.read_news ?? null });
    if (req.user && String(req.query.markRead ?? 'false') === 'true') await req.user.markNewsRead();
    res.send({ posts });
}));

/**
 * POST /news/read
 * Marks every post as read for the signed-in master: `{ read, unread: 0 }`.
 */
router.post('/read', auth(), asyncRoute(async (req, res) => {
    res.send(await News.markAllRead(req.user));
}));

/**
 * GET /news/:hash
 * One post and the hashes of its neighbours: `{ post, previous, next }`.
 */
router.get('/:hash', asyncRoute(async (req, res) => {
    const hash = Validate.text(req.params.hash, 'hash', { pattern: /^[a-f0-9]{4}$/ });
    res.send(await News.findWithNeighbours(hash));
}));

export { router as newsRouter };

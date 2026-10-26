import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { News } from '../model/news.js';

const router = Router();

/**
 * GET /news?offset=0
 * The latest posts, five at a time. A signed-in reader's news counter is cleared.
 */
router.get('/', auth({ optional: true }), asyncRoute(async (req, res) => {
    const offset = Validate.integer(req.query.offset ?? 0, 'offset', { min: 0 });
    const posts = await News.list(offset);
    if (req.user) await req.user.markNewsRead();
    res.send({ posts });
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

import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Friendship } from '../model/friendship.js';

const router = Router();
router.use(auth());

/**
 * GET /friends?filter=
 * The master's friendships: `{ pending, confirmed }`; with `filter`, `{ friends }` whose nickname
 * contains it.
 */
router.get('/', asyncRoute(async (req, res) => {
    if (req.query.filter !== undefined) {
        const text = Validate.text(req.query.filter, 'filter', { min: 0, max: 30 });
        return res.send({ friends: await Friendship.filter(req.user.id, text) });
    }
    return res.send(await Friendship.list(req.user.id));
}));

/**
 * GET /friends/search?nick=
 * Masters to befriend: `{ users: [{ user, nick }] }` (up to ten).
 */
router.get('/search', asyncRoute(async (req, res) => {
    const nick = Validate.text(req.query.nick, 'nick', { max: 30 });
    res.send({ users: await Friendship.search(req.user.id, nick) });
}));

/**
 * POST /friends
 * Asks a master for friendship: `{ user }`. The master is emailed unless they opted out.
 */
router.post('/', asyncRoute(async (req, res) => {
    await Friendship.request(req.user, Validate.integer(req.body?.user, 'user', { min: 1 }));
    res.status(201).send({ requested: true });
}));

/**
 * PUT /friends/requests/:id
 * Answers a friend request: `{ accept }`.
 */
router.put('/requests/:id', asyncRoute(async (req, res) => {
    const accept = Validate.boolean(req.body?.accept, 'accept');
    await Friendship.answer(req.user.id, Validate.integer(req.params.id, 'id', { min: 1 }), accept);
    res.send({ accepted: accept });
}));

/**
 * DELETE /friends/:id
 * Ends a friendship (by its id).
 */
router.delete('/:id', asyncRoute(async (req, res) => {
    await Friendship.remove(req.user.id, Validate.integer(req.params.id, 'id', { min: 1 }));
    res.send({ removed: true });
}));

export { router as friendsRouter };

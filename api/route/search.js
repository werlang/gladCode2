import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Search } from '../model/search.js';

const router = Router();

/**
 * GET /search?q=
 * The header's global search: matching gladiators and masters, five per group. Anonymous visitors
 * may search; the query is trimmed and capped, and every SQL value is parameterised.
 */
router.get('/', auth({ optional: true }), asyncRoute(async (req, res) => {
    const query = Validate.text(req.query.q ?? '', 'q', { min: 2, max: 40 });
    res.send(await Search.query(query));
}));

export { router as searchRouter };

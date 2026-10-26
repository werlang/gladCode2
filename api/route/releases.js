import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Release } from '../model/release.js';

const router = Router();
router.use(auth({ admin: true }));

/**
 * GET /releases/current
 * The running version and how many gladiators each version holds: `{ version, announcing, gladiators }`.
 */
router.get('/current', asyncRoute(async (req, res) => {
    res.send(await Release.current());
}));

/**
 * POST /releases/current/gladiators
 * Carries the gladiators saved on an older version forward: `{ from }`. Answers `{ moved }`.
 */
router.post('/current/gladiators', asyncRoute(async (req, res) => {
    const from = Validate.text(req.body?.from, 'from', { max: 20 });
    res.send({ moved: await Release.carryForward(from) });
}));

/**
 * POST /releases/current/announcement
 * Emails the release to the masters who asked for update news: `{ changes, postLink }` (`changes`
 * is HTML). The emails go out in the background; answers 202 `{ recipients }`.
 */
router.post('/current/announcement', asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const recipients = await Release.announce({
        changes: Validate.text(body.changes, 'changes', { max: 20000 }),
        postLink: Validate.text(body.postLink, 'postLink', { max: 500, pattern: /^https:\/\/[^\s"'<>]+$/ }),
    });
    res.status(202).send({ recipients });
}));

export { router as releasesRouter };

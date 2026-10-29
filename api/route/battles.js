import { Router } from 'express';
import { CustomError } from '../helpers/error.js';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Battle } from '../model/battle.js';
import { Gladiator } from '../model/gladiator.js';
import { RankedBattle } from '../model/ranked-battle.js';
import { SampleGladiator } from '../model/sample-gladiator.js';

const router = Router();
/** Opponents an editor test may have. */
const MAX_OPPONENTS = 4;

/**
 * POST /battles/test
 * The editor's test battle, in the sandbox (test-only commands allowed), open to visitors:
 * `{ gladiator: { source }, opponents: [{ sample } | { id }], breakpoints?: number[] }` where
 * `source` is the full code with setup() and `id` one of the signed-in master's gladiators.
 * Answers `{ hash, error }`: the log hash, or null with the compiler or engine error.
 */
router.post('/test', auth({ optional: true }), asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const source = Validate.text(body.gladiator?.source, 'source', { max: 70000, wide: true });
    const opponents = Array.isArray(body.opponents) ? body.opponents : [];
    if (!opponents.length || opponents.length > MAX_OPPONENTS) throw Validate.error('opponents');
    const breakpoints = Array.isArray(body.breakpoints) ? body.breakpoints.map(line => Validate.integer(line, 'breakpoints', { min: 1 })) : [];

    const battle = new Battle({ origin: 'editor', sandbox: true });
    const ids = [];
    for (const opponent of opponents) {
        if (opponent?.sample !== undefined) battle.addSource((await SampleGladiator.find(String(opponent.sample))).code);
        else {
            if (!req.user) throw new CustomError(401, 'Sign in to fight your own gladiators.', 'NOT_SIGNED_IN');
            const id = Validate.integer(opponent?.id, 'opponents', { min: 1 });
            await Gladiator.findOwned(id, req.user.id);
            ids.push(id);
        }
    }
    battle.addSource(source, { edited: true }).setBreakpoints(breakpoints);
    await battle.addGladiators(ids);

    const { log, error } = await battle.run();
    res.send({ hash: log?.hash ?? null, error });
}));

/**
 * POST /battles/ranked/match
 * Finds opponents for one of the master's gladiators: `{ gladiator }`. Answers `{ opponents, match }`;
 * `match` is the id the battle needs, fought once within ten minutes.
 */
router.post('/ranked/match', auth(), asyncRoute(async (req, res) => {
    res.send(await RankedBattle.match(req.user, Validate.integer(req.body?.gladiator, 'gladiator', { min: 1 })));
}));

/**
 * POST /battles/ranked
 * Fights a match: `{ match }`. Answers `{ hash, error, summary }` with the master's level, xp and
 * silver and their gladiator after the battle.
 */
router.post('/ranked', auth(), asyncRoute(async (req, res) => {
    res.send(await RankedBattle.fight(req.user, Validate.text(req.body?.match, 'match', { min: 32, max: 32, pattern: /^[a-f0-9]{32}$/ })));
}));

export { router as battlesRouter };

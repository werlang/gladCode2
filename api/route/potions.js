import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { BREW_HOURS, Potion, SLOT_LEVELS, UPGRADE_PRICES } from '../model/potion.js';

const router = Router();

/**
 * GET /potions
 * The potions on sale: `{ potions: { <identifier>: { id, name, price, level, description, icon } } }`.
 */
router.get('/', asyncRoute(async (req, res) => {
    res.send({ potions: await Potion.catalog() });
}));

/**
 * GET /potions/apothecary
 * The apothecary's levels: `{ prices, hours }`, each indexed by level - 1 (`prices` is the cost of
 * leaving that level).
 */
router.get('/apothecary', (req, res) => {
    res.send({ prices: UPGRADE_PRICES, hours: BREW_HOURS });
});

/**
 * GET /potions/slots
 * The signed-in master's potions: `{ slots, serverNow, unlockLevels, level }`; each slot carries
 * `expiresAt` and `seconds`.
 */
router.get('/slots', auth(), asyncRoute(async (req, res) => {
    const [slots, serverNow] = await Promise.all([Potion.slots(req.user.id), Potion.serverNow()]);
    res.send({ slots, serverNow, unlockLevels: SLOT_LEVELS, level: req.user.lvl });
}));

/**
 * POST /potions/slots
 * Orders a potion: `{ potion: <identifier> }`. Answers 201 `{ slotId, silver, slots, serverNow, level, unlockLevels }`;
 * the returned list is the authoritative state after the order.
 */
router.post('/slots', auth(), asyncRoute(async (req, res) => {
    const identifier = Validate.text(req.body?.potion, 'potion', { max: 20 });
    res.status(201).send(await Potion.buy(req.user.id, identifier));
}));

/**
 * DELETE /potions/slots/:id
 * Cancels one of the master's potions.
 */
router.delete('/slots/:id', auth(), asyncRoute(async (req, res) => {
    await Potion.cancel(req.user.id, Validate.integer(req.params.id, 'id', { min: 1 }));
    res.send({ cancelled: true });
}));

/**
 * POST /potions/apothecary/upgrade
 * Upgrades the master's apothecary: `{ apothecary, silver }`.
 */
router.post('/apothecary/upgrade', auth(), asyncRoute(async (req, res) => {
    res.send(await Potion.upgradeApothecary(req.user.id));
}));

export { router as potionsRouter };

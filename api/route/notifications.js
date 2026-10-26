import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Notification } from '../model/notification.js';

const router = Router();

/**
 * GET /notifications
 * The profile counters (unread messages and reports, friend requests, duels, news, gladiator
 * places) and the master's level, xp and silver. Marks the master as active.
 */
router.get('/', auth(), asyncRoute(async (req, res) => {
    await req.user.touch();
    res.send(await Notification.counts(req.user));
}));

export { router as notificationsRouter };

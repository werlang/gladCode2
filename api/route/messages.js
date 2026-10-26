import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Message } from '../model/message.js';

const router = Router();
router.use(auth());

/**
 * GET /messages?page=1
 * A page of the master's inbox: `{ meta: { page, total, start, end }, messages }`.
 */
router.get('/', asyncRoute(async (req, res) => {
    res.send(await Message.inbox(req.user.id, Validate.integer(req.query.page ?? 1, 'page', { min: 1 })));
}));

/**
 * POST /messages
 * Sends a message: `{ receiver, message }`. The receiver is emailed unless they opted out.
 */
router.post('/', asyncRoute(async (req, res) => {
    const receiver = Validate.integer(req.body?.receiver, 'receiver', { min: 1 });
    await Message.send(req.user, receiver, Validate.text(req.body?.message, 'message', { max: 1000 }));
    res.status(201).send({ sent: true });
}));

/**
 * POST /messages/:id/reply
 * Answers a message, quoting it: `{ message }`.
 */
router.post('/:id/reply', asyncRoute(async (req, res) => {
    await Message.reply(req.user, Validate.integer(req.params.id, 'id', { min: 1 }), Validate.text(req.body?.message, 'message', { max: 1000 }));
    res.status(201).send({ sent: true });
}));

/**
 * PUT /messages/:id
 * Marks a message as read or unread: `{ read }`.
 */
router.put('/:id', asyncRoute(async (req, res) => {
    const read = Validate.boolean(req.body?.read, 'read');
    await Message.markRead(req.user.id, Validate.integer(req.params.id, 'id', { min: 1 }), read);
    res.send({ read });
}));

/**
 * DELETE /messages/:id
 */
router.delete('/:id', asyncRoute(async (req, res) => {
    await Message.remove(req.user.id, Validate.integer(req.params.id, 'id', { min: 1 }));
    res.send({ deleted: true });
}));

export { router as messagesRouter };

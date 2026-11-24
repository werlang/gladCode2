import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { auth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error.js';
import { Conversation } from '../model/conversation.js';
import { Message } from '../model/message.js';

const router = Router();
router.use(auth());

/**
 * GET /conversations
 * The signed-in master's conversations, keyed by the other master:
 * `{ conversations: [{ user, last, unread }] }`.
 */
router.get('/', asyncRoute(async (req, res) => {
    res.send(await Conversation.list(req.user.id));
}));

/**
 * GET /conversations/:userId?offset=0
 * A page of one conversation, newest first: `{ user, messages, total, offset, pageSize }`.
 */
router.get('/:userId', asyncRoute(async (req, res) => {
    res.send(await Conversation.thread(
        req.user.id,
        Validate.integer(req.params.userId, 'userId', { min: 1 }),
        Validate.integer(req.query.offset ?? 0, 'offset', { min: 0 }),
    ));
}));

/**
 * POST /conversations/:userId/messages
 * Sends a message: `{ message }`. Answers 201 `{ message: { id, sender, mine, time, body, quote, read } }`.
 * The receiver is emailed unless they opted out; a master cannot message themselves.
 */
router.post('/:userId/messages', asyncRoute(async (req, res) => {
    const userId = Validate.integer(req.params.userId, 'userId', { min: 1 });
    const text = Validate.text(req.body?.message, 'message', { max: 1000 });
    const message = await Message.send(req.user, userId, text);
    res.status(201).send({ message });
}));

/**
 * POST /conversations/:userId/read
 * Marks every unread message from that master as read: `{ userId, read, unreadTotal }`.
 */
router.post('/:userId/read', asyncRoute(async (req, res) => {
    res.send(await Conversation.markRead(
        req.user.id,
        Validate.integer(req.params.userId, 'userId', { min: 1 }),
    ));
}));

export { router as conversationsRouter };

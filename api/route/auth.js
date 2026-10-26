import { Router } from 'express';
import { Cookies } from '../helpers/cookies.js';
import { GoogleAuth } from '../helpers/google-auth.js';
import { signJwt } from '../helpers/jwt.js';
import { asyncRoute } from '../middleware/error.js';
import { User } from '../model/user.js';

const router = Router();

/**
 * POST /auth/google
 * Signs in with a Google Identity Services credential: verifies it, finds or creates the account
 * and sets the `app_session` cookie. Body: `{ credential }`. Answers `{ user }`.
 */
router.post('/google', asyncRoute(async (req, res) => {
    const identity = await GoogleAuth.verify(req.body?.credential);
    const user = await User.signInWithGoogle(identity);
    Cookies.set(res, Cookies.SESSION, await signJwt({ id: user.id }));
    res.send({ user });
}));

/**
 * POST /auth/logout
 * Ends the session. Repeating it is harmless.
 */
router.post('/logout', (req, res) => {
    Cookies.clear(res, Cookies.SESSION);
    res.send({ signedOut: true });
});

export { router as authRouter };

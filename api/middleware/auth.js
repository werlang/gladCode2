import { Cookies } from '../helpers/cookies.js';
import { CustomError } from '../helpers/error.js';
import { verifyJwt } from '../helpers/jwt.js';
import { User } from '../model/user.js';

/**
 * Resolves the signed-in user from the `app_session` cookie.
 *
 * @param {import('express').Request} req
 * @returns {Promise<User>}
 * @throws {CustomError} 401 when the cookie is missing, invalid or names no account.
 */
async function sessionUser(req) {
    const payload = await verifyJwt(Cookies.get(req, Cookies.SESSION));
    if (!payload?.id) throw new CustomError(401, 'Sign in to continue.', 'NOT_SIGNED_IN');

    try {
        return await User.findById(payload.id);
    }
    catch (error) {
        if (error.code === 'USER_NOT_FOUND') throw new CustomError(401, 'Sign in to continue.', 'NOT_SIGNED_IN');
        throw error;
    }
}

/**
 * Authentication middleware factory. Sets `req.user` (a `User`) from the session cookie.
 *
 * - default: a signed-in user is required (401 `NOT_SIGNED_IN`).
 * - `{ optional: true }`: anonymous requests continue with `req.user = null`.
 * - `{ admin: true }`: the user's email must be in `ADMIN_EMAILS` (403 `ADMIN_ONLY`).
 *
 * @param {{ optional?: boolean, admin?: boolean }} [options]
 * @returns {import('express').RequestHandler}
 */
export function auth({ optional = false, admin = false } = {}) {
    return async (req, res, next) => {
        try {
            req.user = await sessionUser(req);
        }
        catch (error) {
            if (!optional || error.status !== 401) return next(error);
            req.user = null;
            return next();
        }

        if (admin && !req.user.isAdmin) return next(new CustomError(403, 'Administrators only.', 'ADMIN_ONLY'));
        return next();
    };
}

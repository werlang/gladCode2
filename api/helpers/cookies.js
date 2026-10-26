import { readIntEnv } from './env-values.js';

/**
 * Reads, sets and clears HTTP cookies on API requests and responses.
 */
export class Cookies {
    /** Session cookie holding the signed JWT. */
    static SESSION = 'app_session';

    /** @returns {number} Session lifetime in days (`SESSION_TTL_DAYS`, default 30, 1 to 365). */
    static get ttlDays() {
        return readIntEnv('SESSION_TTL_DAYS', { fallback: 30, min: 1, max: 365 });
    }

    /**
     * Parses the request's Cookie header once and caches it on `req.cookies`.
     *
     * @param {import('express').Request} req
     * @returns {Record<string, string>}
     */
    static parse(req) {
        if (req.cookies) return req.cookies;

        const cookies = {};
        for (const pair of String(req.headers?.cookie || '').split(';')) {
            const index = pair.indexOf('=');
            if (index < 1) continue;
            const key = pair.slice(0, index).trim();
            const value = pair.slice(index + 1).trim();
            try {
                cookies[key] = decodeURIComponent(value);
            }
            catch {
                cookies[key] = value;
            }
        }
        req.cookies = cookies;
        return cookies;
    }

    /**
     * @param {import('express').Request} req
     * @param {string} name
     * @returns {string|undefined}
     */
    static get(req, name) {
        return Cookies.parse(req)[name];
    }

    /**
     * Sets an HttpOnly, SameSite=Lax cookie (Secure in production).
     *
     * @param {import('express').Response} res
     * @param {string} name
     * @param {string} value
     * @param {import('express').CookieOptions} [options]
     */
    static set(res, name, value, options = {}) {
        res.cookie(name, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: Cookies.ttlDays * 86400 * 1000,
            ...options,
        });
    }

    /**
     * @param {import('express').Response} res
     * @param {string} name
     */
    static clear(res, name) {
        res.clearCookie(name, { path: '/' });
    }
}

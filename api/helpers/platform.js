import { randomUUID } from 'node:crypto';
import cors from 'cors';
import { Cookies } from './cookies.js';
import { webOrigin } from './env-values.js';
import { CustomError } from './error.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

/**
 * Allows credentialed browser requests from the configured web origin only. Requests without an
 * Origin header (server to server, curl) get no CORS headers.
 */
export const corsMiddleware = cors({
    origin(origin, callback) {
        if (!origin) return callback(null, false);
        if (origin !== webOrigin()) {
            return callback(new CustomError(403, 'Origin is not allowed.', 'CORS_ORIGIN_DENIED'));
        }
        return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Request-Id'],
    optionsSuccessStatus: 204,
});

/**
 * Requires the web origin on state-changing requests that carry the session cookie, so another
 * site cannot act with a signed-in visitor's cookie.
 *
 * @type {import('express').RequestHandler}
 */
export function csrfOriginMiddleware(req, res, next) {
    const changesState = ['POST', 'PUT', 'DELETE'].includes(req.method);
    if (!changesState || !Cookies.get(req, Cookies.SESSION)) return next();

    if (req.get('Origin') !== webOrigin()) {
        return next(new CustomError(403, 'Origin is not allowed for signed-in changes.', 'CSRF_ORIGIN_DENIED'));
    }
    return next();
}

/**
 * Security and no-cache headers on every API response.
 *
 * @type {import('express').RequestHandler}
 */
export function securityHeadersMiddleware(req, res, next) {
    res.set({
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
    });
    if (process.env.NODE_ENV === 'production') {
        res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    }
    next();
}

/**
 * Adds a bounded `X-Request-Id` and logs one secret-free line per request.
 *
 * @type {import('express').RequestHandler}
 */
export function requestLogMiddleware(req, res, next) {
    const supplied = req.get('X-Request-Id');
    const requestId = supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID();
    const startedAt = process.hrtime.bigint();
    const path = req.path;

    req.requestId = requestId;
    res.set('X-Request-Id', requestId);
    res.once('finish', () => {
        if (process.env.NODE_ENV === 'test') return;
        console.log(JSON.stringify({
            event: 'http_request',
            requestId,
            method: req.method,
            path,
            status: res.statusCode,
            durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
        }));
    });
    next();
}

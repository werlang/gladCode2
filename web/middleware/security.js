/**
 * Baseline security headers for every page and asset.
 *
 * @type {import('express').RequestHandler}
 */
export function securityHeaders(req, res, next) {
    res.set({
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
    });
    if (process.env.NODE_ENV === 'production') {
        res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    }
    next();
}

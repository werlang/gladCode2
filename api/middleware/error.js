import { CustomError } from '../helpers/error.js';

const STATUS_TYPES = {
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    410: 'Gone',
    413: 'Payload Too Large',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
};

const DEFAULT_CODES = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    402: 'PAYMENT_REQUIRED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    410: 'GONE',
    413: 'PAYLOAD_TOO_LARGE',
    422: 'UNPROCESSABLE',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
};

/**
 * Turns thrown errors into the API's JSON error shape:
 * `{ error: true, status, type, code, message, data? }`. Only `CustomError` messages and data reach
 * the client; anything else becomes a logged, generic 500.
 *
 * @type {import('express').ErrorRequestHandler}
 */
export function errorMiddleware(err, req, res, next) {
    if (!err) return next();

    const requested = Number.isInteger(err.status) ? err.status : 500;
    const status = STATUS_TYPES[requested] ? requested : 500;
    const trusted = err instanceof CustomError && status !== 500;
    const tooLarge = err.type === 'entity.too.large';

    if (status === 500) console.error('API 500:', err);

    const payload = {
        error: true,
        status,
        type: STATUS_TYPES[status],
        code: tooLarge ? 'PAYLOAD_TOO_LARGE' : (trusted && err.code) || DEFAULT_CODES[status],
        message: trusted ? err.message : (status === 500 ? 'An unexpected error occurred.' : 'Request failed.'),
    };
    if (trusted && err.data !== undefined) payload.data = err.data;

    res.status(status).send(payload);
}

/**
 * Wraps an async route handler so rejected promises reach the error middleware.
 *
 * @param {import('express').RequestHandler} handler
 * @returns {import('express').RequestHandler}
 */
export function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

import { SignJWT, jwtVerify } from 'jose';
import { Cookies } from './cookies.js';

/** Development-only fallback; production refuses to start without a real `JWT_SECRET`. */
const DEV_SECRET = 'gladcode-dev-jwt-secret';
const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Validates the session signing secret.
 *
 * @param {NodeJS.ProcessEnv} [environment]
 * @throws {Error} When production has a missing, short or placeholder secret.
 */
export function assertJwtSecretConfiguration(environment = process.env) {
    if (environment.NODE_ENV !== 'production') return;

    const secret = environment.JWT_SECRET;
    if (typeof secret !== 'string' || secret.length < MIN_PRODUCTION_SECRET_LENGTH || secret === DEV_SECRET) {
        throw new Error('Invalid production JWT secret configuration.');
    }
}

/** @returns {Uint8Array} The configured signing key. */
function secretKey() {
    assertJwtSecretConfiguration();
    return new TextEncoder().encode(process.env.JWT_SECRET || DEV_SECRET);
}

/**
 * Signs a session payload (HS256) that expires with the session cookie.
 *
 * @param {Record<string, unknown>} payload
 * @returns {Promise<string>}
 */
export function signJwt(payload) {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime(`${Cookies.ttlDays * 86400}s`)
        .sign(secretKey());
}

/**
 * Verifies a session token's signature and expiry.
 *
 * @param {string} token
 * @returns {Promise<Record<string, unknown>|null>} The payload, or null when invalid or expired.
 */
export async function verifyJwt(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
        return payload;
    }
    catch {
        return null;
    }
}

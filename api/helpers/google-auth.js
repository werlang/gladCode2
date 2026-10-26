import { OAuth2Client } from 'google-auth-library';
import { CustomError } from './error.js';

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const client = new OAuth2Client();

/**
 * Verifies Google Identity Services ID tokens at the API boundary. Google's library checks the
 * signature, audience (`GOOGLE_CLIENT_ID`), issuer and expiry; this helper also requires a
 * verified email and a stable subject.
 */
export class GoogleAuth {
    /**
     * @param {string} idToken Credential returned by Google sign-in in the browser.
     * @returns {Promise<{ email: string, givenName: string, familyName: string, sub: string }>}
     * @throws {CustomError} 401 `GOOGLE_TOKEN_INVALID` when the token does not verify.
     */
    static async verify(idToken) {
        const audience = String(process.env.GOOGLE_CLIENT_ID || '').trim();
        if (!audience) throw new CustomError(500, 'Google client ID is not configured.', 'GOOGLE_NOT_CONFIGURED');
        if (!idToken || typeof idToken !== 'string') {
            throw new CustomError(400, 'Google credential is required.', 'GOOGLE_TOKEN_REQUIRED');
        }

        let payload;
        try {
            const ticket = await client.verifyIdToken({ idToken, audience });
            payload = ticket.getPayload();
        }
        catch {
            throw new CustomError(401, 'Google credential is invalid.', 'GOOGLE_TOKEN_INVALID');
        }

        if (!payload?.email || payload.email_verified !== true || !payload.sub || !GOOGLE_ISSUERS.has(payload.iss)) {
            throw new CustomError(401, 'Google credential is invalid.', 'GOOGLE_TOKEN_INVALID');
        }

        const email = payload.email.toLowerCase().trim();
        return {
            email,
            givenName: payload.given_name || email.split('@')[0],
            familyName: payload.family_name || '',
            sub: payload.sub,
        };
    }
}

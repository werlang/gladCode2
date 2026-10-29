import { beforeEach, describe, expect, test, vi } from 'vitest';

const verifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({ OAuth2Client: class { verifyIdToken = verifyIdToken; } }));

const { GoogleAuth } = await import('../../../helpers/google-auth.js');

/** @param {Record<string, unknown>} payload */
function google(payload) {
    verifyIdToken.mockResolvedValueOnce({ getPayload: () => payload });
}

const VALID = { email: 'Player@Example.com ', email_verified: true, sub: '123', iss: 'https://accounts.google.com', given_name: 'Ana' };

describe('Google sign-in', () => {
    beforeEach(() => {
        verifyIdToken.mockReset();
        process.env.GOOGLE_CLIENT_ID = 'client-id';
    });

    test('a verified token gives the normalised email and subject, checked against our client id', async () => {
        google(VALID);
        expect(await GoogleAuth.verify('token')).toEqual({ email: 'player@example.com', givenName: 'Ana', familyName: '', sub: '123' });
        expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'token', audience: 'client-id' });
    });

    test.each([
        ['an unverified email', { email_verified: false }],
        ['a missing email_verified', { email_verified: undefined }],
        ['another issuer', { iss: 'https://evil.example' }],
        ['no subject', { sub: '' }],
        ['no email', { email: '' }],
    ])('refuses %s', async (label, change) => {
        google({ ...VALID, ...change });
        await expect(GoogleAuth.verify('token')).rejects.toMatchObject({ status: 401, code: 'GOOGLE_TOKEN_INVALID' });
    });

    test('refuses tokens Google does not verify', async () => {
        verifyIdToken.mockRejectedValueOnce(new Error('Wrong recipient'));
        await expect(GoogleAuth.verify('token')).rejects.toMatchObject({ status: 401, code: 'GOOGLE_TOKEN_INVALID' });
    });
});

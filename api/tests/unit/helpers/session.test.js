import { describe, expect, test, vi } from 'vitest';
import { Cookies } from '../../../helpers/cookies.js';
import { buildUrl } from '../../../helpers/env-values.js';
import { assertJwtSecretConfiguration, signJwt, verifyJwt } from '../../../helpers/jwt.js';

describe('session helpers', () => {
    test('a signed session verifies and a tampered one does not', async () => {
        const token = await signJwt({ id: 277 });
        expect((await verifyJwt(token)).id).toBe(277);
        expect(await verifyJwt(`${token}x`)).toBeNull();
        expect(await verifyJwt(undefined)).toBeNull();
    });

    test('an expired token no longer verifies', async () => {
        const token = await signJwt({ id: 277 }, { expiresInSeconds: 60 });
        vi.useFakeTimers({ now: Date.now() + 61_000 });
        try {
            expect(await verifyJwt(token)).toBeNull();
        }
        finally {
            vi.useRealTimers();
        }
    });

    test('production refuses the development secret', () => {
        expect(() => assertJwtSecretConfiguration({ NODE_ENV: 'production' })).toThrow();
        expect(() => assertJwtSecretConfiguration({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) })).not.toThrow();
    });

    test('the session cookie is HttpOnly and Lax, and Secure in production', () => {
        const cookie = vi.fn();
        const environment = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = 'production';
            Cookies.set({ cookie }, Cookies.SESSION, 'token');
            process.env.NODE_ENV = 'development';
            Cookies.set({ cookie }, Cookies.SESSION, 'token');
        }
        finally {
            process.env.NODE_ENV = environment;
        }
        expect(cookie.mock.calls[0][2]).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
        expect(cookie.mock.calls[1][2]).toMatchObject({ httpOnly: true, secure: false });
    });

    test('cookies are parsed once from the header', () => {
        const req = { headers: { cookie: 'a=1; app_session=abc%3D; broken' } };
        expect(Cookies.get(req, 'app_session')).toBe('abc=');
        expect(req.cookies).toEqual({ a: '1', app_session: 'abc=' });
    });

    test('origins join a base URL and an external port', () => {
        expect(buildUrl('http://localhost', '8085')).toBe('http://localhost:8085');
        expect(buildUrl('https://gladcode.dev/', '443')).toBe('https://gladcode.dev');
        expect(buildUrl('', '80')).toBe('');
    });
});

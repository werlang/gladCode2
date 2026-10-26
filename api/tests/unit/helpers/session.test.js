import { describe, expect, test } from 'vitest';
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

    test('production refuses the development secret', () => {
        expect(() => assertJwtSecretConfiguration({ NODE_ENV: 'production' })).toThrow();
        expect(() => assertJwtSecretConfiguration({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) })).not.toThrow();
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

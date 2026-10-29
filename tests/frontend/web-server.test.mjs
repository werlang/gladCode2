// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/web-server.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { safeJson } from '../../web/helpers/safe-json.js';
import { buildUrl, legacyPageUrl } from '../../web/helpers/urls.js';

test('page variables cannot close their script tag', () => {
    const json = safeJson({ name: '</script><script>alert(1)</script>', line: 'a\u2028b\u2029c', amp: '&' });
    assert.ok(!json.includes('<') && !json.includes('>') && !json.includes('&'));
    assert.ok(!json.includes('\u2028') && !json.includes('\u2029'));
    assert.deepEqual(JSON.parse(json), { name: '</script><script>alert(1)</script>', line: 'a\u2028b\u2029c', amp: '&' });
});

test('old PHP addresses move to the new routes', () => {
    assert.equal(legacyPageUrl('index', {}), '/');
    assert.equal(legacyPageUrl('index', { login: 'battle' }), '/?login=battle');
    assert.equal(legacyPageUrl('playback', { log: 'abc' }), '/play/abc');
    assert.equal(legacyPageUrl('tournament', { h: 'ab12', r: '2' }), '/tourn/ab12/2');
    assert.equal(legacyPageUrl('editor', { g: '0' }), '/newglad');
    assert.equal(legacyPageUrl('editor', { g: '15' }), '/glad-15');
    assert.equal(legacyPageUrl('function', { f: 'attack', l: 'pt', p: 'c' }), '/funcao/attack.c');
    assert.equal(legacyPageUrl('profile', { t: 'battle', s: 'duel' }), '/profile?t=battle&s=duel');
    assert.equal(legacyPageUrl('code', {}), null);
});

test('redirects never leave the site, whatever the query holds', () => {
    for (const evil of ['//evil.example', '/\\evil.example', 'https://evil.example', '../../etc', 'a\r\nSet-Cookie: x=1']) {
        for (const [page, key] of [['playback', 'log'], ['post', 'p'], ['index', 'login'], ['editor', 'g'], ['tournament', 'h']]) {
            const target = legacyPageUrl(page, { [key]: evil });
            assert.ok(target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\'), `${page}: ${target}`);
            assert.ok(!/[\r\n]/.test(target) && !target.includes('evil.example/'), `${page}: ${target}`);
        }
    }
    assert.equal(legacyPageUrl('playback', { log: ['a', 'b'] }), '/');
});

test('origins join a base URL and an external port', () => {
    assert.equal(buildUrl('http://localhost', '8085'), 'http://localhost:8085');
    assert.equal(buildUrl('https://gladcode.dev/', '443'), 'https://gladcode.dev');
    assert.equal(buildUrl('http://localhost:3000', '80'), 'http://localhost:3000');
    assert.equal(buildUrl('', '80'), '');
});

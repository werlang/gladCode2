// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/theme.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const store = new Map();
globalThis.localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
};
globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {} }) };

const { THEME_CHOICES, resolveTheme, storedThemeChoice } = await import('../../web/public/script/helpers/theme.js');

test('a choice shows its theme; system follows the colour scheme', () => {
    assert.deepEqual(THEME_CHOICES, ['system', 'arena', 'classic']);
    assert.equal(resolveTheme('arena', false), 'arena');
    assert.equal(resolveTheme('classic', true), 'classic');
    assert.equal(resolveTheme('system', true), 'arena');
    assert.equal(resolveTheme('system', false), 'classic');
    assert.equal(resolveTheme('bogus', true), 'arena');
});

test('the cached choice reads as system when missing or unknown', () => {
    store.clear();
    assert.equal(storedThemeChoice(), 'system');
    store.set('gladcode-theme', JSON.stringify({ data: 'arena', expires: false }));
    assert.equal(storedThemeChoice(), 'arena');
    store.set('gladcode-theme', JSON.stringify({ data: 'neon', expires: false }));
    assert.equal(storedThemeChoice(), 'system');
});

test('the boot script reads the same key and format the helper writes', () => {
    const boot = readFileSync(new URL('../../web/public/script/theme-boot.js', import.meta.url), 'utf8');
    assert.match(boot, /localStorage\.getItem\('gladcode-theme'\)/);
    assert.match(boot, /stored\.data/);
    assert.match(boot, /theme-\$\{theme\}/);
});

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

test('a choice shows its theme; system picks Arena light or dark from the colour scheme', () => {
    assert.deepEqual(THEME_CHOICES, ['system', 'classic', 'arena-light', 'arena-dark']);
    assert.equal(resolveTheme('classic', true), 'classic');
    assert.equal(resolveTheme('arena-light', true), 'arena-light');
    assert.equal(resolveTheme('arena-dark', false), 'arena-dark');
    assert.equal(resolveTheme('system', true), 'arena-dark');
    assert.equal(resolveTheme('system', false), 'arena-light');
    assert.equal(resolveTheme('bogus', true), 'arena-dark');
    assert.equal(resolveTheme('arena', false), 'arena-light');
});

test('the cached choice reads as system when missing or unknown', () => {
    store.clear();
    assert.equal(storedThemeChoice(), 'system');
    store.set('gladcode-theme', JSON.stringify({ data: 'arena-dark', expires: false }));
    assert.equal(storedThemeChoice(), 'arena-dark');
    store.set('gladcode-theme', JSON.stringify({ data: 'neon', expires: false }));
    assert.equal(storedThemeChoice(), 'system');
});

test('the boot script reads the same key and format the helper writes', () => {
    const boot = readFileSync(new URL('../../web/public/script/theme-boot.js', import.meta.url), 'utf8');
    assert.match(boot, /localStorage\.getItem\('gladcode-theme'\)/);
    assert.match(boot, /stored\.data/);
    assert.match(boot, /theme-\$\{theme\}/);
});

test('the boot script accepts every theme the helper offers', () => {
    const boot = readFileSync(new URL('../../web/public/script/theme-boot.js', import.meta.url), 'utf8');
    for (const theme of THEME_CHOICES.slice(1)) assert.match(boot, new RegExp(`'${theme}'`));
});

test('every theme the helper offers has a role mapping in tokens.css', () => {
    const tokens = readFileSync(new URL('../../web/public/css/tokens.css', import.meta.url), 'utf8');
    for (const theme of THEME_CHOICES.slice(1)) assert.match(tokens, new RegExp(`:root\\.theme-${theme}[ ,{]`));
});

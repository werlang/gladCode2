// Run: docker run --rm -v "$PWD/web":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && npm test"
import assert from 'node:assert/strict';
import test from 'node:test';

import { moduleImports } from '../helpers/modules.js';

/** The specifiers the card pages must be able to import on demand. */
const CARD_MODULES = [
    'three',
    'three/addons/',
    './render2/card-portrait.js',
    './render2/portrait.js',
    './render2/synty-model.js',
    '/script/render2/card-portrait.js',
    '/script/helpers/portrait-cache.js',
    '/script/components/glad-card.js',
];
/** Pages with gladiator cards, and the editor whose creator mounts the 3D gladiator. */
const CARD_AND_EDITOR_PATHS = [
    '/', '/profile', '/glads', '/battle.ranked', '/tourn/ab12/0', '/train/ab12/0',
    '/editor', '/newglad', '/glad-3',
];

test('three and the 3D renderer are mapped whether or not the replay gate asks for them', () => {
    for (const options of [undefined, { render2: false }, { render2: true }]) {
        const imports = moduleImports(options);
        assert.match(imports.three, /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/build\/three\.module\.min\.js$/);
        assert.match(imports['three/addons/'], /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/examples\/jsm\/$/);
        for (const specifier of CARD_MODULES) assert.ok(imports[specifier], `${specifier} (${JSON.stringify(options)})`);
    }
});

process.env.NODE_ENV = 'test';

/**
 * Serves one fresh copy of the app with `ENABLE_RENDER2` set as given (the flag is read when app.js loads).
 *
 * @param {'0'|'1'} flag Value of ENABLE_RENDER2.
 * @returns {Promise<{ base: string, close: () => void }>}
 */
async function appWithRender2(flag) {
    const previous = process.env.ENABLE_RENDER2;
    process.env.ENABLE_RENDER2 = flag;
    const { app } = await import(`../app.js?import-map-test=render2-${flag}`);
    if (previous === undefined) delete process.env.ENABLE_RENDER2;
    else process.env.ENABLE_RENDER2 = previous;
    const server = app.listen(0);
    return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

const off = await appWithRender2('0');
const on = await appWithRender2('1');
test.after(() => {
    off.close();
    on.close();
});

/** @param {string} html A page. @returns {Record<string, string>} Its import map. */
function importMap(html) {
    const tag = /<script type="importmap">(.*?)<\/script>/s.exec(html);
    assert.ok(tag, 'the page prints an import map');
    return JSON.parse(tag[1]).imports;
}

/** @param {string} base @param {string} path @returns {Promise<string>} */
async function page(base, path) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, path);
    return response.text();
}

test('card pages and the editor map three and render2 with the gate on and off', async () => {
    for (const gate of [off, on]) {
        for (const path of CARD_AND_EDITOR_PATHS) {
            const imports = importMap(await page(gate.base, path));
            assert.match(imports.three, /three@[\d.]+\/build/, path);
            assert.ok(Object.keys(imports).some(specifier => specifier.startsWith('./render2/')), path);
            assert.ok(imports['/script/render2/card-portrait.js'], path);
        }
    }
});

test('the replay keeps its own renderer behind ENABLE_RENDER2 through playback.html', async () => {
    const disabled = await page(off.base, '/play/abc');
    assert.doesNotMatch(disabled, /<script type="module" src="[^"]*\/script\/render2\.js/);
    assert.doesNotMatch(disabled, /css\/playback-render2\.css/);
    // the map is printed all the same: card pages and the editor need three wherever they are
    assert.ok(importMap(disabled).three);

    const enabled = await page(on.base, '/play/abc');
    assert.match(enabled, /<script type="module" src="[^"]*\/script\/render2\.js\?v=\d+"><\/script>/);
    assert.match(enabled, /<link rel='stylesheet' href="[^"]*\/css\/playback-render2\.css\?v=\d+"\/>/);
});

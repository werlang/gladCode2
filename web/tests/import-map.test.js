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

test('three and the 3D renderer are mapped whether or not the replay gate asks for them', () => {
    for (const options of [undefined, { render2: false }, { render2: true }]) {
        const imports = moduleImports(options);
        assert.match(imports.three, /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/build\/three\.module\.min\.js$/);
        assert.match(imports['three/addons/'], /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/examples\/jsm\/$/);
        for (const specifier of CARD_MODULES) assert.ok(imports[specifier], `${specifier} (${JSON.stringify(options)})`);
    }
});

process.env.NODE_ENV = 'test';
process.env.ENABLE_RENDER2 = '0';
const { app } = await import('../app.js?import-map-test=render2-off');
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

/** @param {string} html A page. @returns {Record<string, string>} Its import map. */
function importMap(html) {
    const tag = /<script type="importmap">(.*?)<\/script>/s.exec(html);
    assert.ok(tag, 'the page prints an import map');
    return JSON.parse(tag[1]).imports;
}

/** @param {string} html A page. @returns {Record<string, unknown>} Its template vars (`#template-vars`). */
const templateVars = html => JSON.parse(/<script id="template-vars" type="application\/json">(.*?)<\/script>/s.exec(html)[1]);

test('the routes with gladiator cards map three and render2 with ENABLE_RENDER2=0', async () => {
    for (const path of ['/', '/profile', '/glads', '/battle.ranked', '/tourn/ab12/0', '/train/ab12/0', '/editor', '/glad-3']) {
        const response = await fetch(`${base}${path}`);
        assert.equal(response.status, 200, path);
        const imports = importMap(await response.text());
        assert.match(imports.three, /three@[\d.]+\/build/, path);
        assert.ok(Object.keys(imports).some(specifier => specifier.startsWith('./render2/')), path);
        assert.ok(imports['/script/render2/card-portrait.js'], path);
    }
});

test('the gate still keeps the replay (and the editor preview) off the 3D renderer', async () => {
    const replay = await (await fetch(`${base}/play/abc`)).text();
    assert.doesNotMatch(replay, /src="[^"]*script\/render2\.js/);
    assert.match(replay, /window\.__RENDER2_ENABLED__ = false;/);

    const editor = await (await fetch(`${base}/editor`)).text();
    assert.equal(templateVars(editor).render2, false);
});

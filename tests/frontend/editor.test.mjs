// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { attributeCost, detectLanguage, gladiatorSource, validGladName } from '../../web/public/script/editor/attributes.js';
import { insideFunction } from '../../web/public/script/editor/code-editor.js';
import { currentGladView } from '../../web/public/script/helpers/glad-view.js';

test('attribute costs grow by one point every six levels', () => {
    assert.equal(attributeCost(0), 0);
    assert.equal(attributeCost(6), 6);
    assert.equal(attributeCost(10), 14);
    assert.equal(attributeCost(18), 36);
    assert.equal(attributeCost(10) + attributeCost(0) + attributeCost(18), 50);
});

test('gladiator names need three letters, digits or spaces', () => {
    assert.equal(validGladName('Magnus'), true);
    assert.equal(validGladName('Zé Bão'), true);
    assert.equal(validGladName('ab'), false);
    assert.equal(validGladName('bad;name'), false);
});

test('the language follows the code, or the blocks editor', () => {
    assert.equal(detectLanguage('loop(){}'), 'c');
    assert.equal(detectLanguage('def loop():\n    pass'), 'python');
    assert.equal(detectLanguage('def loop():', true), 'blocks');
});

test('the gladiator source starts with its setup', () => {
    const glad = { name: 'Rex', vstr: 10, vagi: 0, vint: 18, skin: '["male"]', user: 'me' };
    const c = gladiatorSource(glad, 'loop(){}', 'c');
    assert.match(c, /^setup\(\)\{\n    setName\("Rex"\);/);
    assert.match(c, /setSkin\("\["male"\]"\);/);
    assert.ok(c.endsWith('}\n\nloop(){}'));
    const python = gladiatorSource(glad, 'def loop():\n    pass', 'python');
    assert.match(python, /^def setup\(\):\n    setName\("Rex"\)/);
    assert.ok(python.endsWith('# start of user code\ndef loop():\n    pass'));
});

test('breakpoints only go inside functions', () => {
    const c = ['int x;', 'loop(){', '    x++;', '}'];
    assert.equal(insideFunction(c, 0, 'c'), false);
    assert.equal(insideFunction(c, 2, 'c'), true);
    const python = ['x = 0', 'def loop():', '    x += 1'];
    assert.equal(insideFunction(python, 0, 'python'), false);
    assert.equal(insideFunction(python, 2, 'python'), true);
});

/** A page with no editor markup, the cached style the web service renders and a cookie. */
function fakePage({ view = '3d' } = {}) {
    const attributes = { 'data-glad-view': view };
    return {
        cookie: '',
        documentElement: {
            getAttribute: name => attributes[name] ?? null,
            setAttribute: (name, value) => {
                attributes[name] = value;
            },
        },
        querySelector: () => null,
        addEventListener: () => {},
        dispatchEvent: () => true,
    };
}

test('a sprite account mounts the editor creator without the 3D preview, even with no cached cookie', async () => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: key => store.get(key) ?? null,
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: key => store.delete(key),
    };
    // blocks.js registers its Blockly blocks at import time
    globalThis.Blockly = { Blocks: {}, Python: {} };
    // what the web service serves for a browser that never visited the profile: the 3D default, no cookie
    globalThis.document = fakePage({ view: '3d' });
    const { startCreator } = await import('../../web/public/script/editor.js');

    // SkinCreator#init reads the page's style before it decides whether to mount SkinPreview3D
    const creator = {
        mounted: null,
        async init() {
            this.mounted = currentGladView() === '3d' ? 'SkinPreview3D' : 'sprite';
        },
    };
    const user = await startCreator(creator, async () => ({ id: 7, gladView: 'sprite' }));

    assert.equal(user.id, 7);
    assert.equal(creator.mounted, 'sprite', 'the account choice must reach the creator before it mounts its preview');
    assert.equal(document.documentElement.getAttribute('data-glad-view'), 'sprite');
    assert.match(document.cookie, /gladview=sprite/);
});

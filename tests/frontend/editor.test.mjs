// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { attributeCost, detectLanguage, gladiatorSource, validGladName } from '../../web/public/script/editor/attributes.js';
import { insideFunction } from '../../web/public/script/editor/code-editor.js';

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
    assert.equal(detectLanguage('function loop() {}'), 'javascript');
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
    const javascript = gladiatorSource(glad, 'function loop() {}', 'javascript');
    assert.match(javascript, /^function setup\(\) \{\n    setName\("Rex"\);/);
    assert.match(javascript, /setUser\("me"\);\n    setSlots\("-1,-1,-1,-1"\);\n\}\n/);
    assert.ok(javascript.endsWith('}\n// start of user code\nfunction loop() {}'));
});

test('breakpoints only go inside functions', () => {
    const c = ['int x;', 'loop(){', '    x++;', '}'];
    assert.equal(insideFunction(c, 0, 'c'), false);
    assert.equal(insideFunction(c, 2, 'c'), true);
    const python = ['x = 0', 'def loop():', '    x += 1'];
    assert.equal(insideFunction(python, 0, 'python'), false);
    assert.equal(insideFunction(python, 2, 'python'), true);
    const javascript = ['let x = 0;', 'const loop = () => {', '    x++;', '};'];
    assert.equal(insideFunction(javascript, 0, 'javascript'), false);
    assert.equal(insideFunction(javascript, 2, 'javascript'), true);
});

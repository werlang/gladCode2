// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { ACE_MODES, codeLanguage } from '../../web/public/script/helpers/code-language.js';
import { elapsedString, formatMessageTime, splitDuration } from '../../web/public/script/helpers/date-format.js';
import { translateFunctionText } from '../../web/public/script/helpers/function-reference.js';
import { escapeHtml, renderTemplate } from '../../web/public/script/helpers/html.js';
import { RequestError, parseBody, toQuery } from '../../web/public/script/helpers/request.js';
import { nameGladiators, simulationProblem } from '../../web/public/script/helpers/simulation-report.js';

test('queries repeat array keys and leave empty values out', () => {
    assert.equal(toQuery({ page: 2, glads: [3, 7], search: '', skipped: undefined, none: null }), 'page=2&glads=3&glads=7');
    assert.equal(toQuery({ q: 'a b&c' }), 'q=a+b%26c');
});

test('bodies parse as JSON and fall back to their text', () => {
    assert.deepEqual(parseBody('{"status":"alive"}'), { status: 'alive' });
    assert.equal(parseBody('plain text'), 'plain text');
    assert.equal(parseBody(''), null);
});

test('API errors expose their stable code', () => {
    const error = new RequestError(409, 'Nickname taken.', { error: true, code: 'NICKNAME_TAKEN' });
    assert.equal(error.code, 'NICKNAME_TAKEN');
    assert.equal(new RequestError(500, 'x', 'text').code, undefined);
});

test('templates escape double braces and insert triple braces as is', () => {
    const html = renderTemplate('<b title="{{title}}">{{{body}}}</b>', { title: '"x" & <y>', body: '<i>ok</i>' });
    assert.equal(html, '<b title="&quot;x&quot; &amp; &lt;y&gt;"><i>ok</i></b>');
    assert.equal(renderTemplate('{{a}}{{b}}', { a: null, b: undefined }), '');
    assert.throws(() => renderTemplate('{{missing}}', {}), /missing/);
    assert.equal(renderTemplate('{{a}}', { a: '{{b}}', b: 'no' }), '{{b}}');
    assert.equal(escapeHtml("it's"), 'it&#39;s');
});

test('elapsed time reads in its largest unit', () => {
    assert.equal(elapsedString(5.9), '5 minutos');
    assert.equal(elapsedString(125), '2 horas');
    assert.equal(elapsedString(60 * 24 * 3 + 10), '3 dias');
    assert.equal(elapsedString(60 * 24 * 65), '2 meses');
});

test('message times read as Portuguese dates', () => {
    const time = new Date(2025, 9, 3, 9, 5);
    assert.equal(formatMessageTime(time), '3 de out de 2025 às 09:05');
    assert.equal(formatMessageTime(time, { monthFull: true }), '3 de Outubro de 2025 às 09:05');
    assert.equal(formatMessageTime(Date.now() - 3 * 60000, { short: true }), '3 minutos');
});

test('compiler errors name the gladiators and stay text', () => {
    assert.equal(nameGladiators('/usercode/code0.c:1 x\\ncode1.py:2', ['Alpha', 'Beta']), '<span>Alpha</span>:1 x\n<span>Beta</span>:2');
    assert.equal(nameGladiators('code0.c: expected <b>', ['<i>A</i>']), '<span>&#60;i&#62;A&#60;/i&#62;</span>: expected &#60;b&#62;');
    assert.equal(simulationProblem({ hash: null, error: 'INVALID_ATTR' }).title, 'ERRO DE VALIDAÇÃO');
    assert.equal(simulationProblem({ hash: null, error: 'NO_OUTPUT' }).title, 'ERRO NA SIMULAÇÃO');
    assert.equal(simulationProblem({ hash: 'abc', error: '' }), null);
    assert.equal(simulationProblem({ hash: null, error: 'code0.c: oops' }, ['Zed']).message, '<span>Zed</span>: oops');
    assert.equal(nameGladiators('code0.js:3\nReferenceError: x is not defined\n    at loop (code0.js:3:5)', ['Zed']), '<span>Zed</span>:3\nReferenceError: x is not defined\n    at loop (<span>Zed</span>:3:5)');
});

test('the code language comes from how loop() is written, like the API reads it', () => {
    assert.equal(codeLanguage('loop(){\n    stepForward();\n}'), 'c');
    assert.equal(codeLanguage('def loop():\n    stepForward()'), 'python');
    assert.equal(codeLanguage('function loop() {\n    stepForward();\n}'), 'javascript');
    assert.equal(codeLanguage('let start = true;\nconst loop = () => turn(5);'), 'javascript');
    assert.equal(codeLanguage('var loop=function(){};'), 'javascript');
    assert.equal(codeLanguage('loop = () => turn(5);'), 'javascript');
    assert.equal(codeLanguage('int loops = 0;\nloop(){}'), 'c');
    // comments and strings never turn a C gladiator into JavaScript
    assert.equal(codeLanguage('// const loop = estrategia\nloop(){\n}'), 'c');
    assert.equal(codeLanguage('loop(){ speak("function loop() {}"); }'), 'c');
    assert.equal(codeLanguage(undefined), 'c');
    assert.equal(ACE_MODES[codeLanguage('function loop() {}')], 'ace/mode/javascript');
});

test('function prose translates whole API names only', () => {
    const names = { getTargetX: 'pegaXAlvo', getX: 'pegaX' };
    assert.equal(translateFunctionText('Use getTargetX e getX.', names), 'Use pegaXAlvo e pegaX.');
    assert.equal(translateFunctionText('getTargetX()', names), 'pegaXAlvo()');
    assert.equal(translateFunctionText('my_getTargetXValue', names), 'my_getTargetXValue');
});

test('durations split into padded hours, minutes and seconds', () => {
    assert.deepEqual(splitDuration(3725000), ['01', '02', '05']);
    assert.deepEqual(splitDuration(-5000), ['00', '00', '00']);
});

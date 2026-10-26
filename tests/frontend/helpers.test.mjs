// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { elapsedString, formatMessageTime, splitDuration } from '../../public_html/script/helpers/date-format.js';
import { escapeHtml, renderTemplate } from '../../public_html/script/helpers/html.js';
import { parseBody, toFormBody } from '../../public_html/script/helpers/request.js';
import { nameGladiators, simulationProblem } from '../../public_html/script/helpers/simulation-report.js';

test('form bodies nest objects and arrays the way PHP reads $_POST', () => {
    const body = toFormBody({
        action: 'SET',
        glads: [3, 7],
        prefs: { sound: true, speed: 2 },
        rows: [{ id: 1 }],
        empty: null,
        skipped: undefined,
    });
    assert.equal(
        decodeURIComponent(body.toString()),
        'action=SET&glads[]=3&glads[]=7&prefs[sound]=true&prefs[speed]=2&rows[0][id]=1&empty=',
    );
});

test('bodies parse as JSON and fall back to their text', () => {
    assert.deepEqual(parseBody('{"status":"SUCCESS"}'), { status: 'SUCCESS' });
    assert.equal(parseBody('Warning: oops'), 'Warning: oops');
    assert.equal(parseBody(''), '');
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

test('compiler errors name the gladiators', () => {
    const glads = [{ name: 'Alpha' }, 'setName("Beta");', 7];
    assert.equal(nameGladiators('/usercode/code0.c:1 x\\ncode1.py:2', glads), '<span>Alpha</span>:1 x\n<span>Beta</span>:2');
    assert.equal(simulationProblem({ error: 'INVALID_ATTR' }).title, 'ERRO DE VALIDAÇÃO');
    assert.match(simulationProblem({ error: '', output: 'Gladiator Zed timed out' }).message, /Zed/);
    assert.equal(simulationProblem({ error: '', output: '', simulation: 'abc' }), null);
    assert.equal(simulationProblem('Fatal error').title, 'ERRO EM TEMPO DE EXECUÇÃO');
});

test('durations split into padded hours, minutes and seconds', () => {
    assert.deepEqual(splitDuration(3725000), ['01', '02', '05']);
    assert.deepEqual(splitDuration(-5000), ['00', '00', '00']);
});

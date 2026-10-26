// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { dressMessage, linkMessage, sendFeedback } from '../../public_html/script/helpers/chat-commands.js';
import { splitDuration } from '../../public_html/script/helpers/date-format.js';
import { nameGladiators, simulationProblem } from '../../public_html/script/helpers/simulation-report.js';

test('commands answer with a toast and a room list change', () => {
    assert.deepEqual(sendFeedback({ status: 'JOINED', name: 'gladCode' }), {
        toast: ['Bem-vindo à sala gladCode', 'success'],
        rooms: { insert: 'gladCode' },
    });
    assert.deepEqual(sendFeedback({ status: 'NOTARGET', command: 'unban', target: 'x' }).toast, ['O usuário x não está banido', 'info']);
    assert.deepEqual(sendFeedback({ status: 'SENT' }), {});
});

test('a user listing becomes a table with a total row', () => {
    const { table } = sendFeedback({ status: 'LIST', user: [{ privilege: 'Líder', apelido: 'a', since: '1', login: '2' }] });
    assert.equal(table.length, 4);
    assert.equal(table.at(-1)[0].data, 'Total de 1 participantes');
});

test('messages get code blocks, images and a web address to resolve', () => {
    assert.equal(
        dressMessage('&lt;code&gt;int x;&lt;/code&gt;').html,
        "<pre class='language-c'><code>int x;</code></pre>",
    );
    assert.match(dressMessage('&lt;img src=&#039;https://x.dev/a.png&#039;&gt;').html, /<img class='chat-img' src='https:\/\/x.dev\/a.png'/);
    assert.equal(dressMessage('veja www.gladcode.dev agora').url, 'www.gladcode.dev');
    assert.equal(linkMessage('veja www.gladcode.dev', 'www.gladcode.dev', false), "veja <a href='//www.gladcode.dev' target='_blank' rel='noopener'>www.gladcode.dev</a>");
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

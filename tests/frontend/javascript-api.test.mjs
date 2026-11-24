// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const corePath = require.resolve('../../Payload/gladCodeCore.js');
const previousCore = require.cache[corePath];
let reply = '0';
const sent = [];
require.cache[corePath] = {
    id: corePath,
    filename: corePath,
    loaded: true,
    exports: { sendMessage: message => { sent.push(message); return reply; } },
};
const api = require('../../Payload/gladCodeAPI.js');
const { MESSAGE_BYTES, limitMessage } = require('../../Payload/gladCodeProtocol.js');

test.after(() => {
    if (previousCore) require.cache[corePath] = previousCore;
    else delete require.cache[corePath];
    delete require.cache[require.resolve('../../Payload/gladCodeAPI.js')];
});

test('target status sentinels are false and real answers stay boolean', () => {
    for (const name of ['isStunned', 'isBurning', 'isProtected', 'isRunning', 'isSlowed']) {
        reply = '-1';
        assert.equal(api[name](), false, name);
        reply = '0';
        assert.equal(api[name](), false, name);
        reply = '1';
        assert.equal(api[name](), true, name);
    }
});

test('target health is a ratio or false when no target is visible', () => {
    reply = '-1';
    assert.equal(api.getTargetHealth(), false);
    reply = '0.5';
    assert.equal(api.getTargetHealth(), 0.5);
});

test('protocol messages are capped at 1999 UTF-8 bytes without splitting a character', () => {
    assert.equal(MESSAGE_BYTES, 1999);
    const cases = [
        ['é'.repeat(1000), 996],
        ['😀'.repeat(500), 498],
        ['a'.repeat(1998) + '\uFFFD' + 'b', 1993],
        ['a'.repeat(1990) + '\uFFFD' + '😀', 1991],
    ];
    for (const [message, length] of cases) {
        const command = limitMessage(`speak ${message}`).slice('speak '.length);
        assert.ok(Buffer.byteLength(`speak ${command}`, 'utf8') <= MESSAGE_BYTES);
        assert.equal([...command].length, length);
        assert.ok(message.startsWith(command));
        assert.equal(command.includes('\uFFFD'), message.slice(0, command.length).includes('\uFFFD'));
    }
});

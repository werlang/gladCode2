// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/theme-preview.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { previewTheme } = await import('../../web/public/script/helpers/theme-preview.js');

/** @returns {{ calls: string[], apply: (choice: string) => void }} */
function recorder() {
    const calls = [];
    return { calls, apply: choice => calls.push(choice) };
}

test('a confirmed save keeps the preview and returns the undo token', async () => {
    const { calls, apply } = recorder();
    const token = { field: 'theme', rev: 1, previous: 'arena-light' };
    const result = await previewTheme({
        choice: 'classic',
        previous: 'arena-light',
        fallback: () => 'system',
        apply,
        save: async () => ({ token, user: { theme: 'classic' } }),
    });
    assert.deepEqual(calls, ['classic']);
    assert.equal(result.status, 'saved');
    assert.equal(result.token, token);
    assert.equal(result.previous, 'arena-light');
});

test('a refused save rolls the preview back to the confirmed choice', async () => {
    const { calls, apply } = recorder();
    const error = Object.assign(new Error('offline'), { code: 'NETWORK' });
    const result = await previewTheme({
        choice: 'classic',
        previous: 'arena-dark',
        fallback: () => 'system',
        apply,
        save: async () => {
            throw error;
        },
    });
    assert.deepEqual(calls, ['classic', 'arena-dark']);
    assert.equal(result.status, 'failed');
    assert.equal(result.error, error);
});

test('without a confirmed choice the rollback uses the cached one', async () => {
    const { calls, apply } = recorder();
    const result = await previewTheme({
        choice: 'classic',
        previous: null,
        fallback: () => 'system',
        apply,
        save: async () => {
            throw new Error('offline');
        },
    });
    assert.deepEqual(calls, ['classic', 'system']);
    assert.equal(result.previous, 'system');
});

test('a stale refusal never repaints over a newer preview', async () => {
    const { calls, apply } = recorder();
    const result = await previewTheme({
        choice: 'classic',
        previous: 'arena-light',
        fallback: () => 'system',
        apply,
        save: async () => {
            throw new Error('offline');
        },
        isCurrent: () => false,
    });
    assert.deepEqual(calls, ['classic']);
    assert.equal(result.status, 'failed');
});

test('a superseded save reports it instead of offering an undo', async () => {
    const { calls, apply } = recorder();
    const result = await previewTheme({
        choice: 'classic',
        previous: 'arena-light',
        fallback: () => 'system',
        apply,
        save: async () => ({ token: {}, user: { theme: 'classic' }, superseded: true }),
    });
    assert.deepEqual(calls, ['classic']);
    assert.equal(result.status, 'superseded');
});

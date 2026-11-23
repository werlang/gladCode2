// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/theme-preview.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { previewTheme } = await import('../../web/public/script/helpers/theme-preview.js');
const { AccountService } = await import('../../web/public/script/services/account.js');

/** A deferred the test resolves when it wants the request to finish. */
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return { promise, resolve, reject };
}

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

test('a refusal rolls back to the value confirmed while the queue advanced', async () => {
    const { calls, apply } = recorder();
    let confirmed = 'arena-light';
    const result = await previewTheme({
        choice: 'classic',
        previous: 'arena-light',
        fallback: () => 'system',
        apply,
        confirmed: () => confirmed,
        save: async () => {
            confirmed = 'arena-dark';
            throw new Error('offline');
        },
    });
    assert.deepEqual(calls, ['classic', 'arena-dark']);
    assert.equal(result.previous, 'arena-light');
    assert.equal(result.status, 'failed');
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

test('a second theme failure rolls back to the first confirmed write', async () => {
    const firstGate = deferred();
    const secondGate = deferred();
    const model = {
        user: { id: 1, theme: 'arena-light' },
        calls: 0,
        async current() {
            return this.user;
        },
        async update(body) {
            const call = this.calls++;
            await (call === 0 ? firstGate : secondGate).promise;
            if (call === 1) throw new Error('refused');
            this.user = { ...this.user, ...body };
            return this.user;
        },
    };
    const account = new AccountService({ model, bus: { emit() {} } });
    await account.load();
    const applied = [];
    const common = {
        fallback: () => 'system',
        apply: choice => applied.push(choice),
        save: (field, value) => account.save(field, value),
        confirmed: () => account.confirmed('theme'),
    };

    const first = previewTheme({ ...common, choice: 'classic', previous: account.confirmed('theme') });
    const second = previewTheme({ ...common, choice: 'arena-dark', previous: account.confirmed('theme') });
    firstGate.resolve();
    await first;
    await new Promise(resolve => setTimeout(resolve, 0));
    secondGate.resolve();
    const failed = await second;

    assert.equal(failed.status, 'failed');
    assert.equal(account.confirmed('theme'), 'classic');
    assert.deepEqual(applied, ['classic', 'arena-dark', 'classic']);
});

// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/section-request.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { retryAction, runReadTask, writeThenRead } = await import('../../web/public/script/helpers/section-request.js');

test('a write followed by a refused read retries only the read', async () => {
    let writes = 0;
    let reads = 0;
    let retry;
    const notify = (message, action, signal) => {
        retry = retryAction(action, signal);
    };
    const signal = new AbortController().signal;
    const failed = new Error('read refused');

    await writeThenRead(
        async () => { writes += 1; },
        async () => {
            reads += 1;
            if (reads === 1) throw failed;
        },
        { signal, notify },
    );
    assert.equal(writes, 1);
    assert.equal(reads, 1);
    assert.equal(typeof retry, 'function');

    await retry();
    assert.equal(writes, 1);
    assert.equal(reads, 2);
});

test('a retry action is inert once navigation aborted the signal', async () => {
    let runs = 0;
    let retry;
    const notify = (message, action, signal) => {
        retry = retryAction(action, signal);
    };
    const controller = new AbortController();
    await runReadTask(async () => {
        runs += 1;
        throw new Error('read refused');
    }, controller.signal, notify);

    controller.abort();
    const result = await retry();
    assert.equal(result, undefined);
    assert.equal(runs, 1);
});

test('runReadTask stays silent when the navigation aborts the request', async () => {
    let notified = 0;
    const controller = new AbortController();
    controller.abort();
    await runReadTask(async () => {
        const error = new Error('aborted');
        error.aborted = true;
        throw error;
    }, controller.signal, () => { notified += 1; });
    assert.equal(notified, 0);
});

test('a refused write is never followed by a generic retry', async () => {
    let writes = 0;
    let reads = 0;
    let writeErrors = 0;
    let notifications = 0;
    await writeThenRead(
        async () => {
            writes += 1;
            throw new Error('write refused');
        },
        async () => { reads += 1; },
        {
            onWriteError: () => { writeErrors += 1; },
            notify: () => { notifications += 1; },
        },
    );
    assert.equal(writes, 1);
    assert.equal(reads, 0);
    assert.equal(writeErrors, 1);
    assert.equal(notifications, 0);
});

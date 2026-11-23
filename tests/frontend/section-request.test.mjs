// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/section-request.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const {
    optimisticWrite, retryAction, runReadTask, runSectionTask, undoChange, writeErrorMessage, writeThenRead,
} = await import('../../web/public/script/helpers/section-request.js');

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

test('write feedback uses the escaped API message and a generic fallback', () => {
    assert.equal(writeErrorMessage(new Error('Name <taken>')), 'Name &lt;taken&gt;');
    assert.equal(writeErrorMessage(new Error('')), 'Não foi possível concluir esta ação.');
    assert.equal(writeErrorMessage(null), 'Não foi possível concluir esta ação.');
});

test('a write failure reported through the default write path runs its reporter once', async () => {
    let reports = 0;
    let seen;
    await writeThenRead(
        async () => { throw new Error('write refused'); },
        async () => {},
        { reportWrite: error => { reports += 1; seen = error; } },
    );
    assert.equal(reports, 1);
    assert.equal(seen.message, 'write refused');

    let actionReports = 0;
    await runSectionTask(async () => { throw new Error('action refused'); }, () => { actionReports += 1; });
    assert.equal(actionReports, 1);
});

test('an undo restores the confirmed control state and reports a refusal instead of rejecting', async () => {
    let restores = 0;
    let reports = 0;
    let reported = null;
    const result = await undoChange(async () => ({ user: { theme: 'system' } }), {
        restore: () => { restores += 1; },
        report: error => { reports += 1; reported = error; },
    });
    assert.deepEqual(result, { user: { theme: 'system' } });
    assert.equal(restores, 1);
    assert.equal(reports, 0);

    const refused = await undoChange(async () => { throw new Error('Gravação recusada'); }, {
        restore: () => { restores += 1; },
        report: error => { reports += 1; reported = error; },
    });
    assert.equal(refused, null);
    assert.equal(restores, 2);
    assert.equal(reports, 1);
    assert.equal(reported.message, 'Gravação recusada');
});

test('an undo superseded by a newer change leaves the controls alone', async () => {
    let restores = 0;
    const result = await undoChange(async () => ({ superseded: true }), {
        restore: () => { restores += 1; },
        report: () => { throw new Error('must not report'); },
    });
    assert.deepEqual(result, { superseded: true });
    assert.equal(restores, 0);
});

test('an optimistic write rolls the UI back with feedback on failure', async () => {
    let applied = 0;
    let rolledBack = 0;
    let errors = 0;
    let writes = 0;
    const failed = await optimisticWrite({
        apply: () => { applied += 1; },
        rollback: () => { rolledBack += 1; },
        write: async () => {
            writes += 1;
            throw new Error('refused');
        },
        onError: () => { errors += 1; },
    });
    assert.equal(failed, false);
    assert.equal(applied, 1);
    assert.equal(rolledBack, 1);
    assert.equal(errors, 1);
    assert.equal(writes, 1);

    const ok = await optimisticWrite({
        apply: () => { applied += 1; },
        rollback: () => { rolledBack += 1; },
        write: async () => { writes += 1; },
        onError: () => { errors += 1; },
    });
    assert.equal(ok, true);
    assert.equal(applied, 2);
    assert.equal(rolledBack, 1);
    assert.equal(errors, 1);
});

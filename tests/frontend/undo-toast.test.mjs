// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/undo-toast.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { UndoToast } = await import('../../web/public/script/services/undo-toast.js');
const { writeErrorMessage } = await import('../../web/public/script/helpers/section-request.js');

/** A createToast double that records messages/options and counts immediate removals. */
function fakeCreate() {
    const calls = [];
    const create = (message, options) => {
        let removed = 0;
        const toast = { dismissNow: () => { removed += 1; } };
        calls.push({ message, options, removed: () => removed });
        return toast;
    };
    create.calls = calls;
    return create;
}

test('only the newest undo toast survives; an old token is ignored', () => {
    const create = fakeCreate();
    const toast = new UndoToast({ create, save: async () => ({ status: 'saved' }), confirm: () => 'MestreArena' });
    const old = toast.begin();
    const current = toast.begin();
    toast.show(old, { field: 'nickname', before: 'MestreArena', restore: () => {} });
    assert.equal(create.calls.length, 0);

    toast.show(current, { field: 'nickname', before: 'MestreArena', restore: () => {} });
    assert.equal(create.calls.length, 1);
    assert.equal(create.calls[0].message, 'Apelido alterado');
    assert.doesNotMatch(create.calls[0].message, /<img|onerror/i);

    toast.begin();
    assert.equal(create.calls[0].removed(), 1);
});

test('the undo action is a normal save; a refusal restores and reports without a retry', async () => {
    const create = fakeCreate();
    let saveCall = null;
    const restoreCalls = [];
    const reports = [];
    const showReports = [];
    const toast = new UndoToast({
        create,
        save: async (field, value) => {
            saveCall = { field, value };
            return { status: 'refused', error: new Error('Desfazer recusado') };
        },
        confirm: field => `${field}-confirmed`,
        report: error => reports.push(error),
    });
    toast.show(toast.begin(), {
        field: 'nickname',
        before: 'MestreArena',
        restore: value => restoreCalls.push(value),
        report: error => showReports.push(error),
    });
    await create.calls[0].options.action.onClick();
    assert.deepEqual(saveCall, { field: 'nickname', value: 'MestreArena' });
    assert.deepEqual(restoreCalls, ['MestreArena', 'nickname-confirmed']);
    assert.equal(reports.length, 0);
    assert.equal(showReports.length, 1);
    assert.equal(showReports[0].message, 'Desfazer recusado');
});

test('the API message is escaped before it reaches a toast', () => {
    assert.equal(
        writeErrorMessage(new Error('<img src=x onerror=alert(1)>')),
        '&lt;img src=x onerror=alert(1)&gt;',
    );
});

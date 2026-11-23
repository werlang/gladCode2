// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/dialog.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

/** A node with the listeners, attributes and focus bookkeeping the modal uses. */
function fakeNode(doc) {
    const listeners = new Map();
    const attributes = new Map();
    const node = {
        style: {}, hidden: false, disabled: false, isConnected: true,
        className: '', textContent: '', innerHTML: '',
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener(name, listener) {
            listeners.set(name, [...(listeners.get(name) ?? []), listener]);
        },
        removeEventListener(name, listener) {
            listeners.set(name, (listeners.get(name) ?? []).filter(item => item !== listener));
        },
        fire(name, event) {
            for (const listener of listeners.get(name) ?? []) listener(event);
        },
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        removeAttribute(name) { attributes.delete(name); },
        append() {},
        remove() { node.isConnected = false; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        focus() { doc.activeElement = node; },
        click() {
            for (const listener of listeners.get('click') ?? []) listener({});
        },
    };
    return node;
}

test('the shared modal traps focus, closes with Esc and returns focus to its opener', async () => {
    const previousDocument = globalThis.document;
    const previousStyle = globalThis.getComputedStyle;
    const previousCss = globalThis.CSS;
    const doc = { activeElement: null };
    const opener = fakeNode(doc);
    const box = fakeNode(doc);
    const message = fakeNode(doc);
    const cancel = fakeNode(doc);
    const save = fakeNode(doc);
    const fog = fakeNode(doc);
    const body = fakeNode(doc);

    fog.querySelector = selector => ({
        '#dialog-box': box,
        '#message': message,
        '#dialog-button-cancel': cancel,
        '#dialog-button-save': save,
        '.input': null,
    })[selector] ?? null;
    fog.querySelectorAll = () => [cancel, save];

    doc.activeElement = opener;
    doc.body = body;
    doc.createElement = tagName => {
        if (tagName !== 'template') throw new Error(`Unexpected element "${tagName}".`);
        return { innerHTML: '', content: { firstElementChild: fog } };
    };
    globalThis.document = doc;
    globalThis.getComputedStyle = () => ({ display: 'block' });
    globalThis.CSS = { escape: value => value };

    try {
        const { Message } = await import('../../web/public/script/components/dialog.js');
        const dialog = new Message({
            message: "<div class='profile-cropper-image'><img alt='Prévia'></div>",
            buttons: { cancel: 'Cancelar', save: 'Recortar imagem' },
            class: 'profile-cropper-dialog',
            preventKill: true,
        }).show();
        dialog.click('cancel', () => dialog.kill());

        // focus enters the dialog on its last action
        assert.equal(doc.activeElement, save);
        assert.equal(fog.querySelector('#dialog-box'), box);

        // Tab wraps from the last action to the first, and Shift+Tab back
        let prevented = false;
        fog.fire('keydown', { key: 'Tab', shiftKey: false, preventDefault: () => { prevented = true; } });
        assert.equal(prevented, true);
        assert.equal(doc.activeElement, cancel);
        fog.fire('keydown', { key: 'Tab', shiftKey: true, preventDefault: () => { prevented = true; } });
        assert.equal(doc.activeElement, save);

        // Esc presses Cancelar, closes the modal and returns focus to the opener
        document.activeElement = save;
        fog.fire('keydown', { key: 'Escape', preventDefault: () => { prevented = true; } });
        assert.deepEqual(await dialog.wait(), { button: 'cancel' });
        assert.equal(fog.isConnected, false);
        assert.equal(doc.activeElement, opener);
    }
    finally {
        globalThis.document = previousDocument;
        globalThis.getComputedStyle = previousStyle;
        globalThis.CSS = previousCss;
    }
});

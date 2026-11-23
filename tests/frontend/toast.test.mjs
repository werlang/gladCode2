// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/toast.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { createToast, isToastShortcut, TOAST_ACTION_SHORTCUT } = await import('../../web/public/script/components/toast.js');

/** A node with just what createToast touches. */
function fakeNode(document) {
    const listeners = new Map();
    const attributes = new Map();
    return {
        style: {},
        children: [],
        className: '',
        type: '',
        textContent: '',
        isConnected: true,
        addEventListener(name, listener) {
            listeners.set(name, [...(listeners.get(name) ?? []), listener]);
        },
        setAttribute(name, value) {
            attributes.set(name, String(value));
        },
        getAttribute(name) {
            return attributes.get(name) ?? null;
        },
        append(...nodes) {
            this.children.push(...nodes);
        },
        contains(node) {
            return node === this || this.children.includes(node);
        },
        focus() {
            document.activeElement = this;
        },
        remove() {
            this.isConnected = false;
        },
    };
}

test('an asynchronous toast leaves focus alone until the documented shortcut is pressed', async () => {
    const previousDocument = globalThis.document;
    const fakeDocument = { activeElement: null };
    const documentListeners = new Map();
    const toast = fakeNode(fakeDocument);
    let action = null;
    fakeDocument.body = fakeNode(fakeDocument);
    fakeDocument.querySelectorAll = () => [];
    fakeDocument.createElement = tagName => {
        if (tagName === 'template') return { innerHTML: '', content: { firstElementChild: toast } };
        if (tagName === 'button') {
            action = fakeNode(fakeDocument);
            return action;
        }
        throw new Error(`Unexpected element "${tagName}".`);
    };
    fakeDocument.addEventListener = (name, listener) => {
        documentListeners.set(name, [...(documentListeners.get(name) ?? []), listener]);
    };
    fakeDocument.dispatchEvent = event => {
        for (const listener of documentListeners.get(event.type) ?? []) listener(event);
    };
    globalThis.document = fakeDocument;
    const opener = fakeNode(fakeDocument);
    fakeDocument.activeElement = opener;

    try {
        const result = createToast('Tema alterado', {
            action: { label: 'Desfazer', onClick: () => {} },
            duration: 10000,
        });

        assert.equal(result, toast);
        assert.equal(fakeDocument.activeElement, opener);
        assert.equal(action.getAttribute('aria-keyshortcuts'), TOAST_ACTION_SHORTCUT);
        assert.equal(isToastShortcut({ altKey: true, key: 'z' }), true);
        assert.equal(isToastShortcut({ altKey: true, ctrlKey: true, key: 'z' }), false);
        assert.equal(isToastShortcut({ altKey: true, shiftKey: true, key: 'z' }), false);

        let prevented = false;
        fakeDocument.dispatchEvent({
            type: 'keydown',
            altKey: true,
            ctrlKey: false,
            metaKey: false,
            key: 'z',
            preventDefault: () => { prevented = true; },
        });
        assert.equal(prevented, true);
        assert.equal(fakeDocument.activeElement, action);

        await result.dismiss();
        assert.equal(fakeDocument.activeElement, opener);
        assert.equal(toast.isConnected, false);
    }
    finally {
        globalThis.document = previousDocument;
    }
});

// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/nickname-injection.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

/** A small DOM node with the queries, attributes and listeners the components use. */
function fakeElement(document) {
    const children = new Map();
    const listeners = new Map();
    const attributes = new Map();
    const classes = new Set();
    const node = {
        style: { setProperty() {}, removeProperty() {} }, dataset: {}, textContent: '', innerHTML: '', hidden: false, disabled: false,
        value: '', className: '', isConnected: true, alt: '', src: '',
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: name => classes.has(name),
        },
        querySelector: selector => {
            if (!children.has(selector)) children.set(selector, fakeElement(document));
            return children.get(selector);
        },
        querySelectorAll: selector => children.get(selector) ?? [],
        append: (...nodes) => { for (const child of nodes) child?.remove?.(); },
        replaceChildren: () => {},
        prepend: () => {},
        addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        removeEventListener: (name) => listeners.delete(name),
        setAttribute: (name, value) => attributes.set(name, String(value)),
        getAttribute: name => attributes.get(name) ?? null,
        removeAttribute: name => attributes.delete(name),
        focus: () => { document.activeElement = node; },
        click: () => { for (const listener of listeners.get('click') ?? []) listener({}); },
        remove: () => { node.isConnected = false; },
        insertAdjacentHTML: () => {},
        closest: () => null,
        contains: other => other === node,
        animate: null,
    };
    return node;
}

/** Installs a minimal document and records every template's rendered markup. */
function installDocument() {
    const document = {
        templates: [],
        activeElement: null,
        body: null,
        createElement: tagName => {
            if (tagName === 'template') {
                const template = {
                    _html: '',
                    content: { firstElementChild: fakeElement(document) },
                    set innerHTML(value) { this._html = value; document.templates.push(value); },
                    get innerHTML() { return this._html; },
                };
                return template;
            }
            return fakeElement(document);
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
    };
    document.body = fakeElement(document);
    document.documentElement = fakeElement(document);
    document.activeElement = document.body;
    globalThis.document = document;
    globalThis.getComputedStyle = () => ({ display: 'block' });
    return document;
}

test('a hostile nickname stays literal in the avatar, account menu, rail and toast paths', async () => {
    const previousDocument = globalThis.document;
    const previousStyle = globalThis.getComputedStyle;
    const document = installDocument();
    const hostile = '<img src=x onerror=alert(1)>';
    try {
        const { Avatar } = await import('../../web/public/script/components/avatar.js');
        const { AccountMenu } = await import('../../web/public/script/components/account-menu.js');
        const { PainelMenu } = await import('../../web/public/script/components/painel-menu.js');
        const { createToast } = await import('../../web/public/script/components/toast.js');
        const { writeErrorMessage } = await import('../../web/public/script/helpers/section-request.js');
        const { UndoToast } = await import('../../web/public/script/services/undo-toast.js');

        const avatar = new Avatar({ size: 'lg' });
        avatar.set({ name: hostile, picture: '/image/test.png', level: 0 });
        assert.equal(avatar.element.querySelector('.avatar-image').alt, hostile);
        assert.equal(avatar.element.getAttribute('aria-label'), `Conta de ${hostile}`);

        const menu = new AccountMenu({ element: fakeElement(document) });
        menu.setAccount({ nickname: hostile, level: 1, picture: '', theme: 'system', xp: 0 });
        assert.equal(menu.element.querySelector('.account-menu-name').textContent, hostile);

        const rail = new PainelMenu({
            element: fakeElement(document),
            account: { nickname: hostile, level: 1, picture: '', xp: 0 },
            counts: null,
        });
        assert.equal(rail.element.querySelector('#nickname').textContent, hostile);

        const undoMessages = [];
        const undo = new UndoToast({
            create: message => { undoMessages.push(message); return { dismissNow() {} }; },
            save: async () => ({ status: 'saved' }),
            confirm: () => hostile,
        });
        undo.show(undo.begin(), { field: 'nickname', before: hostile, restore: () => {} });
        assert.equal(undoMessages[0], 'Apelido alterado');
        assert.doesNotMatch(undoMessages.join('\n'), /<img/);

        const toast = createToast(writeErrorMessage(new Error(hostile)), 'error');
        const rendered = document.templates.join('\n');
        assert.match(rendered, /&lt;img src=x onerror=alert\(1\)&gt;/);
        assert.doesNotMatch(rendered, /<img src=x/);
        toast.dismissNow();
    }
    finally {
        globalThis.document = previousDocument;
        globalThis.getComputedStyle = previousStyle;
    }
});

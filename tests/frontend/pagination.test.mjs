// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/pagination.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { Pagination } = await import('../../web/public/script/components/pagination.js');

/** A minimal DOM node with just what Pagination renders into. */
function makeNode(document, tagName = 'div') {
    const listeners = new Map();
    return {
        tagName: tagName.toUpperCase(),
        children: [],
        attributes: new Map(),
        textContent: '',
        className: '',
        type: '',
        disabled: false,
        id: '',
        hidden: false,
        htmlFor: '',
        inputMode: '',
        placeholder: '',
        value: '',
        append(...items) {
            for (const item of items) {
                if (item?.isFragment) this.children.push(...item.children);
                else this.children.push(item);
            }
        },
        replaceChildren(...items) {
            this.children = [];
            this.append(...items);
        },
        setAttribute(name, value) {
            this.attributes.set(name, String(value));
        },
        removeAttribute(name) {
            this.attributes.delete(name);
        },
        getAttribute(name) {
            return this.attributes.get(name) ?? null;
        },
        addEventListener(name, listener) {
            listeners.set(name, [...(listeners.get(name) ?? []), listener]);
        },
        dispatchEvent(event) {
            Object.defineProperty(event, 'target', { value: this, configurable: true });
            for (const listener of listeners.get(event.type) ?? []) listener(event);
        },
        click() {
            for (const listener of listeners.get('click') ?? []) listener({ type: 'click' });
        },
        contains(candidate) {
            return candidate === this || this.children.some(child => child.contains?.(candidate));
        },
        querySelector(selector) {
            const matches = node => {
                if (selector === '[aria-label="Página anterior"]') return node.getAttribute('aria-label') === 'Página anterior';
                if (selector === '[aria-label="Próxima página"]') return node.getAttribute('aria-label') === 'Próxima página';
                if (selector === '.pagination-page[aria-current="page"]') {
                    return node.className === 'pagination-page' && node.getAttribute('aria-current') === 'page';
                }
                if (selector === '.pagination-button:not([disabled])') {
                    return node.className === 'pagination-button' && !node.disabled;
                }
                return false;
            };
            if (matches(this)) return this;
            for (const child of this.children) {
                const found = child.querySelector?.(selector);
                if (found) return found;
            }
            return null;
        },
        focus() {
            document.activeElement = this;
        },
    };
}

test('a page change emits the event and keeps focus on the equivalent control', () => {
    const previousDocument = globalThis.document;
    const fakeDocument = { activeElement: null };
    fakeDocument.createElement = tagName => makeNode(fakeDocument, tagName);
    fakeDocument.createDocumentFragment = () => {
        const fragment = makeNode(fakeDocument, '#fragment');
        fragment.isFragment = true;
        return fragment;
    };
    globalThis.document = fakeDocument;

    try {
        const root = makeNode(fakeDocument);
        const pagination = new Pagination({ element: root, variant: 'numbered' });
        const changes = [];
        pagination.listen('change', detail => changes.push(detail));
        pagination.set({ page: 1, pages: 3, total: 30, pageSize: 10 });

        const next = root.querySelector('[aria-label="Próxima página"]');
        next.focus();
        next.click();

        assert.deepEqual(changes, [{ page: 2 }]);
        const afterNext = fakeDocument.activeElement;
        assert.notEqual(afterNext, next);
        assert.equal(root.contains(afterNext), true);
        assert.equal(afterNext.getAttribute('aria-label'), 'Próxima página');

        pagination.goTo(3, { focus: 'page' });
        assert.deepEqual(changes, [{ page: 2 }, { page: 3 }]);
        const current = fakeDocument.activeElement;
        assert.equal(root.contains(current), true);
        assert.equal(current.className, 'pagination-page');
        assert.equal(current.getAttribute('aria-current'), 'page');
        assert.equal(current.textContent, '3');

        pagination.set({ page: 2, pages: 3, total: 30, pageSize: 10 });
        const previous = root.querySelector('[aria-label="Página anterior"]');
        previous.focus();
        previous.click();
        assert.deepEqual(changes, [{ page: 2 }, { page: 3 }, { page: 1 }]);
        const first = fakeDocument.activeElement;
        assert.equal(first.className, 'pagination-page');
        assert.equal(first.getAttribute('aria-current'), 'page');
        assert.equal(first.textContent, '1');

        const simpleRoot = makeNode(fakeDocument);
        const simple = new Pagination({ element: simpleRoot, variant: 'simple' });
        simple.set({ page: 1, pages: 2, total: 20, pageSize: 10 });
        const simpleNext = simpleRoot.querySelector('[aria-label="Próxima página"]');
        simpleNext.focus();
        simpleNext.click();
        assert.equal(fakeDocument.activeElement.getAttribute('aria-label'), 'Página anterior');
        simple.set({ page: 2, pages: 2, total: 20, pageSize: 10 });
        assert.equal(simpleRoot.contains(fakeDocument.activeElement), true);
        assert.equal(fakeDocument.activeElement.getAttribute('aria-label'), 'Página anterior');
    }
    finally {
        globalThis.document = previousDocument;
    }
});

test('a controlled page keeps the confirmed range until set and a cancel changes nothing', () => {
    const previousDocument = globalThis.document;
    const fakeDocument = { activeElement: null };
    fakeDocument.createElement = tagName => makeNode(fakeDocument, tagName);
    fakeDocument.createDocumentFragment = () => {
        const fragment = makeNode(fakeDocument, '#fragment');
        fragment.isFragment = true;
        return fragment;
    };
    globalThis.document = fakeDocument;
    try {
        const root = makeNode(fakeDocument);
        const pagination = new Pagination({ element: root, variant: 'simple', controlled: true });
        const changes = [];
        pagination.listen('change', detail => changes.push(detail));
        pagination.set({ page: 1, pages: 2, total: 20, pageSize: 10 });
        const summary = () => root.children.find(child => child.className === 'pagination-summary').textContent;

        pagination.goTo(2);
        assert.deepEqual(changes, [{ page: 2 }]);
        assert.equal(summary(), '1–10 de 20');
        assert.equal(root.getAttribute('aria-busy'), 'true');

        pagination.cancel();
        assert.equal(root.getAttribute('aria-busy'), null);
        assert.equal(summary(), '1–10 de 20');

        const next = root.querySelector('[aria-label="Próxima página"]');
        next.focus();
        pagination.goTo(2);
        assert.equal(fakeDocument.activeElement, next);
        pagination.set({ page: 2, pages: 2, total: 20, pageSize: 10 });
        assert.equal(summary(), '11–20 de 20');
        assert.equal(root.getAttribute('aria-busy'), null);
        assert.equal(root.contains(fakeDocument.activeElement), true);
        assert.equal(fakeDocument.activeElement.getAttribute('aria-label'), 'Página anterior');
    }
    finally {
        globalThis.document = previousDocument;
    }
});

test('a pager can name what it counts in the summary', () => {
    const previousDocument = globalThis.document;
    const fakeDocument = { activeElement: null };
    fakeDocument.createElement = tagName => makeNode(fakeDocument, tagName);
    fakeDocument.createDocumentFragment = () => {
        const fragment = makeNode(fakeDocument, '#fragment');
        fragment.isFragment = true;
        return fragment;
    };
    globalThis.document = fakeDocument;
    try {
        const root = makeNode(fakeDocument);
        const pagination = new Pagination({ element: root, variant: 'simple', unit: 'batalhas' });
        pagination.set({ page: 1, pages: 2, total: 20, pageSize: 10 });
        const summary = root.children.find(child => child.className === 'pagination-summary');
        assert.equal(summary.textContent, '1–10 de 20 batalhas');
    }
    finally {
        globalThis.document = previousDocument;
    }
});

test('the go-to form reports an out-of-range position instead of clamping it', () => {
    const previousDocument = globalThis.document;
    const fakeDocument = { activeElement: null };
    fakeDocument.createElement = tagName => makeNode(fakeDocument, tagName);
    fakeDocument.createDocumentFragment = () => {
        const fragment = makeNode(fakeDocument, '#fragment');
        fragment.isFragment = true;
        return fragment;
    };
    globalThis.document = fakeDocument;
    try {
        const root = makeNode(fakeDocument);
        const pagination = new Pagination({ element: root, variant: 'numbered' });
        pagination.set({ page: 1, pages: 2, total: 20, pageSize: 10 });
        const jumps = [];
        const invalid = [];
        pagination.listen('jump', detail => jumps.push(detail));
        pagination.listen('invalid', detail => invalid.push(detail));
        const form = root.children.find(child => child.className === 'pagination-jump');
        const input = form.children.find(child => child.className === 'pagination-jump-input');
        input.value = '99';
        form.dispatchEvent({ type: 'submit', preventDefault: () => {} });
        assert.deepEqual(invalid, [{ value: '99' }]);
        assert.deepEqual(jumps, []);
        input.value = '20';
        form.dispatchEvent({ type: 'submit', preventDefault: () => {} });
        assert.deepEqual(jumps, [{ position: 20 }]);
    }
    finally {
        globalThis.document = previousDocument;
    }
});

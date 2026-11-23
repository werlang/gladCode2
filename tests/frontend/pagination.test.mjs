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
    }
    finally {
        globalThis.document = previousDocument;
    }
});

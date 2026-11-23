// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/search-field.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { SearchField } = await import('../../web/public/script/components/search-field.js');

/** A node with just what SearchField touches. */
function fakeNode() {
    const listeners = new Map();
    const attributes = new Map();
    return {
        hidden: false,
        value: '',
        placeholder: '',
        focused: false,
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: name => attributes.delete(name),
        getAttribute: name => attributes.get(name) ?? null,
        addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        removeEventListener: () => {},
        dispatchEvent(event) {
            Object.defineProperty(event, 'target', { value: this, configurable: true });
            for (const listener of listeners.get(event.type) ?? []) listener(event);
        },
        fire(name, event = {}) {
            for (const listener of listeners.get(name) ?? []) listener(event);
        },
        focus() {
            this.focused = true;
        },
    };
}

test('typing waits for the debounce, trims and emits the search once', () => {
    const form = fakeNode();
    const input = fakeNode();
    const clear = fakeNode();
    form.querySelector = selector => (selector.includes('input') ? input : clear);

    let timer = null;
    let delay = null;
    const field = new SearchField({
        element: form,
        debounce: 300,
        setTimer: (callback, ms) => {
            timer = callback;
            delay = ms;
            return 7;
        },
        clearTimer: () => {},
    });
    const searches = [];
    field.listen('search', detail => searches.push(detail));

    input.value = '  Magnus ';
    input.fire('input');
    assert.equal(delay, 300);
    assert.deepEqual(searches, []);

    timer();
    assert.deepEqual(searches, [{ value: 'Magnus' }]);
    assert.equal(clear.hidden, false);

    input.value = 'Magnus';
    input.fire('input');
    timer();
    assert.equal(searches.length, 1);
});

test('Enter submits the trimmed value and clearing resets the field', () => {
    const form = fakeNode();
    const input = fakeNode();
    const clear = fakeNode();
    form.querySelector = selector => (selector.includes('input') ? input : clear);
    const field = new SearchField({ element: form, setTimer: () => 1, clearTimer: () => {} });
    const submitted = [];
    const searched = [];
    field.listen('submit', detail => submitted.push(detail));
    field.listen('search', detail => searched.push(detail));

    input.value = '  relatórios ';
    let prevented = false;
    form.fire('submit', { preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.deepEqual(submitted, [{ value: 'relatórios' }]);

    input.value = 'relatórios';
    input.fire('input');
    clear.fire('click');
    assert.equal(input.value, '');
    assert.equal(input.focused, true);
    assert.deepEqual(searched, [{ value: '' }]);
    assert.equal(field.value, '');
});

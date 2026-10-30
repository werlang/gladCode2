// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/components.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

/** The parts of an element the UI primitives touch. */
function fakeElement(props = {}) {
    const classes = new Set();
    const attributes = new Map();
    const listeners = new Map();
    const style = { removeProperty: name => delete style[name] };
    return {
        innerHTML: '', value: '', type: 'text', disabled: false, offsetWidth: 120, focused: false, style,
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: name => classes.has(name),
        },
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: name => attributes.delete(name),
        getAttribute: name => attributes.get(name) ?? null,
        addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        removeEventListener: () => {},
        focus() { this.focused = true; },
        fire: (name, event = {}) => Promise.all((listeners.get(name) ?? []).map(listener => listener(event))),
        ...props,
    };
}

const { Button } = await import('../../web/public/script/components/button.js');
const { Input } = await import('../../web/public/script/components/input.js');
const { Select } = await import('../../web/public/script/components/select.js');

test('a button is disabled with a spinner while its action runs, and restored after', async () => {
    const element = fakeElement({ innerHTML: 'GRAVAR' });
    let release;
    const button = new Button({ element }).click(() => new Promise(resolve => { release = resolve; }));

    const running = element.fire('click');
    assert.equal(button.busy, true);
    assert.equal(element.disabled, true);
    assert.match(element.innerHTML, /fa-spinner/);
    assert.equal(element.style.width, '120px');

    await element.fire('click'); // a second click while busy does nothing
    release();
    await running;
    assert.equal(button.busy, false);
    assert.equal(element.disabled, false);
    assert.equal(element.innerHTML, 'GRAVAR');
    assert.equal(element.style.width, undefined);
});

test('a failing action still restores the button', async () => {
    const element = fakeElement({ innerHTML: 'ENVIAR' });
    new Button({ element }).click(() => { throw new Error('refused'); });
    await assert.rejects(element.fire('click'), /refused/);
    assert.equal(element.disabled, false);
    assert.equal(element.innerHTML, 'ENVIAR');
});

test('fields mark an error until the user edits them', async () => {
    const element = fakeElement();
    const input = new Input(element);
    input.setError('Outro usuário já escolheu este nome');
    assert.equal(input.error, 'Outro usuário já escolheu este nome');
    assert.equal(element.classList.contains('error'), true);
    assert.equal(element.getAttribute('aria-invalid'), 'true');
    assert.equal(element.focused, true);

    element.value = 'Werlang';
    await element.fire('input');
    assert.equal(input.error, '');
    assert.equal(element.classList.contains('error'), false);
    assert.equal(element.classList.contains('filled'), true);
});

test('a select sets its value without firing change', async () => {
    const element = fakeElement();
    let changes = 0;
    const select = new Select(element).change(() => changes++);
    select.set('arena-dark');
    assert.equal(select.value, 'arena-dark');
    assert.equal(changes, 0);
    await element.fire('change');
    assert.equal(changes, 1);
});

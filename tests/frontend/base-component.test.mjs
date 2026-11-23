// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/base-component.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { BaseComponent } = await import('../../web/public/script/components/base-component.js');

/** A minimal element: an EventTarget that can be removed. */
function fakeElement() {
    const element = new EventTarget();
    element.removed = false;
    element.remove = () => { element.removed = true; };
    return element;
}

test('emit() dispatches a bubbling component event with its detail', () => {
    const element = fakeElement();
    const component = new BaseComponent(element);
    let event = null;
    element.addEventListener('select', received => { event = received; });

    component.emit('select', { id: 7 });

    assert.equal(event.type, 'select');
    assert.equal(event.bubbles, true);
    assert.deepEqual(event.detail, { id: 7 });
});

test('listen() receives the detail of the component event', () => {
    const element = fakeElement();
    const component = new BaseComponent(element);
    const seen = [];
    component.listen('change', (detail, event) => seen.push([detail, event.bubbles]));

    component.emit('change', 'classic');

    assert.deepEqual(seen, [['classic', true]]);
});

test('on() stops with the component signal and with a caller signal', () => {
    const target = new EventTarget();
    const component = new BaseComponent(fakeElement());
    let componentHits = 0;
    let callerHits = 0;
    component.on(target, 'ping', () => { componentHits += 1; });
    const controller = new AbortController();
    component.on(target, 'pong', () => { callerHits += 1; }, { signal: controller.signal });

    target.dispatchEvent(new Event('ping'));
    target.dispatchEvent(new Event('pong'));
    component.abort();
    controller.abort();
    target.dispatchEvent(new Event('ping'));
    target.dispatchEvent(new Event('pong'));

    assert.equal(componentHits, 1);
    assert.equal(callerHits, 1);
});

test('clearListeners() removes listeners, aborts the signal and can be reused', () => {
    const element = fakeElement();
    const target = new EventTarget();
    const component = new BaseComponent(element);
    let hits = 0;
    component.on(target, 'ping', () => { hits += 1; });
    const first = component.signal;

    component.clearListeners();
    target.dispatchEvent(new Event('ping'));

    assert.equal(hits, 0);
    assert.equal(first.aborted, true);
    assert.equal(component.signal.aborted, false);

    component.on(target, 'ping', () => { hits += 1; });
    target.dispatchEvent(new Event('ping'));
    assert.equal(hits, 1);
});

test('destroy() aborts, removes the element and drops the signal', () => {
    const element = fakeElement();
    const component = new BaseComponent(element);
    const signal = component.signal;
    let hits = 0;
    component.on(element, 'ping', () => { hits += 1; });

    component.destroy();
    element.dispatchEvent(new Event('ping'));

    assert.equal(hits, 0);
    assert.equal(signal.aborted, true);
    assert.equal(element.removed, true);
    assert.equal(component.element, null);
});

test('emitting without an element is a no-op', () => {
    const component = new BaseComponent();
    assert.doesNotThrow(() => component.emit('select', {}));
});

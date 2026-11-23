// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/event-bus.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { APP_EVENTS, EventBus, events } = await import('../../web/public/script/helpers/event-bus.js');

test('the map declares every event once and the singleton is the only bus', () => {
    const names = Object.values(APP_EVENTS);
    assert.equal(new Set(names).size, names.length);
    assert.ok(events instanceof EventBus);
    assert.equal(APP_EVENTS.potionsReconciled, 'potions:reconciled');
});

test('on() delivers the detail, returns an unsubscribe and accepts an AbortSignal', () => {
    const bus = new EventBus();
    const seen = [];
    const off = bus.on(APP_EVENTS.accountSilver, detail => seen.push(detail));
    bus.emit(APP_EVENTS.accountSilver, { silver: 120 });
    off();
    bus.emit(APP_EVENTS.accountSilver, { silver: 80 });

    const controller = new AbortController();
    bus.on(APP_EVENTS.themeChanged, detail => seen.push(detail), { signal: controller.signal });
    bus.emit(APP_EVENTS.themeChanged, { choice: 'classic', theme: 'classic' });
    controller.abort();
    bus.emit(APP_EVENTS.themeChanged, { choice: 'arena-dark', theme: 'arena-dark' });

    assert.deepEqual(seen, [
        { silver: 120 },
        { choice: 'classic', theme: 'classic' },
    ]);
});

test('an unknown event name fails on both ends', () => {
    const bus = new EventBus();
    assert.throws(() => bus.emit('shell:opened', {}), /Unknown app event/);
    assert.throws(() => bus.on('shell:opened', () => {}), /Unknown app event/);
});

test('a non-function handler is refused', () => {
    const bus = new EventBus();
    assert.throws(() => bus.on(APP_EVENTS.paletteOpened, 'nope'), /not a function/);
});

test('the bus is DOM-free: it works without a document', () => {
    const bus = new EventBus();
    let got = null;
    bus.on(APP_EVENTS.notificationsCounts, detail => { got = detail; });
    bus.emit(APP_EVENTS.notificationsCounts, { bell: 3 });
    assert.deepEqual(got, { bell: 3 });
});

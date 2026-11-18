// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/render2/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { CardPortraitService, IDLE_CONTEXT_MS, PLACEHOLDER_SRC } from '../../web/public/script/render2/card-portrait.js';

/** The smallest DOM the service touches (it never reaches a real 2D/WebGL context in these tests). */
function fakeDocument() {
    return {
        createElement(tag) {
            if (tag === 'canvas') return { width: 0, height: 0, getContext: () => null, addEventListener() {} };
            const classes = new Set();
            return {
                tagName: 'IMG', alt: '', decoding: '', src: '', onload: null, onerror: null,
                classList: {
                    add: name => classes.add(name),
                    contains: name => classes.has(name),
                },
            };
        },
    };
}

/** A fake DOM whose images finish decoding as soon as their source is set. */
function loadingDocument() {
    return {
        createElement(tag) {
            if (tag === 'canvas') return { width: 0, height: 0, getContext: () => null, addEventListener() {} };
            const classes = new Set();
            return {
                tagName: 'IMG', alt: '', decoding: '', onload: null, onerror: null,
                classList: {
                    add: name => classes.add(name),
                    contains: name => classes.has(name),
                },
                set src(value) {
                    this._src = value;
                    queueMicrotask(() => this.onload?.());
                },
                get src() {
                    return this._src;
                },
            };
        },
    };
}

/** A canvas whose `toBlob` answers with a small WebP blob. */
function paintingCanvas() {
    return {
        toBlob(callback) {
            callback(new Blob(['portrait'], { type: 'image/webp' }));
        },
    };
}

/** A service that never gets a WebGL context and runs its frames on the microtask queue. */
function brokenService() {
    return new CardPortraitService({
        document: fakeDocument(),
        getContext: () => null,
        requestFrame: callback => {
            queueMicrotask(() => callback(0));
            return 0;
        },
    });
}

test('without WebGL a card gets the placeholder picture, one warning, and no rejection', async t => {
    const warn = t.mock.method(console, 'warn', () => {});
    const service = brokenService();

    const portrait = await service.get(['male', 'male-light'], { pose: 'idle' });
    assert.equal(portrait.src, PLACEHOLDER_SRC);
    assert.equal(portrait.classList.contains('is-placeholder'), true);
    assert.equal(warn.mock.callCount(), 1, 'one console.warn per page');

    const dead = await service.get('["male","male-light"]', { pose: 'dead' });
    assert.equal(dead.src, PLACEHOLDER_SRC);
    assert.equal(warn.mock.callCount(), 1, 'later cards reuse the placeholder without warning again');

    assert.equal(IDLE_CONTEXT_MS, 10000);
    assert.doesNotThrow(() => service.dispose());
});

test('a broken page keeps answering placeholders and the service can be asked again', async t => {
    const warn = t.mock.method(console, 'warn', () => {});
    const service = brokenService();
    const cards = await Promise.all([
        service.get(['male']),
        service.get(['female', 'female-light']),
        service.get(['male']),
    ]);
    assert.equal(cards.length, 3);
    for (const card of cards) {
        assert.equal(card.src, PLACEHOLDER_SRC);
        assert.equal(card.classList.contains('is-placeholder'), true);
    }
    assert.equal(warn.mock.callCount(), 1);
});

test('a portrait cached in IndexedDB is shown before WebGL and reused in memory', async t => {
    const warn = t.mock.method(console, 'warn', () => {});
    const blob = new Blob(['portrait'], { type: 'image/webp' });
    let reads = 0;
    const cache = {
        get: async () => {
            reads += 1;
            return blob;
        },
        put: async () => {
            throw new Error('a cached portrait must not be stored again');
        },
    };
    const service = new CardPortraitService({
        document: loadingDocument(),
        getContext: () => {
            throw new Error('the cache must win before WebGL');
        },
        requestFrame: callback => {
            queueMicrotask(() => callback(0));
            return 0;
        },
        cache,
    });

    const first = await service.get(['male', 'male-light'], { pose: 'idle' });
    assert.match(first.src, /^blob:/);
    assert.equal(first.classList.contains('is-placeholder'), false);
    const second = await service.get(['male-light', 'male'], { pose: 'idle' });
    assert.equal(second.src, first.src, 'the memory cache shares one picture');
    assert.equal(reads, 1, 'the same look is read from IndexedDB once');
    assert.equal(warn.mock.callCount(), 0);
    service.dispose();
});

/** A service whose drawing call is a test seam, so a look can fail without loading three. */
function paintingService(render) {
    return new CardPortraitService({
        document: loadingDocument(),
        getContext: () => {
            throw new Error('the test render must not reach WebGL');
        },
        requestFrame: callback => {
            queueMicrotask(() => callback(0));
            return 0;
        },
        render,
    });
}

/** The IntersectionObserver stand-in: the test fires its entries by hand. */
class FakeIntersectionObserver {
    static instances = [];

    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.targets = new Set();
        FakeIntersectionObserver.instances.push(this);
    }

    observe(target) {
        this.targets.add(target);
    }

    unobserve(target) {
        this.targets.delete(target);
    }

    disconnect() {
        this.targets.clear();
    }

    /** @param {Element} target @param {boolean} isIntersecting */
    fire(target, isIntersecting) {
        this.callback([{ target, isIntersecting }]);
    }
}

/**
 * A painting service under a fake observer.
 *
 * @param {(job: { tokens: string[], pose: string }) => Promise<HTMLCanvasElement>} render
 */
function watchingService(render) {
    const previous = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = FakeIntersectionObserver;
    FakeIntersectionObserver.instances = [];
    const service = paintingService(render);
    return {
        service,
        observer: () => FakeIntersectionObserver.instances.at(-1),
        restore: () => {
            globalThis.IntersectionObserver = previous;
        },
    };
}

test('a look that cannot be painted falls back alone and the other cards still render', async t => {
    const warn = t.mock.method(console, 'warn', () => {});
    const service = paintingService(async ({ tokens }) => {
        if (tokens.includes('missing')) throw new Error('FBX 404');
        return paintingCanvas();
    });

    const [failed, painted] = await Promise.all([
        service.get(['male', 'missing']),
        service.get(['female', 'female-light']),
    ]);
    assert.equal(failed.src, PLACEHOLDER_SRC);
    assert.equal(failed.classList.contains('is-placeholder'), true, 'only that card falls back');
    assert.match(painted.src, /^blob:/, 'the other skin is still painted');
    assert.equal(painted.classList.contains('is-placeholder'), false);
    assert.equal(warn.mock.callCount(), 1, 'the page warns once');
    service.dispose();
});

test('a card removed before its turn is answered without painting it', async t => {
    const warn = t.mock.method(console, 'warn', () => {});
    let rendered = 0;
    const service = paintingService(async () => {
        rendered += 1;
        return paintingCanvas();
    });

    const portrait = await service.get(['male'], { target: { isConnected: false } });
    assert.equal(portrait.src, PLACEHOLDER_SRC);
    assert.equal(rendered, 0, 'the detached card is dropped by the pump');
    assert.equal(warn.mock.callCount(), 0);
    service.dispose();
});

test('dispose answers a card still waiting for its portrait with the placeholder', async t => {
    t.mock.method(console, 'warn', () => {});
    let started;
    const drawing = new Promise(resolve => {
        started = resolve;
    });
    const service = paintingService(async () => {
        started();
        return new Promise(() => {});
    });

    const pending = service.get(['male', 'male-light']);
    await drawing;
    service.dispose();
    const portrait = await pending;
    assert.equal(portrait.src, PLACEHOLDER_SRC);
    assert.equal(portrait.classList.contains('is-placeholder'), true);
});

test('dispose revokes the object URLs the cards were given', async t => {
    const revoke = t.mock.method(URL, 'revokeObjectURL');
    const service = paintingService(async () => paintingCanvas());

    const portrait = await service.get(['male', 'male-light']);
    assert.match(portrait.src, /^blob:/);
    service.dispose();
    assert.ok(revoke.mock.calls.some(call => call.arguments[0] === portrait.src), 'the memory cache hands the URL back');
});

test('a card in the page waits for the viewport before it is painted', async t => {
    t.mock.method(console, 'warn', () => {});
    let rendered = 0;
    const setup = watchingService(async () => {
        rendered += 1;
        return paintingCanvas();
    });
    t.after(setup.restore);

    const card = { isConnected: true };
    const pending = setup.service.get(['male', 'male-light'], { target: card });
    assert.equal(rendered, 0, 'nothing is painted before the card is near the viewport');
    assert.equal(setup.observer().targets.has(card), true, 'the card is being watched');

    setup.observer().fire(card, true);
    const portrait = await pending;

    assert.match(portrait.src, /^blob:/);
    assert.equal(rendered, 1);
    assert.equal(setup.observer().targets.has(card), false, 'an answered card is no longer watched');
    setup.service.dispose();
});

test('a card removed before it shows answers the placeholder and is not painted', async t => {
    t.mock.method(console, 'warn', () => {});
    let rendered = 0;
    const setup = watchingService(async () => {
        rendered += 1;
        return paintingCanvas();
    });
    t.after(setup.restore);

    const card = { isConnected: true };
    const pending = setup.service.get(['male', 'male-light'], { target: card });
    card.isConnected = false;
    setup.observer().fire(card, false);
    const portrait = await pending;

    assert.equal(portrait.src, PLACEHOLDER_SRC);
    assert.equal(portrait.classList.contains('is-placeholder'), true);
    assert.equal(rendered, 0, 'the removed card never reaches the render queue');
    assert.equal(setup.observer().targets.has(card), false, 'the removed card is no longer watched');
    setup.service.dispose();
});

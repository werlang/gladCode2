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

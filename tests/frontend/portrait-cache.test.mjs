// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    Lru, PORTRAIT_CACHE_LIMIT, PORTRAIT_SIZE, PORTRAIT_VERSION, PortraitCache, evictionVictims, portraitKey,
    skinKey, skinTokens,
} from '../../web/public/script/helpers/portrait-cache.js';

test('the order of the worn layers never changes the portrait key', () => {
    const first = ['male', 'male-light', 'male_longsleeve_red', 'cape_red'];
    const shuffled = ['cape_red', 'male_longsleeve_red', 'male', 'male-light'];
    assert.equal(skinKey(first), skinKey(shuffled));
    assert.equal(portraitKey(first, { pose: 'idle' }), portraitKey(shuffled, { pose: 'idle' }));
    assert.equal(portraitKey(first, { pose: 'dead' }), portraitKey(shuffled, { pose: 'dead' }));
    assert.notEqual(skinKey(first), skinKey(first.slice(0, -1)));
});

test('the pose, the renderer version and the size are part of the key', () => {
    const tokens = ['male', 'male-light'];
    const idle = portraitKey(tokens, { pose: 'idle' });
    assert.equal(idle, portraitKey(tokens));
    assert.notEqual(idle, portraitKey(tokens, { pose: 'dead' }));
    assert.notEqual(idle, portraitKey(tokens, { version: PORTRAIT_VERSION + 1 }));
    assert.notEqual(idle, portraitKey(tokens, { size: PORTRAIT_SIZE * 2 }));
    assert.ok(idle.endsWith(`|idle|${PORTRAIT_VERSION}|${PORTRAIT_SIZE}`));
});

test('a persisted skin JSON string reads like its token array', () => {
    assert.deepEqual(skinTokens('["male","male-light"]'), ['male', 'male-light']);
    assert.deepEqual(skinTokens(['male', 'male-light']), ['male', 'male-light']);
    assert.deepEqual(skinTokens('not json'), []);
    assert.deepEqual(skinTokens(null), []);
});

test('the LRU forgets the oldest entry first and keeps a hit alive', () => {
    const lru = new Lru(3);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.set('c', 3);
    assert.equal(lru.get('a'), 1, 'a is read before the store is full');
    lru.set('d', 4);
    assert.deepEqual(lru.keys(), ['c', 'a', 'd'], 'b was the least recently used');
    assert.equal(lru.get('b'), undefined);
    assert.equal(lru.size, 3);
});

test('the store evicts only the records beyond its limit, oldest use first', () => {
    const records = [
        { key: 'old', usedAt: 10 },
        { key: 'newest', usedAt: 40 },
        { key: 'middle', usedAt: 20 },
        { key: 'newer', usedAt: 30 },
    ];
    assert.deepEqual(evictionVictims(records, 4), []);
    assert.deepEqual(evictionVictims(records, 3), ['old']);
    assert.deepEqual(evictionVictims(records, 2), ['old', 'middle']);
    assert.equal(PORTRAIT_CACHE_LIMIT, 300);
    const full = Array.from({ length: PORTRAIT_CACHE_LIMIT + 1 }, (_, index) => ({ key: `k${index}`, usedAt: index }));
    assert.deepEqual(evictionVictims(full), ['k0']);
});

test('without IndexedDB the cache is a quiet miss and never throws', async () => {
    const cache = new PortraitCache({ indexedDB: null });
    assert.equal(await cache.get('male|idle'), null);
    await assert.doesNotReject(cache.put('male|idle', new Blob(['portrait'])));
    assert.equal(await cache.get('male|idle'), null);
});

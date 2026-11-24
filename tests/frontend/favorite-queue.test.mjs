// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/favorite-queue.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { FavoriteQueue } = await import('../../web/public/script/helpers/favorite-queue.js');

test('the latest intent wins while one write is in flight', async () => {
    let release;
    const writes = [];
    const painted = [];
    const queue = new FavoriteQueue({
        write: (id, favorite) => {
            writes.push([id, favorite]);
            if (writes.length === 1) return new Promise(resolve => { release = resolve; });
            return Promise.resolve();
        },
        paint: (id, favorite) => painted.push([id, favorite]),
        report: () => assert.fail('no refusal expected'),
    });
    queue.seed(1, false);
    queue.toggle(1, true);
    queue.toggle(1, false);
    assert.deepEqual(painted, [[1, true], [1, false]]);
    release();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(writes, [[1, true], [1, false]]);
    assert.equal(queue.confirmed(1), false);
});

test('two concurrent refusals roll each row back to its confirmed state', async () => {
    const pending = new Map();
    const painted = [];
    const reported = [];
    const queue = new FavoriteQueue({
        write: (id, favorite) => {
            const promise = new Promise((resolve, reject) => pending.set(id, { favorite, reject }));
            return promise;
        },
        paint: (id, favorite) => painted.push([id, favorite]),
        report: error => reported.push(error.message),
    });
    queue.seed(1, false);
    queue.seed(2, true);
    queue.toggle(1, true);
    queue.toggle(2, false);
    assert.equal(pending.size, 2);
    pending.get(1).reject(new Error('one refused'));
    pending.get(2).reject(new Error('two refused'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(reported, ['one refused', 'two refused']);
    assert.equal(queue.confirmed(1), false);
    assert.equal(queue.confirmed(2), true);
    assert.deepEqual(painted, [[1, true], [2, false], [1, false], [2, true]]);
});

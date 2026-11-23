// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/news-pager.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { NEWS_PAGE_SIZE, NewsPager } from '../../web/public/script/helpers/news-pager.js';

/** A deferred the test resolves when the page should arrive. */
function deferred() {
    let resolve;
    const promise = new Promise(onResolve => { resolve = onResolve; });
    return { promise, resolve };
}

test('a double click on “ver mais” loads one page and advances the offset once', async () => {
    const pager = new NewsPager().reset(NEWS_PAGE_SIZE);
    const page = deferred();
    const calls = [];
    const fetchPage = offset => {
        calls.push(offset);
        return page.promise;
    };

    const first = pager.next(fetchPage);
    const second = pager.next(fetchPage);
    assert.equal(pager.loading, true);
    assert.equal(await second, null);
    assert.deepEqual(calls, [NEWS_PAGE_SIZE]);

    page.resolve(Array.from({ length: NEWS_PAGE_SIZE }, (_, index) => ({ hash: String(index) })));
    assert.equal((await first).length, NEWS_PAGE_SIZE);
    assert.equal(pager.offset, NEWS_PAGE_SIZE * 2);
    assert.equal(pager.hasMore, true);
    assert.equal(pager.loading, false);
});

test('a short page ends the feed and a reset starts at the first page again', async () => {
    const pager = new NewsPager().reset(NEWS_PAGE_SIZE);
    const calls = [];
    const posts = await pager.next(async offset => {
        calls.push(offset);
        return [{ hash: 'a' }, { hash: 'b' }];
    });
    assert.equal(posts.length, 2);
    assert.equal(pager.hasMore, false);
    assert.equal(pager.offset, NEWS_PAGE_SIZE + 2);
    assert.equal(await pager.next(async () => []), null);
    assert.deepEqual(calls, [NEWS_PAGE_SIZE]);

    pager.reset(3);
    assert.equal(pager.offset, 3);
    assert.equal(pager.hasMore, false);
});

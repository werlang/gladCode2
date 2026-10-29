// Run: docker compose exec -T web npm test
import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
const { app } = await import('../app.js');

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

/** @param {string} path @returns {Promise<Response>} */
const get = path => fetch(`${base}${path}`, { redirect: 'manual' });

test('every old address lands on a page that does not redirect again', async () => {
    const old = [
        '/index', '/index.php?login=battle', '/playback.php?log=abc', '/tournament?h=ab&r=2', '/training.php?h=AB12',
        '/editor.php?g=5', '/editor?g=0', '/post.php?p=ab12', '/function.php?f=attack&l=pt&p=c', '/profile.php?t=battle&s=duel',
        ...['about', 'creditos', 'docs', 'docs-ptbr', 'docs-blocks', 'manual', 'stats', 'thanks', 'update'].map(page => `/${page}.php`),
    ];
    for (const path of old) {
        const first = await get(path);
        assert.equal(first.status, 301, path);
        let target = new URL(first.headers.get('location'), base);
        let landing = await get(`${target.pathname}${target.search}`);
        // tournaments and trainings without a round go to round 0 once
        if (landing.status === 302) {
            target = new URL(landing.headers.get('location'), base);
            landing = await get(`${target.pathname}${target.search}`);
        }
        assert.equal(landing.status, 200, `${path} -> ${target.pathname}${target.search}`);
    }
});

test('unknown addresses are not found, whatever their form', async () => {
    for (const path of ['/nope', '/nope.php', '/code.php']) assert.equal((await get(path)).status, 404, path);
});

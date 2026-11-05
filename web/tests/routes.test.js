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

/**
 * Serves one fresh copy of the app with `ENABLE_RENDER2` set as given (the flag is read when app.js loads).
 *
 * @param {string} flag Value of ENABLE_RENDER2.
 * @returns {Promise<{ page: (path: string) => Promise<string>, close: () => void }>}
 */
async function appWithRender2(flag) {
    const previous = process.env.ENABLE_RENDER2;
    process.env.ENABLE_RENDER2 = flag;
    const { app: fresh } = await import(`../app.js?render2=${flag}`);
    if (previous === undefined) delete process.env.ENABLE_RENDER2;
    else process.env.ENABLE_RENDER2 = previous;
    const listener = fresh.listen(0);
    const origin = `http://127.0.0.1:${listener.address().port}`;
    return {
        page: async path => {
            const response = await fetch(`${origin}${path}`);
            assert.equal(response.status, 200, path);
            return response.text();
        },
        close: () => listener.close(),
    };
}

/** @param {string} html A page. @returns {Record<string, unknown>} Its template vars (`#template-vars`). */
const templateVars = html => JSON.parse(/<script id="template-vars" type="application\/json">(.*?)<\/script>/s.exec(html)[1]);

test('the editor tells the gladiator creator whether the 3D renderer is on, and maps three only then', async () => {
    const on = await appWithRender2('1');
    const off = await appWithRender2('0');
    try {
        for (const path of ['/editor', '/newglad', '/glad-3']) {
            const enabled = await on.page(path);
            assert.equal(templateVars(enabled).render2, true, path);
            assert.match(enabled, /"three":"https:\/\/cdn\.jsdelivr\.net\/npm\/three@/, path);
            assert.match(enabled, /"\/script\/render2\/creator-stage\.js":/, path);
            // modules only: no page globals and no classic preference script tag on the editor (every import map lists the file)
            assert.doesNotMatch(enabled, /__RENDER2_ENABLED__|<script src="[^"]*battle-renderer-preference\.js/, path);

            const disabled = await off.page(path);
            assert.equal(templateVars(disabled).render2, false, path);
            assert.doesNotMatch(disabled, /"three":/, path);
            assert.doesNotMatch(disabled, /render2\/creator-stage\.js/, path);
            assert.doesNotMatch(disabled, /__RENDER2_ENABLED__|<script src="[^"]*battle-renderer-preference\.js/, path);
        }
        // the replay page keeps its classic preference script, set before its renderers load
        const replay = await on.page('/play/abc');
        assert.match(replay, /<script>window\.__RENDER2_ENABLED__ = true;<\/script>\s*<script src="\/script\/battle-renderer-preference\.js\?v=\d+"><\/script>/);
        assert.match(await off.page('/play/abc'), /window\.__RENDER2_ENABLED__ = false;/);
    }
    finally {
        on.close();
        off.close();
    }
});

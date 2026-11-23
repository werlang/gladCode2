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
        page: async (path, headers = {}) => {
            const response = await fetch(`${origin}${path}`, { headers });
            assert.equal(response.status, 200, path);
            return response.text();
        },
        close: () => listener.close(),
    };
}

test('every page names the gladiator style on the root element before its scripts run', async () => {
    const page = await (await get('/profile')).text();
    assert.match(page, /<html data-glad-view="3d"/);
    // the settings offer both styles, the 3D coliseum first
    assert.match(page, /id='glad-view'/);
    assert.match(page, /<option value='3d'>Coliseu 3D<\/option>/);
    assert.match(page, /<option value='sprite'>Sprites<\/option>/);

    // a browser that chose sprites tells the web service through its cookie
    const sprite = await fetch(`${base}/profile`, { headers: { cookie: 'gladview=sprite' } });
    assert.match(await sprite.text(), /<html data-glad-view="sprite"/);

    // an unknown value falls back to the 3D coliseum default
    const unknown = await fetch(`${base}/profile`, { headers: { cookie: 'gladview=3D' } });
    assert.match(await unknown.text(), /<html data-glad-view="3d"/);
});

test('the replay gate controls only the replay renderer: the editor is 3D and maps three either way', async () => {
    const on = await appWithRender2('1');
    const off = await appWithRender2('0');
    try {
        for (const path of ['/editor', '/newglad', '/glad-3']) {
            for (const [flag, server] of [['on', on], ['off', off]]) {
                const page = await server.page(path);
                assert.match(page, /"three":"https:\/\/cdn\.jsdelivr\.net\/npm\/three@/, `${path} (${flag})`);
                assert.match(page, /"\/script\/render2\/creator-stage\.js":/, `${path} (${flag})`);
                // modules only: the editor has no replay gate script and no classic renderer
                assert.doesNotMatch(page, /__RENDER2_ENABLED__/, `${path} (${flag})`);
            }
        }
        // the gate still decides whether the replay loads the 3D renderer module, and the page
        // carries the master's style on <html>, where the renderer boot reads it
        const replayOn = await on.page('/play/abc');
        assert.match(replayOn, /<html data-glad-view="3d"/);
        assert.match(replayOn, /<script>window\.__RENDER2_ENABLED__ = true;<\/script>/);
        assert.match(replayOn, /src="\/script\/render2\.js\?v=\d+"/);

        // a master who chose sprites still gets the module (it decides at boot) and the attribute it follows
        const replaySprite = await on.page('/play/abc', { cookie: 'gladview=sprite' });
        assert.match(replaySprite, /<html data-glad-view="sprite"/);
        assert.match(replaySprite, /src="\/script\/render2\.js\?v=\d+"/);

        const replayOff = await off.page('/play/abc');
        assert.match(replayOff, /<html data-glad-view="3d"/);
        assert.match(replayOff, /<script>window\.__RENDER2_ENABLED__ = false;<\/script>/);
        assert.doesNotMatch(replayOff, /src="[^"]*script\/render2\.js/);
    }
    finally {
        on.close();
        off.close();
    }
});

test('the component gallery answers outside production', async () => {
    const response = await get('/dev-tools/components');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Componentes do Painel/);
    assert.match(html, /css\/components\/badge\.css/);
    assert.match(html, /script\/dev-components\.js/);
});

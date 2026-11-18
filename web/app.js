import path from 'node:path';
import express from 'express';
import { DEFAULT_GLAD_VIEW, GLAD_VIEW_COOKIE, normalizeGladView } from './public/script/helpers/glad-view.js';
import { buildUrl, legacyPageUrl } from './helpers/urls.js';
import { renderMiddleware } from './middleware/render.js';
import { securityHeaders } from './middleware/security.js';

const port = 3000;
const host = '0.0.0.0';
const PUBLIC = path.join(import.meta.dirname, 'public');

const app = express();
app.disable('x-powered-by');
// behind the host nginx: trust its one hop only, so a client cannot pick its own address with X-Forwarded-For
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(securityHeaders);

/** Feature gate for the Three.js Coliseu 3D renderer (`ENABLE_RENDER2`: 1/true/on/yes). */
const render2Enabled = ['1', 'true', 'on', 'yes'].includes(String(process.env.ENABLE_RENDER2 ?? '1').trim().toLowerCase());

// no trailing-slash redirect: /dev-tools is a page next to the public/dev-tools/ folder
app.use(express.static(PUBLIC, { index: false, extensions: false, redirect: false }));
// Profile pictures uploaded through the API (shared data volume).
app.use('/profpics', express.static(process.env.PROFPICS_DIR || '/data/profpics', { index: false }));

// Maintenance mode: files keep being served above, every page answers with the notice.
if (['1', 'true', 'on', 'yes'].includes(String(process.env.MAINTENANCE || '').toLowerCase())) {
    app.use((req, res) => res.status(503).sendFile(path.join(PUBLIC, 'maintenance.html')));
}

// The browser talks to the API directly; the web service only renders page shells and never
// receives the session.
app.use(renderMiddleware({
    apiUrl: buildUrl(process.env.API_URL, process.env.API_PORT),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
}, { cache: process.env.NODE_ENV === 'production' }));

/**
 * The gladiator style named on a page's root element: the browser's `gladview` cookie when it
 * holds a choice, the 3D coliseum otherwise. The session never reaches this service, so the
 * browser keeps its cached choice in the cookie (`helpers/glad-view.js` writes it).
 *
 * @param {string} [header] The request's `Cookie` header.
 * @returns {'sprite'|'3d'}
 */
function gladViewOf(header = '') {
    for (const pair of String(header).split(';')) {
        const index = pair.indexOf('=');
        if (index < 1 || pair.slice(0, index).trim() !== GLAD_VIEW_COOKIE) continue;
        const value = pair.slice(index + 1).trim();
        try {
            return normalizeGladView(decodeURIComponent(value));
        }
        catch {
            return normalizeGladView(value);
        }
    }
    return DEFAULT_GLAD_VIEW;
}

// The style belongs on <html> before the first paint, so every page gets it from the cookie and
// the page scripts read it through `currentGladView()`; it is also offered to the templates and to
// the browser variables for pages that need it directly.
app.use((req, res, next) => {
    const gladView = gladViewOf(req.headers.cookie);
    res.locals.gladView = gladView;

    const page = res.page.bind(res);
    res.page = (view, vars = {}, clientVars = {}) => page(view, { ...vars, gladView }, { ...clientVars, gladView });

    const send = res.send.bind(res);
    res.send = body => (typeof body === 'string' && body.includes('<html')
        ? send(body.replace(/<html(?![^>]*data-glad-view)/, `<html data-glad-view="${gladView}"`))
        : send(body));
    next();
});

/**
 * Registers a GET route that renders a view; `clientVars(req)` picks the route values the page's
 * script reads through `helpers/template-var.js`.
 *
 * @param {string|RegExp|Array<string|RegExp>} route
 * @param {string} view
 * @param {(req: import('express').Request) => Record<string, unknown>} [clientVars]
 * @param {Record<string, unknown>} [vars]
 */
function page(route, view, clientVars = () => ({}), vars = {}) {
    app.get(route, async (req, res, next) => {
        try {
            await res.page(view, vars, clientVars(req));
        }
        catch (error) {
            next(error);
        }
    });
}

/** @param {unknown} value A query value. @returns {string} The value when it is a plain string. */
const text = value => (typeof value === 'string' ? value : '');

page('/', 'index', req => ({ login: text(req.query.login) }));
page('/about', 'about');
page('/creditos', 'creditos');
page('/docs', 'docs');
page('/docs-ptbr', 'docs-ptbr');
page('/docs-blocks', 'docs-blocks');
page('/manual', 'manual');
page('/stats', 'stats');
page('/thanks', 'thanks');
page('/update', 'update');
// administrators only: the API refuses everyone else and the page sends them home
page('/dev-tools', 'dev-tools');
app.get('/dev-tools/index.html', (req, res) => res.redirect(301, '/dev-tools'));
page(['/function/:name', '/funcao/:name'], 'function', req => {
    const [name, language = ''] = req.params.name.split('.');
    return { functionName: name, codeLanguage: language, docLanguage: req.path.startsWith('/funcao/') ? 'pt' : '' };
});
page('/post/:hash', 'post', req => ({ postHash: req.params.hash }));
// the old editor address took the gladiator as ?g=
app.get('/editor', (req, res, next) => (req.query.g === undefined ? next() : res.redirect(301, legacyPageUrl('editor', req.query))));
// The editor's gladiator creator draws the master's style (sprite or 3D): the import map always offers three
// and render2, so the page needs no gate; `ENABLE_RENDER2` below only decides the replay's renderer
page('/editor', 'editor', () => ({ gladiatorId: null }));
page('/newglad', 'editor', () => ({ gladiatorId: 0 }));
page(/^\/glad-(\d+)$/, 'editor', req => ({ gladiatorId: Number(req.params[0]) }));
// the replay reads its gate from `render2` before loading the 3D entry
page('/play/:hash', 'playback', req => ({ logHash: req.params.hash, tournament: text(req.query.t) }), { render2: render2Enabled });

// A tournament or training link without a round opens round 0.
app.get(['/tourn/:hash', '/train/:hash'], (req, res) => res.redirect(`${req.path.replace(/\/+$/, '')}/0`));
page('/tourn/:hash/:round', 'tournament', req => ({ hash: req.params.hash, round: Number(req.params.round) || 0 }));
page('/train/:hash/:round', 'training', req => ({ hash: req.params.hash, round: Number(req.params.round) || 0 }));

/** Profile tabs keep their short URLs (`/news`, `/battle.duel`, ...). */
const PROFILE_TABS = {
    news: 'news', glads: 'glads', reports: 'report', battle: 'battle', potion: 'potions',
    ranking: 'ranking', messages: 'messages', friends: 'friends', logout: 'logout',
};
page('/profile', 'profile', req => ({ tab: text(req.query.t), subtab: text(req.query.s) }));
for (const [route, tab] of Object.entries(PROFILE_TABS)) page(`/${route}`, 'profile', () => ({ tab, subtab: '' }));
page(/^\/battle\.([\w-]+)$/, 'profile', req => ({ tab: 'battle', subtab: req.params[0] }));

// Old PHP addresses (shared battle links, bookmarks), with or without `.php` as Apache served
// both, move permanently to the new routes.
app.get(/^\/([\w-]+)(?:\.php)?$/, (req, res, next) => {
    const target = legacyPageUrl(req.params[0], req.query);
    if (!target) return next();
    return res.redirect(301, target);
});

app.use(async (req, res) => {
    res.status(404);
    await res.page('notfound');
});

app.use((err, req, res, next) => {
    console.error('Web 500:', err);
    if (res.headersSent) return next(err);
    return res.status(500).send('Erro interno. Tente novamente em instantes.');
});

if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(port, host, () => console.log(`Web listening on http://${host}:${port}/`));
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

export { app };

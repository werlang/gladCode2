// Run: node dev-tools/ui-audit.mjs --base http://localhost:8085 --cookie "$COOKIE" --axe /tmp/axe.min.js
//
// Drives the local Chrome DevTools endpoint (--remote http://localhost:9222) through every Painel
// section in the three themes and the desktop/phone widths. It reports horizontal page overflow,
// small phone targets, unlabelled icon controls, runtime errors and the axe-core serious/critical
// violations, and writes one screenshot per combination when --out is given.
//
// Options:
//   --base <url>       Web service (default http://localhost:8085)
//   --cookie <value>   app_session cookie value for a signed-in master
//   --axe <file>       Local axe-core build; omit to skip axe
//   --out <dir>        Screenshot directory; omit for metrics only
//   --remote <url>     Chrome DevTools endpoint (default http://localhost:9222)
//   --routes <list>    Comma-separated route slugs (default: every section)
//   --themes <list>    Comma-separated theme ids (default: all three)
//   --viewports <list> desktop,phone,small (default: all three)
//   --json <file>      Write the full result JSON here
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const options = Object.fromEntries(process.argv.slice(2).flatMap((arg, index, all) => (
    arg.startsWith('--') ? [[arg.slice(2), all[index + 1]?.startsWith('--') ? true : all[index + 1]]] : []
)));

const BASE = options.base ?? 'http://localhost:8085';
const REMOTE = options.remote ?? 'http://localhost:9222';
const OUT = options.out ?? '';
const AXE = options.axe ?? '';
const COOKIE = options.cookie ?? '';
const THEMES = (options.themes ?? 'arena-light,arena-dark,classic').split(',');
const VIEWPORTS = Object.fromEntries(Object.entries({
    desktop: { width: 1440, height: 900, mobile: false },
    phone: { width: 390, height: 844, mobile: true },
    small: { width: 360, height: 740, mobile: true },
}).filter(([name]) => (options.viewports ?? 'desktop,phone,small').split(',').includes(name)));
const SECTIONS = [
    ['news', '/news'],
    ['profile', '/profile'],
    ['glads', '/glads'],
    ['potions', '/potion'],
    ['battle', '/battle'],
    ['reports', '/reports'],
    ['ranking', '/ranking'],
    ['ranking-own', '/ranking?at=128'],
    ['messages', '/messages'],
    ['messages-thread', '/messages/1'],
    ['friends', '/friends'],
];
const ROUTES = SECTIONS.filter(([slug]) => !options.routes || options.routes.split(',').includes(slug));
if (OUT) mkdirSync(OUT, { recursive: true });

const version = await (await fetch(`${REMOTE}/json/version`)).json();
const created = await (await fetch(`${REMOTE}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const events = [];
ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
        return;
    }
    if (message.method) events.push(message);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
});

const report = { generatedAt: new Date().toISOString(), base: BASE, results: [] };

try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Log.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    if (COOKIE) await send('Network.setCookie', { name: 'app_session', value: COOKIE, domain: 'localhost', path: '/', httpOnly: true });
    if (AXE) {
        const source = readFileSync(AXE, 'utf8');
        await send('Page.addScriptToEvaluateOnNewDocument', { source });
    }

    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
        await send('Emulation.setDeviceMetricsOverride', {
            width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
        });
        for (const theme of THEMES) {
            for (const [slug, path] of ROUTES) {
                events.length = 0;
                await send('Runtime.evaluate', {
                    expression: `localStorage.setItem('gladcode-theme', JSON.stringify({ data: '${theme}' }))`,
                });
                await send('Page.navigate', { url: `${BASE}${path}` });
                await wait(550);
                for (let attempt = 0; attempt < 30; attempt += 1) {
                    const state = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
                    if (state.result.value === 'complete') break;
                    await wait(120);
                }
                await wait(1500);
                await send('Runtime.evaluate', {
                    expression: `import('/script/helpers/theme.js').then(m => m.applyTheme('${theme}')).catch(() => {})`,
                    awaitPromise: true,
                });
                await wait(250);
                await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });

                const metrics = (await send('Runtime.evaluate', {
                    expression: `JSON.stringify((() => {
                        const width = innerWidth;
                        const visible = element => {
                            const rect = element.getBoundingClientRect();
                            const style = getComputedStyle(element);
                            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
                        };
                        const label = element => (element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 70);
                        const elements = [...document.querySelectorAll('body *')];
                        const overflow = elements.filter(element => {
                            if (!visible(element)) return false;
                            const rect = element.getBoundingClientRect();
                            return rect.right > width + 2 && getComputedStyle(element).position !== 'fixed';
                        }).slice(0, 12).map(element => ({
                            tag: element.tagName.toLowerCase(),
                            id: element.id,
                            cls: String(element.className).slice(0, 80),
                            right: Math.round(element.getBoundingClientRect().right),
                            text: label(element),
                        }));
                        const targets = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"]')]
                            .filter(visible)
                            .map(element => {
                                const rect = element.getBoundingClientRect();
                                return { tag: element.tagName.toLowerCase(), id: element.id, cls: String(element.className).slice(0, 60), w: Math.round(rect.width), h: Math.round(rect.height), text: label(element) };
                            })
                            .filter(target => target.w < 44 || target.h < 44);
                        const unlabelled = [...document.querySelectorAll('button, a[href], [role="button"]')]
                            .filter(visible)
                            .filter(element => !element.getAttribute('aria-label') && !element.getAttribute('title') && !element.textContent.trim() && !element.querySelector('img[alt]:not([alt=""])'))
                            .slice(0, 12)
                            .map(element => ({ tag: element.tagName.toLowerCase(), id: element.id, cls: String(element.className).slice(0, 80) }));
                        return {
                            width,
                            pageScrollWidth: document.documentElement.scrollWidth,
                            bodyScrollWidth: document.body.scrollWidth,
                            pageHeight: document.documentElement.scrollHeight,
                            overflow,
                            smallTargets: targets.slice(0, 20),
                            smallTargetCount: targets.length,
                            unlabelled,
                        };
                    })())`,
                    returnByValue: true,
                })).result.value;
                const data = JSON.parse(metrics);
                const problems = events
                    .filter(event => event.method === 'Runtime.exceptionThrown')
                    .map(event => event.params.exceptionDetails.text)
                    .concat(events
                        .filter(event => event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error')
                        .map(event => event.params.args.map(arg => arg.value ?? arg.description).join(' ')))
                    .concat(events
                        .filter(event => event.method === 'Network.responseReceived' && event.params.response.status >= 400 && !/synty|\.woff|\.png$|\.jpg$|\.svg$/.test(event.params.response.url))
                        .map(event => `${event.params.response.status} ${event.params.response.url}`));

                let axe = null;
                if (AXE) {
                    const axeResult = await send('Runtime.evaluate', {
                        expression: `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }).then(r => JSON.stringify(r.violations.map(v => ({
                            id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
                            targets: v.nodes.slice(0, 20).map(n => ({ target: n.target.join(' '), html: n.html, data: n.any?.[0]?.data })),
                        }))))`,
                        awaitPromise: true,
                        returnByValue: true,
                    });
                    if (axeResult.exceptionDetails) axe = { error: axeResult.exceptionDetails.text };
                    else {
                        const violations = JSON.parse(axeResult.result.value);
                        axe = {
                            violations,
                            serious: violations.filter(v => v.impact === 'serious').length,
                            critical: violations.filter(v => v.impact === 'critical').length,
                        };
                    }
                }

                const result = { viewport: viewportName, theme, slug, path, ...data, problems, axe };
                report.results.push(result);
                const flag = data.pageScrollWidth > viewport.width + 2
                    ? ` HSCROLL ${data.pageScrollWidth}>${viewport.width}`
                    : '';
                const axeFlag = axe && (axe.serious || axe.critical) ? ` AXE serious=${axe.serious} critical=${axe.critical}` : '';
                console.log(`${viewportName.padEnd(7)} ${theme.padEnd(11)} ${slug.padEnd(15)} overflow=${data.smallTargetCount} targets${flag}${axeFlag}`);
                if (OUT) {
                    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                    writeFileSync(join(OUT, `${slug}-${theme}-${viewport.width}.png`), Buffer.from(shot.data, 'base64'));
                }
            }
        }
    }
}
finally {
    if (options.json) writeFileSync(options.json, JSON.stringify(report, null, 2));
    ws.close();
    await fetch(`${REMOTE}/json/close/${created.id}`).catch(() => {});
}

const bad = report.results.filter(result => result.pageScrollWidth > result.width + 2);
const axeBad = report.results.filter(result => result.axe && (result.axe.serious || result.axe.critical));
const unlabelled = report.results.filter(result => result.unlabelled.length);
console.log(JSON.stringify({
    runs: report.results.length,
    horizontalScroll: bad.map(result => `${result.viewport}/${result.theme}/${result.slug} ${result.pageScrollWidth}>${result.width}`),
    axeSeriousOrCritical: axeBad.map(result => `${result.viewport}/${result.theme}/${result.slug}`),
    unlabelled: unlabelled.map(result => `${result.viewport}/${result.theme}/${result.slug}`),
}, null, 2));

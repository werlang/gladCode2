// Render the static Painel design boards into plain HTML for visual auditing.
//
// Run: node dev-tools/render-boards.mjs [outDir]
// The boards under docs/design/painel are exported design-canvas files. Their small runtime
// (support.js) is not exported, so this script evaluates each board's `data-dc-script` logic,
// expands its sc-for/sc-if loops and writes a standalone HTML file per board. It is an audit aid,
// not part of the application build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const HERE = resolve(import.meta.dirname, '..');
const BOARDS = join(HERE, 'docs/design/painel');
const OUT = resolve(process.argv[2] ?? '/tmp/opencode/boards');
mkdirSync(OUT, { recursive: true });

const LOGO = readFileSync(join(HERE, 'web/public/icon/logo.png')).toString('base64');
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

const boardFile = name => join(BOARDS, `${name}.dc.html`);
const cache = new Map();

/** Reads a board once. */
function source(name) {
    if (!cache.has(name)) cache.set(name, readFileSync(boardFile(name), 'utf8'));
    return cache.get(name);
}

/** Defaults declared by the board's data-props. */
function defaults(html) {
    const match = html.match(/data-props='([^']+)'/);
    if (!match) return {};
    const config = JSON.parse(match[1]);
    const props = {};
    for (const [key, value] of Object.entries(config)) {
        if (key === '$preview') continue;
        if (value && typeof value === 'object' && 'default' in value) props[key] = value.default;
    }
    return { props, preview: config.$preview ?? { width: 1440, height: 900 } };
}

/** Looks a `{{a.b}}` expression up in the render scope. */
function value(scope, expression) {
    const path = String(expression).replace(/^\{\{\s*|\s*\}\}$/g, '').trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    return path.split('.').reduce((current, key) => current?.[key], scope);
}

/** Renders sc-for/sc-if and {{placeholders}} in one board fragment. */
function template(text, scope) {
    let output = '';
    let cursor = 0;
    while (cursor < text.length) {
        const open = /<(sc-for|sc-if)\b([^>]*)>/.exec(text.slice(cursor));
        if (!open) {
            output += text.slice(cursor);
            break;
        }
        const openIndex = cursor + open.index;
        output += text.slice(cursor, openIndex);
        const kind = open[1];
        const attrs = open[2];
        const bodyStart = openIndex + open[0].length;
        const tag = /<(\/)?(sc-for|sc-if)\b[^>]*>/g;
        tag.lastIndex = bodyStart;
        let depth = 1;
        let close = null;
        let token;
        while ((token = tag.exec(text))) {
            if (token[1]) depth -= 1;
            else depth += 1;
            if (depth === 0) {
                close = { start: token.index, end: tag.lastIndex };
                break;
            }
        }
        if (!close) {
            output += text.slice(openIndex);
            break;
        }
        const body = text.slice(bodyStart, close.start);
        if (kind === 'sc-for') {
            const list = value(scope, attrs.match(/list="([^"]*)"/)?.[1] ?? '') ?? [];
            const as = attrs.match(/as="([^"]*)"/)?.[1] ?? 'item';
            output += list.map(item => template(body, { ...scope, [as]: item })).join('');
        }
        else {
            const truthy = value(scope, attrs.match(/value="([^"]*)"/)?.[1] ?? '') ?? false;
            if (truthy) output += template(body, scope);
        }
        cursor = close.end;
    }
    return output.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, expression) => {
        const found = value(scope, expression);
        return found == null ? '' : String(found);
    });
}

/** Renders one board body; imports Header/Rail recursively. */
function render(name, overrides = {}) {
    const html = source(name);
    const { props, preview } = defaults(html);
    const settings = { ...props, ...overrides };
    const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? '';
    const module = new Function('DCLogic', `${script}\nreturn Component;`);
    class DCLogic {
        constructor(values) { this.props = values; }
    }
    const logic = module(DCLogic);
    const values = logic ? new logic(settings).renderVals() : {};
    const scope = { ...settings, ...values };

    let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
    body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
    body = body.replace(/<x-dc>/g, '<div class="dc-artboard">').replace(/<\/x-dc>/g, '</div>');
    body = body.replace(/<dc-import\s+name="([^"]+)"([^>]*)><\/dc-import>/g, (whole, imported, attrs) => {
        const importedProps = {};
        for (const [, key, literal] of attrs.matchAll(/(\w+)="([^"]*)"/g)) {
            importedProps[key] = /^(true|false)$/.test(literal) ? literal === 'true' : literal;
        }
        return `<div class="dc-import dc-import--${imported.toLowerCase()}">${render(imported, importedProps).body}</div>`;
    });
    body = template(body, scope);
    const logo = `data:image/png;base64,${LOGO}`;
    body = body.replace(/\/_blob\/54e6f23576297d5425eec7e04d5b380b/g, logo);
    // The other canvas blobs are not exported; keep their layout boxes without a broken-image glyph.
    body = body.replace(/\/_blob\/[^"')]+/g, BLANK);
    return { body, preview, html };
}

for (const file of ['Header', 'Rail', 'Estados', 'Mobile', 'Main', 'Perfil', 'Gladiadores', 'Pocoes', 'Batalhas', 'Relatorios', 'Ranking', 'Mensagens', 'Amigos']) {
    const { body, preview, html } = render(file);
    const head = html.slice(0, html.indexOf('<body>'));
    const page = `${head}<body>${body}</body></html>`;
    writeFileSync(join(OUT, `${file}.html`), page);
    console.log(`${basename(file)}.html ${preview.width}x${preview.height}`);
}

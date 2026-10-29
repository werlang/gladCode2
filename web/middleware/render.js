import fs from 'node:fs/promises';
import path from 'node:path';
import Mustache from 'mustache';
import { assetUrl, importMapTag } from '../helpers/modules.js';
import { safeJson } from '../helpers/safe-json.js';

const VIEW_PATH = path.join(import.meta.dirname, '../view');

/**
 * Adds `res.page(view, vars, clientVars)`, which renders `view/<view>.html` with Mustache. Every
 * file in `view/` is available as a partial (`{{> header}}`). Views get:
 *
 * - `{{#asset}}css/x.css{{/asset}}`: the file's versioned URL;
 * - `{{#module}}page.js{{/module}}`: a module entry's versioned URL under `script/`;
 * - `{{{importMap}}}`: the module import map (`render2: true` in vars adds the 3D renderer);
 * - `{{{templateVars}}}`: a JSON script with `fixedVars` and `clientVars`, read in the browser by
 *   `helpers/template-var.js`. The server never sees sessions, so nothing private goes there.
 *
 * @param {Record<string, unknown>} fixedVars Variables for every page and the browser (e.g. `apiUrl`).
 * @param {{ cache?: boolean }} [options] Cache view files and import maps (production, where the
 *   files never change while the service runs).
 * @returns {import('express').RequestHandler}
 */
export function renderMiddleware(fixedVars = {}, { cache = false } = {}) {
    const templates = new Map();
    const importMaps = new Map();
    const assets = new Map();
    let viewNames = null;

    /** @param {string} file Path under `public/`. @returns {string} Its versioned URL. */
    const versioned = file => {
        if (!cache) return assetUrl(file);
        if (!assets.has(file)) assets.set(file, assetUrl(file));
        return assets.get(file);
    };

    /** @param {boolean} render2 @returns {string} */
    const importMap = render2 => {
        if (!cache) return importMapTag({ render2 });
        if (!importMaps.has(render2)) importMaps.set(render2, importMapTag({ render2 }));
        return importMaps.get(render2);
    };

    /** @param {string} name */
    const read = async name => {
        if (cache && templates.has(name)) return templates.get(name);
        const text = await fs.readFile(path.join(VIEW_PATH, `${name}.html`), 'utf8');
        if (cache) templates.set(name, text);
        return text;
    };

    /** @returns {Promise<Record<string, string>>} Every view as a partial. */
    const partials = async () => {
        const names = viewNames ?? (await fs.readdir(VIEW_PATH)).filter(file => file.endsWith('.html')).map(file => file.slice(0, -5));
        if (cache) viewNames = names;
        return Object.fromEntries(await Promise.all(names.map(async name => [name, await read(name)])));
    };

    return (req, res, next) => {
        /**
         * @param {string} view
         * @param {Record<string, unknown>} [vars] Values for the template only.
         * @param {Record<string, unknown>} [clientVars] Values also sent to the browser.
         */
        res.page = async (view, vars = {}, clientVars = {}) => {
            const context = {
                ...fixedVars,
                ...clientVars,
                ...vars,
                year: new Date().getFullYear(),
                asset: () => text => versioned(text.trim()),
                module: () => text => versioned(`script/${text.trim()}`),
                importMap: importMap(Boolean(vars.render2)),
                templateVars: `<script id="template-vars" type="application/json">${safeJson({ ...fixedVars, ...clientVars })}</script>`,
            };
            res.send(Mustache.render(await read(view), context, await partials()));
        };
        next();
    };
}

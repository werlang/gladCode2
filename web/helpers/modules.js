import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const PUBLIC = path.join(import.meta.dirname, '../public');

/** Folders under `public/script/` whose ES modules are versioned in the import map. */
export const MODULE_DIRS = ['', 'components', 'editor', 'helpers', 'models', 'profile', 'templates'];

/** CDN modules of the 3D renderer. */
const THREE_IMPORTS = {
    three: 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js',
    'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/',
};

/**
 * Versioned URL of a public file: `?v=` carries its modification time, so a browser never mixes a
 * cached file with a newer one.
 *
 * @param {string} file Path under `public/`, without a leading slash (e.g. `css/index.css`).
 * @returns {string}
 */
export function assetUrl(file) {
    const clean = file.replace(/^\/+/, '');
    return `/${clean}?v=${Math.trunc(statSync(path.join(PUBLIC, clean)).mtimeMs)}`;
}

/**
 * Lists the `.js` files of a folder under `public/script/`.
 *
 * @param {string} dir
 * @returns {string[]} Paths under `public/`.
 */
function scripts(dir) {
    const folder = path.join(PUBLIC, 'script', dir);
    return readdirSync(folder).filter(name => name.endsWith('.js')).map(name => path.posix.join('script', dir, name));
}

/**
 * Import map entries for every frontend module, plus the 3D renderer's. The 3D modules are mapped on every page
 * whatever the replay gate says: the gladiator cards' portraits (and the editor's preview) import three and
 * `render2/` on demand, while `ENABLE_RENDER2` keeps deciding whether the replay itself runs the 3D renderer.
 *
 * @param {{ render2?: boolean }} [options] Kept for callers; it no longer changes the map.
 * @returns {Record<string, string>} Specifier => versioned URL.
 */
export function moduleImports(options = {}) {
    const imports = {};
    for (const dir of MODULE_DIRS) {
        for (const file of scripts(dir)) imports[`/${file}`] = assetUrl(file);
    }
    Object.assign(imports, THREE_IMPORTS);
    for (const file of scripts('render2')) {
        imports[`/${file}`] = assetUrl(file);
        imports[`./render2/${path.basename(file)}`] = assetUrl(file);
    }
    return imports;
}

/**
 * The `<script type="importmap">` tag a page prints once in `<head>`, before any module script.
 *
 * @param {{ render2?: boolean }} [options] Kept for callers; it no longer changes the map.
 * @returns {string}
 */
export function importMapTag(options) {
    const json = JSON.stringify({ imports: moduleImports(options) }).replace(/</g, '\\u003c');
    return `<script type="importmap">${json}</script>`;
}

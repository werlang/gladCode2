/**
 * Builds the Synty asset catalog in this folder from the (gitignored) packs under `public_html/assets/synty/`.
 *
 * For every pack it writes `<pack>.tsv` (one line per FBX: measured size in metres, pivot, triangles, bones,
 * animation clips, the material names inside the FBX and the texture slots from the pack's MaterialList txt) and
 * `<pack>.textures.tsv` (every image with its pixel size), then `INDEX.md` with per-pack totals, units, categories
 * and atlases. Run it again whenever a pack is added or changed (see README.md):
 *
 *   docker run --rm -v "$PWD":/w -w /w node:22-alpine sh -c \
 *     'cd /tmp && npm i -s three@0.185.1 >/dev/null 2>&1 && THREE_DIR=/tmp/node_modules/three node --max-old-space-size=4096 /w/docs/synty-assets/build-catalog.mjs'
 */
import { closeSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', 'public_html', 'assets', 'synty');
const THREE_DIR = process.env.THREE_DIR ?? 'three';
const THREE = await import(`${THREE_DIR}/build/three.module.js`);
const { FBXLoader } = await import(`${THREE_DIR}/examples/jsm/loaders/FBXLoader.js`);

// FBXLoader wants a DOM for textures and logs on odd files; the catalog needs neither.
THREE.TextureLoader.prototype.load = () => new THREE.Texture();
const quiet = console.warn;
console.warn = () => {};

/** Recursively lists files under `dir` whose name matches `pattern`. */
function walk(dir, pattern, out = []) {
    for (const name of readdirSync(dir)) {
        if (name.startsWith('.')) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path, pattern, out);
        else if (pattern.test(name)) out.push(path);
    }
    return out;
}

/** Prefab name -> { folder, slots: ["Slot (Texture)"] } from a pack's MaterialList_*.txt files. */
function readMaterialLists(pack) {
    const prefabs = new Map();
    for (const file of readdirSync(pack).filter((name) => /^MaterialList.*\.txt$/i.test(name))) {
        let folder = '';
        let current = null;
        for (const line of readFileSync(join(pack, file), 'utf8').split(/\r?\n/)) {
            const folderMatch = line.match(/^Folder Name:\s*(.+)$/);
            if (folderMatch) folder = folderMatch[1].trim();
            const prefab = line.match(/^Prefab Name:\s*(.+)$/);
            if (prefab) {
                current = { folder, slots: [] };
                prefabs.set(prefab[1].trim(), current);
            }
            const slot = line.match(/^\s*Slot:\s*(.+)$/);
            if (slot && current) current.slots.push(slot[1].trim());
        }
    }
    return prefabs;
}

/** Width and height of a PNG or TGA, read from its header (null for other formats). */
function imageSize(path) {
    const head = Buffer.alloc(24);
    const fd = openSync(path, 'r');
    readSync(fd, head, 0, 24, 0);
    closeSync(fd);
    if (head.readUInt32BE(0) === 0x89504e47) return [head.readUInt32BE(16), head.readUInt32BE(20)];
    if (extname(path).toLowerCase() === '.tga') return [head.readUInt16LE(12), head.readUInt16LE(14)];
    return null;
}

const loader = new FBXLoader();
/** Measures one FBX in its raw (authored) units. */
function measure(path) {
    const buffer = readFileSync(path);
    const root = loader.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const materials = new Set();
    let triangles = 0;
    let meshes = 0;
    const bones = new Set();
    root.traverse((node) => {
        if (node.isBone) bones.add(node.name);
        if (!node.isMesh) return;
        meshes += 1;
        [].concat(node.material).forEach((material) => material?.name && materials.add(material.name));
        const geometry = node.geometry;
        triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
        geometry.computeBoundingBox();
        box.union(geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
    });
    const clips = (root.animations ?? []).map((clip) => `${clip.name}:${clip.duration.toFixed(2)}s`);
    return { box: box.isEmpty() ? null : box, materials: [...materials], triangles: Math.round(triangles), meshes, bones: bones.size, clips };
}

/** The colour atlases: Synty names them after the pack (PolygonX_Texture_01[_A], Dungeons_Texture_01, Texture_01). */
const ATLAS = /(^|\/)((Polygon|Dungeons|PNB)[^/]*_)?Texture_0?1(_A)?\.png$/i;
/** Tiling surface textures that share the atlas naming (terrain, environment). */
const TILING = /(^|\/)(Terrain|Env)\//i;

const round = (value) => (Math.abs(value) < 0.005 ? '0' : value.toFixed(2));
const packs = readdirSync(ROOT).filter((name) => statSync(join(ROOT, name)).isDirectory()).sort();
const index = [];

for (const name of packs) {
    const pack = join(ROOT, name);
    const prefabs = readMaterialLists(pack);
    const files = walk(pack, /\.fbx$/i).sort();
    const measured = [];
    for (const [i, file] of files.entries()) {
        let result;
        try {
            result = measure(file);
        }
        catch (error) {
            result = { error: String(error.message ?? error).slice(0, 60) };
        }
        measured.push({ file, ...result });
        if ((i + 1) % 100 === 0) process.stdout.write(`${name}: ${i + 1}/${files.length}\n`);
    }
    // Units: Synty FBX are mostly authored in centimetres; a pack whose typical model is under 20 raw units across
    // is in metres (the dungeon pack, for one). Sizes are reported in metres either way.
    const spans = measured.filter((m) => m.box).map((m) => {
        const s = m.box.getSize(new THREE.Vector3());
        return Math.max(s.x, s.y, s.z);
    }).sort((a, b) => a - b);
    const median = spans.length ? spans[Math.floor(spans.length / 2)] : 0;
    const unit = median > 20 ? 0.01 : 1;
    const rows = [['path', 'category', 'size_x_m', 'size_y_m', 'size_z_m', 'min_x_m', 'min_y_m', 'min_z_m', 'tris', 'meshes', 'bones', 'clips', 'fbx_materials', 'materiallist_slots'].join('\t')];
    const categories = new Map();
    for (const m of measured) {
        const rel = relative(pack, m.file);
        const prefab = prefabs.get(basename(m.file, extname(m.file)));
        const category = prefab?.folder || rel.split('/').slice(-2, -1)[0] || '';
        categories.set(category, (categories.get(category) ?? 0) + 1);
        if (m.error) {
            rows.push([rel, category, '', '', '', '', '', '', '', '', '', '', `ERROR ${m.error}`, ''].join('\t'));
            continue;
        }
        const size = m.box ? m.box.getSize(new THREE.Vector3()).multiplyScalar(unit) : null;
        const min = m.box ? m.box.min.clone().multiplyScalar(unit) : null;
        rows.push([
            rel, category,
            ...(size ? [round(size.x), round(size.y), round(size.z)] : ['', '', '']),
            ...(min ? [round(min.x), round(min.y), round(min.z)] : ['', '', '']),
            m.triangles, m.meshes, m.bones, m.clips.join(' '), m.materials.join(','), prefab ? prefab.slots.join(' | ') : '',
        ].join('\t'));
    }
    writeFileSync(join(HERE, `${name}.tsv`), `${rows.join('\n')}\n`);

    const images = walk(pack, /\.(png|tga|jpe?g|psd|tif)$/i).sort();
    const textureRows = [['path', 'width', 'height'].join('\t')];
    for (const image of images) {
        let size = null;
        try {
            size = imageSize(image);
        }
        catch {
            size = null;
        }
        textureRows.push([relative(pack, image), size?.[0] ?? '', size?.[1] ?? ''].join('\t'));
    }
    writeFileSync(join(HERE, `${name}.textures.tsv`), `${textureRows.join('\n')}\n`);

    const animated = measured.filter((m) => m.clips?.length).length;
    const skinned = measured.filter((m) => m.bones > 0 && m.triangles > 0).length;
    const atlases = images.map((image) => relative(pack, image)).filter((path) => ATLAS.test(path) && !TILING.test(path)).slice(0, 4);
    index.push({ name, fbx: files.length, images: images.length, unit, animated, skinned, categories, atlases, lists: readdirSync(pack).filter((f) => /^MaterialList.*\.txt$/i.test(f)) });
    process.stdout.write(`${name}: ${files.length} fbx, ${images.length} images\n`);
}

const lines = [
    '# Synty asset index (generated)',
    '',
    'Generated by `build-catalog.mjs` from `public_html/assets/synty/`; do not edit by hand. See `README.md` for how to use it.',
    '',
    '| Pack | FBX | Images | FBX unit | Skinned | With clips | Material lists | Colour atlases |',
    '| :--- | ---: | ---: | :--- | ---: | ---: | :--- | :--- |',
    ...index.map((p) => `| \`${p.name}\` | ${p.fbx} | ${p.images} | ${p.fbx ? (p.unit === 1 ? 'metres' : 'centimetres (×0.01)') : '-'} | ${p.skinned} | ${p.animated} | ${p.lists.map((l) => `\`${l}\``).join(', ') || '-'} | ${p.atlases.map((a) => `\`${a}\``).join('<br>') || '-'} |`),
    '',
    '## Categories per pack',
    '',
    'Category is the MaterialList `Folder Name` when the txt lists the prefab, else the FBX file\'s parent folder.',
    '',
];
for (const p of index) {
    if (!p.fbx) continue;
    lines.push(`### ${p.name}`, '', [...p.categories].sort((a, b) => b[1] - a[1]).map(([category, count]) => `\`${category || '(root)'}\` ${count}`).join(' · '), '');
}
writeFileSync(join(HERE, 'INDEX.md'), `${lines.join('\n')}\n`);
console.warn = quiet;
process.stdout.write('catalog written\n');

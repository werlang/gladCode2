// Run: docker run --rm -v "$PWD":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && node --test tests/render2/synty-library.test.mjs"
// The real SyntyLibrary and SyntyModel on real three, with the network stubbed: FBXLoader#load answers with the
// synthetic scenes of fixtures/synty-fbx.mjs, fetch and createImageBitmap answer for the atlases.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import { images } from '../../web/public/script/helpers/sprite-catalog.js';
import { getAppearance } from '../../web/public/script/render2/palette.js';
import { SyntyLibrary, loadSynty } from '../../web/public/script/render2/synty-model.js';
import { buildSyntyFbx } from './fixtures/synty-fbx.mjs';

/** Every file asked for, the files that answer 404 (by part of their URL) and the scenes handed out. */
const network = { fbx: [], images: [], missing: new Set(), scenes: [] };
const isMissing = url => [...network.missing].some(part => url.includes(part));

FBXLoader.prototype.load = function load(url, onLoad, onProgress, onError) {
    const resolved = this.manager.resolveURL(url);
    network.fbx.push(resolved);
    this.manager.itemStart(resolved);
    setTimeout(() => {
        if (isMissing(resolved)) {
            onError(new Error(`404 ${resolved}`));
        }
        else {
            const scene = buildSyntyFbx(resolved);
            network.scenes.push(scene);
            onLoad(scene);
        }
        this.manager.itemEnd(resolved);
    }, 2);
};
globalThis.fetch = async url => {
    network.images.push(String(url));
    return isMissing(String(url)) ? { ok: false, status: 404 } : { ok: true, status: 200, blob: async () => new Blob([]) };
};
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });

/** Starts a test with nothing asked for yet. */
function fresh() {
    network.fbx.length = 0;
    network.images.length = 0;
    network.missing.clear();
    network.scenes.length = 0;
}

const look = (...ids) => getAppearance(ids, 0, new Map(), images);
const MALE = look('male', 'male-light');
const SPEARMAN = look('male', 'male-light', 'male_spear');
const repeats = list => list.length - new Set(list).size;
const short = url => url.replace(/^.*assets\/synty\//, '');
/** Hero, animation character, 15 masculine locomotion clips, 15 sword clips, the default sword and bow. */
const FIRST_FILES = 34;

test('these tests run the three the pages load', () => {
    const tooling = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    const pages = readFileSync(new URL('../../web/helpers/modules.js', import.meta.url), 'utf8');
    assert.equal(`three@${tooling.devDependencies.three}`, /npm\/(three@[\d.]+)\/build/.exec(pages)[1]);
});

test('each file is fetched once, and a later outfit fetches only what it adds', async () => {
    fresh();
    const library = new SyntyLibrary(THREE);
    await library.prepare([MALE]);
    assert.equal(network.fbx.length, FIRST_FILES);
    await library.prepare([MALE]);
    assert.equal(network.fbx.length, FIRST_FILES, 'the same outfit loads nothing');
    await library.prepare([SPEARMAN]);
    assert.deepEqual(network.fbx.slice(FIRST_FILES).map(short), ['viking-realm/FBX/SM_Wep_Spear_02.fbx']);
    await library.prepare([look('female', 'female-light')]);
    const feminine = network.fbx.slice(FIRST_FILES + 1);
    assert.equal(feminine.length, 15);
    assert.ok(feminine.every(url => /Feminine\/.*_Femn\.fbx$/.test(url)));
    await library.prepare([MALE, SPEARMAN]);
    assert.equal(network.fbx.length, FIRST_FILES + 16);
    assert.equal(repeats(network.fbx), 0);
    assert.equal(repeats(network.images), 0);
});

test('prepares running at once share every load', async () => {
    fresh();
    const library = new SyntyLibrary(THREE);
    const factories = await Promise.all([
        library.prepare([SPEARMAN]),
        library.prepare([look('male', 'male-light', 'male_spear', 'male_shield_5')]),
        library.prepare([SPEARMAN]),
    ]);
    assert.ok(factories.every(create => typeof create === 'function'));
    assert.equal(network.fbx.length, FIRST_FILES + 2);
    assert.equal(repeats(network.fbx), 0);
    assert.equal(repeats(network.images), 0);
});

test('a missing piece of gear is reported once, never fetched again, and the fighter goes without', async t => {
    fresh();
    network.missing.add('SM_Wep_Spear_02');
    const warn = t.mock.method(console, 'warn', () => {});
    const library = new SyntyLibrary(THREE);
    const create = await library.prepare([SPEARMAN]);
    await library.prepare([SPEARMAN]);
    assert.equal(network.fbx.filter(url => url.includes('SM_Wep_Spear_02')).length, 1);
    assert.equal(warn.mock.callCount(), 1);
    // the default sword stands in
    const model = create({ THREE, look: SPEARMAN, index: 0 });
    assert.ok(model.figure.children.length > 0);
    model.dispose();
});

test('a missing required file fails every prepare, without fetching it again', async () => {
    for (const required of ['ModularCharactersFixedScale', 'PolygonFantasyHero_Texture_01', 'A_Idle_Standing_Masc']) {
        fresh();
        network.missing.add(required);
        const library = new SyntyLibrary(THREE);
        await assert.rejects(library.prepare([MALE]), new RegExp(required));
        await assert.rejects(library.prepare([MALE]), new RegExp(required));
        const asked = [...network.fbx, ...network.images].filter(url => url.includes(required));
        assert.equal(asked.length, 1, required);
    }
});

test('the battle loads every fighter at once, each file once', async () => {
    fresh();
    const create = await loadSynty(THREE, [SPEARMAN, look('female', 'female-light', 'bow', 'female_shield_5')]);
    assert.equal(typeof create, 'function');
    // 2 characters, 15 + 15 locomotion clips, 15 sword clips, sword, bow, spear and the shield
    assert.equal(network.fbx.length, 51);
    assert.equal(repeats(network.fbx), 0);
});

test('a model disposes every skeleton it made, and none of the assets\'', async () => {
    fresh();
    const disposed = new Set();
    const dispose = THREE.Skeleton.prototype.dispose;
    THREE.Skeleton.prototype.dispose = function spy() {
        disposed.add(this);
        return dispose.call(this);
    };
    try {
        const archer = look('male', 'male-light', 'bow', 'male_longsleeve_red');
        const create = await new SyntyLibrary(THREE).prepare([archer]);
        const model = create({ THREE, look: archer, index: 0 });
        const owned = new Set();
        model.figure.traverse(node => {
            if (node.isSkinnedMesh) owned.add(node.skeleton);
        });
        // one per body part, plus the cloned bow's
        assert.ok(owned.size >= 10, `${owned.size} skeletons`);
        model.dispose();
        // counts, not the skeletons themselves: a failing diff of bone graphs would take ages to print
        assert.equal([...owned].filter(skeleton => !disposed.has(skeleton)).length, 0, 'skeletons left undisposed');
        assert.ok([...disposed].every(skeleton => owned.has(skeleton)), 'only its own');
        // the loaded scenes' skeletons (hero parts, source bow) stay, and the next model still builds
        const sources = [];
        network.scenes.forEach(scene => scene.traverse(node => {
            if (node.isSkinnedMesh) sources.push(node.skeleton);
        }));
        assert.ok(sources.length > 0);
        assert.equal(sources.filter(skeleton => disposed.has(skeleton)).length, 0);
        const next = create({ THREE, look: archer, index: 0 });
        assert.ok(next.figure);
        next.dispose();
    }
    finally {
        THREE.Skeleton.prototype.dispose = dispose;
    }
});

// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/renderer-preference.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import { RENDERER_ALIASES, RENDERER_STORAGE_KEY, chooseRenderer, normalizeRenderer } from '../../web/public/script/helpers/renderer-preference.js';

const CLASSIC_SCRIPT = readFileSync(new URL('../../web/public/script/battle-renderer-preference.js', import.meta.url), 'utf8');

/**
 * Runs the replay page's classic preference script in a fake window.
 *
 * @param {{ stored?: string|null, search?: string, enabled?: boolean }} page Stored value, URL query and server flag.
 * @returns {{ renderer: string, keys: string[] }} What the script chose and the storage keys it read.
 */
function classicChoice({ stored = null, search = '', enabled = true }) {
    const keys = [];
    const window = {
        __RENDER2_ENABLED__: enabled,
        location: { search },
        localStorage: { getItem: key => (keys.push(key), stored), setItem() {} },
    };
    vm.runInNewContext(CLASSIC_SCRIPT, { window, URLSearchParams, document: { documentElement: { classList: { toggle() {} } } } });
    return { renderer: window.BattleRendererPreference.get(), keys };
}

test('the module and the replay page\'s classic script accept the same spellings', () => {
    const lists = [...CLASSIC_SCRIPT.matchAll(/\[([^\]]*)\]\.includes\(normalized\)/g)].map(([, items]) => items.split(',').map(item => item.trim().replace(/^'|'$/g, '')));
    assert.deepEqual(lists, [RENDERER_ALIASES.three, RENDERER_ALIASES.classic]);
});

test('both choose the same renderer from storage, the query and the server flag', () => {
    const values = [...RENDERER_ALIASES.three, ...RENDERER_ALIASES.classic, '3D', 'Three', ' three', 'webgl', '', null];
    for (const stored of values) {
        assert.equal(chooseRenderer({ enabled: true, stored }), classicChoice({ stored }).renderer, String(stored));
    }
    // the query wins over storage, and a server without the 3D renderer always gets classic
    assert.equal(chooseRenderer({ enabled: true, query: 'v2', stored: 'classic' }), 'three');
    assert.equal(classicChoice({ stored: 'classic', search: '?renderer=v2' }).renderer, 'three');
    assert.equal(chooseRenderer({ enabled: false, stored: 'three' }), 'classic');
    assert.equal(classicChoice({ stored: 'three', enabled: false }).renderer, 'classic');
    assert.deepEqual(classicChoice({ stored: 'three' }).keys, [RENDERER_STORAGE_KEY]);
});

test('unknown spellings name no renderer', () => {
    assert.equal(normalizeRenderer('THREE'), 'three');
    assert.equal(normalizeRenderer('phaser'), 'classic');
    assert.equal(normalizeRenderer('webgl'), null);
    assert.equal(normalizeRenderer(undefined), null);
    assert.equal(chooseRenderer({ enabled: true }), 'classic');
});

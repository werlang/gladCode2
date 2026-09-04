/**
 * Integrity guards for the Synty packs wired into the 3D renderer.
 *
 * These tests run in Node against the repository checkout: every registry,
 * pool and clip path must point at a real file so one renamed FBX can never
 * silently disable part of the arena.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    listWeaponAssetFiles,
    WEAPON_ASSET_REGISTRY,
} from '../../public_html/script/render2/synty-hero-config.js';
import { ANIMATION_KEYS, CLIP_SOURCES } from '../../public_html/script/render2/animation-library.js';
import { PROP_REGISTRY } from '../../public_html/script/render2/synty-prop-packs.js';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

/** Resolves a public_html-relative asset path and asserts it exists. */
function assertAssetExists(relativePath, context) {
    const absolute = path.join(REPO_ROOT, 'public_html', relativePath);
    assert.equal(fs.existsSync(absolute), true, `${context}: missing file ${relativePath}`);
}

test('every registered weapon asset exists and stays normalized', () => {
    const entries = Object.entries(WEAPON_ASSET_REGISTRY);
    assert.ok(entries.length >= 25, `expected all five packs to contribute weapons, found ${entries.length}`);

    for (const [key, entry] of entries) {
        assert.match(key, /^(?:hero|bow|dungeon|empire):[\w]+$/u, key);
        assert.equal(fs.existsSync(path.join(REPO_ROOT, 'public_html', entry.file)), true, `${key}: ${entry.file}`);
        assert.equal(entry.length > 0.2 && entry.length < 2.2, true, `${key}: world length ${entry.length}`);
        assert.ok(['hero', 'bow', 'dungeon', 'empire'].includes(entry.pack), key);
    }
});

test('weapon pools stay class-pure so silhouettes match the engine contract', () => {
    for (const banned of ['bow:CrossBow_01', 'dungeon:Halberd_06', 'empire:Axe_01', 'hero:Mace_01', 'hero:Dagger_01']) {
        assert.equal(WEAPON_ASSET_REGISTRY[banned], undefined, `${banned} must not be auto-selected`);
    }
});

test('weapon pools only reference registry entries with unique files', () => {
    const files = new Set(listWeaponAssetFiles());

    for (const key of Object.values(WEAPON_ASSET_REGISTRY).map((entry) => entry.file)) {
        files.add(key);
    }
    // Every pool pick resolves through the registry.
    for (const poolKey of ['hero:Sword_01', 'bow:Bow_01', 'dungeon:Spear_01', 'empire:Spear_01']) {
        assert.ok(WEAPON_ASSET_REGISTRY[poolKey], poolKey);
    }
    // Prefetching must cover every registry file.
    for (const entry of Object.values(WEAPON_ASSET_REGISTRY)) {
        assert.ok(listWeaponAssetFiles().includes(entry.file), entry.file);
        files.delete(entry.file);
    }
    assert.equal(files.size, 0);
});

test('animation clips cover guard states from real files', () => {
    for (const key of ['idle', 'idleMenacing', 'block', 'staggerF', 'stun', 'deathF']) {
        assert.ok(ANIMATION_KEYS.includes(key), `missing clip key ${key}`);
        assertAssetExists(CLIP_SOURCES[key], `clip ${key}`);
    }
    // Locomotion and attacks are procedural; they must not load clips.
    for (const removed of ['walkM', 'runF', 'sprintM', 'crouchWalkF', 'meleeA', 'stab', 'leap']) {
        assert.equal(ANIMATION_KEYS.includes(removed), false, `${removed} should be procedural`);
    }
});

test('arena dressing props exist and declare sane normalization', () => {
    const expected = [
        'pillar', 'statue', 'lionStatue', 'brazier', 'torch',
        'wallBanner', 'throne', 'portcullis', 'weaponRack', 'obelisk', 'bonePile',
    ];
    for (const key of expected) {
        const entry = PROP_REGISTRY[key];
        assert.ok(entry, `missing prop ${key}`);
        assertAssetExists(entry.file, `prop ${key}`);
        assert.ok(entry.size > 0.3 && entry.size < 6, `${key}: size ${entry.size}`);
        assert.ok(['ground', 'top', 'center'].includes(entry.anchor), key);
    }
});

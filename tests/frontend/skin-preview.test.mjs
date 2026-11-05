// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/skin-preview.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { availableMoves, nextMoveIndex, previewMode } from '../../web/public/script/helpers/skin-preview.js';
import { getImage } from '../../web/public/script/helpers/sprite-catalog.js';

/** The creator's animation button order. */
const MOVES = ['walk', 'cast', 'thrust', 'slash', 'shoot'];
const preference = (renderer, enabled = true) => ({ ENABLED: enabled, CLASSIC: 'classic', THREE: 'three', get: () => renderer });
const worn = (...ids) => ids.map(id => getImage(id));

test('the creator shows the 3D gladiator only for the enabled 3D battle renderer', () => {
    assert.equal(previewMode(preference('three')), 'three');
    assert.equal(previewMode(preference('classic')), 'sprite');
    // the server turned render2 off: whatever the stored choice, the sprite
    assert.equal(previewMode(preference('three', false)), 'sprite');
    // a page without the preference script
    assert.equal(previewMode(undefined), 'sprite');
    assert.equal(previewMode({ ENABLED: true }), 'sprite');
});

test('walking and casting are always there; the rest come with the weapon that does them', () => {
    assert.deepEqual([...availableMoves(worn('male', 'male-light'))].sort(), ['cast', 'walk']);
    assert.deepEqual([...availableMoves(worn('male', 'male-light', 'male_spear'))].sort(), ['cast', 'thrust', 'walk']);
    assert.deepEqual([...availableMoves(worn('female', 'female-light', 'female_oversize_17', 'bow'))].sort(), ['cast', 'shoot', 'slash', 'walk']);
});

test('the animation button skips what the outfit cannot play and wraps around', () => {
    const spear = availableMoves(worn('male', 'male-light', 'male_spear'));
    assert.equal(nextMoveIndex(0, MOVES, spear), 1);
    assert.equal(nextMoveIndex(1, MOVES, spear), 2);
    assert.equal(nextMoveIndex(2, MOVES, spear), 0);
    const archer = availableMoves(worn('male', 'male-light', 'bow'));
    assert.equal(nextMoveIndex(1, MOVES, archer), 4);
    assert.equal(nextMoveIndex(4, MOVES, archer), 0);
    // nothing else to play: the button stays where it is
    assert.equal(nextMoveIndex(0, MOVES, new Set(['walk'])), 0);
});

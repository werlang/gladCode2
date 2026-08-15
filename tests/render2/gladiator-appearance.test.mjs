import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getGladiatorAppearance,
    getPotionEffect,
} from '../../public_html/script/render2/gladiator-appearance.js';

test('derives recognizable low-poly materials and equipment from a persisted skin', () => {
    const appearance = getGladiatorAppearance({
        name: 'Aurelia',
        user: 'Equipe Solar',
        skin: JSON.stringify([
            'female',
            'female-darkelf2',
            'female_gold-helmet',
            'female_gold-chest',
            'female_oversize_longsword',
            'cape_red',
            'long_raven',
        ]),
    });

    assert.equal(appearance.gender, 'female');
    assert.equal(appearance.skinColor, '#aeb3ca');
    assert.equal(appearance.armor, 'gold');
    assert.equal(appearance.weapon, 'sword');
    assert.equal(appearance.hasHelmet, true);
    assert.equal(appearance.hasCape, true);
    assert.equal(appearance.hairColor, '#242126');
});

test('uses stable identity colors and safe defaults for incomplete skins', () => {
    const first = getGladiatorAppearance({ name: 'Sem Skin', user: 'Equipe A', skin: 'invalid-json' });
    const second = getGladiatorAppearance({ name: 'Sem Skin', user: 'Equipe A', skin: null });

    assert.equal(first.accentColor, second.accentColor);
    assert.equal(first.gender, 'male');
    assert.equal(first.weapon, 'sword');
    assert.equal(first.armor, 'cloth');
});

test('maps potion command suffixes to renderer effects', () => {
    assert.equal(getPotionEffect('useItem("pot-hp-5")'), 'heal');
    assert.equal(getPotionEffect('useItem("pot-ap-5")'), 'mana');
    assert.equal(getPotionEffect('useItem("pot-high-3")'), 'tonic');
    assert.equal(getPotionEffect('useItem("pot-low-3")'), 'tonic');
    assert.equal(getPotionEffect('useItem("pot-xp-3")'), 'elixir');
    assert.equal(getPotionEffect(''), null);
});

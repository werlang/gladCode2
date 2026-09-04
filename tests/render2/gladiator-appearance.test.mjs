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

test('ignores LPC empty-slot tokens when classifying weapons (real rosters)', () => {
    // Regression: `ranged_none` marked an EMPTY ranged slot, but the old
    // substring match turned every such fighter into an archer.
    const cases = [
        // [name, skin, expected weapon]
        ['DEV SrBlue', ['male', 'male_metal-gauntlet', 'shield_none', 'ranged_none', 'male_longsleeve_blue'], 'sword'],
        ['Kaiser', ['male', 'ranged_none', 'male_warhammer', 'male_shield_9', 'male_plate-chest'], 'sword'],
        ['Arcaness', ['female', 'female_oversize_rapier', 'arcoreal', 'arrows', 'female_plate-chest'], 'bow'],
        ['O Mestre dos Magos', ['melee_none', 'ranged_none', 'shield_none', 'male', 'male_cloth-hood', 'male_longsleeve_red'], 'staff'],
        ['Malenia', ['female', 'recurvebow', 'female_wizard-hat', 'female_oversize_longsword', 'arrows'], 'bow'],
        ['Lanceiro', ['male', 'oversize_spear', 'shield_none', 'ranged_none'], 'spear'],
        ['Caçadora', ['female', 'crossbow', 'melee_none'], 'bow'],
    ];

    cases.forEach(([name, tokens, expected]) => {
        const appearance = getGladiatorAppearance({ name, user: 'Probe', skin: JSON.stringify(tokens) });
        assert.equal(appearance.weapon, expected, `${name} should be ${expected}`);
    });
});

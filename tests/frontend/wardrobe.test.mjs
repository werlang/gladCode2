// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wardrobe.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { images } from '../../web/public/script/helpers/sprite-catalog.js';
import { colorFor, labelFor } from '../../web/public/script/helpers/wardrobe.js';

/** Every catalogue layer that belongs to a menu (the ones the creator lists). */
const wardrobe = images.filter(image => image.parent);

test('every wardrobe layer has a non-empty pt-BR label', () => {
    for (const image of wardrobe) {
        const label = labelFor(image.id);
        assert.equal(typeof label, 'string', image.id);
        assert.ok(label.trim().length > 0, image.id);
    }
});

test('empty slots are labelled "Nenhum"', () => {
    const empty = [
        'hair_none', 'facial_none', 'shirt_none', 'armor_none', 'legs_none', 'head_none', 'hands_none',
        'shoulder_none', 'feet_none', 'melee_none', 'ranged_none', 'shield_none', 'belt_none', 'cape_none',
    ];
    for (const id of empty) assert.equal(labelFor(id), 'Nenhum', id);
});

test('labels name the piece and its colour in Portuguese', () => {
    assert.equal(labelFor('bangs_blonde'), 'Franja · Loiro');
    assert.equal(labelFor('fiveoclock_black'), 'Barba de 5 Horas · Preto');
    assert.equal(labelFor('eyes_blue'), 'Olhos · Azuis');
    assert.equal(labelFor('default_ears'), 'Padrão');
    assert.equal(labelFor('male_plate-chest'), 'Peitoral de Placas');
    assert.equal(labelFor('male_longsleeve_black'), 'Manga Longa · Preto');
    assert.equal(labelFor('male_shoes_black'), 'Sapatos · Preto');
    assert.equal(labelFor('male_oversize_longsword'), 'Espadão');
    assert.equal(labelFor('female_oversize_17'), 'Lâmina 17');
    assert.equal(labelFor('male_shield_3'), 'Escudo 3');
    assert.equal(labelFor('cape_red_behind'), 'Capa · Vermelho (costas)');
});

test('every colour chip is a CSS colour or empty', () => {
    for (const image of wardrobe) {
        const colour = colorFor(image.id);
        assert.ok(colour === null || /^#[0-9a-f]{6}$/.test(colour), `${image.id}: ${colour}`);
    }
});

test('the colour chip prefers the sampled colour and falls back to the id', () => {
    assert.equal(colorFor('bangs_blonde', new Map([['bangs_blonde', 0x112233]])), '#112233');
    assert.equal(colorFor('bangs_blonde', new Map([['bangs_blonde', '#abcdef']])), '#abcdef');
    assert.equal(colorFor('bangs_blonde'), '#d8b45a');
    assert.equal(colorFor('male-dark'), '#8a5a3c');
    assert.equal(colorFor('male-red_orc'), '#9d5f4d');
    assert.equal(colorFor('male_gold-chest'), '#d4a83a');
    assert.equal(colorFor('female_pirate_blue'), '#3a70d8');
    assert.equal(colorFor('hair_none'), null);
    assert.equal(colorFor('not-a-layer'), null);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { getAppearance } from '../../public_html/script/render2/palette.js';
import {
    FACIAL_STYLES, HAIR_STYLES, PROPS, SHIELD_MODELS, WEAPON_MODELS, bowModel, meleeModel, shieldModel, syntyOutfit,
} from '../../public_html/script/render2/synty-outfit.js';

const outfitOf = (tokens) => syntyOutfit(getAppearance(JSON.stringify(tokens), 0, new Map(), []));
const names = (outfit) => outfit.parts.map((part) => part.name);

test('every LPC hair and facial style maps to a hero mesh or a known prop', () => {
    const styles = ['bangs', 'bangslong', 'bangslong2', 'bangsshort', 'bedhead', 'bunches', 'jewfro', 'long', 'longhawk', 'longknot',
        'loose', 'messy1', 'messy2', 'mohawk', 'page', 'page2', 'parted', 'pixie', 'plain', 'ponytail', 'ponytail2', 'princess',
        'shorthawk', 'shortknot', 'shoulderl', 'shoulderr', 'swoop', 'unkempt', 'xlong', 'xlongknot'];
    for (const style of styles) {
        const mesh = HAIR_STYLES[style];
        assert.ok(mesh !== undefined, style);
        if (typeof mesh === 'number') assert.ok(mesh >= 1 && mesh <= 38, style);
        else assert.ok(PROPS[mesh.replace(/^prop:/, '')], style);
    }
    for (const kind of ['beard', 'bigstache', 'frenchstache', 'mustache', 'fiveoclock']) assert.ok(FACIAL_STYLES[kind] >= 1 && FACIAL_STYLES[kind] <= 18);
});

test('a bare gladiator wears the base hero parts on both sides', () => {
    const outfit = outfitOf(['male', 'male-light']);
    assert.equal(outfit.body, 'hero');
    for (const part of ['Chr_Torso_Male_00', 'Chr_Hips_Male_00', 'Chr_LegRight_Male_00', 'Chr_LegLeft_Male_00', 'Chr_Head_Male_01']) {
        assert.ok(names(outfit).includes(part), part);
    }
});

test('shirts and pants keep their sampled colour on the cloth swatches', () => {
    const look = getAppearance(JSON.stringify(['male', 'male-light', 'male_longsleeve_red', 'male_pants_blue', 'male_shoes_black']), 0, new Map(), []);
    const outfit = syntyOutfit(look);
    const torso = outfit.parts.find((part) => part.name === 'Chr_Torso_Male_18');
    assert.equal(torso.colors.MS, look.shirt);
    assert.ok(names(outfit).includes('Chr_ArmUpperRight_Male_20'));
    const hips = outfit.parts.find((part) => part.name === 'Chr_Hips_Male_14');
    assert.equal(hips.colors.MD, look.pants);
    assert.ok(names(outfit).includes('Chr_LegLeft_Male_11'));
});

test('armour, helmets and capes pick their matching pieces', () => {
    const outfit = outfitOf(['male', 'male-light', 'male_gold-chest', 'male_gold-legs', 'male_gold-helmet', 'male_metal-shoulder', 'tattercape_red', 'beard_black']);
    const list = names(outfit);
    assert.ok(list.includes('Chr_Torso_Male_24'));
    assert.ok(list.includes('Chr_Hips_Male_15'));
    assert.ok(list.includes('Chr_HeadCoverings_No_Hair_04'));
    assert.ok(list.includes('Chr_ShoulderAttachLeft_19'));
    // A tattered cape is the ragged cape, not one of the packs (14, 15).
    assert.ok(list.includes('Chr_BackAttachment_02'));
    // A closed helmet hides hair and beard.
    assert.ok(!list.some((name) => /FacialHair|Chr_Hair_/.test(name)));
    assert.ok(outfit.parts.find((part) => part.name === 'Chr_Torso_Male_24').colors.MP);
});

test('hats keep the hair, bandanas become a head prop', () => {
    const cap = outfitOf(['male', 'male-light', 'male_cap', 'plain_black']);
    assert.ok(names(cap).includes('Chr_HeadCoverings_Base_Hair_10'));
    assert.ok(names(cap).includes('Chr_Hair_04'));
    const bandana = outfitOf(['female', 'female-light', 'female_bandana_blue', 'jewfro_black']);
    assert.deepEqual(bandana.props.map((prop) => prop.id).sort(), ['afro', 'bandana']);
});

test('skeletons use the full skeleton body and skip skin parts', () => {
    const outfit = outfitOf(['male', 'skeleton', 'male_plate-chest']);
    assert.equal(outfit.body, 'skeleton');
    assert.ok(names(outfit).includes('Chr_Torso_Male_24'));
    assert.ok(!names(outfit).some((name) => /_00$|Chr_Head_/.test(name)));
});

test('weapon tokens map to catalogued models', () => {
    assert.equal(meleeModel('male_sword'), 'sword');
    assert.equal(meleeModel('female_dagger'), 'dagger');
    assert.equal(meleeModel('oversize_trident'), 'trident');
    assert.equal(meleeModel('male_oversize_mace'), 'mace');
    assert.equal(meleeModel('male_oversize_6'), 'lightBlue');
    assert.equal(meleeModel('male_oversize_8'), 'goldDagger');
    assert.equal(meleeModel('male_oversize_19'), 'steelGreat');
    assert.equal(meleeModel('female_oversize_25'), 'silverShort');
    assert.equal(meleeModel(''), 'sword');
    for (let n = 1; n <= 27; n += 1) assert.ok(WEAPON_MODELS[meleeModel(`male_oversize_${n}`)], String(n));
    assert.equal(bowModel('greatbow'), 'greatbow');
    assert.equal(bowModel('recurvebow'), 'recurve');
    assert.equal(bowModel('arcoreal'), 'royal');
    assert.equal(bowModel('bow'), 'bow');
    for (const n of [1, 3, 4, 5, 6, 7, 8, 9, 10]) assert.ok(SHIELD_MODELS[shieldModel(`male_shield_${n}`)], String(n));
    assert.equal(shieldModel('shield_none'), null);
});

test('weapon-pack blades keep a motion family that matches their size', () => {
    const family = (token) => getAppearance(JSON.stringify(['male', token]), 0, new Map(), []).weapon;
    assert.equal(family('male_oversize_12'), 'dagger');
    assert.equal(family('male_oversize_15'), 'longsword');
    assert.equal(family('male_oversize_7'), 'lightblade');
    assert.equal(family('male_oversize_17'), 'sword');
});

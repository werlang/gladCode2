import assert from 'node:assert/strict';
import test from 'node:test';

import { getSyntyHeroConfig } from '../../public_html/script/render2/synty-hero-config.js';

test('builds a deterministic, gender-matched modular hero', () => {
    const gladiator = { name: 'Aurelia', user: 'Equipe Solar' };
    const appearance = {
        armor: 'gold',
        gender: 'female',
        hasCape: true,
        hasHelmet: false,
        weapon: 'sword',
    };

    const first = getSyntyHeroConfig(gladiator, appearance);
    const second = getSyntyHeroConfig(gladiator, appearance);

    assert.deepEqual(first, second);
    assert.ok(first.meshes.some((name) => /^Chr_Head_Female_\d{2}$/.test(name)));
    assert.ok(first.meshes.includes('Chr_Torso_Female_15'));
    assert.ok(first.meshes.includes('Chr_ArmUpperLeft_Female_15'));
    assert.ok(first.meshes.includes('Chr_ArmUpperRight_Female_15'));
    assert.ok(first.meshes.some((name) => /^Chr_Hair_\d{2}$/.test(name)));
    assert.ok(first.meshes.some((name) => /^Chr_BackAttachment_\d{2}$/.test(name)));
    assert.equal(first.meshes.some((name) => name.startsWith('Chr_HeadCoverings_No_Hair_')), false);
    assert.equal(first.weaponAsset, 'SK_Wep_Sword_01.fbx');
});

test('uses helmet meshes instead of hair and maps every supported pack weapon', () => {
    const base = {
        armor: 'metal',
        gender: 'male',
        hasCape: false,
        hasHelmet: true,
    };

    const sword = getSyntyHeroConfig({ name: 'S', user: 'T' }, { ...base, weapon: 'sword' });
    const spear = getSyntyHeroConfig({ name: 'P', user: 'T' }, { ...base, weapon: 'spear' });
    const staff = getSyntyHeroConfig({ name: 'M', user: 'T' }, { ...base, weapon: 'staff' });
    const bow = getSyntyHeroConfig({ name: 'R', user: 'T' }, { ...base, weapon: 'bow' });

    assert.ok(sword.meshes.some((name) => /^Chr_HeadCoverings_No_Hair_\d{2}$/.test(name)));
    assert.equal(sword.meshes.some((name) => name.startsWith('Chr_Hair_')), false);
    assert.equal(spear.weaponAsset, 'SK_Wep_Joust_01.fbx');
    assert.equal(staff.weaponAsset, 'SK_Wep_Staff_01.fbx');
    assert.equal(bow.weaponAsset, null);
});

test('keeps selected part indexes inside the source pack ranges', () => {
    for (let index = 0; index < 80; index += 1) {
        const config = getSyntyHeroConfig(
            { name: `Gladiator ${index}`, user: `Team ${index % 7}` },
            {
                armor: ['cloth', 'leather', 'metal', 'gold'][index % 4],
                gender: index % 2 ? 'female' : 'male',
                hasCape: index % 3 === 0,
                hasHelmet: index % 4 === 0,
                weapon: ['sword', 'spear', 'staff', 'bow'][index % 4],
            },
        );

        assert.equal(new Set(config.meshes).size, config.meshes.length);
        assert.match(config.textureAsset, /^PolygonFantasyHero_Texture_(?:0[1-4](?:_[ABC])?)\.png$/);
        assert.equal(config.meshes.length >= 13, true);
    }
});

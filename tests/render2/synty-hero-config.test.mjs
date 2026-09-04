import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getSyntyHeroConfig,
    listWeaponAssetFiles,
    WEAPON_ASSET_REGISTRY,
} from '../../public_html/script/render2/synty-hero-config.js';

test('builds a deterministic, gender-matched modular hero', () => {
    const gladiator = { name: 'Aurelia', user: 'Equipe Solar' };
    const appearance = {
        armor: 'gold',
        families: { bow: false, spear: false, staff: false, magic: false, melee: true },
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
    assert.equal(first.arsenal.primary, 'melee');
    assert.match(first.arsenal.melee, /^(?:hero|dungeon|empire):\w+$/);
    assert.equal(first.arsenal.ranged, null);
    assert.equal(first.arsenal.staff, null);
    assert.ok(first.shieldAsset && WEAPON_ASSET_REGISTRY[first.shieldAsset], 'blade-primary fighters carry a shield');
});

test('hybrid skins own several weapons and swap by action', () => {
    const base = {
        armor: 'metal',
        gender: 'male',
        hasCape: false,
        hasHelmet: true,
        weapon: 'sword',
    };

    // Rapier + royal bow: blade while idle, bow while shooting.
    const hybrid = getSyntyHeroConfig(
        { name: 'Arcaness', user: 'Probe' },
        { ...base, families: { bow: true, spear: false, staff: false, magic: false, melee: true } },
    );
    assert.equal(hybrid.arsenal.primary, 'melee');
    assert.ok(hybrid.arsenal.melee && hybrid.arsenal.ranged, 'hybrid owns both weapons');
    assert.equal(hybrid.arsenal.staff, null);

    // Spear skins swing a polearm instead of a sword.
    const lancer = getSyntyHeroConfig(
        { name: 'Splinter', user: 'Probe' },
        { ...base, families: { bow: false, spear: true, staff: false, magic: false, melee: false } },
    );
    assert.equal(lancer.arsenal.primary, 'melee');
    assert.match(lancer.arsenal.melee, /^(?:hero:Joust|dungeon:Spear|dungeon:Ornate_Spear|empire:Spear)/, lancer.arsenal.melee);
    assert.equal(lancer.shieldAsset, null, 'polearm fighters carry no off-hand shield');

    // Robed casters idle with a staff and fight with empty hands.
    const caster = getSyntyHeroConfig(
        { name: 'Mestre', user: 'Probe' },
        { ...base, families: { bow: false, spear: false, staff: false, magic: true, melee: false } },
    );
    assert.equal(caster.arsenal.primary, 'staff');
    assert.ok(caster.arsenal.staff, 'caster owns a staff');
    assert.equal(caster.arsenal.ranged, null);
    assert.equal(caster.shieldAsset, null);

    // Pure archers idle with the bow.
    const archer = getSyntyHeroConfig(
        { name: 'Caçadora', user: 'Probe' },
        { ...base, families: { bow: true, spear: false, staff: false, magic: false, melee: false } },
    );
    assert.equal(archer.arsenal.primary, 'ranged');
    assert.equal(archer.arsenal.ranged, 'bow:Bow_01');
    assert.equal(archer.shieldAsset, null);
});

test('keeps selected part indexes inside the source pack ranges', () => {
    for (let index = 0; index < 80; index += 1) {
        const families = [
            { bow: false, spear: false, staff: false, magic: false, melee: true },
            { bow: false, spear: true, staff: false, magic: false, melee: false },
            { bow: false, spear: false, staff: true, magic: false, melee: false },
            { bow: true, spear: false, staff: false, magic: false, melee: true },
        ][index % 4];
        const config = getSyntyHeroConfig(
            { name: `Gladiator ${index}`, user: `Team ${index % 7}` },
            {
                armor: ['cloth', 'leather', 'metal', 'gold'][index % 4],
                families,
                gender: index % 2 ? 'female' : 'male',
                hasCape: index % 3 === 0,
                hasHelmet: index % 4 === 0,
                weapon: ['sword', 'spear', 'staff', 'bow'][index % 4],
            },
        );

        assert.equal(new Set(config.meshes).size, config.meshes.length);
        assert.match(config.textureAsset, /^PolygonFantasyHero_Texture_(?:0[1-4](?:_[ABC])?)\.png$/);
        assert.equal(config.meshes.length >= 13, true);
        assert.ok(config.arsenal.melee, 'every fighter owns a melee weapon');
        if (families.bow) assert.ok(config.arsenal.ranged, 'archers own a bow');
        if (families.staff) assert.ok(config.arsenal.staff, 'casters own a staff');
        if (!families.melee && !families.spear) {
            assert.notEqual(config.arsenal.primary, 'melee', 'weaponless skins idle with bow or staff');
        }
    }
});

/**
 * Maps a legacy LPC skin (the sprite tokens picked in the editor, grouped by slot in `palette.js`) onto
 * the Synty sets, so a gladiator keeps its old look in 3D: modular hero parts (POLYGON Fantasy Hero) with
 * their atlas swatches recoloured to the sampled sprite colours, head props from Dungeon Realms and Viking
 * Realm, and a weapon, bow and shield model from the Dungeon, Dungeon Realms, Goblin War Camp and Viking
 * Realm packs. Pure data and functions: `synty-model.js` loads and skins what this module names.
 *
 * Hero atlas swatches (the flat blocks every clothing part samples, see `synty-model.js` `RECOLOR_SHADER`):
 * `P`/`S` primary/secondary cloth, `LP`/`LS` primary/secondary leather, `MP`/`MS`/`MD` light/mid/dark
 * metal and `X` the accent (plumes, feathers). Skin and hair are recoloured for every part.
 */

/** sRGB colours used when a slot carries no sampled colour. */
const GOLD = Object.freeze({ MP: 0xe0b347, MS: 0xb88a2c, MD: 0x7d5a1a });
const CHAIN = 0xa3a8ad;

/** Hair meshes per LPC hair style: hero `Chr_Hair_NN` numbers, or a `prop:` id from {@link PROPS}. */
export const HAIR_STYLES = Object.freeze({
    bangs: 9, bangslong: 21, bangslong2: 28, bangsshort: 14, bedhead: 37, bunches: 'prop:pigtails',
    jewfro: 'prop:afro', long: 35, longhawk: 'prop:mohawk', longknot: 19, loose: 24, messy1: 7, messy2: 13,
    mohawk: 17, page: 27, page2: 32, parted: 10, pixie: 11, plain: 4, ponytail: 2, ponytail2: 38,
    princess: 29, shorthawk: 15, shortknot: 1, shoulderl: 26, shoulderr: 34, swoop: 5, unkempt: 'prop:wild',
    xlong: 25, xlongknot: 30,
});

/** Hero `Chr_FacialHair_Male_NN` per LPC facial hair style. */
export const FACIAL_STYLES = Object.freeze({ beard: 1, bigstache: 11, frenchstache: 8, mustache: 16, fiveoclock: 5 });

/**
 * Static head props from the other packs, in the `Head` bone's frame (cm). `tint` says which look colour
 * paints the whole prop (`hair` or `head`); props without it keep their pack atlas.
 */
export const PROPS = Object.freeze({
    pigtails: { file: 'dungeon-realms/FBX/Characters/Attachments/SM_Chr_Attach_Dwarf_Hair_Pigtails_01.fbx', tint: 'hair' },
    afro: { file: 'dungeon-realms/FBX/Characters/Attachments/SM_Chr_Attach_Dwarf_Hair_Afro_01.fbx', tint: 'hair', scale: 0.9 },
    mohawk: { file: 'dungeon-realms/FBX/Characters/Attachments/SM_Chr_Attach_Dwarf_Hair_Mohawk_01.fbx', tint: 'hair' },
    wild: { file: 'dungeon-realms/FBX/Characters/Attachments/SM_Chr_Attach_Hair_Wild_01.fbx', tint: 'hair' },
    bandana: { file: 'dungeon-realms/FBX/Characters/Attachments/SM_Chr_Attach_Dwarf_Bandana_01.fbx', tint: 'head' },
});

/** Full-body characters that share the hero skeleton (same bone names and bind pose). */
export const BODIES = Object.freeze({
    skeleton: { file: 'dungeon-realms/FBX/Characters/Chr_Skeleton_01.fbx', atlas: 'dungeonRealms' },
});

/** Pack atlases, relative to the Synty asset root. */
export const ATLASES = Object.freeze({
    heroes: 'synty-modular-heroes/Textures/PolygonFantasyHero_Texture_01.png',
    dungeonRealms: 'dungeon-realms/Textures/Dungeons_2_Texture_01_A.png',
    dungeon: 'dungeon-pack/Textures/Dungeons_Texture_01.png',
    dungeonCyan: 'dungeon-pack/Textures/Dungeons_Texture_02.png',
    goblin: 'goblin-war-camp/Textures/Alts/PolygonGoblinWarCamp_Texture_01_A.png',
    viking: 'viking-realm/Textures/Alts/PolygonVikingRealm_Texture_01_A.png',
    vikingShield: 'viking-realm/Textures/Shield_Set_01.png',
    bow: 'bow-crossbow/Texture_01.png',
});

const DR = 'dungeon-realms/FBX/SM_Wep_';
const DP = 'dungeon-pack/FBX/SM_Wep_';
const GW = 'goblin-war-camp/FBX/Weapons/SM_Wep_';
const VR = 'viking-realm/FBX/SM_Wep_';

/**
 * Weapon models. `length` is the size in figure units, `grip` the fraction of that length (from the butt)
 * held in the palm, `axis` the FBX axis the blade points along (default `y`), `tint` multiplies the atlas,
 * `glow` makes the blade emissive. Rigged bows keep their skeleton so the string (`string` bone) can be drawn.
 */
export const WEAPON_MODELS = Object.freeze({
    sword: { file: `${VR}Sword_01.fbx`, atlas: 'viking', axis: 'z', length: 0.85, grip: 0.1 },
    dagger: { file: `${VR}Knife_02.fbx`, atlas: 'viking', axis: 'z', length: 0.42, grip: 0.28 },
    spear: { file: `${VR}Spear_02.fbx`, atlas: 'viking', length: 1.7, grip: 0.35 },
    longspear: { file: `${VR}Spear_02.fbx`, atlas: 'viking', length: 1.95, grip: 0.35 },
    dragonspear: { file: `${DP}Ornate_Spear_01.fbx`, atlas: 'dungeon', length: 1.95, grip: 0.35 },
    trident: { file: `${DP}Ornate_Spikes_Long_01.fbx`, atlas: 'dungeon', length: 1.8, grip: 0.3 },
    staff: { file: `${GW}Staff_01.fbx`, atlas: 'goblin', length: 1.4, grip: 0.45 },
    woodwand: { file: `${GW}Staff_02.fbx`, atlas: 'goblin', length: 0.62, grip: 0.3 },
    steelwand: { file: `${DR}Staff_02.fbx`, atlas: 'dungeonRealms', length: 0.62, grip: 0.3 },
    warhammer: { file: `${DP}Hammer_Large_Metal_01.fbx`, atlas: 'dungeon', length: 0.9, grip: 0.2 },
    mace: { file: `${DP}Hammer_Mace_Spikes_01.fbx`, atlas: 'dungeon', length: 0.7, grip: 0.15 },
    longsword: { file: `${DP}GreatSword_01.fbx`, atlas: 'dungeon', length: 1.15, grip: 0.14 },
    rapier: { file: `${DR}Sword_Small_05.fbx`, atlas: 'dungeonRealms', length: 0.95, grip: 0.14 },
    saber: { file: `${DP}Cutlass_01.fbx`, atlas: 'dungeon', length: 0.85, grip: 0.12 },
    darksword: { file: `${DR}Sword_Medium_08.fbx`, atlas: 'dungeonRealms', length: 0.8, grip: 0.16 },
    lightBlue: { file: `${DP}Crystal_Ornate_Straightsword_01.fbx`, atlas: 'dungeonCyan', length: 0.95, grip: 0.16, glow: 0x2aa8ff },
    lightRed: { file: `${DP}Crystal_Ornate_Straightsword_01.fbx`, atlas: 'dungeon', length: 0.95, grip: 0.16, glow: 0xff2a1a },
    // Weapon pack blades: four sizes (dagger, short, sword, great) in five materials.
    goldDagger: { file: `${DR}Knife_Medium_01.fbx`, atlas: 'dungeonRealms', length: 0.45, grip: 0.25 },
    goldShort: { file: `${DR}Sword_Medium_02.fbx`, atlas: 'dungeonRealms', length: 0.72, grip: 0.18 },
    goldSword: { file: `${DR}Sword_Large_02.fbx`, atlas: 'dungeonRealms', length: 0.9, grip: 0.14 },
    goldGreat: { file: `${DR}Sword_Large_04.fbx`, atlas: 'dungeonRealms', length: 1.12, grip: 0.13 },
    boneDagger: { file: `${DP}Goblin_Shiv_Bone_01.fbx`, atlas: 'dungeon', length: 0.45, grip: 0.25 },
    boneShort: { file: `${GW}Sword_01.fbx`, atlas: 'goblin', length: 0.72, grip: 0.18 },
    boneSword: { file: `${GW}Sword_02.fbx`, atlas: 'goblin', length: 0.9, grip: 0.16 },
    boneGreat: { file: `${DR}Sword_Large_07.fbx`, atlas: 'dungeonRealms', length: 1.12, grip: 0.13 },
    steelDagger: { file: `${VR}Knife_01.fbx`, atlas: 'viking', axis: 'z', length: 0.45, grip: 0.28 },
    steelShort: { file: `${VR}Sword_Short_01.fbx`, atlas: 'viking', axis: 'z', length: 0.72, grip: 0.14 },
    steelSword: { file: `${VR}Sword_03.fbx`, atlas: 'viking', axis: 'z', length: 0.9, grip: 0.1 },
    steelGreat: { file: `${DP}Greatsword_Straight_01.fbx`, atlas: 'dungeon', length: 1.15, grip: 0.14 },
    crystalDagger: { file: `${DP}Crystal_Ornate_Straightsword_01.fbx`, atlas: 'dungeonCyan', length: 0.45, grip: 0.2 },
    crystalShort: { file: `${DP}Crystal_Ornate_Straightsword_01.fbx`, atlas: 'dungeonCyan', length: 0.72, grip: 0.16 },
    crystalSword: { file: `${DP}Crystal_Ornate_Straightsword_01.fbx`, atlas: 'dungeonCyan', length: 0.92, grip: 0.16 },
    crystalGreat: { file: `${DP}Crystal_DoubleSword_01.fbx`, atlas: 'dungeonCyan', length: 1.12, grip: 0.14 },
    silverDagger: { file: `${DR}Knife_Small_02.fbx`, atlas: 'dungeonRealms', length: 0.45, grip: 0.25 },
    silverShort: { file: `${DR}Sword_Small_03.fbx`, atlas: 'dungeonRealms', length: 0.72, grip: 0.16 },
    silverSword: { file: `${DP}Straightsword_01.fbx`, atlas: 'dungeon', length: 0.9, grip: 0.12 },
    silverGreat: { file: `${DP}Greatsword_Round_01.fbx`, atlas: 'dungeon', length: 1.12, grip: 0.14 },
    // Bows: all three rigs share one frame (limbs along Y, string toward -Z).
    bow: { file: 'bow-crossbow/Rigged_Bow_Testing.fbx', atlas: 'bow', length: 0.9, grip: 0.5, rigged: true, string: 'bowString' },
    recurve: { file: 'bow-crossbow/Rigged_Bow_NativeAmerican_Testing.fbx', atlas: 'bow', length: 0.9, grip: 0.5, rigged: true, string: 'bowString' },
    greatbow: { file: `${VR}Bow_Rigged_01.fbx`, atlas: 'viking', length: 1.1, grip: 0.5, rigged: true, string: 'Wep_Bow_01' },
    royal: { file: 'bow-crossbow/Rigged_Bow_Testing.fbx', atlas: 'bow', length: 0.95, grip: 0.5, rigged: true, string: 'bowString', tint: 0x6a6470 },
});

/** Shield models, face along FBX +Z. `size` is the diameter in figure units. */
export const SHIELD_MODELS = Object.freeze({
    heater: { file: `${DP}Shield_Heater_02.fbx`, atlas: 'dungeon', size: 0.62 },
    goldBoss: { file: `${DR}Shield_01.fbx`, atlas: 'dungeonRealms', size: 0.6 },
    gold: { file: `${DR}Shield_03.fbx`, atlas: 'dungeonRealms', size: 0.6 },
    whiteBoss: { file: `${VR}Shield_Set_07.fbx`, atlas: 'vikingShield', size: 0.6 },
    darkWood: { file: `${VR}Shield_Set_74.fbx`, atlas: 'vikingShield', size: 0.6 },
    wood: { file: `${VR}Shield_Set_73.fbx`, atlas: 'vikingShield', size: 0.6 },
});

/** LPC shield pack number to model. */
const SHIELDS = Object.freeze({ 1: 'heater', 3: 'goldBoss', 4: 'gold', 5: 'whiteBoss', 6: 'whiteBoss', 7: 'goldBoss', 8: 'gold', 9: 'darkWood', 10: 'wood' });

/** Weapon pack (`oversize_N`) materials, four blade sizes each starting at N. */
const BLADE_SETS = Object.freeze([[8, 'gold'], [12, 'bone'], [16, 'steel'], [20, 'crystal'], [24, 'silver']]);
const BLADE_SIZES = Object.freeze(['Dagger', 'Short', 'Sword', 'Great']);

/**
 * Picks the weapon model for a melee token.
 *
 * @param {string} token Melee skin token (`male_sword`, `female_oversize_17`, `oversize_trident`...).
 * @returns {string} Key of {@link WEAPON_MODELS}.
 */
export function meleeModel(token = '') {
    const id = String(token).replace(/^(fe)?male_/, '');
    const pack = /^oversize_(\d+)$/.exec(id);
    if (pack) {
        const n = Number(pack[1]);
        if (n === 1) return 'darksword';
        if (n === 6) return 'lightBlue';
        if (n === 7) return 'lightRed';
        const set = BLADE_SETS.find(([start]) => n >= start && n < start + 4);
        return set ? `${set[1]}${BLADE_SIZES[n - set[0]]}` : 'sword';
    }
    const named = {
        oversize_spear: 'longspear', oversize_dragonspear: 'dragonspear', oversize_trident: 'trident',
        oversize_mace: 'mace', oversize_longsword: 'longsword', oversize_rapier: 'rapier', oversize_saber: 'saber',
    }[id];
    if (named) return named;
    return WEAPON_MODELS[id] && !WEAPON_MODELS[id].rigged ? id : 'sword';
}

/** @returns {string} Bow model key for a ranged token. */
export function bowModel(token = '') {
    if (/greatbow/.test(token)) return 'greatbow';
    if (/recurve/.test(token)) return 'recurve';
    if (/arcoreal/.test(token)) return 'royal';
    return 'bow';
}

/** @returns {string|null} Shield model key for a shield token (`male_shield_5`), or null. */
export function shieldModel(token = '') {
    const n = /shield_(\d+)$/.exec(String(token))?.[1];
    return n ? (SHIELDS[n] ?? 'wood') : null;
}

/** @returns {number} `hex` with every channel scaled by `factor` (clamped). */
export function shade(hex, factor) {
    const channel = (shift) => Math.max(0, Math.min(255, Math.round(((hex >> shift) & 255) * factor)));
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Cloth recolour: the swatches of a part painted with one colour and its shades. */
const cloth = (color, keys) => Object.fromEntries(Object.entries(keys).map(([key, factor]) => [key, shade(color, factor)]));

/**
 * Builds the Synty outfit of a gladiator.
 *
 * @param {Record<string, any>} look Appearance from `palette.getAppearance` (colours plus `tokens`, the slot tokens).
 * @returns {{
 *   body: 'hero'|'skeleton',
 *   parts: Array<{ name: string, colors: Record<string, number> }>,
 *   props: Array<{ id: string, color: number|null }>,
 *   skin: number, hair: number,
 *   weapon: string, bow: string, shield: string|null,
 * }} Outfit: hero part names (without gender suffix resolution failures, see `resolvePart`), recolours, props and gear.
 */
export function syntyOutfit(look) {
    const tokens = look.tokens ?? {};
    const id = (slot) => String(tokens[slot] ?? '').replace(/^(fe)?male_/, '');
    const g = look.female ? 'Female' : 'Male';
    const pad = (n) => String(n).padStart(2, '0');
    const parts = [];
    const props = [];
    const add = (family, n, colors = {}, sided = false) => {
        if (sided) {
            parts.push({ name: `Chr_${family}Right_${g}_${pad(n)}`, colors });
            parts.push({ name: `Chr_${family}Left_${g}_${pad(n)}`, colors });
        }
        else parts.push({ name: `Chr_${family}_${g}_${pad(n)}`, colors });
    };
    const addShared = (family, n, colors = {}) => parts.push({ name: `Chr_${family}_${pad(n)}`, colors });
    const skeleton = look.skeleton === true;

    // ---------------------------------------------------------------- upper body
    const armor = id('armor').replace(/-chest$/, '');
    const shirt = id('shirt');
    const shirtColor = look.shirt ?? look.tunic ?? 0x8a6a4a;
    const sleeves = /^longsleeve/.test(shirt);
    const dress = /dress/.test(shirt);
    const metal = (kind) => (kind === 'gold' ? GOLD : {});

    if (armor === 'chain') add('Torso', 17, { MS: CHAIN, MP: shade(CHAIN, 1.12) });
    else if (armor === 'leather') add('Torso', 13);
    else if (armor === 'plate' || armor === 'gold') add('Torso', 24, metal(armor));
    else if (/^(longsleeve|sleeveless|pirate)/.test(shirt)) add('Torso', 18, cloth(shirtColor, { MS: 1, MP: 1.15, MD: 0.6 }));
    else if (/^corset/.test(shirt)) add('Torso', 28, cloth(shirtColor, { LP: 1 }));
    else if (shirt === 'bikini') add('Torso', 0, cloth(shirtColor, { LS: 1 }));
    else if (dress) add('Torso', 8, { ...cloth(shirtColor, { P: 1, MD: 0.7, LS: 0.55 }), ...(shirt === 'dress_sash' ? {} : cloth(shirtColor, { S: 0.85 })) });
    else if (!skeleton) add('Torso', 0);

    const gauntlet = id('hands').replace(/-gauntlet$/, '');
    if (sleeves) {
        add('ArmUpper', 20, cloth(shirtColor, { P: 1, S: 0.65 }), true);
        if (!gauntlet) add('ArmLower', 18, cloth(shirtColor, { P: 1, S: 0.65 }), true);
    }
    else if (armor === 'chain') add('ArmUpper', 18, {}, true);
    else if (!skeleton) add('ArmUpper', 0, {}, true);
    if (gauntlet) {
        add('ArmLower', 16, metal(gauntlet), true);
        add('Hand', 6, metal(gauntlet), true);
    }
    else {
        if (!sleeves && !skeleton) add('ArmLower', 0, {}, true);
        if (!skeleton) add('Hand', 0, {}, true);
    }

    const shoulder = id('shoulder').replace(/-shoulder$/, '');
    if (shoulder) {
        const n = shoulder === 'leather' ? 15 : 19;
        parts.push({ name: `Chr_ShoulderAttachRight_${pad(n)}`, colors: metal(shoulder) });
        parts.push({ name: `Chr_ShoulderAttachLeft_${pad(n)}`, colors: metal(shoulder) });
    }

    // ---------------------------------------------------------------- lower body
    const legs = id('legs');
    const feet = id('feet');
    const pantsColor = look.pants ?? 0x4a4f5a;
    const plateLegs = /-legs$/.test(legs) ? legs.replace(/-legs$/, '') : null;
    const boots = /-feet$/.test(feet) ? feet.replace(/-feet$/, '') : null;
    const shoes = /^shoes_/.test(feet) ? (look.boots ?? 0x4a3626) : null;
    const pants = /^pants_/.test(legs);

    if (plateLegs) add('Hips', 15, metal(plateLegs));
    else if (pants) add('Hips', 14, cloth(pantsColor, { MD: 1 }));
    else if (legs === 'robe-skirt') add('Hips', 8, cloth(look.skirt ?? pantsColor, { P: 1, MD: 0.7, S: 0.85 }));
    else if (dress) add('Hips', 8, cloth(shirtColor, { P: 1, MD: 0.7, S: 0.85 }));
    else if (!skeleton) add('Hips', 0);

    if (boots || plateLegs) add('Leg', 14, metal(boots ?? plateLegs), true);
    else if (pants) add('Leg', 11, { MD: pantsColor, ...(shoes ? cloth(shoes, { LS: 1, LP: 0.75 }) : {}) }, true);
    else if (shoes) add('Leg', 4, cloth(shoes, { LP: 1, LS: 1.15 }), true);
    else if (!skeleton) add('Leg', 0, {}, true);

    const cape = /^(tatter)?cape_/.exec(tokens.cape ?? '');
    if (cape) addShared('BackAttachment', cape[1] ? 14 : 13, cloth(look.cape ?? 0xc23a34, { P: 1, MD: 0.55 }));

    // ---------------------------------------------------------------- head
    const head = id('head');
    const headColor = look.helmet ?? 0x7a5232;
    let hairVisible = true;
    let beardVisible = true;
    if (head === 'cap') addShared('HeadCoverings_Base_Hair', 10, { ...cloth(headColor, { LP: 1, LS: 1.2 }), X: 0xc23a34 });
    else if (head === 'wizard-hat') addShared('HeadCoverings_Base_Hair', 2, cloth(headColor, { MD: 1, LP: 0.7 }));
    else if (head === 'cloth-hood') addShared('HeadCoverings_No_Hair', 6, cloth(headColor, { LS: 1 }));
    else if (head === 'chain-hood') addShared('HeadCoverings_No_Hair', 12);
    else if (head === 'chain-hat') addShared('HeadCoverings_No_Hair', 2);
    else if (head === 'metal-helmet') addShared('HeadCoverings_No_Hair', 11);
    else if (head === 'gold-helmet') addShared('HeadCoverings_No_Hair', 4, GOLD);
    else if (/^bandana/.test(head)) props.push({ id: 'bandana', color: headColor });
    if (/(hood|hat|helmet)$/.test(head) && !/^(cap|wizard-hat)$/.test(head)) hairVisible = false;
    if (/helmet$/.test(head)) beardVisible = false;

    if (!skeleton) {
        add('Head', 1);
        add('Eyebrow', 1);
        if (/^(big|elven)ears/.test(tokens.ears ?? '') || /orc/.test(look.shape ?? '')) {
            addShared('Ear_Ear', /^elvenears/.test(tokens.ears ?? '') ? 2 : 1);
        }
        const style = look.hairStyle && HAIR_STYLES[look.hairStyle];
        if (style && hairVisible) {
            if (typeof style === 'number') addShared('Hair', style);
            else props.push({ id: style.slice(5), color: look.hair });
        }
        const facial = look.facial && FACIAL_STYLES[look.facial.kind];
        if (facial && beardVisible && !look.female) parts.push({ name: `Chr_FacialHair_Male_${pad(facial)}`, colors: look.facial.color ? { hair: look.facial.color } : {} });
    }

    const meleeToken = tokens.melee ?? '';
    return {
        body: skeleton ? 'skeleton' : 'hero',
        parts,
        props,
        skin: look.skin,
        hair: look.hair,
        weapon: meleeModel(meleeToken),
        bow: bowModel(tokens.ranged ?? ''),
        shield: shieldModel(tokens.shield ?? ''),
    };
}

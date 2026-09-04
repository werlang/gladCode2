const ARMOR_VARIANTS = Object.freeze({
    cloth: 0,
    leather: 5,
    metal: 10,
    gold: 15,
});

const TEXTURE_ASSETS = Object.freeze([
    'PolygonFantasyHero_Texture_01.png',
    'PolygonFantasyHero_Texture_01_A.png',
    'PolygonFantasyHero_Texture_01_B.png',
    'PolygonFantasyHero_Texture_01_C.png',
    'PolygonFantasyHero_Texture_02_A.png',
    'PolygonFantasyHero_Texture_02_B.png',
    'PolygonFantasyHero_Texture_02_C.png',
    'PolygonFantasyHero_Texture_03_A.png',
    'PolygonFantasyHero_Texture_03_B.png',
    'PolygonFantasyHero_Texture_03_C.png',
    'PolygonFantasyHero_Texture_04_A.png',
    'PolygonFantasyHero_Texture_04_B.png',
    'PolygonFantasyHero_Texture_04_C.png',
]);

/**
 * Every rigid equipment FBX available to fighters.
 *
 * `pack` selects which atlas material shades the mesh: `hero` shares the
 * fighter's body palette, while the newer packs own their dedicated atlases.
 * `length` is the normalized world size of the longest axis after mounting,
 * matching the visual scale already established by the hero-pack weapons.
 */
export const WEAPON_ASSET_REGISTRY = Object.freeze({
    // Fantasy Hero pack weapons share the character texture atlas.
    'hero:Sword_01': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Sword_01.fbx', pack: 'hero', length: 1.05 },
    'hero:Sword_Small_01': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Sword_Small_01.fbx', pack: 'hero', length: 0.72 },
    'hero:Sword_Large_01': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Sword_Large_01.fbx', pack: 'hero', length: 1.3 },
    'hero:Joust_01': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Joust_01.fbx', pack: 'hero', length: 1.55 },
    'hero:Joust_02': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Joust_02.fbx', pack: 'hero', length: 1.55 },
    'hero:Joust_03': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Joust_03.fbx', pack: 'hero', length: 1.55 },
    'hero:Staff_01': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Staff_01.fbx', pack: 'hero', length: 1.42 },
    'hero:Staff_02': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Staff_02.fbx', pack: 'hero', length: 1.42 },
    'hero:Shield_01': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Shield_01.fbx', pack: 'hero', length: 0.62 },
    'hero:Shield_05': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Shield_05.fbx', pack: 'hero', length: 0.62 },
    'hero:Shield_12': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Shield_12.fbx', pack: 'hero', length: 0.62 },
    'hero:Shield_Buckler_01': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Shield_Buckler_01.fbx', pack: 'hero', length: 0.5 },
    'hero:Shield_Long_01': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Shield_Long_01.fbx', pack: 'hero', length: 0.78 },
    'hero:Shield_Long_07': { file: 'assets/synty-modular-heroes/FBX/Weapons/SK_Wep_Shield_Long_07.fbx', pack: 'hero', length: 0.78 },

    // POLYGON Bow & Crossbow drop: the ranged silhouette.
    'bow:Bow_01': { file: 'assets/bow-crossbow/Rigged_Bow_Testing.fbx', pack: 'bow', length: 0.95 },

    // POLYGON Dungeon pack swords, spears and staves.
    'dungeon:Straightsword_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Straightsword_01.fbx', pack: 'dungeon', length: 1.05 },
    'dungeon:GreatSword_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_GreatSword_01.fbx', pack: 'dungeon', length: 1.32 },
    'dungeon:Greatsword_Straight_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Greatsword_Straight_01.fbx', pack: 'dungeon', length: 1.32 },
    'dungeon:Cutlass_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Cutlass_01.fbx', pack: 'dungeon', length: 1.0 },
    'dungeon:Ornate_Sword_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Ornate_Sword_01.fbx', pack: 'dungeon', length: 1.28 },
    'dungeon:Spear_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Spear_01.fbx', pack: 'dungeon', length: 1.7 },
    'dungeon:Spear_02': { file: 'assets/dungeon-pack/FBX/SM_Wep_Spear_02.fbx', pack: 'dungeon', length: 1.66 },
    'dungeon:Ornate_Spear_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Ornate_Spear_01.fbx', pack: 'dungeon', length: 1.74 },
    'dungeon:Staff_Gem_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Staff_Gem_01.fbx', pack: 'dungeon', length: 1.46 },
    'dungeon:Staff_DoubleBlade_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Staff_DoubleBlade_01.fbx', pack: 'dungeon', length: 1.5 },
    'dungeon:Shield_Heater_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Shield_Heater_01.fbx', pack: 'dungeon', length: 0.62 },
    'dungeon:Shield_Round_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Shield_Round_01.fbx', pack: 'dungeon', length: 0.6 },
    'dungeon:Shield_Ornate_01': { file: 'assets/dungeon-pack/FBX/SM_Wep_Shield_Ornate_01.fbx', pack: 'dungeon', length: 0.74 },

    // Ancient Empire weapons shade gladiators who favor classical arms.
    'empire:Sword_01': { file: 'assets/ancient-empire/FBX/Weapons/SM_Wep_Sword_01.fbx', pack: 'empire', length: 1.0 },
    'empire:Spear_01': { file: 'assets/ancient-empire/FBX/Weapons/SM_Wep_Spear_01.fbx', pack: 'empire', length: 1.7 },
    'empire:Shield_01': { file: 'assets/ancient-empire/FBX/Weapons/SM_Wep_Shield_01.fbx', pack: 'empire', length: 0.62 },
});

/** Rigid bow model for fighters whose skin carries a ranged weapon. */
const BOW_POOL = Object.freeze(['bow:Bow_01']);

/** Blade family for melee swings; variety stays within the sword family. */
const SWORD_POOL = Object.freeze([
    'hero:Sword_01',
    'hero:Sword_Small_01',
    'hero:Sword_Large_01',
    'dungeon:Straightsword_01',
    'dungeon:GreatSword_01',
    'dungeon:Greatsword_Straight_01',
    'dungeon:Cutlass_01',
    'dungeon:Ornate_Sword_01',
    'empire:Sword_01',
]);

/** Polearm family for skins that explicitly carry a spear. */
const SPEAR_POOL = Object.freeze([
    'hero:Joust_01',
    'hero:Joust_02',
    'hero:Joust_03',
    'dungeon:Spear_01',
    'dungeon:Spear_02',
    'dungeon:Ornate_Spear_01',
    'empire:Spear_01',
]);

/** Casting family for staff/magic skins. */
const STAFF_POOL = Object.freeze([
    'hero:Staff_01',
    'hero:Staff_02',
    'dungeon:Staff_Gem_01',
    'dungeon:Staff_DoubleBlade_01',
]);

/** Off-hand shields offered to blade-primary fighters. */
const SHIELD_POOL = Object.freeze([
    'hero:Shield_01',
    'hero:Shield_05',
    'hero:Shield_12',
    'hero:Shield_Buckler_01',
    'hero:Shield_Long_01',
    'hero:Shield_Long_07',
    'dungeon:Shield_Heater_01',
    'dungeon:Shield_Round_01',
    'dungeon:Shield_Ornate_01',
    'empire:Shield_01',
]);

/**
 * Lists every equipment FBX referenced by the pools so loaders can prefetch.
 *
 * @returns {string[]} Unique repository-relative FBX paths.
 */
export function listWeaponAssetFiles() {
    return [...new Set(Object.values(WEAPON_ASSET_REGISTRY).map((entry) => entry.file))];
}

/** @param {number} value Numeric part index. */
function partIndex(value) {
    return String(value).padStart(2, '0');
}

/**
 * Produces a stable unsigned hash without relying on runtime random state.
 *
 * @param {string} identity Persisted gladiator identity.
 * @returns {number} Unsigned 32-bit hash.
 */
export function hashIdentity(identity) {
    let hash = 2166136261;
    for (const character of identity) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/**
 * Selects a complete, compatible Synty modular-character set plus the
 * fighter's weapon arsenal.
 *
 * Body part indexes deliberately stay below 18 because that is the narrowest
 * shared range among hands, lower arms, legs, hips, upper arms and torsos.
 *
 * The arsenal mirrors how the engine fights: hybrid skins (rapier + bow,
 * longsword + recurve bow) own several weapons and the renderer swaps between
 * them as the action demands — bow while shooting, blade while swinging,
 * empty hands while casting.
 *
 * @param {{ name?: string, user?: string }} gladiator Stable fighter metadata.
 * @param {ReturnType<import('./gladiator-appearance.js').getGladiatorAppearance>} appearance Renderer appearance.
 * @returns {{
 *   meshes: string[],
 *   textureAsset: string,
 *   weaponClass: string,
 *   arsenal: { melee: string|null, ranged: string|null, staff: string|null, primary: 'melee'|'ranged'|'staff' },
 *   shieldAsset: string|null,
 * }} Runtime asset selection.
 */
export function getSyntyHeroConfig(gladiator, appearance) {
    const identity = `${gladiator.user ?? ''}:${gladiator.name ?? ''}`;
    const hash = hashIdentity(identity);
    const gender = appearance.gender === 'female' ? 'Female' : 'Male';
    const variant = partIndex(ARMOR_VARIANTS[appearance.armor] ?? ARMOR_VARIANTS.cloth);
    const meshes = [
        `Chr_Head_${gender}_${partIndex((hash >>> 21) % 23)}`,
        `Chr_Eyebrow_${gender}_${partIndex(1 + hash % (gender === 'Female' ? 7 : 10))}`,
        `Chr_Torso_${gender}_${variant}`,
        `Chr_ArmUpperRight_${gender}_${variant}`,
        `Chr_ArmUpperLeft_${gender}_${variant}`,
        `Chr_ArmLowerRight_${gender}_${variant}`,
        `Chr_ArmLowerLeft_${gender}_${variant}`,
        `Chr_HandRight_${gender}_${variant}`,
        `Chr_HandLeft_${gender}_${variant}`,
        `Chr_Hips_${gender}_${variant}`,
        `Chr_LegRight_${gender}_${variant}`,
        `Chr_LegLeft_${gender}_${variant}`,
    ];

    if (appearance.hasHelmet) {
        meshes.push(`Chr_HeadCoverings_No_Hair_${partIndex(1 + (hash >>> 4) % 13)}`);
    }
    else {
        meshes.push(`Chr_Hair_${partIndex(1 + (hash >>> 4) % 38)}`);
    }

    if (appearance.hasCape) {
        meshes.push(`Chr_BackAttachment_${partIndex(1 + (hash >>> 10) % 4)}`);
    }

    if (appearance.armor === 'metal' || appearance.armor === 'gold') {
        const shoulder = partIndex(1 + (hash >>> 15) % 6);
        meshes.push(`Chr_ShoulderAttachRight_${shoulder}`, `Chr_ShoulderAttachLeft_${shoulder}`);
    }

    // Primary combat class from the appearance contract (kept as metadata).
    const weaponClass = appearance.weapon;
    const families = appearance.families ?? { bow: false, spear: false, staff: false, magic: false, melee: false };

    // Melee fighters swing a sword — or a spear when their skin says so.
    const meleeFamily = families.spear ? SPEAR_POOL : SWORD_POOL;
    const melee = meleeFamily[hash % meleeFamily.length] ?? null;
    // Archers draw the bow while shooting.
    const ranged = families.bow ? BOW_POOL[hash % BOW_POOL.length] : null;
    // Casters keep a staff as their idle weapon.
    const staff = (families.staff || families.magic) && !families.bow && !families.melee && !families.spear
        ? STAFF_POOL[hash % STAFF_POOL.length]
        : (families.staff ? STAFF_POOL[hash % STAFF_POOL.length] : null);

    // Primary = the weapon shown while idle or moving: the melee blade when
    // the skin carries one, otherwise the bow for pure archers, otherwise the
    // caster's staff.
    const primary = families.melee || families.spear
        ? 'melee'
        : families.bow
            ? 'ranged'
            : families.staff || families.magic
                ? 'staff'
                : 'melee';

    // Only blade-primary fighters strap on an off-hand shield.
    const shieldAsset = primary === 'melee' && !families.spear
        ? SHIELD_POOL[(hash >>> 8) % SHIELD_POOL.length]
        : null;

    return {
        meshes,
        textureAsset: TEXTURE_ASSETS[(hash >>> 7) % TEXTURE_ASSETS.length],
        weaponClass,
        arsenal: { melee, ranged, staff, primary },
        shieldAsset,
    };
}

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

const WEAPON_ASSETS = Object.freeze({
    bow: null,
    spear: 'SK_Wep_Joust_01.fbx',
    staff: 'SK_Wep_Staff_01.fbx',
    sword: 'SK_Wep_Sword_01.fbx',
});

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
function hashIdentity(identity) {
    let hash = 2166136261;
    for (const character of identity) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/**
 * Selects a complete, compatible Synty modular-character set.
 *
 * Body part indexes deliberately stay below 18 because that is the narrowest
 * shared range among hands, lower arms, legs, hips, upper arms and torsos.
 *
 * @param {{ name?: string, user?: string }} gladiator Stable fighter metadata.
 * @param {{ armor: string, gender: 'female'|'male', hasCape: boolean, hasHelmet: boolean, weapon: string }} appearance Renderer appearance.
 * @returns {{ meshes: string[], textureAsset: string, weaponAsset: string|null }} Runtime asset selection.
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

    return {
        meshes,
        textureAsset: TEXTURE_ASSETS[(hash >>> 7) % TEXTURE_ASSETS.length],
        weaponAsset: Object.hasOwn(WEAPON_ASSETS, appearance.weapon)
            ? WEAPON_ASSETS[appearance.weapon]
            : WEAPON_ASSETS.sword,
    };
}

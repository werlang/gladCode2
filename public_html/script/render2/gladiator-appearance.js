const ACCENT_PALETTE = [
    '#31a7c7',
    '#dc5f52',
    '#e3b341',
    '#55a868',
    '#a06cd5',
    '#e07a9e',
    '#5f83d6',
    '#d7833f',
];

const SKIN_COLORS = [
    ['darkelf', '#aeb3ca'],
    ['red_orc', '#568b33'],
    ['tanned', '#d9a86c'],
    ['dark', '#8a583f'],
    ['black', '#61382d'],
    ['light', '#f0c5a5'],
];

const HAIR_COLORS = [
    ['raven', '#242126'],
    ['black', '#2f2927'],
    ['blonde', '#d9b85f'],
    ['redhead', '#8f3d2c'],
    ['ruby-red', '#7d2635'],
    ['white', '#dedbd2'],
    ['gray', '#858585'],
    ['brown', '#70462f'],
    ['brunette', '#4b3028'],
    ['blue', '#3b6da8'],
    ['green', '#487f55'],
    ['pink', '#b95b7f'],
    ['purple', '#684d8f'],
];

/**
 * Parses a persisted skin while treating malformed legacy values as empty.
 *
 * @param {unknown} skin Persisted JSON string or token array.
 * @returns {string[]} Normalized skin tokens.
 */
function parseSkin(skin) {
    if (Array.isArray(skin)) {
        return skin.filter((token) => typeof token === 'string');
    }

    if (typeof skin !== 'string') {
        return [];
    }

    try {
        const parsed = JSON.parse(skin);
        return Array.isArray(parsed) ? parsed.filter((token) => typeof token === 'string') : [];
    }
    catch {
        return [];
    }
}

/**
 * Creates a deterministic palette index from a gladiator identity.
 *
 * @param {string} identity Stable display identity.
 * @returns {number} Non-negative 32-bit hash.
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
 * Finds the first palette value whose marker occurs in any skin token.
 *
 * @param {string[]} tokens Skin tokens.
 * @param {Array<[string, string]>} palette Ordered marker/color pairs.
 * @param {string} fallback Fallback color.
 * @returns {string} CSS color.
 */
function findColor(tokens, palette, fallback) {
    for (const [marker, color] of palette) {
        if (tokens.some((token) => token.includes(marker))) {
            return color;
        }
    }

    return fallback;
}

/**
 * Reduces the detailed LPC skin into recognizable low-poly model materials.
 *
 * The 3D renderer keeps exact LPC portraits in the shared HUD. This appearance
 * contract carries the same broad skin, armor, weapon, helmet, cape and hair
 * choices into the arena model without pretending the sprite is a 3D mesh.
 *
 * @param {{ name?: string, user?: string, skin?: unknown }} gladiator Gladiator metadata.
 * @returns {{
 *   accentColor: string,
 *   armor: 'cloth'|'leather'|'metal'|'gold',
 *   armorColor: string,
 *   gender: 'female'|'male',
 *   hairColor: string,
 *   hasCape: boolean,
 *   hasHelmet: boolean,
 *   skinColor: string,
 *   weapon: 'bow'|'spear'|'staff'|'sword'
 * }} Low-poly appearance contract.
 */
export function getGladiatorAppearance(gladiator) {
    const tokens = parseSkin(gladiator.skin);
    const identity = `${gladiator.user ?? ''}:${gladiator.name ?? ''}`;
    const accentColor = ACCENT_PALETTE[hashIdentity(identity) % ACCENT_PALETTE.length];

    let armor = 'cloth';
    let armorColor = accentColor;
    if (tokens.some((token) => token.includes('gold'))) {
        armor = 'gold';
        armorColor = '#c99b3d';
    }
    else if (tokens.some((token) => token.includes('plate') || token.includes('metal'))) {
        armor = 'metal';
        armorColor = '#87939c';
    }
    else if (tokens.some((token) => token.includes('leather') || token.includes('chain'))) {
        armor = 'leather';
        armorColor = '#75543b';
    }

    let weapon = 'sword';
    if (tokens.some((token) => /bow|arcoreal|ranged/.test(token))) {
        weapon = 'bow';
    }
    else if (tokens.some((token) => /spear|trident/.test(token))) {
        weapon = 'spear';
    }
    else if (tokens.some((token) => /staff|wand/.test(token))) {
        weapon = 'staff';
    }

    return {
        accentColor,
        armor,
        armorColor,
        gender: tokens.some((token) => token === 'female' || token.startsWith('female-')) ? 'female' : 'male',
        hairColor: findColor(tokens, HAIR_COLORS, '#4b3028'),
        hasCape: tokens.some((token) => token.startsWith('cape_') && !token.includes('none')),
        hasHelmet: tokens.some((token) => /helmet|helm|hood|hat|cap/.test(token) && token !== 'head_none'),
        skinColor: findColor(tokens, SKIN_COLORS, '#d9a67f'),
        weapon,
    };
}

/**
 * Maps a potion command suffix to the matching visual and audio effect.
 *
 * @param {unknown} code Engine command string.
 * @returns {'heal'|'mana'|'tonic'|'elixir'|null} Effect name or null.
 */
export function getPotionEffect(code) {
    if (typeof code !== 'string') {
        return null;
    }

    const suffix = code.split('-')[1];
    return {
        hp: 'heal',
        ap: 'mana',
        high: 'tonic',
        low: 'tonic',
        xp: 'elixir',
    }[suffix] ?? null;
}

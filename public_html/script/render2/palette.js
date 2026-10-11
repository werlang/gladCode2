/**
 * Turns the persisted skin token list (e.g. `male_longsleeve_black`, `cape_red`)
 * into the colors and appearance traits used by gladiator models.
 */

const COLOR_WORDS = Object.freeze([
    ['dark-blonde', 0xa9853f], ['dark-blue', 0x27408b], ['dark-green', 0x2f6b3c],
    ['dark-brown', 0x4a3020], ['light-blue', 0x6fb1e8], ['light-green', 0x8fd06f],
    ['brunette', 0x5a3a22], ['blonde', 0xd8b45a], ['black', 0x24242a], ['white', 0xe8e8ee],
    ['brown', 0x7a5232], ['orange', 0xe27a2b], ['yellow', 0xe8c93b], ['purple', 0x7b4bb0],
    ['violet', 0x7b4bb0], ['green', 0x3f9a4b], ['blue', 0x3a70d8], ['pink', 0xe58bb5],
    ['gray', 0x8a9099], ['grey', 0x8a9099], ['red', 0xc23a34], ['gold', 0xd4a83a],
    ['silver', 0xc4ccd4], ['metal', 0x9aa3ad], ['steel', 0x9aa3ad], ['plate', 0x9aa3ad],
    ['leather', 0x7a5232], ['bronze', 0xa9743a],
]);

const SKIN_TONES = Object.freeze([
    ['darkelf', 0x6d6a86], ['orc', 0x7fa85a], ['zombie', 0x8aa77c], ['dark', 0x8a5a3c],
    ['tanned', 0xc99a6b], ['tan', 0xc99a6b], ['light', 0xf0c8a0],
]);

const TEAM_COLORS = Object.freeze([0xd94841, 0x31a7c7, 0xf0c453, 0x9b6bd8, 0x4fd46a, 0xe58bb5, 0xf08a3c, 0xb8c2c8]);

/** @returns {number} Color of the first known color word in the text, or the fallback. */
export function colorFromText(text, fallback) {
    const lower = String(text ?? '').toLowerCase();
    for (const [word, color] of COLOR_WORDS) {
        if (lower.includes(word)) return color;
    }
    return fallback;
}

/** @returns {string[]} Skin tokens, tolerating a JSON string, an array or garbage. */
export function parseSkin(skin) {
    if (Array.isArray(skin)) return skin.map(String);
    try {
        const parsed = JSON.parse(String(skin ?? '[]'));
        return Array.isArray(parsed) ? parsed.map(String) : [];
    }
    catch {
        return [];
    }
}

const isNone = (token) => token.endsWith('_none') || token === 'none';

const SPRITE_ROOT = 'sprite/Universal-LPC-spritesheet/';
/** Slots whose sprite sheet color is sampled; weapons keep their own procedural look. */
const SAMPLED_SLOTS = Object.freeze(['shape', 'eyes', 'ears', 'facial', 'style', 'shirt', 'armor', 'legs', 'head', 'hands', 'shoulder', 'feet', 'belt', 'cape', 'shield', 'melee', 'ranged']);

/** Fallback slot detection used when the editor catalog (`window.images`) is unavailable. */
const SLOT_FALLBACK = Object.freeze([
    ['shape', /^(fe)?male-|^skeleton$/], ['eyes', /^eyes_/], ['ears', /ears/],
    ['facial', /^(beard|bigstache|fiveoclock|frenchstache|mustache|facial)/],
    ['style', /^(bangs|bunches|bedhead|ponytail|long|short|mohawk|afro|bob|curly|messy|braid|plain|parted|page|pixie|princess|swoop|unkempt|loose|jewfro|xlong)/],
    ['cape', /^(tatter)?cape_(?!.*_behind$)/], ['shield', /shield/], ['head', /(helmet|hat|hood|bandana|tiara|cap$)/],
    ['shoulder', /shoulder/], ['hands', /(gauntlet|glove|bracer)/], ['belt', /belt/],
    ['armor', /(chest|chain|plate)/], ['shirt', /(longsleeve|shirt|robe|tunic|dress|corset|sleeveless|pirate)/],
    ['legs', /(pants|legs|skirt)/], ['feet', /(shoes|boots|feet)/], ['ranged', /(bow|arcoreal)/],
    ['melee', /(sword|saber|rapier|dagger|spear|trident|mace|hammer|staff|wand|oversize)/],
]);

/**
 * Melee families in match order. Numbered `oversize_N` blades come from the weapon pack: 1 is a dark short
 * sword, 6/7 energy blades, and 8-27 five materials in four sizes each (dagger, short, sword, great).
 */
const MELEE_KINDS = Object.freeze([
    ['wand', /wand/], ['staff', /staff/], ['trident', /trident/], ['spear', /spear/], ['warhammer', /hammer/],
    ['mace', /mace/], ['dagger', /(dagger|oversize_(8|12|16|20|24)$)/], ['rapier', /rapier/], ['saber', /saber/],
    ['lightblade', /oversize_[67]$/], ['longsword', /(longsword|oversize_(11|15|19|23|27)$)/],
]);

/** Bow families of the editor (`weapons/shoot`). */
const BOW_KINDS = Object.freeze([['greatbow', /greatbow/], ['recurve', /recurve/], ['royal', /arcoreal/]]);

/** @returns {Array<Record<string, unknown>>} The editor sprite catalog, when loaded in the page. */
function pageCatalog() {
    return typeof window !== 'undefined' && Array.isArray(window.images) ? window.images : [];
}

/**
 * Groups skin tokens by slot (shape, style, shirt, armor, legs, head, feet...).
 *
 * @param {string[]} tokens Skin tokens.
 * @param {Array<Record<string, unknown>>} catalog Editor catalog used to resolve slots exactly.
 * @returns {Record<string, string>} First real (non-"none") token of every slot.
 */
export function groupTokens(tokens, catalog = pageCatalog()) {
    const byId = new Map(catalog.map((entry) => [entry.id, entry]));
    const slots = {};
    for (const token of tokens) {
        if (isNone(token)) continue;
        const entry = byId.get(token);
        const parent = entry ? String(entry.parent).split(',')[0] : SLOT_FALLBACK.find(([, pattern]) => pattern.test(token))?.[0];
        if (entry && !entry.path) continue;
        if (parent && !(parent in slots)) slots[parent] = token;
    }
    return slots;
}

/** @returns {string} Style or kind name of a token: the last folder of its sprite path, else the token itself. */
const styleOf = (token, catalog) => {
    const entry = catalog.find((item) => item.id === token);
    return entry?.path ? String(entry.path).split('/').slice(-2, -1)[0] : token.split('_')[0];
};

/**
 * Reads the average color of every sampled sprite sheet used by these skins.
 * Dark outline pixels and specular highlights are dropped so the result reads
 * as the material's base color.
 *
 * @param {string[]} skins Persisted skin JSON strings or token arrays.
 * @returns {Promise<Map<string, number>>} Token to sRGB color.
 */
export async function sampleSkinColors(skins, catalog = pageCatalog()) {
    const byId = new Map(catalog.map((entry) => [entry.id, entry]));
    const wanted = new Set();
    for (const skin of skins) {
        const slots = groupTokens(parseSkin(skin), catalog);
        for (const slot of SAMPLED_SLOTS) {
            if (slots[slot]) wanted.add(slots[slot]);
        }
    }
    const colors = new Map();
    await Promise.all([...wanted].map(async (token) => {
        const entry = byId.get(token);
        if (!entry?.path) return;
        const color = await sampleImage(SPRITE_ROOT + entry.path);
        if (color !== null) colors.set(token, color);
    }));
    return colors;
}

const sampleCache = new Map();

function sampleImage(url) {
    if (!sampleCache.has(url)) {
        sampleCache.set(url, new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.min(image.width, 512);
                    canvas.height = Math.max(1, Math.round(image.height * canvas.width / image.width));
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(averageColor(ctx.getImageData(0, 0, canvas.width, canvas.height).data));
                }
                catch {
                    resolve(null);
                }
            };
            image.onerror = () => resolve(null);
            image.src = url;
        }));
    }
    return sampleCache.get(url);
}

/** @returns {number|null} Mean color of opaque pixels between the 35th and 95th luminance percentile. */
export function averageColor(data) {
    const histogram = new Uint32Array(256);
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        histogram[Math.round(0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2])] += 1;
        count += 1;
    }
    if (!count) return null;
    let seen = 0;
    let low = 0;
    let high = 255;
    for (let level = 0; level < 256; level += 1) {
        seen += histogram[level];
        if (seen < count * 0.35) low = level + 1;
        if (seen <= count * 0.95) high = level;
    }
    let r = 0;
    let g = 0;
    let b = 0;
    let used = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        const level = Math.round(0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]);
        if (level < low || level > high) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        used += 1;
    }
    return used ? (Math.round(r / used) << 16) | (Math.round(g / used) << 8) | Math.round(b / used) : null;
}

/**
 * Derives the visual traits of a gladiator from its skin tokens.
 *
 * @param {unknown} skin Persisted skin JSON string or token array.
 * @param {number} [index] Roster index, used for the team ring color.
 * @param {Map<string, number>} [colors] Sampled sprite colors from {@link sampleSkinColors}.
 * @returns {Record<string, any>} Traits: colors, slot `tokens`, `shape`, plus `hairStyle`, `facial`, `headgear`, `skirt`, `weapon`, `shield`, `elfEars`.
 */
export function getAppearance(skin, index = 0, colors = new Map(), catalog = pageCatalog()) {
    const tokens = parseSkin(skin);
    const slots = groupTokens(tokens, catalog);
    const female = tokens.some((token) => token.startsWith('female'));
    const tint = (slot, fallback) => {
        const token = slots[slot];
        if (!token) return null;
        return colors.get(token) ?? colorFromText(token, fallback);
    };

    const shape = slots.shape ?? tokens.find((token) => /^(fe)?male-/.test(token)) ?? '';
    const tone = shape.replace(/^(fe)?male-/, '');
    const toneColor = (SKIN_TONES.find(([key]) => tone.includes(key)) ?? [null, 0xe4b98f])[1];
    const skinColor = colors.get(shape) ?? toneColor;

    const hairColor = tint('style', 0x5a3a22) ?? 0x5a3a22;
    const armorColor = tint('armor', 0x9aa3ad);
    const shirt = tint('shirt', 0x9aa3ad);
    const headToken = slots.head ?? '';
    const legsToken = slots.legs ?? '';
    const meleeToken = slots.melee ?? tokens.find((token) => /(staff|sword|saber|rapier|dagger|spear|mace|wand|hammer|trident)/.test(token) && !isNone(token)) ?? '';

    return {
        female,
        /** Slot to skin token, for model sets that pick meshes per item (`synty-outfit.js`). */
        tokens: slots,
        shape,
        skeleton: shape === 'skeleton',
        skin: skinColor,
        elfEars: /^(big|elven)ears/.test(slots.ears ?? ''),
        eyes: tint('eyes', 0x2a2a30) ?? 0x14161a,
        hair: hairColor,
        hairStyle: slots.style ? styleOf(slots.style, catalog) : null,
        facial: slots.facial ? { kind: styleOf(slots.facial, catalog), color: tint('facial', 0x5a3a22) } : null,
        shirt,
        tunic: shirt ?? armorColor ?? 0x8a6a4a,
        pants: tint('legs', 0x555b66) ?? 0x4a4f5a,
        skirt: /skirt/.test(legsToken) || /(dress|robe)/.test(slots.shirt ?? '') ? (tint('legs', 0x555b66) ?? shirt) : null,
        longSleeves: /(longsleeve|pirate)/.test(slots.shirt ?? '') || Boolean(slots.armor),
        armor: armorColor,
        shoulder: tint('shoulder', 0x9aa3ad),
        gloves: tint('hands', 0x9aa3ad),
        belt: tint('belt', 0x4a3020),
        boots: tint('feet', 0x5a4230) ?? 0x4a3626,
        cape: tint('cape', 0xc23a34),
        helmet: tint('head', 0x9aa3ad),
        headgear: headToken ? headKind(headToken) : null,
        weapon: (MELEE_KINDS.find(([, pattern]) => pattern.test(meleeToken)) ?? ['sword'])[0],
        bladeColor: /oversize_\d+$/.test(meleeToken) ? tint('melee', 0xdfe6ee) : null,
        bow: (BOW_KINDS.find(([, pattern]) => pattern.test(slots.ranged ?? '')) ?? ['bow'])[0],
        bowColor: tint('ranged', 0x7a4a22),
        shield: tint('shield', 0x8a7a60),
        team: TEAM_COLORS[index % TEAM_COLORS.length],
    };
}

/** @returns {'helm'|'wizard'|'hood'|'cap'|'bandana'|'tiara'} Shape family of a head item. */
function headKind(token) {
    if (/wizard/.test(token)) return 'wizard';
    if (/(hood|chain-hat)/.test(token)) return 'hood';
    if (/(helmet|helm)/.test(token)) return 'helm';
    if (/bandana/.test(token)) return 'bandana';
    if (/tiara/.test(token)) return 'tiara';
    return 'cap';
}

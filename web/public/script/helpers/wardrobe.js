/**
 * The gladiator creator's wardrobe, in the player's language: the label of every catalogue layer and the colour
 * chip of its tile, both derived from the layer id (the 3D preview itself is drawn by `render2`). Pure: no DOM is
 * touched, so `tests/frontend/wardrobe.test.mjs` can run it in Node.
 */
import { getImage } from './sprite-catalog.js';

/** Names of the two gender layers. */
const GENDERS = Object.freeze({ male: 'Masculino', female: 'Feminino' });

/** Body layers by the tone part of their id (`male-light` -> Clara). */
const SKIN_NAMES = Object.freeze({
    light: 'Clara',
    tanned: 'Bronzeada',
    tanned2: 'Bronzeada 2',
    olive: 'Oliva',
    dark: 'Escura',
    dark2: 'Escura 2',
    brown: 'Parda',
    black: 'Negra',
    darkelf: 'Elfo Sombrio',
    darkelf2: 'Elfo Sombrio 2',
    orc: 'Orc',
    red_orc: 'Orc Vermelho',
    skeleton: 'Esqueleto',
});

/** Hair styles by the style part of their id. */
const HAIR_STYLES = Object.freeze({
    bangs: 'Franja',
    bangslong: 'Franja Longa',
    bangslong2: 'Franja Longa 2',
    bangsshort: 'Franja Curta',
    bedhead: 'Cabelo Bagunçado',
    bunches: 'Marias-Chiquinhas',
    jewfro: 'Juba',
    long: 'Longo',
    longhawk: 'Moicano Longo',
    longknot: 'Coque Longo',
    loose: 'Solto',
    messy1: 'Bagunçado',
    messy2: 'Bagunçado 2',
    mohawk: 'Moicano',
    page: 'Chanel',
    page2: 'Chanel 2',
    parted: 'Repartido',
    pixie: 'Pixie',
    plain: 'Liso',
    ponytail: 'Rabo de Cavalo',
    ponytail2: 'Rabo de Cavalo 2',
    princess: 'Princesa',
    shorthawk: 'Moicano Curto',
    shortknot: 'Coque Curto',
    shoulderl: 'Ombro Esquerdo',
    shoulderr: 'Ombro Direito',
    swoop: 'Jogado',
    unkempt: 'Descuidado',
    xlong: 'Muito Longo',
    xlongknot: 'Coque Muito Longo',
});

/** Beard styles by the style part of their id. */
const BEARD_STYLES = Object.freeze({
    beard: 'Barba',
    bigstache: 'Bigode Grande',
    fiveoclock: 'Barba de 5 Horas',
    frenchstache: 'Bigode Francês',
    mustache: 'Bigode',
});

/** Hair and cloth colours by the colour part of their id. */
const COLOUR_NAMES = Object.freeze({
    black: 'Preto',
    white: 'Branco',
    gray: 'Cinza',
    grey: 'Cinza',
    blonde: 'Loiro',
    'dark-blonde': 'Loiro-escuro',
    'light-blonde': 'Loiro-claro',
    'white-blonde': 'Loiro-branco',
    brunette: 'Castanho',
    brown: 'Marrom',
    raven: 'Corvo',
    redhead: 'Ruivo',
    ruby: 'Rubi',
    'ruby-red': 'Rubi',
    red: 'Vermelho',
    blue: 'Azul',
    'dark-blue': 'Azul-escuro',
    'light-blue': 'Azul-claro',
    lightblue: 'Azul-claro',
    green: 'Verde',
    yellow: 'Amarelo',
    pink: 'Rosa',
    purple: 'Roxo',
    gold: 'Dourado',
    cyan: 'Ciano',
    'white-cyan': 'Ciano-claro',
    teal: 'Turquesa',
    magenta: 'Magenta',
    lavender: 'Lavanda',
    orange: 'Laranja',
    olive: 'Oliva',
    dark: 'Escuro',
    light: 'Claro',
    tanned: 'Bronzeado',
});

/** Eye colours, in the plural they take after "Olhos". */
const EYE_NAMES = Object.freeze({
    blue: 'Azuis',
    brown: 'Castanhos',
    gray: 'Cinzas',
    green: 'Verdes',
    orange: 'Laranja',
    purple: 'Roxos',
    red: 'Vermelhos',
    yellow: 'Amarelos',
});

/** Shirt styles by the style part of their id. */
const SHIRT_STYLES = Object.freeze({
    longsleeve: 'Manga Longa',
    pirate: 'Pirata',
    sleeveless: 'Sem Mangas',
    corset: 'Espartilho',
    tightdress: 'Vestido Ajustado',
    bikini: 'Biquíni',
    dress: 'Vestido',
});

/** Armour pieces by the piece part of their id. */
const ARMOUR_NAMES = Object.freeze({
    chain: 'Cota de Malha',
    'leather-chest': 'Peitoral de Couro',
    'plate-chest': 'Peitoral de Placas',
    'gold-chest': 'Peitoral Dourado',
});

/** Leg pieces by the piece part of their id. */
const LEG_NAMES = Object.freeze({
    'plate-legs': 'Perneiras de Placas',
    'gold-legs': 'Grevas Douradas',
    'robe-skirt': 'Saia de Túnica',
    pants: 'Calças',
});

/** Head pieces by the piece part of their id. */
const HEAD_NAMES = Object.freeze({
    cap: 'Gorro de Couro',
    'wizard-hat': 'Chapéu de Mago',
    'cloth-hood': 'Capuz de Pano',
    'chain-hood': 'Capuz de Malha',
    'chain-hat': 'Coifa de Malha',
    'metal-helmet': 'Elmo de Metal',
    'gold-helmet': 'Elmo Dourado',
    bandana: 'Bandana',
});

/** Hand pieces by the piece part of their id. */
const HAND_NAMES = Object.freeze({
    'gold-gauntlet': 'Manoplas Douradas',
    'metal-gauntlet': 'Manoplas de Metal',
});

/** Shoulder pieces by the piece part of their id. */
const SHOULDER_NAMES = Object.freeze({
    'gold-shoulder': 'Ombreiras Douradas',
    'metal-shoulder': 'Ombreiras de Metal',
    'leather-shoulder': 'Ombreiras de Couro',
});

/** Foot pieces by the piece part of their id. */
const FOOT_NAMES = Object.freeze({
    'gold-feet': 'Botas Douradas',
    'metal-feet': 'Botas de Metal',
    shoes: 'Sapatos',
});

/** Melee weapons by the weapon part of their id. */
const MELEE_NAMES = Object.freeze({
    spear: 'Lança',
    staff: 'Cajado',
    dagger: 'Adaga',
    woodwand: 'Varinha de Madeira',
    steelwand: 'Varinha de Aço',
    sword: 'Espada',
    warhammer: 'Martelo de Guerra',
    dragonspear: 'Lança de Dragão',
    trident: 'Tridente',
    mace: 'Maça',
    longsword: 'Espadão',
    rapier: 'Rapieira',
    saber: 'Sabre',
});

/** Ranged weapons by the weapon part of their id. */
const RANGED_NAMES = Object.freeze({
    bow: 'Arco',
    greatbow: 'Arco Grande',
    recurvebow: 'Arco Recurvo',
    arcoreal: 'Arco Real',
});

/** Belt pieces by the piece part of their id. */
const BELT_NAMES = Object.freeze({
    'white-cloth': 'Faixa Branca',
    leather: 'Cinto de Couro',
});

/** Cape kinds by their first id part. */
const CAPE_KINDS = Object.freeze({ cape: 'Capa', tattercape: 'Capa Esfarrapada' });

/** Skin and material colours sampled for the tiles, longest names first so `ruby-red` never reads as `red`. */
const COLOUR_WORDS = Object.freeze([
    ['white-blonde', 0xf5edd5], ['light-blonde', 0xe8d38a], ['dark-blonde', 0xa9853f],
    ['white-cyan', 0xd8f5ef], ['ruby-red', 0xb3132e], ['dark-blue', 0x27408b],
    ['light-blue', 0x6fb1e8], ['lightblue', 0x6fb1e8], ['brunette', 0x5a3a22],
    ['redhead', 0xb4552f], ['blonde', 0xd8b45a], ['raven', 0x1c1c24],
    ['black', 0x24242a], ['white', 0xe8e8ee], ['gray', 0x8a9099],
    ['grey', 0x8a9099], ['brown', 0x7a5232], ['orange', 0xe27a2b],
    ['yellow', 0xe8c93b], ['purple', 0x7b4bb0], ['violet', 0x7b4bb0],
    ['green', 0x3f9a4b], ['blue', 0x3a70d8], ['pink', 0xe58bb5],
    ['red', 0xc23a34], ['gold', 0xd4a83a], ['silver', 0xc4ccd4],
    ['steel', 0x9aa3ad], ['metal', 0x9aa3ad], ['plate', 0x9aa3ad],
    ['chain', 0x9aa3ad], ['leather', 0x7a5232], ['bronze', 0xa9743a],
    ['lavender', 0xb59ed6], ['cyan', 0x57c7d4], ['teal', 0x2f8f83],
    ['magenta', 0xb03a8f], ['olive', 0x9a9a4e], ['tanned', 0xc99a6b],
    ['bikini', 0x3a70d8], ['dress', 0xb9a37c], ['robe', 0xb9a37c],
]);

/** Skin tones sampled for the body layers (checked before the colour words). */
const SKIN_COLOURS = Object.freeze([
    ['red_orc', 0x9d5f4d], ['darkelf', 0x6d6a86], ['orc', 0x7fa85a], ['skeleton', 0xd9d5c5],
    ['tanned', 0xc99a6b], ['olive', 0xb08a5a], ['black', 0x4e352a], ['brown', 0x7a5232],
    ['dark', 0x8a5a3c], ['light', 0xf0c8a0],
]);

/**
 * @param {object} image Catalogue layer.
 * @returns {string} The layer's first parent menu.
 */
function familyOf(image) {
    return Array.isArray(image.parent) ? image.parent[0] : image.parent;
}

/**
 * The skin a gladiator is saved with: the worn layer ids in the order the wardrobe keeps them. It never depends
 * on the preview style, so the sprite and the 3D creator produce the same array for the same choices (the replay
 * and the engine's `setSpritesheet` read it the same way).
 *
 * @param {Record<string, object>} selected Worn layers, by id.
 * @returns {string[]} Catalogue layer ids.
 */
export function skinOf(selected) {
    return Object.keys(selected);
}

/**
 * @param {string} text Any id fragment.
 * @returns {string} The fragment with its separators turned into spaces, capitalised (never empty).
 */
function title(text) {
    const spaced = String(text ?? '').replace(/[_-]+/g, ' ').trim();
    return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : 'Nenhum';
}

/**
 * @param {string} token Layer id without its gender prefix.
 * @returns {string} The label of a colour part, reading the numbered variants (`blonde2`) as "Loiro 2".
 */
function colourLabel(token) {
    const known = COLOUR_NAMES[token] ?? COLOUR_NAMES[token.replace(/2$/, '')];
    if (!known) return title(token);
    return /2$/.test(token) ? `${known} 2` : known;
}

/** @param {string} token Layer id. @returns {string} The id without the `male_`/`female_` prefix. */
function withoutGender(token) {
    return token.replace(/^(?:male|female)_/, '');
}

/**
 * @param {string} token Layer id. @returns {string} The id without the `male-`/`female-` prefix.
 */
function withoutGenderDash(token) {
    return token.replace(/^(?:male|female)-/, '');
}

/**
 * Labels a piece made of a known style plus an optional colour (`shoes_black`, `pants_dark-blue`).
 *
 * @param {string} token Layer id without its gender prefix.
 * @param {Record<string, string>} styles Known styles.
 * @returns {string}
 */
function pieceLabel(token, styles) {
    const exact = styles[token];
    if (exact) return exact;
    const parts = token.split('_');
    const colour = parts.length > 1 && COLOUR_NAMES[parts[parts.length - 1]] ? parts.pop() : null;
    const style = styles[parts.join('_')];
    if (style) return colour ? `${style} · ${colourLabel(colour)}` : style;
    return title(token);
}

/**
 * @param {string} token Layer id.
 * @returns {string} The label of a hair style (`bangs_blonde` -> "Franja · Loiro").
 */
function hairLabel(token) {
    const [style, colour] = token.split('_');
    const name = HAIR_STYLES[style] ?? title(style);
    return colour ? `${name} · ${colourLabel(colour)}` : name;
}

/**
 * @param {string} token Layer id.
 * @returns {string} The label of a beard style (`fiveoclock_black` -> "Barba de 5 Horas · Preto").
 */
function beardLabel(token) {
    const [style, colour] = token.split('_');
    const name = BEARD_STYLES[style] ?? title(style);
    return colour ? `${name} · ${colourLabel(colour)}` : name;
}

/**
 * @param {string} token Layer id.
 * @returns {string} The label of a melee weapon (`female_oversize_17` -> "Lâmina 17").
 */
function meleeLabel(token) {
    const rest = withoutGender(token);
    const numbered = /^oversize_(\d+)$/.exec(rest);
    if (numbered) return `Lâmina ${numbered[1]}`;
    const oversize = rest.replace(/^oversize_/, '');
    return MELEE_NAMES[oversize] ?? MELEE_NAMES[rest] ?? title(rest);
}

/**
 * @param {string} token Layer id.
 * @returns {string} The label of a cape; the copy drawn behind the body says so.
 */
function capeLabel(token) {
    const behind = token.endsWith('_behind');
    const base = behind ? token.slice(0, -'_behind'.length) : token;
    const [kind, ...colour] = base.split('_');
    const name = CAPE_KINDS[kind] ?? title(kind);
    const label = colour.length ? `${name} · ${colourLabel(colour.join('_'))}` : name;
    return behind ? `${label} (costas)` : label;
}

/**
 * The pt-BR label of a wardrobe layer, derived from its catalogue id: `_none` slots are "Nenhum", known pieces
 * name their style and colour, and anything the catalogue adds later still gets a readable label.
 *
 * @param {string} id Catalogue layer id.
 * @returns {string} A non-empty label.
 */
export function labelFor(id) {
    const token = String(id ?? '');
    if (!token) return 'Nenhum';
    if (token.endsWith('_none')) return 'Nenhum';

    const image = getImage(token);
    const family = image ? familyOf(image) : null;
    switch (family) {
        case 'gender':
            return GENDERS[token] ?? title(token);
        case 'shape':
            return SKIN_NAMES[withoutGenderDash(token)] ?? title(withoutGenderDash(token));
        case 'eyes':
            return `Olhos · ${EYE_NAMES[token.slice('eyes_'.length)] ?? title(token.slice('eyes_'.length))}`;
        case 'ears': {
            if (token === 'default_ears') return 'Padrão';
            const [kind, tone] = token.split('_');
            const name = kind === 'bigears' ? 'Grandes' : kind === 'elvenears' ? 'Élficas' : title(kind);
            return tone ? `${name} · ${SKIN_NAMES[tone] ?? title(tone)}` : name;
        }
        case 'style':
        case 'color':
            return hairLabel(token);
        case 'facial':
        case 'bcolor':
            return beardLabel(token);
        case 'shirt':
            return token === 'female_dress_sash' ? 'Vestido com Faixa' : pieceLabel(withoutGender(token), SHIRT_STYLES);
        case 'armor':
            return ARMOUR_NAMES[withoutGender(token)] ?? title(withoutGender(token));
        case 'legs':
            return pieceLabel(withoutGender(token), LEG_NAMES);
        case 'head':
            return pieceLabel(withoutGender(token), HEAD_NAMES);
        case 'hands':
            return HAND_NAMES[withoutGender(token)] ?? title(withoutGender(token));
        case 'shoulder':
            return SHOULDER_NAMES[withoutGender(token)] ?? title(withoutGender(token));
        case 'feet':
            return pieceLabel(withoutGender(token), FOOT_NAMES);
        case 'melee':
            return meleeLabel(token);
        case 'ranged':
            return RANGED_NAMES[withoutGenderDash(token)] ?? title(withoutGenderDash(token));
        case 'shield': {
            const rest = withoutGender(token);
            const numbered = /^shield_(\d+)$/.exec(rest);
            return numbered ? `Escudo ${numbered[1]}` : title(rest);
        }
        case 'belt':
            return pieceLabel(withoutGender(token).replace(/^belt_/, ''), BELT_NAMES);
        case 'cape':
            return capeLabel(token);
        case 'none':
            return token === 'arrows' ? 'Flechas' : capeLabel(token);
        default:
            return title(withoutGender(token));
    }
}

/**
 * @param {number} value An sRGB colour.
 * @returns {string} Its CSS hex notation.
 */
function hex(value) {
    return `#${(value & 0xffffff).toString(16).padStart(6, '0')}`;
}

/**
 * The colour chip of a wardrobe tile: the colour sampled from the layer's sprite when `sampleSkinColors` has it,
 * otherwise a colour word of the id itself (`bangs_blonde` -> blonde), and null for empty slots and pieces with
 * no colour of their own.
 *
 * @param {string} id Catalogue layer id.
 * @param {Map<string, number|string>} [colors] Sampled token colours (`sampleSkinColors`).
 * @returns {string|null} CSS colour.
 */
export function colorFor(id, colors = new Map()) {
    const token = String(id ?? '');
    if (!token) return null;

    const sampled = colors && typeof colors.get === 'function' ? colors.get(token) : colors?.[token];
    if (typeof sampled === 'number' && Number.isFinite(sampled)) return hex(sampled);
    if (typeof sampled === 'string' && sampled) return sampled;

    if (token.endsWith('_none')) return null;
    const image = getImage(token);
    if (!image?.path) return null;
    const family = familyOf(image);
    const lower = token.toLowerCase();

    if (family === 'shape' || family === 'ears') {
        const tone = SKIN_COLOURS.find(([word]) => lower.includes(word));
        return tone ? hex(tone[1]) : '#e8c3a0';
    }
    if (family === 'gender') return '#d9a97c';

    const word = COLOUR_WORDS.find(([name]) => lower.includes(name));
    if (word) return hex(word[1]);

    if (family === 'head') {
        if (lower.includes('helmet')) return '#9aa3ad';
        if (lower.includes('hood')) return '#8a7a5c';
        if (lower.includes('cap')) return '#7a5232';
        if (lower.includes('hat')) return '#4b5f9a';
    }
    if (family === 'ranged') return '#7a5232';
    if (family === 'melee') {
        return /spear|staff|trident|woodwand/.test(lower) ? '#7a5232' : '#9aa3ad';
    }
    if (family === 'shield') return '#8a6a3a';
    if (family === 'legs') return '#b9a37c';
    return null;
}

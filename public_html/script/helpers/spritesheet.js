import { getImage, validateSkin } from './sprite-catalog.js';

/** Base cell of the LPC sheets. */
const CELL = 64;
/** Cell of the composed sheet: every LPC frame is centred in a 192 px cell so oversize weapons fit. */
const BIG_CELL = 192;
const COLUMNS = 13;
const ROWS = 21;
const SPRITE_ROOT = 'sprite/Universal-LPC-spritesheet/';
/** Sheet drawn when a skin cannot be built. */
const FALLBACK_SHEET = 'res/glad.png';

/** Sheet row and frame count of each animation, for the oversize weapon sheets. */
const MOVES = {
    walk: { sprites: 9, line: 8 },
    cast: { sprites: 7, line: 0 },
    thrust: { sprites: 8, line: 4 },
    slash: { sprites: 6, line: 12 },
    shoot: { sprites: 13, line: 16 },
    die: { sprites: 6, line: 20 },
};

/** First row of each animation in the composed sheet. */
const MOVE_ROWS = { walk: 8, cast: 0, thrust: 4, slash: 12, shoot: 16 };
/** Row offset of each facing within an animation. */
const DIRECTIONS = { up: 0, left: 1, down: 2, right: 3 };
/** The death animation's single row and its last frame. */
const DEATH = { row: 20, column: 5 };

/**
 * The drawing order of a layer (weapons use their facing-down order).
 *
 * @param {object} image Catalogue layer.
 * @returns {number|null}
 */
function layerOf(image) {
    return typeof image.layer === 'object' && image.layer !== null ? image.layer.down : image.layer;
}

/**
 * Loads an image.
 *
 * @param {string} src Image URL.
 * @returns {Promise<HTMLImageElement|null>} The image, or `null` when it fails.
 */
function loadImage(src) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

/**
 * Copies a 64 px LPC sheet into the 192 px cells of the composed sheet.
 *
 * @param {CanvasRenderingContext2D} context Composed sheet.
 * @param {CanvasImageSource} image LPC sheet.
 */
function drawCells(context, image) {
    for (let row = 0; row < ROWS; row++) {
        for (let column = 0; column < COLUMNS; column++) {
            context.drawImage(image, column * CELL, row * CELL, CELL, CELL,
                CELL + 3 * column * CELL, CELL + 3 * row * CELL, CELL, CELL);
        }
    }
}

/**
 * Copies an oversize weapon sheet onto its animation's rows.
 *
 * @param {CanvasRenderingContext2D} context Composed sheet.
 * @param {CanvasImageSource} image Weapon sheet.
 * @param {string} move Animation the weapon is drawn for.
 */
function drawOversize(context, image, move) {
    const { line, sprites } = MOVES[move];
    for (let direction = 0; direction < 4; direction++) {
        for (let frame = 0; frame < sprites; frame++) {
            context.drawImage(image, frame * BIG_CELL, direction * BIG_CELL, BIG_CELL, BIG_CELL,
                frame * BIG_CELL, (line + direction) * BIG_CELL, BIG_CELL, BIG_CELL);
        }
    }
}

/**
 * Builds a gladiator's full spritesheet from its skin: every layer drawn in
 * order into 192 px cells. A skin that cannot be read or has no body gets
 * the default gladiator.
 *
 * @param {string|string[]} skin Layer ids, or their JSON.
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function fetchSpritesheet(skin) {
    const sheet = document.createElement('canvas');
    sheet.width = BIG_CELL * COLUMNS;
    sheet.height = BIG_CELL * ROWS;
    const context = sheet.getContext('2d');

    let ids = [];
    try {
        ids = typeof skin === 'string' ? JSON.parse(skin) : skin;
    }
    catch {
        ids = [];
    }
    const layers = Object.values(ids ?? {}).map(id => getImage(id)).filter(Boolean);

    if (!validateSkin(layers)) {
        const fallback = await loadImage(FALLBACK_SHEET);
        if (fallback) drawCells(context, fallback);
        return sheet;
    }

    layers.sort((a, b) => {
        if (layerOf(a) == null) return -1;
        if (layerOf(b) == null) return 1;
        return layerOf(a) - layerOf(b);
    });

    const drawable = layers.map(layer => (layer.path && !layer.png ? loadImage(SPRITE_ROOT + layer.path) : null));
    const loaded = await Promise.all(drawable);
    loaded.forEach((image, index) => {
        if (!image) return;
        const layer = layers[index];
        if (layer.oversize) drawOversize(context, image, layer.move);
        else drawCells(context, image);
    });
    return sheet;
}

/**
 * Cuts one frame out of a composed spritesheet.
 *
 * @param {HTMLCanvasElement} sheet Sheet from {@link fetchSpritesheet}.
 * @param {'walk'|'cast'|'thrust'|'slash'|'shoot'|'die'} move Animation.
 * @param {'up'|'left'|'down'|'right'} direction Facing (ignored for `die`).
 * @param {number} [frame] Frame of the animation (the death pose is always its last frame).
 * @returns {HTMLCanvasElement} A 64 px canvas.
 */
export function getSpriteThumb(sheet, move, direction, frame = 0) {
    const row = move === 'die' ? DEATH.row : MOVE_ROWS[move] + DIRECTIONS[direction];
    const column = move === 'die' ? DEATH.column : frame;

    const thumb = document.createElement('canvas');
    thumb.width = CELL;
    thumb.height = CELL;
    thumb.getContext('2d').drawImage(sheet, column * BIG_CELL + CELL, row * BIG_CELL + CELL, CELL, CELL, 0, 0, CELL, CELL);
    return thumb;
}

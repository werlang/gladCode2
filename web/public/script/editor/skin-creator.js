import { createElement } from '../helpers/html.js';
import { currentGladView, onGladViewChange } from '../helpers/glad-view.js';
import { site } from '../helpers/request.js';
import { availableMoves, nextMoveIndex } from '../helpers/skin-preview.js';
import { getImage, images } from '../helpers/sprite-catalog.js';
import { fetchSpritesheet, getSpriteThumb } from '../helpers/spritesheet.js';
import { colorFor, labelFor, skinOf } from '../helpers/wardrobe.js';
import { gladPlaceholderTemplate, skinSpriteTemplate } from '../templates/editor.js';
import { ATTRIBUTE_POINTS, attributeCost, validGladName } from './attributes.js';

/** Sub-menus shown by each category button. */
const MENUS = {
    body: ['gender', 'shape', 'ears', 'eyes'],
    hair: ['style', 'color', 'facial', 'bcolor'],
    cloth: ['shirt', 'armor', 'legs', 'feet'],
    misc: ['head', 'shoulder', 'hands', 'cape', 'belt'],
    equip: ['melee', 'ranged', 'shield'],
};

/** Preview animations: button icon, stage action, and the frames of the sprite sheet's animation. */
const MOVES = [
    { name: 'walk', sprites: 9, line: 8, image: 'walk' },
    { name: 'cast', sprites: 7, line: 0, image: 'magic' },
    { name: 'thrust', sprites: 8, line: 4, image: 'thrust' },
    { name: 'slash', sprites: 6, line: 12, image: 'slash' },
    { name: 'shoot', sprites: 13, line: 16, image: 'arrows' },
];
const MOVE_INDEX = Object.fromEntries(MOVES.map((move, index) => [move.name, index]));
/** Facings of the LPC rows, in turn-button order, and the sprite sheet's cells. */
const DIRECTIONS = ['up', 'left', 'down', 'right'];
const CELL = 64;
const BIG_CELL = 192;
const SPRITE_ROOT = 'sprite/Universal-LPC-spritesheet/';
/** How often the sprite preview advances a frame. */
const FRAME_MS = 100;

const ICON_ROOT = 'sprite/images/';
/** The small family icon each tile wears, by the layer's first parent menu. */
const FAMILY_ICONS = {
    gender: 'gender.png',
    shape: 'skin.png',
    eyes: 'eye.png',
    ears: 'ear.png',
    style: 'hair.png',
    color: 'dye.png',
    facial: 'beard.png',
    bcolor: 'bcolor.png',
    shirt: 'shirt.png',
    armor: 'armor.png',
    legs: 'pants.png',
    feet: 'boots.png',
    head: 'helmet.png',
    shoulder: 'shoulder.png',
    hands: 'fist.png',
    cape: 'cape.png',
    belt: 'belt.png',
    melee: 'swords.png',
    ranged: 'bow.png',
    shield: 'shield.png',
    none: 'backpack.png',
};
const FALLBACK_ICON = 'backpack.png';
/** How long a tile must stay hovered or focused before it previews on the 3D gladiator. */
const HOVER_PREVIEW_MS = 150;
/** The status line when the 3D view (or the module that draws it) cannot load. */
const UNAVAILABLE_STATUS = 'Visual 3D indisponível';
/** Bodies that have no visible eyes or ears to choose. */
const NO_FACE = ['male-orc', 'male-red_orc', 'skeleton', 'female-orc', 'female-red_orc'];

/** What each attribute does, shown when hovering its slider. */
const ATTRIBUTE_INFO = [
    {
        path: 'sprite/images/strength.png',
        title: 'Força - STR',
        description: 'Força física e resistência do gladiador.',
        list: [
            { path: 'sprite/images/decapitation.png', description: 'Dano físico, o dano causado com armas corpo-a-corpo' },
            { path: 'sprite/images/healing.png', description: 'Pontos de vida, responsáveis por manter o gladiador vivo' },
        ],
    },
    {
        path: 'sprite/images/agility.png',
        title: 'Agilidade - AGI',
        description: 'Agilidade, rapidez e destreza do gladiador.',
        list: [
            { path: 'sprite/images/bullseye.png', description: 'Precisão, o dano causado com armas à distância' },
            { path: 'sprite/images/sprint.png', description: 'Velocidade de movimento dentro da arena' },
            { path: 'sprite/images/blades.png', description: 'Velocidade de execução de ataques' },
        ],
    },
    {
        path: 'sprite/images/smart.png',
        title: 'Inteligência - INT',
        description: 'Rapidez de raciocínio e Capacidade intelectual do gladiador.',
        list: [
            { path: 'sprite/images/energy.png', description: 'Poder mágico, o dano causado com habilidades mágicas' },
            { path: 'sprite/images/3balls.png', description: 'Velocidade de execução de uma habilidade' },
            { path: 'sprite/images/energise.png', description: 'Pontos de habilidade, usados para lançar habilidades' },
        ],
    },
];

/**
 * @param {object} image Catalogue layer.
 * @returns {string[]} The layer's parent menus.
 */
function parentsOf(image) {
    return Array.isArray(image.parent) ? image.parent : [image.parent];
}

/**
 * @param {object} image Catalogue layer.
 * @returns {number|null} The layer's drawing order (weapons use their facing-down order, like the replay's sheet).
 */
function layerOf(image) {
    return typeof image.layer === 'object' && image.layer !== null ? image.layer.down : image.layer;
}

/**
 * Loads an image.
 *
 * @param {string} src URL.
 * @returns {Promise<HTMLImageElement|null>}
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
 * The gladiator creator (glad-create.html): appearance layers with a live preview, then name and attributes.
 *
 * The style is the master's gladiator style (`helpers/glad-view.js`): the `'3d'` one shows the 3D gladiator with
 * wardrobe tiles that name each layer, show its colour and preview it on hover; the `'sprite'` one shows the
 * composed LPC sheet and the layer thumbnails it has always had. `currentGladView()` picks the view at start and
 * `onGladViewChange` swaps it on the same page, releasing the WebGL context when the 3D view goes away, without
 * touching the choices. Without WebGL the 3D view says so and the tiles keep working.
 */
export class SkinCreator {
    /** Layers worn, by id. */
    selected = {};
    #root;
    /** Layer ids of each sub-menu. */
    #tree = new Map();
    /** The style this creator draws (`'sprite'` or `'3d'`), and the request that mounted the current view. */
    #view = '3d';
    #viewRequest = 0;
    #canvas;
    #sheet;
    #direction = 2;
    #scale = 1;
    #playing = false;
    #move = 0;
    #frame = 0;
    #lastColor = 'black';
    #drawing = 0;
    #frameTimer = 0;
    /** @type {import('./skin-preview-3d.js').SkinPreview3D|null} The 3D gladiator, in the `'3d'` style. */
    #preview3d = null;
    /** The 3D palette's colour sampler, loaded only when a 3D tile asks for a sampled colour. */
    #colorSampler = null;
    #hoverTimer = 0;
    /** The tile whose hover preview is pending or showing. */
    #hoverItem = null;
    /** Bumped by each attribute card so an older portrait answer never replaces a newer one. */
    #portraitRequest = 0;

    /**
     * @param {HTMLElement} root The `#fog-skin` overlay.
     * @param {(glad: { name: string, vstr: number, vagi: number, vint: number, skin: string[] }) => void} onReady
     *   Called with the finished gladiator ("GERAR CÓDIGO").
     */
    constructor(root, onReady) {
        this.#root = root;
        this.onReady = onReady;
        this.#canvas = createElement(skinSpriteTemplate);
        this.#canvas.width = BIG_CELL;
        this.#canvas.height = BIG_CELL;
        this.#sheet = document.createElement('canvas');
        this.#sheet.width = BIG_CELL * 13;
        this.#sheet.height = BIG_CELL * 21;
    }

    /** Loads glad-create.html, binds it and mounts the preview of the master's style. */
    async init() {
        const markup = await site.get('glad-create.html');
        this.#root.innerHTML = typeof markup === 'string' ? markup : '';
        this.#buildTree();
        this.#find('#middle-container').append(this.#canvas);
        this.#root.querySelectorAll('.img-button.sub').forEach(button => button.classList.add('hidden'));
        this.#bindMenus();
        this.#bindPreview();
        this.#bindAttributes();
        this.#view = currentGladView();
        await this.#applyView();
        onGladViewChange(choice => {
            this.#view = choice;
            void this.#applyView();
            this.reload();
        });
        this.reload();
    }

    /**
     * Mounts the preview of this style: the 3D view (releasing any previous one) or the sprite canvas. The
     * attribute card is painted again when it is open, so it follows the new style too.
     *
     * @returns {Promise<void>}
     */
    async #applyView() {
        const request = ++this.#viewRequest;
        const sprite = this.#view !== '3d';
        this.#find('#middle-container')?.classList.toggle('is-3d', !sprite);
        if (sprite) {
            this.#destroy3d();
            this.#startFrames();
            this.#draw();
            this.#portraitIfShown();
            return;
        }
        this.#stopFrames();
        await this.#mount3d(request);
        this.#portraitIfShown();
    }

    /**
     * Mounts the 3D view; a browser or module that cannot show it gets the status line instead.
     *
     * @param {number} request The view request that asked for it.
     */
    async #mount3d(request) {
        this.#destroy3d();
        try {
            const { SkinPreview3D } = await import('./skin-preview-3d.js');
            if (request !== this.#viewRequest || this.#view !== '3d') return;
            const container = this.#find('#middle-container');
            if (!container) return;
            // the rows of buttons and items that the layout runs over the preview (they differ on a phone and a desktop)
            const controls = [...this.#root.querySelectorAll('#top-container, #left-container, #sub-container, #right-container, #bottom-container')];
            const preview = new SkinPreview3D(container, { controls });
            this.#preview3d = preview;
            preview.setMove(MOVES[this.#move].name);
            preview.setPlaying(this.#playing);
            preview.setSkin(skinOf(this.selected));
        }
        catch (error) {
            if (request !== this.#viewRequest || this.#view !== '3d') return;
            console.warn('Visual 3D do criador indisponível.', error);
            this.#showUnavailable();
        }
    }

    /** Unmounts the 3D view, releasing its WebGL context, and leaves the sprite canvas in its place. */
    #destroy3d() {
        this.#preview3d?.destroy();
        this.#preview3d = null;
        this.#find('#middle-container')?.querySelectorAll('.skin-3d, .skin-3d-status').forEach(element => element.remove());
    }

    /** Starts the sprite preview's frame clock (only while that style draws). */
    #startFrames() {
        if (this.#frameTimer) return;
        this.#frameTimer = setInterval(() => this.#renderFrame(), FRAME_MS);
    }

    /** Stops the sprite preview's frame clock (the 3D view animates itself). */
    #stopFrames() {
        clearInterval(this.#frameTimer);
        this.#frameTimer = 0;
    }

    /** Paints the attribute card again when the attributes screen is the one on show. */
    #portraitIfShown() {
        if (this.#find('#distribuicao-container')?.style.display === 'flex') this.#showPortrait();
    }

    /** Leaves the creator a status line where the 3D gladiator would be. */
    #showUnavailable() {
        const container = this.#find('#middle-container');
        if (!container) return;
        const existing = container.querySelector('.skin-3d-status');
        if (existing) {
            existing.textContent = UNAVAILABLE_STATUS;
            return;
        }
        const status = document.createElement('p');
        status.className = 'skin-3d-status';
        status.setAttribute('role', 'status');
        status.textContent = UNAVAILABLE_STATUS;
        container.append(status);
    }

    /** @param {string} selector Selector inside the creator. */
    #find(selector) {
        return this.#root.querySelector(selector);
    }

    /** @param {string} id Sub-menu id. */
    #subButton(id) {
        return this.#root.querySelector(`.img-button.sub#${CSS.escape(id)}`);
    }

    /** Groups the catalogue by sub-menu and wears the default layers. */
    #buildTree() {
        images.forEach(image => {
            if (image.parent) {
                parentsOf(image).forEach(parent => {
                    if (!this.#tree.has(parent)) this.#tree.set(parent, []);
                    this.#tree.get(parent).push(image.id);
                });
            }
            if (image.default) this.selected[image.id] = image;
        });
    }

    /** @returns {{ name: string, vstr: number, vagi: number, vint: number, skin: string[] }} The current gladiator. */
    values() {
        const [vstr, vagi, vint] = [...this.#root.querySelectorAll('#distribuicao .slider-input')].map(input => parseInt(input.value, 10) || 0);
        return {
            name: this.#find('#distribuicao #nome')?.value ?? '',
            vstr,
            vagi,
            vint,
            skin: skinOf(this.selected),
        };
    }

    /**
     * Fills the creator with a saved gladiator.
     *
     * @param {{ name: string, vstr: number, vagi: number, vint: number, skin: string }} glad
     */
    load(glad) {
        let skin = [];
        try {
            skin = JSON.parse(glad.skin);
        }
        catch {
            skin = [];
        }
        this.selected = {};
        skin.forEach(id => {
            const image = getImage(id);
            if (image) this.selected[id] = image;
        });
        this.#find('#distribuicao #nome').value = glad.name;
        this.#root.querySelectorAll('#distribuicao .slider').forEach((slider, index) => {
            slider.value = [glad.vstr, glad.vagi, glad.vint][index];
        });
        this.#updateAttributes();
        this.reload();
    }

    #bindMenus() {
        this.#root.querySelectorAll('.img-button.cat').forEach(category => category.addEventListener('click', () => {
            if (category.classList.contains('n-av')) return;
            this.#root.querySelectorAll('.img-button.cat, .img-button.sub').forEach(button => button.classList.remove('selected'));
            this.#root.querySelectorAll('.img-button.sub').forEach(button => button.classList.add('hidden'));
            MENUS[category.id].forEach(id => this.#subButton(id)?.classList.remove('hidden'));
            category.classList.add('selected');
            this.reload();
        }));

        this.#root.querySelectorAll('.img-button.sub').forEach(sub => sub.addEventListener('click', () => {
            if (sub.classList.contains('n-av')) return;
            this.#root.querySelectorAll('.img-button.sub').forEach(button => button.classList.remove('selected'));
            sub.classList.add('selected');
            this.reload();
        }));

        this.#root.querySelectorAll('.close').forEach(close => close.addEventListener('click', () => {
            this.#root.style.display = 'none';
        }));
        this.#find('#save-glad').addEventListener('click', () => this.#showAttributes());
        this.#find('#back').addEventListener('click', () => this.showAppearance());
        this.#find('#reset').addEventListener('click', () => this.#reset());
        this.#find('#get-code').addEventListener('click', () => this.#finish());
    }

    /**
     * The preview buttons. Turn and zoom act on the 3D view while it is on screen and on the sprite otherwise;
     * play/pause and the animation are shared, so either view shows the same animation.
     */
    #bindPreview() {
        this.#find('#turn').addEventListener('click', () => {
            if (this.#preview3d?.active) {
                this.#preview3d.turn();
                return;
            }
            this.#direction = (this.#direction + 1) % DIRECTIONS.length;
            this.#renderFrame();
        });
        this.#find('#down-scale').addEventListener('click', () => {
            if (this.#preview3d?.active) {
                this.#preview3d.zoomBy(-0.5);
                return;
            }
            if (this.#scale > 1) this.#scale -= 0.5;
            this.#renderFrame();
        });
        this.#find('#up-scale').addEventListener('click', () => {
            if (this.#preview3d?.active) {
                this.#preview3d.zoomBy(0.5);
                return;
            }
            if (this.#scale < 3.5) this.#scale += 0.5;
            this.#renderFrame();
        });
        const play = this.#find('#play-pause');
        play.addEventListener('click', () => {
            this.#playing = !this.#playing;
            if (!this.#playing) this.#frame = 0;
            play.querySelector('img').src = `${ICON_ROOT}${this.#playing ? 'pause' : 'play'}.png`;
            this.#preview3d?.setPlaying(this.#playing);
            this.#renderFrame();
        });
        this.#find('#animation').addEventListener('click', () => {
            const available = availableMoves(Object.values(this.selected));
            this.#setMove(nextMoveIndex(this.#move, MOVES.map(move => move.name), available));
            this.#renderFrame();
        });
    }

    /** @param {number} index Preview animation (index in `MOVES`), shown on the button and played by the visible view. */
    #setMove(index) {
        this.#move = index;
        this.#frame = 0;
        this.#find('#animation img').src = `${ICON_ROOT}${MOVES[this.#move].image}.png`;
        this.#preview3d?.setMove(MOVES[this.#move].name);
    }

    /** Draws the current frame of the sprite preview (nothing while the 3D view is the one on show). */
    #renderFrame() {
        if (this.#view !== 'sprite') return;
        const context = this.#canvas.getContext('2d');
        context.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
        if (this.#playing) this.#frame++;
        if (this.#frame >= MOVES[this.#move].sprites) this.#frame = 0;
        const row = this.#direction + MOVES[this.#move].line;
        const size = BIG_CELL * this.#scale;
        context.drawImage(this.#sheet, BIG_CELL * this.#frame, BIG_CELL * row, BIG_CELL, BIG_CELL,
            BIG_CELL / 2 - size / 2, BIG_CELL / 2 - size / 2 - 5, size, size);
    }

    /** Composes the spritesheet of the worn layers into the sprite preview's sheet. */
    async #draw() {
        if (this.#view !== 'sprite') return;
        const drawing = ++this.#drawing;
        const layers = Object.values(this.selected).sort((a, b) => (layerOf(a) ?? -1) - (layerOf(b) ?? -1));
        const loaded = await Promise.all(layers.map(layer => (
            layer.path && !layer.png ? loadImage(SPRITE_ROOT + layer.path) : null
        )));
        if (drawing !== this.#drawing || this.#view !== 'sprite') return;

        const context = this.#sheet.getContext('2d');
        context.clearRect(0, 0, this.#sheet.width, this.#sheet.height);
        loaded.forEach((image, index) => {
            if (!image) return;
            const layer = layers[index];
            if (layer.oversize) {
                const { line, sprites } = MOVES[MOVE_INDEX[layer.move]];
                for (let direction = 0; direction < 4; direction++) {
                    for (let frame = 0; frame < sprites; frame++) {
                        context.drawImage(image, frame * BIG_CELL, direction * BIG_CELL, BIG_CELL, BIG_CELL,
                            frame * BIG_CELL, (line + direction) * BIG_CELL, BIG_CELL, BIG_CELL);
                    }
                }
            }
            else {
                for (let row = 0; row < 21; row++) {
                    for (let column = 0; column < 13; column++) {
                        context.drawImage(image, column * CELL, row * CELL, CELL, CELL,
                            CELL + 3 * column * CELL, CELL + 3 * row * CELL, CELL, CELL);
                    }
                }
            }
        });
        this.#renderFrame();
    }

    /**
     * Applies the wardrobe rules (requirements, matching colours, blocked menus) and redraws: the items of the
     * open sub-menu (unless `keepItems`) and the visible preview.
     *
     * @param {boolean} [keepItems] Keep the item list as it is.
     */
    reload(keepItems = false) {
        const items = this.#find('#right-container');
        if (!keepItems) {
            clearTimeout(this.#hoverTimer);
            this.#hoverItem = null;
            items.replaceChildren();
        }
        const isOpen = id => Boolean(this.#subButton(id)?.classList.contains('selected'));

        const openMenu = this.#root.querySelector('.img-button.sub.selected')?.id;
        const visible = {};
        (this.#tree.get(openMenu) ?? []).forEach(id => {
            const image = getImage(id);
            if (parentsOf(image).some(isOpen)) visible[id] = image;
        });

        // layers whose requirements are not worn disappear
        images.forEach(image => {
            if (!image.req) return;
            const { req } = image;
            let allowed;
            if (req.or) allowed = req.or.some(id => this.selected[id]);
            else if (req.and) allowed = req.and.every(id => this.selected[id]);
            else if (req.not) allowed = !req.not.some(id => this.selected[id]);
            else allowed = Boolean(this.selected[req]);
            if (!allowed) {
                delete visible[image.id];
                delete this.selected[image.id];
            }
        });

        // a gender change drops the body, so give the new gender one
        if (!Object.values(this.selected).some(image => image.parent === 'shape')) {
            const body = this.selected.male ? 'male-light' : 'female-light';
            this.selected[body] = getImage(body);
        }

        // hair and beard styles are listed in the worn colour, and colours in the worn style
        const showMatching = (part, position, value) => images.forEach(image => {
            if (!Array.isArray(image.parent) || image.parent[position] !== part) return;
            if (image.id.split('_')[position] === value) visible[image.id] = image;
            else delete visible[image.id];
        });
        const wornPart = (part, position) => Object.values(this.selected).find(image => Array.isArray(image.parent) && image.parent[position] === part);
        if (isOpen('style')) {
            const color = wornPart('color', 1)?.id.split('_')[1] ?? this.#lastColor;
            this.#lastColor = color;
            showMatching('color', 1, color);
        }
        if (isOpen('facial')) {
            const color = wornPart('bcolor', 1)?.id.split('_')[1] ?? this.#lastColor;
            this.#lastColor = color;
            showMatching('bcolor', 1, color);
        }
        if (isOpen('color')) showMatching('style', 0, wornPart('style', 0)?.id.split('_')[0]);
        if (isOpen('bcolor')) showMatching('facial', 0, wornPart('facial', 0)?.id.split('_')[0]);

        this.#markUnavailable();
        if (!keepItems) Object.values(visible).forEach(image => this.#addItem(image));
        if (this.#view === '3d') this.#preview3d?.setSkin(skinOf(this.selected));
        else this.#draw();
    }

    /** Greys out the menus the worn layers rule out, dropping their layers. */
    #markUnavailable() {
        this.#root.querySelectorAll('.img-button.sub.n-av').forEach(button => button.classList.remove('n-av'));
        const block = id => this.#subButton(id)?.classList.add('n-av');
        if (NO_FACE.some(id => this.selected[id])) ['eyes', 'ears'].forEach(block);
        if (this.selected.hair_none) block('color');
        if (this.selected.facial_none) block('bcolor');
        if (this.selected.male_chain || this.selected.female_chain) ['shirt', 'legs'].forEach(block);

        Object.values(this.selected).forEach(image => {
            [].concat(image.block ?? []).forEach(block);
            if (image.move && parentsOf(image).some(parent => this.#subButton(parent)?.classList.contains('selected'))) {
                this.#setMove(MOVE_INDEX[image.move]);
            }
        });

        // the parts drawn behind the body follow the item that brings them
        Object.values(this.selected).forEach(image => {
            if (image.parent === 'none') delete this.selected[image.id];
        });
        Object.values(this.selected).forEach(image => {
            if (image.select) this.selected[image.select] = getImage(image.select);
        });

        this.#root.querySelectorAll('.img-button.sub.n-av').forEach(button => {
            (this.#tree.get(button.id) ?? []).forEach(id => delete this.selected[id]);
        });
    }

    /**
     * Adds a layer to the item list in the style on show: the `'3d'` style's family icon, pt-BR label and colour
     * chip (hovering or focusing previews it on the gladiator), or the `'sprite'` style's LPC thumbnail.
     *
     * @param {object} image Catalogue layer.
     */
    #addItem(image) {
        const item = document.createElement('div');
        item.className = 'img-button item';
        item.id = image.id;
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        const label = labelFor(image.id);
        item.title = label;
        item.setAttribute('aria-label', label);

        if (this.#view === 'sprite') {
            item.classList.add('sprite-item');
            this.#addSpriteThumb(item, image);
        }
        else {
            this.#addLabelTile(item, image);
        }

        if (this.selected[image.id]) item.classList.add('selected');
        this.#find('#right-container').append(item);
        this.#bindItem(item, image);
    }

    /**
     * Fills a `'3d'` wardrobe tile: family icon, pt-BR label and colour chip, and the hover preview on the 3D
     * gladiator after {@link HOVER_PREVIEW_MS}.
     *
     * @param {HTMLElement} item The tile.
     * @param {object} image Catalogue layer.
     */
    #addLabelTile(item, image) {
        const icon = document.createElement('img');
        icon.className = 'item-icon';
        icon.alt = '';
        icon.src = `${ICON_ROOT}${FAMILY_ICONS[parentsOf(image)[0]] ?? FALLBACK_ICON}`;

        const text = document.createElement('span');
        text.className = 'item-label';
        text.textContent = labelFor(image.id);

        const chip = document.createElement('span');
        chip.className = 'item-color';
        chip.setAttribute('aria-hidden', 'true');
        const colour = colorFor(image.id);
        if (colour) chip.style.backgroundColor = colour;
        else chip.classList.add('empty');

        item.append(icon, text, chip);

        const preview = () => {
            this.#hoverItem = item;
            clearTimeout(this.#hoverTimer);
            this.#hoverTimer = setTimeout(() => {
                if (this.#hoverItem === item) this.#preview3d?.setSkin([...skinOf(this.selected), image.id]);
            }, HOVER_PREVIEW_MS);
        };
        const restore = () => {
            if (this.#hoverItem !== item) return;
            this.#hoverItem = null;
            clearTimeout(this.#hoverTimer);
            this.#preview3d?.setSkin(skinOf(this.selected));
        };
        item.addEventListener('mouseenter', preview);
        item.addEventListener('focus', preview);
        item.addEventListener('mouseleave', restore);
        item.addEventListener('blur', restore);

        this.#sampleItemColour(image, chip);
    }

    /**
     * Draws a `'sprite'` wardrobe tile with the layer's own LPC thumbnail (the look the creator had before the 3D
     * view, and the one the replay composes the gladiator from).
     *
     * @param {HTMLElement} item The tile.
     * @param {object} image Catalogue layer.
     */
    #addSpriteThumb(item, image) {
        const preview = document.createElement('canvas');
        preview.width = CELL;
        preview.height = CELL;
        item.append(preview);
        // empty slots (`hair_none`) are a blank tile
        if (!image.path) return;

        loadImage(image.png ? ICON_ROOT + image.path : SPRITE_ROOT + image.path).then(source => {
            if (!source || !preview.isConnected) return;
            const context = preview.getContext('2d');
            const size = image.oversize ? BIG_CELL : CELL;
            const line = image.line ?? 10;
            const column = image.col ?? 0;
            if (image.png) {
                context.drawImage(source, 0, 0, image.width, image.height, 0, 0, CELL, CELL);
            }
            else if (image.scale) {
                context.drawImage(source, column * size, line * size, size, size,
                    size / 2 - (image.scale * size) / 2 + (image.posx ?? 0), size / 2 - (image.scale * size) / 2 + (image.posy ?? 0),
                    CELL * image.scale, CELL * image.scale);
            }
            else {
                context.drawImage(source, column * size, line * size, size, size, 0, -5, CELL, CELL);
            }
        });
    }

    /**
     * Binds the click and the keyboard of a wardrobe tile: it drops the worn layers of the same menus and wears
     * the clicked one.
     *
     * @param {HTMLElement} item The tile.
     * @param {object} image Catalogue layer.
     */
    #bindItem(item, image) {
        item.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            item.click();
        });
        item.addEventListener('click', () => {
            const parents = parentsOf(image);
            Object.values(this.selected).forEach(worn => {
                if (parentsOf(worn).some(parent => parents.includes(parent))) delete this.selected[worn.id];
            });
            this.selected[image.id] = image;
            this.#root.querySelectorAll('.img-button.item').forEach(other => other.classList.remove('selected'));
            item.classList.add('selected');
            this.reload(true);
        });
    }

    /**
     * Replaces the chip's colour with the one sampled from the layer's sprite, when the sampler knows it.
     *
     * @param {object} image Catalogue layer.
     * @param {HTMLElement} chip The tile's colour chip.
     */
    #sampleItemColour(image, chip) {
        this.#colorSampler ??= import('../render2/palette.js').then(module => module.sampleSkinColors);
        this.#colorSampler.then(sample => sample([[image.id]], images)).then(colors => {
            const colour = colorFor(image.id, colors);
            if (!colour || !chip.isConnected) return;
            chip.classList.remove('empty');
            chip.style.backgroundColor = colour;
        }).catch(() => {
            // a sprite that cannot be read keeps the colour the id names
        });
    }

    #bindAttributes() {
        const info = this.#find('#info');
        this.#root.querySelectorAll('.slider-container').forEach((container, index) => {
            const describe = () => {
                const text = ATTRIBUTE_INFO[index];
                info.querySelector('#title img').src = text.path;
                info.querySelector('#title span').textContent = text.title;
                info.querySelector('#body .fill').textContent = text.description;
                const list = info.querySelector('ul');
                list.replaceChildren(...text.list.map(item => {
                    const entry = document.createElement('li');
                    entry.innerHTML = "<div class='img-container'><img alt=''></div><span></span>";
                    entry.querySelector('img').src = item.path;
                    entry.querySelector('span').textContent = item.description;
                    return entry;
                }));
            };
            container.addEventListener('mouseenter', describe);
            container.addEventListener('touchstart', describe, { passive: true });
            container.querySelector('.slider').addEventListener('input', () => this.#updateAttributes());
        });
    }

    /** Shows each attribute's cost and the points left; "GERAR CÓDIGO" needs exactly all of them. */
    #updateAttributes() {
        let spent = 0;
        this.#root.querySelectorAll('#distribuicao .slider-container').forEach(container => {
            const { value } = container.querySelector('.slider');
            const cost = attributeCost(value);
            container.querySelector('.slider-value').textContent = cost;
            container.querySelector('.slider-input').value = value;
            spent += cost;
        });

        const remaining = this.#find('#distribuicao #remaining span');
        remaining.textContent = ATTRIBUTE_POINTS - spent;
        const button = this.#find('#get-code');
        button.disabled = spent !== ATTRIBUTE_POINTS;
        if (spent === ATTRIBUTE_POINTS) button.textContent = 'GERAR CÓDIGO';
        remaining.style.color = spent === ATTRIBUTE_POINTS ? 'var(--color-success)' : spent > ATTRIBUTE_POINTS ? 'var(--color-danger)' : 'var(--color-text-strong)';
    }

    /** "PRONTO": from the appearance to the name and attributes. */
    #showAttributes() {
        const appearance = this.#find('#skin-container');
        const attributes = this.#find('#distribuicao-container');
        attributes.style.display = 'flex';
        attributes.style.height = `${appearance.offsetHeight}px`;
        appearance.style.display = 'none';
        this.#showPortrait();
    }

    /**
     * Paints the gladiator's card portrait above its name, in the style on show: the card portrait service in 3D
     * (the placeholder picture when it cannot draw) or the sprite sheet's thumbnail. The slot stays empty only when
     * the card was replaced before the answer arrived.
     */
    async #showPortrait() {
        const slot = this.#find('#cv');
        if (!slot) return;
        const request = ++this.#portraitRequest;
        slot.replaceChildren();
        const image = await this.picture(skinOf(this.selected));
        if (request !== this.#portraitRequest || !image || !slot.isConnected) return;
        slot.replaceChildren(image);
    }

    /**
     * The picture of a gladiator for the editor's cards, drawn the way this page draws gladiators: the 3D card
     * portrait service (its placeholder picture when WebGL or the Synty pack is missing) in the `'3d'` style, or the
     * sprite sheet's down-facing walking frame in the `'sprite'` one.
     *
     * @param {string[]} skin Catalogue layer ids.
     * @param {'idle'|'dead'} [pose] Portrait pose (the sprite sheet has no idle; its walk frame stands in).
     * @returns {Promise<HTMLElement|null>} The picture, or null when there is none to draw.
     */
    async picture(skin, pose = 'idle') {
        if (this.#view !== '3d') return getSpriteThumb(await fetchSpritesheet(skin), pose === 'dead' ? 'die' : 'walk', 'down');
        try {
            const { CardPortraits } = await import('../render2/card-portrait.js');
            return await CardPortraits.get(skin, { pose });
        }
        catch (error) {
            console.warn('O retrato 3D do card está indisponível.', error);
            return createElement(gladPlaceholderTemplate);
        }
    }

    /** Back to the appearance. */
    showAppearance() {
        this.#find('#distribuicao-container').style.display = 'none';
        this.#find('#skin-container').style.display = '';
    }

    #reset() {
        this.#root.querySelectorAll('.img-button').forEach(button => button.classList.remove('selected'));
        this.#root.querySelectorAll('.img-button.sub').forEach(button => button.classList.add('hidden'));
        this.#find('#distribuicao #nome').value = '';
        this.#root.querySelectorAll('#distribuicao .slider').forEach(slider => {
            slider.value = 0;
        });
        this.#updateAttributes();
        this.selected = Object.fromEntries(images.filter(image => image.default).map(image => [image.id, image]));
        this.reload();
        this.showAppearance();
    }

    /** "GERAR CÓDIGO": validates the name and hands the gladiator over. */
    #finish() {
        const field = this.#find('#distribuicao #nome');
        if (!validGladName(field.value)) {
            field.classList.add('error');
            field.focus();
            return;
        }
        field.classList.remove('error');
        this.onReady(this.values());
    }
}

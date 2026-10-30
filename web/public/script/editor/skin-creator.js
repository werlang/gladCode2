import { site } from '../helpers/request.js';
import { getImage, images } from '../helpers/sprite-catalog.js';
import { ATTRIBUTE_POINTS, attributeCost, validGladName } from './attributes.js';

/** Sub-menus shown by each category button. */
const MENUS = {
    body: ['gender', 'shape', 'ears', 'eyes'],
    hair: ['style', 'color', 'facial', 'bcolor'],
    cloth: ['shirt', 'armor', 'legs', 'feet'],
    misc: ['head', 'shoulder', 'hands', 'cape', 'belt'],
    equip: ['melee', 'ranged', 'shield'],
};

/** Preview animations: frames, sheet row and button icon. */
const MOVES = [
    { name: 'walk', sprites: 9, line: 8, image: 'walk' },
    { name: 'cast', sprites: 7, line: 0, image: 'magic' },
    { name: 'thrust', sprites: 8, line: 4, image: 'thrust' },
    { name: 'slash', sprites: 6, line: 12, image: 'slash' },
    { name: 'shoot', sprites: 13, line: 16, image: 'arrows' },
];
const MOVE_INDEX = Object.fromEntries(MOVES.map((move, index) => [move.name, index]));
const DIRECTIONS = ['up', 'left', 'down', 'right'];

const CELL = 64;
const BIG_CELL = 192;
const SPRITE_ROOT = 'sprite/Universal-LPC-spritesheet/';
const ICON_ROOT = 'sprite/images/';
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
 * The gladiator creator (glad-create.html): appearance layers with a live
 * animated preview, then name and attributes.
 */
export class SkinCreator {
    /** Layers worn, by id. */
    selected = {};
    #root;
    /** Layer ids of each sub-menu. */
    #tree = new Map();
    #canvas = document.createElement('canvas');
    #sheet = document.createElement('canvas');
    #direction = 2;
    #scale = 1;
    #playing = false;
    #move = 0;
    #frame = 0;
    #lastColor = 'black';
    #drawing = 0;

    /**
     * @param {HTMLElement} root The `#fog-skin` overlay.
     * @param {(glad: { name: string, vstr: number, vagi: number, vint: number, skin: string[], image: HTMLCanvasElement }) => void} onReady
     *   Called with the finished gladiator ("GERAR CÓDIGO").
     */
    constructor(root, onReady) {
        this.#root = root;
        this.onReady = onReady;
        this.#canvas.width = BIG_CELL;
        this.#canvas.height = BIG_CELL;
        this.#sheet.width = BIG_CELL * 13;
        this.#sheet.height = BIG_CELL * 21;
    }

    /** Loads glad-create.html and binds it. */
    async init() {
        const markup = await site.get('glad-create.html');
        this.#root.innerHTML = typeof markup === 'string' ? markup : '';
        this.#buildTree();
        this.#find('#middle-container').append(this.#canvas);
        this.#root.querySelectorAll('.img-button.sub').forEach(button => button.classList.add('hidden'));
        this.#bindMenus();
        this.#bindPreview();
        this.#bindAttributes();
        this.reload();
        setInterval(() => this.#renderFrame(), 100);
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
            skin: Object.keys(this.selected),
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

    #bindPreview() {
        this.#find('#turn').addEventListener('click', () => {
            this.#direction = (this.#direction + 1) % 4;
            this.#draw();
        });
        this.#find('#down-scale').addEventListener('click', () => {
            if (this.#scale > 1) this.#scale -= 0.5;
        });
        this.#find('#up-scale').addEventListener('click', () => {
            if (this.#scale < 3.5) this.#scale += 0.5;
        });
        const play = this.#find('#play-pause');
        play.addEventListener('click', () => {
            this.#playing = !this.#playing;
            if (!this.#playing) this.#frame = 0;
            play.querySelector('img').src = `${ICON_ROOT}${this.#playing ? 'pause' : 'play'}.png`;
        });
        this.#find('#animation').addEventListener('click', () => {
            const available = { walk: true, cast: true, thrust: false, slash: false, shoot: false };
            Object.values(this.selected).forEach(image => {
                if (image.move) available[image.move] = true;
            });
            do {
                this.#move = (this.#move + 1) % MOVES.length;
            } while (!available[MOVES[this.#move].name]);
            this.#frame = 0;
            this.#showMoveIcon();
        });
    }

    #showMoveIcon() {
        this.#find('#animation img').src = `${ICON_ROOT}${MOVES[this.#move].image}.png`;
    }

    /** Draws the current frame of the preview. */
    #renderFrame() {
        const context = this.#canvas.getContext('2d');
        context.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
        if (this.#playing) this.#frame++;
        if (this.#frame >= MOVES[this.#move].sprites) this.#frame = 0;
        const row = this.#direction + MOVES[this.#move].line;
        const size = BIG_CELL * this.#scale;
        context.drawImage(this.#sheet, BIG_CELL * this.#frame, BIG_CELL * row, BIG_CELL, BIG_CELL,
            BIG_CELL / 2 - size / 2, BIG_CELL / 2 - size / 2 - 5, size, size);
    }

    /**
     * The drawing order of a layer for the facing direction.
     *
     * @param {object} image Catalogue layer.
     * @returns {number}
     */
    #layerOf(image) {
        if (image.layer && typeof image.layer === 'object') {
            return image.layer[DIRECTIONS[this.#direction]] ?? image.layer.default;
        }
        return image.layer;
    }

    /** Composes the spritesheet of the worn layers. */
    async #draw() {
        const drawing = ++this.#drawing;
        const layers = Object.values(this.selected).sort((a, b) => this.#layerOf(a) - this.#layerOf(b));
        const loaded = await Promise.all(layers.map(layer => (
            layer.path && !layer.png ? loadImage(SPRITE_ROOT + layer.path) : null
        )));
        if (drawing !== this.#drawing) return;

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
    }

    /**
     * Applies the wardrobe rules (requirements, matching colours, blocked
     * menus) and redraws: the items of the open sub-menu (unless `keepItems`)
     * and the preview.
     *
     * @param {boolean} [keepItems] Keep the item list as it is.
     */
    reload(keepItems = false) {
        const items = this.#find('#right-container');
        if (!keepItems) items.replaceChildren();
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
        this.#draw();
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
                this.#move = MOVE_INDEX[image.move];
                this.#showMoveIcon();
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
     * Adds a layer to the item list, with its thumbnail.
     *
     * @param {object} image Catalogue layer.
     */
    async #addItem(image) {
        const preview = document.createElement('canvas');
        preview.width = CELL;
        preview.height = CELL;
        const item = document.createElement('div');
        item.className = 'img-button item';
        item.id = image.id;
        item.append(preview);
        if (this.selected[image.id]) item.classList.add('selected');
        this.#find('#right-container').append(item);

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

        const source = await loadImage(image.png ? ICON_ROOT + image.path : SPRITE_ROOT + image.path);
        if (!source) return;
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
        this.#find('#cv').replaceChildren(this.thumbnail());
    }

    /** Back to the appearance. */
    showAppearance() {
        this.#find('#distribuicao-container').style.display = 'none';
        this.#find('#skin-container').style.display = '';
    }

    /** @returns {HTMLCanvasElement} A 64 px picture of the gladiator facing down. */
    thumbnail() {
        const thumb = document.createElement('canvas');
        thumb.width = CELL;
        thumb.height = CELL;
        thumb.getContext('2d').drawImage(this.#canvas, CELL, CELL, CELL, CELL, 0, 0, CELL, CELL);
        return thumb;
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
        this.onReady({ ...this.values(), image: this.thumbnail() });
    }
}

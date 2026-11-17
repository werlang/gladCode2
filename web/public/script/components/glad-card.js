import { currentGladView, onGladViewChange } from '../helpers/glad-view.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { Lru, skinKey, skinTokens } from '../helpers/portrait-cache.js';
import { GladiatorModel } from '../models/gladiator.js';
import { codeBlocksModalTemplate, codeModalTemplate, gladCardTemplate } from '../templates/glad-card.js';

/** The fallback picture when a portrait cannot be drawn. */
const PLACEHOLDER_SRC = '/image/glad-placeholder.svg';
/** Pixel-art frames kept in memory; a page shows a handful of cards at a time. */
const SPRITE_CACHE_LIMIT = 48;
/** The pixel-art frame of each card state. */
const SPRITE_POSES = {
    alive: { move: 'walk', direction: 'down' },
    dead: { move: 'die', direction: 'down' },
};

/** Gladiator shown by each card element. */
const cardGlads = new WeakMap();

/**
 * The page's card portrait service. This is the only place the 3D module is imported, so pixel-art cards
 * never download three or the Synty pack, and a missing module must leave the cards standing.
 *
 * @returns {Promise<import('../render2/card-portrait.js').CardPortraitService>}
 */
async function loadCardPortraits() {
    const module = await import('../render2/card-portrait.js');
    return module.CardPortraits;
}

/**
 * The LPC sprite builders. Imported on demand too, so 3D cards never fetch the sprite catalogue.
 *
 * @returns {Promise<typeof import('../helpers/spritesheet.js')>}
 */
function loadSpritesheet() {
    return import('../helpers/spritesheet.js');
}

/**
 * Paints the page's gladiator cards in the style the master chose: the 3D portrait, or the pixel-art sprite
 * (`fetchSpritesheet` + `getSpriteThumb`). Every card is registered by its `.image` slot, so a style change
 * redraws the cards already on the page in place, keeping selection, filters and pagination untouched.
 */
export class GladCardPainter {
    #document;
    #view;
    #subscribe;
    #importPortraits;
    #importSprites;
    #warn;
    /** @type {Promise<import('../render2/card-portrait.js').CardPortraitService|null>|null} */
    #portraits = null;
    /** @type {Promise<typeof import('../helpers/spritesheet.js')>|null} */
    #sprites = null;
    /** @type {Lru} */
    #thumbs = new Lru(SPRITE_CACHE_LIMIT);
    /** The live cards of the page, by their `.image` slot, with the gladiator each one shows. */
    #cards = new Map();
    /** The newest paint of each slot; a slower, older one is dropped instead of overwriting it. */
    #paints = new WeakMap();
    #warnedSprite = false;
    #listening = false;

    /**
     * @param {{
     *   document?: Document|null,
     *   view?: () => 'sprite'|'3d',
     *   subscribe?: (handler: () => void) => unknown,
     *   importPortraits?: () => Promise<import('../render2/card-portrait.js').CardPortraitService>,
     *   importSprites?: () => Promise<typeof import('../helpers/spritesheet.js')>,
     *   warn?: (...args: unknown[]) => void,
     * }} [options] Test seams: the page's document, the style read, the `gladviewchange` subscription
     *   and the two modules the cards draw with.
     */
    constructor({
        document: documentRef = globalThis.document ?? null,
        view,
        subscribe,
        importPortraits,
        importSprites,
        warn = (...args) => console.warn(...args),
    } = {}) {
        this.#document = documentRef;
        this.#view = view ?? (() => currentGladView());
        this.#subscribe = subscribe ?? (handler => onGladViewChange(handler));
        this.#importPortraits = importPortraits ?? loadCardPortraits;
        this.#importSprites = importSprites ?? loadSpritesheet;
        this.#warn = warn;
    }

    /**
     * Registers a card image and draws it in the chosen style.
     *
     * @param {ParentNode} container Holds the cards.
     * @param {number} index Card index.
     * @param {string} skin Persisted skin JSON (tokens).
     * @param {boolean} [dead] Show the death pose.
     * @returns {Promise<void>}
     */
    async set(container, index, skin, dead = false) {
        const image = container.querySelectorAll('.glad-preview .image')[index];
        if (!image) return;
        this.#listen();
        this.#sweep();
        this.#cards.set(image, { skin, dead });
        await this.#paint(image, skin, dead);
    }

    /**
     * Redraws every card already on the page in the style now chosen, in the slots the cards already have.
     *
     * @returns {Promise<void>}
     */
    async redraw() {
        this.#sweep();
        await Promise.all([...this.#cards].map(([image, card]) => this.#paint(image, card.skin, card.dead)));
    }

    /** Follows the style preference for the life of the page (one subscription). */
    #listen() {
        if (this.#listening || !this.#document) return;
        this.#listening = true;
        // the handler returns the redraw so a test can await the event it fires
        this.#subscribe(() => this.redraw());
    }

    /** Forgets the cards removed from the page, so they are not repainted or kept alive. */
    #sweep() {
        for (const image of this.#cards.keys()) {
            if (image.isConnected === false) this.#cards.delete(image);
        }
    }

    /**
     * Paints one slot, dropping its answer when a newer paint or a removed card made it stale.
     *
     * @param {Element} image The card's `.image` slot.
     * @param {string} skin
     * @param {boolean} dead
     * @returns {Promise<void>}
     */
    async #paint(image, skin, dead) {
        const paint = {};
        this.#paints.set(image, paint);
        const view = this.#view();
        const element = view === 'sprite' ? await this.#sprite(skin, dead) : await this.#portrait(skin, dead, image);
        if (this.#paints.get(image) !== paint || image.isConnected === false || !element) return;
        image.replaceChildren(element);
        image.classList.toggle('is-placeholder', element.classList.contains('is-placeholder'));
    }

    /**
     * The gladiator's 3D portrait. The portrait waits until the card is near the viewport; a failure falls
     * back to the placeholder picture.
     *
     * @param {string} skin
     * @param {boolean} dead
     * @param {Element} target The card image to wait to be visible.
     * @returns {Promise<Element|null>}
     */
    async #portrait(skin, dead, target) {
        const service = await this.#portraitService();
        if (!service) return this.#placeholder();
        try {
            const portrait = await service.get(skin, { pose: dead ? 'dead' : 'idle', target });
            if (!portrait) return this.#placeholder();
            const placeholder = portrait.classList.contains('is-placeholder');
            portrait.classList.toggle('model-3d', !placeholder);
            return portrait;
        }
        catch (error) {
            this.#warn('Gladiator card portrait failed.', error);
            return this.#placeholder();
        }
    }

    /**
     * The gladiator's pixel-art frame, cut from its LPC spritesheet. It never loads three, and a failure
     * warns once per page while the cards keep their place.
     *
     * @param {string} skin
     * @param {boolean} dead
     * @returns {Promise<Element|null>}
     */
    async #sprite(skin, dead) {
        try {
            const sprites = await this.#spriteModule();
            const thumb = await this.#thumb(sprites, skin, dead);
            const sprite = this.#copySprite(thumb);
            sprite.classList.add('sprite');
            return sprite;
        }
        catch (error) {
            if (!this.#warnedSprite) {
                this.#warnedSprite = true;
                this.#warn('Gladiator card sprites are unavailable.', error);
            }
            return this.#placeholder();
        }
    }

    /**
     * A fresh canvas with the cached frame, so every card owns its picture element.
     *
     * @param {HTMLCanvasElement} thumb
     * @returns {HTMLCanvasElement}
     */
    #copySprite(thumb) {
        const sprite = this.#document.createElement('canvas');
        sprite.width = thumb.width;
        sprite.height = thumb.height;
        sprite.getContext('2d').drawImage(thumb, 0, 0);
        return sprite;
    }

    /**
     * A pixel-art frame, built once per skin and state and kept in a small LRU.
     *
     * @param {typeof import('../helpers/spritesheet.js')} sprites
     * @param {string} skin
     * @param {boolean} dead
     * @returns {Promise<HTMLCanvasElement>}
     */
    #thumb(sprites, skin, dead) {
        const key = `${skinKey(skinTokens(skin))}|${dead ? 'dead' : 'alive'}`;
        const known = /** @type {Promise<HTMLCanvasElement>|undefined} */ (this.#thumbs.get(key));
        if (known) return known;
        const thumb = (async () => {
            const sheet = await sprites.fetchSpritesheet(skin);
            const pose = dead ? SPRITE_POSES.dead : SPRITE_POSES.alive;
            return sprites.getSpriteThumb(sheet, pose.move, pose.direction);
        })();
        this.#thumbs.set(key, thumb);
        thumb.catch(() => this.#thumbs.delete(key));
        return thumb;
    }

    /** @returns {Promise<import('../render2/card-portrait.js').CardPortraitService|null>} */
    async #portraitService() {
        if (!this.#portraits) {
            this.#portraits = (async () => {
                try {
                    return await this.#importPortraits();
                }
                catch (error) {
                    this.#warn('Gladiator card portraits are unavailable.', error);
                    return null;
                }
            })();
        }
        return this.#portraits;
    }

    /** @returns {Promise<typeof import('../helpers/spritesheet.js')>} */
    #spriteModule() {
        this.#sprites ??= this.#importSprites();
        return this.#sprites;
    }

    /** @returns {Element|null} The fallback picture, or null when there is no document to make one. */
    #placeholder() {
        if (!this.#document) return null;
        const fallback = this.#document.createElement('img');
        fallback.src = PLACEHOLDER_SRC;
        fallback.alt = '';
        fallback.classList.add('is-placeholder');
        return fallback;
    }
}

/**
 * The gladiator a card shows.
 *
 * @param {Element} card A `.glad-preview` element (or anything inside it).
 * @returns {Record<string, any>|undefined}
 */
export function gladOfCard(card) {
    return cardGlads.get(card.closest('.glad-preview'));
}

/** The page's cards, painted in the master's chosen style. */
const painter = new GladCardPainter();

/**
 * Draws a gladiator into the `index`-th card image of `container`, in the style the master chose
 * ({@link currentGladView}): the 3D portrait, or the pixel-art sprite. The picture is painted only once the
 * card is near the viewport; a failure falls back to the placeholder picture.
 *
 * @param {ParentNode} container Holds the cards.
 * @param {number} index Card index.
 * @param {string} skin Persisted skin JSON (tokens).
 * @param {boolean} [dead] Show the death pose.
 * @returns {Promise<void>}
 */
export async function setGladImage(container, index, skin, dead = false) {
    await painter.set(container, index, skin, dead);
}

/**
 * Opens a window with a gladiator's code: its blocks, or C/Python
 * highlighted by Prism.
 *
 * @param {{ code: string, blocks?: string }} glad Gladiator; its code is escaped by the template.
 */
function showCode({ code, blocks }) {
    let fog;
    if (blocks?.length) {
        fog = createElement(codeBlocksModalTemplate);
        document.body.append(fog);
        const workspace = Blockly.inject('code-ws', { scrollbars: true, readOnly: true });
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(blocks), workspace);
    }
    else {
        const language = code.includes('def loop():') ? 'python' : 'c';
        fog = createElement(renderTemplate(codeModalTemplate, { language, code }));
        document.body.append(fog);
        Prism.highlightElement(fog.querySelector('code'));
    }
    fog.querySelector('.button').addEventListener('click', () => fog.remove());
}

/**
 * Renders gladiator cards into a container.
 *
 * @param {HTMLElement} container Where the cards go.
 * @param {object} [options]
 * @param {object[]} [options.glads] Gladiators to show; the signed-in user's when omitted.
 * @param {boolean} [options.dead] Show dead gladiators (`dead` set) in the death pose.
 * @param {boolean} [options.code] Add the button that shows the gladiator's code.
 * @param {(glad: object) => void} [options.onCode] Replaces what the code button does.
 * @param {boolean} [options.master] Show the owner's nickname.
 * @param {boolean} [options.remove] Keep the delete button.
 * @param {(event: MouseEvent, glad: object, index: number) => void} [options.onClick] Card click.
 * @param {(event: MouseEvent, glad: object, index: number) => void} [options.onDoubleClick] Card double click.
 * @returns {Promise<HTMLElement[]>} The card elements.
 */
export async function loadGladCards(container, { glads, dead, code, master, remove, onClick, onDoubleClick, onCode } = {}) {
    const list = glads ?? await GladiatorModel.list();

    const cards = list.map((glad, index) => {
        const card = createElement(renderTemplate(gladCardTemplate, {
            name: glad.name,
            vstr: glad.vstr,
            vagi: glad.vagi,
            vint: glad.vint,
            master: master ? glad.master : '',
        }));
        cardGlads.set(card, glad);
        container.append(card);
        setGladImage(container, container.querySelectorAll('.glad-preview').length - 1, glad.skin, Boolean(dead && glad.dead));

        const codeButton = card.querySelector('.code .button');
        if (!code) {
            codeButton.remove();
        }
        else if (glad.code || onCode) {
            codeButton.addEventListener('click', event => {
                event.stopPropagation();
                (onCode ?? showCode)(glad);
            });
        }
        else {
            codeButton.disabled = true;
        }

        if (!remove) card.querySelector('.delete-container').remove();

        if (dead && glad.dead) {
            card.classList.add('dead');
            card.title = 'Este gladiador está morto';
        }
        if (glad.outdated) {
            card.classList.add('old');
            card.title = 'Este gladiador precisa ser atualizado';
        }

        if (onClick) card.addEventListener('click', event => onClick(event, glad, index));
        if (onDoubleClick) card.addEventListener('dblclick', event => onDoubleClick(event, glad, index));
        return card;
    });

    return cards;
}

/**
 * Renders cards the user picks one of: a click selects a card and enables
 * `button`, a double click presses it. Old (and, with `dead`, dead)
 * gladiators cannot be picked.
 *
 * @param {HTMLElement} container Where the cards go.
 * @param {HTMLButtonElement} button The confirm button.
 * @param {object} [options] {@link loadGladCards} options (`glads`, `dead`, `code`, `master`, `remove`),
 *   plus `canPick(card)` to decide which cards can be picked.
 * @returns {Promise<() => Record<string, any>|null>} Reads the picked gladiator.
 */
export async function loadSelectableCards(container, button, { canPick, ...options } = {}) {
    let selected = null;
    const selectable = canPick ?? (card => !card.classList.contains('old') && !card.classList.contains('dead'));

    await loadGladCards(container, {
        ...options,
        onClick: event => {
            const card = event.currentTarget;
            if (!selectable(card)) return;
            container.querySelectorAll('.glad-preview').forEach(other => other.classList.remove('selected'));
            card.classList.add('selected');
            selected = gladOfCard(card);
            button.disabled = false;
        },
        onDoubleClick: event => {
            if (selectable(event.currentTarget) && selected) button.click();
        },
    });
    return () => selected;
}

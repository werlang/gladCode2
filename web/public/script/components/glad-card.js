import { createElement, renderTemplate } from '../helpers/html.js';
import { fetchSpritesheet, getSpriteThumb } from '../helpers/spritesheet.js';
import { GladiatorModel } from '../models/gladiator.js';
import { codeBlocksModalTemplate, codeModalTemplate, gladCardTemplate } from '../templates/glad-card.js';

/** Gladiator shown by each card element. */
const cardGlads = new WeakMap();

/**
 * The gladiator a card shows.
 *
 * @param {Element} card A `.glad-preview` element (or anything inside it).
 * @returns {Record<string, any>|undefined}
 */
export function gladOfCard(card) {
    return cardGlads.get(card.closest('.glad-preview'));
}

/**
 * Draws a gladiator's sprite into the `index`-th card image of `container`.
 *
 * @param {ParentNode} container Holds the cards.
 * @param {number} index Card index.
 * @param {string} skin Skin JSON.
 * @param {boolean} [dead] Show the death pose.
 * @returns {Promise<void>}
 */
export async function setGladImage(container, index, skin, dead = false) {
    const sheet = await fetchSpritesheet(skin);
    const image = container.querySelectorAll('.glad-preview .image')[index];
    image?.replaceChildren(getSpriteThumb(sheet, dead ? 'die' : 'walk', 'down', 1));
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

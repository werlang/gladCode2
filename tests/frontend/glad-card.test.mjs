// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/glad-card.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { GladCardPainter } from '../../web/public/script/components/glad-card.js';

/** A class list with the parts the card painter uses. */
function fakeClassList() {
    const names = new Set();
    return {
        add: (...list) => list.forEach(name => names.add(name)),
        remove: (...list) => list.forEach(name => names.delete(name)),
        toggle: (name, on) => (on ? names.add(name) : names.delete(name)),
        contains: name => names.has(name),
    };
}

/** A DOM element stand-in with only what the painter touches. */
function fakeElement() {
    const children = [];
    const element = {
        isConnected: true,
        width: 0,
        height: 0,
        children,
        classList: fakeClassList(),
        replaceChildren: (...nodes) => children.splice(0, children.length, ...nodes),
        getContext: () => ({ drawImage: () => {} }),
    };
    return element;
}

/** A container whose cards are these slots. */
function fakeContainer(slots) {
    return {
        slots,
        querySelectorAll: selector => (selector === '.glad-preview .image' ? slots : []),
    };
}

/** A document that makes image elements. */
const fakeDocument = { createElement: () => fakeElement() };

/** The sprite module stand-in (no three, no assets). */
function fakeSprites({ thumb = fakeElement(), onCut = () => {} } = {}) {
    return {
        fetchSpritesheet: async () => fakeElement(),
        getSpriteThumb: (sheet, move, direction) => {
            onCut(move, direction);
            return thumb;
        },
    };
}

/** @returns {{ painter: GladCardPainter, listeners: Array<(choice: string) => Promise<void>> }} */
function fakePainter(options) {
    const listeners = [];
    const painter = new GladCardPainter({
        document: fakeDocument,
        subscribe: handler => {
            listeners.push(handler);
            return () => {};
        },
        warn: () => {},
        ...options,
    });
    return { painter, listeners };
}

test('a sprite card never imports the 3D portrait, and a style change repaints its slot in place', async () => {
    let view = 'sprite';
    let portraitImports = 0;
    const slot = fakeElement();
    const container = fakeContainer([slot]);
    const portrait = fakeElement();
    const { painter, listeners } = fakePainter({
        view: () => view,
        importPortraits: async () => {
            portraitImports++;
            return { get: async () => portrait };
        },
        importSprites: async () => fakeSprites(),
    });

    await painter.set(container, 0, '["male","male-light"]');

    assert.equal(portraitImports, 0, 'the sprite style must not import render2/card-portrait.js');
    assert.equal(slot.children.length, 1);
    assert.equal(slot.children[0].classList.contains('sprite'), true);
    assert.equal(slot.classList.contains('is-placeholder'), false);
    assert.equal(listeners.length, 1, 'the card list follows the gladviewchange event');

    view = '3d';
    await listeners[0]('3d');

    assert.equal(portraitImports, 1, 'the 3D style imports the portrait module');
    assert.equal(container.querySelectorAll('.glad-preview .image')[0], slot, 'the slot is not recreated');
    assert.equal(slot.children.length, 1);
    assert.equal(slot.children[0], portrait, 'the portrait is the slot content now');
    assert.equal(portrait.classList.contains('model-3d'), true);
});

test('a dead gladiator gets the pixel-art death pose', async () => {
    const cuts = [];
    const slot = fakeElement();
    const { painter } = fakePainter({
        view: () => 'sprite',
        importSprites: async () => fakeSprites({ onCut: (move, direction) => cuts.push([move, direction]) }),
    });

    await painter.set(fakeContainer([slot]), 0, '[]', true);

    assert.deepEqual(cuts, [['die', 'down']]);
    assert.equal(slot.children[0].classList.contains('sprite'), true);
});

test('a failing spritesheet keeps the list and warns once per page', async () => {
    const warnings = [];
    const slots = [fakeElement(), fakeElement()];
    const { painter } = fakePainter({
        view: () => 'sprite',
        importPortraits: async () => {
            throw new Error('the sprite style must not import the portrait module');
        },
        importSprites: async () => ({
            fetchSpritesheet: async () => {
                throw new Error('the spritesheet cannot be built');
            },
            getSpriteThumb: () => fakeElement(),
        }),
        warn: (...args) => warnings.push(args),
    });

    await Promise.all([
        painter.set(fakeContainer(slots), 0, '[]'),
        painter.set(fakeContainer(slots), 1, '["male"]'),
    ]);

    for (const slot of slots) {
        assert.equal(slot.children.length, 1, 'the card keeps a picture');
        assert.equal(slot.children[0].src, '/image/glad-placeholder.svg');
        assert.equal(slot.children[0].classList.contains('is-placeholder'), true);
        assert.equal(slot.classList.contains('is-placeholder'), true);
    }
    assert.equal(warnings.length, 1, 'one warning per page');
});

test('a 3D portrait that cannot be drawn falls back to the placeholder picture', async () => {
    const warnings = [];
    const slot = fakeElement();
    const { painter } = fakePainter({
        view: () => '3d',
        importPortraits: async () => {
            throw new Error('WebGL2 is not available');
        },
        warn: (...args) => warnings.push(args),
    });

    await painter.set(fakeContainer([slot]), 0, '[]');

    assert.equal(slot.children[0].src, '/image/glad-placeholder.svg');
    assert.equal(slot.children[0].classList.contains('is-placeholder'), true);
    assert.equal(slot.classList.contains('is-placeholder'), true);
    assert.equal(warnings.length, 1);
});

test('a slow 3D portrait never overwrites the sprite drawn after the style change', async () => {
    let view = '3d';
    let requestPortrait;
    let releasePortrait;
    const portraitRequested = new Promise(resolve => {
        requestPortrait = resolve;
    });
    const portrait = fakeElement();
    const slot = fakeElement();
    const { painter, listeners } = fakePainter({
        view: () => view,
        importPortraits: async () => ({
            get: () => {
                requestPortrait();
                return new Promise(resolve => {
                    releasePortrait = resolve;
                });
            },
        }),
        importSprites: async () => fakeSprites(),
    });

    const painting = painter.set(fakeContainer([slot]), 0, '[]');
    await portraitRequested;

    view = 'sprite';
    await listeners[0]('sprite');
    assert.equal(slot.children[0].classList.contains('sprite'), true);

    releasePortrait(portrait);
    await painting;

    assert.equal(slot.children[0].classList.contains('sprite'), true, 'the stale portrait was dropped');
    assert.notEqual(slot.children[0], portrait);
});

// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wp4-components.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

/** A tiny node with everything the two components touch. */
function fakeNode() {
    const classes = new Set();
    const children = new Map();
    const node = {
        dataset: {}, textContent: '', hidden: false, disabled: false, role: '', className: '',
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: name => classes.has(name),
        },
        querySelector: selector => {
            if (selector === '.save-status-retry') return null;
            if (!children.has(selector)) children.set(selector, fakeNode());
            return children.get(selector);
        },
        querySelectorAll: () => [],
        append: () => {},
        replaceChildren: () => {},
        addEventListener: () => {},
        dispatchEvent: () => true,
        setAttribute: (name, value) => { node[name] = value; },
        getAttribute: name => node[name] ?? null,
        focus: () => {},
    };
    return node;
}

globalThis.document = {
    createElement: () => {
        const template = fakeNode();
        template.content = { firstElementChild: fakeNode() };
        return template;
    },
    body: fakeNode(),
};

const { ChoiceCards } = await import('../../web/public/script/components/choice-cards.js');
const { SaveStatus } = await import('../../web/public/script/components/save-status.js');

test('choice cards select, clear and expose their value', () => {
    const cards = new ChoiceCards({ element: fakeNode(), variant: 'preview', label: 'Tema' });
    cards.setOptions([
        { value: 'arena-light', title: 'Arena claro' },
        { value: 'arena-dark', title: 'Arena escuro' },
    ]);
    assert.equal(cards.value, null);
    cards.set('arena-dark');
    assert.equal(cards.value, 'arena-dark');
    cards.clear();
    assert.equal(cards.value, null);
});

test('save status exposes saved and error states without a retry action', () => {
    const status = new SaveStatus();
    status.set('saved', 'Salvo');
    assert.equal(status.element.dataset.state, 'saved');
    assert.equal(status.element.querySelector('.save-status-text').textContent, 'Salvo');
    assert.equal(status.element.hidden, false);
    status.set('error', 'Não foi possível salvar');
    assert.equal(status.element.dataset.state, 'error');
    assert.equal(status.element.querySelector('.save-status-retry'), null);
    status.set('idle', 'Disponível · salva quando você sai do campo');
    assert.equal(status.element.dataset.state, 'idle');
});

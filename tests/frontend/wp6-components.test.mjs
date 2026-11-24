// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/wp6-components.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

/** A tiny node with everything the components touch. */
function fakeNode() {
    const classes = new Set();
    const attributes = new Map();
    const children = new Map();
    const node = {
        dataset: {}, textContent: '', hidden: false, disabled: false, className: '', title: '',
        replaced: 0, inserted: [], listeners: new Map(),
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: name => classes.has(name),
        },
        querySelector: selector => {
            if (!children.has(selector)) {
                const appended = node.appended?.find(child => child.className && selector.startsWith('.') && child.className === selector.slice(1));
                children.set(selector, appended ?? fakeNode());
            }
            return children.get(selector);
        },
        querySelectorAll: () => [],
        appended: [],
        append: (...nodes) => node.appended.push(...nodes),
        replaceChildren: () => { node.replaced += 1; },
        insertAdjacentHTML: (position, html) => node.inserted.push([position, html]),
        addEventListener: (name, listener) => node.listeners.set(name, listener),
        dispatchEvent: () => true,
        setAttribute: (name, value) => attributes.set(name, value),
        getAttribute: name => attributes.get(name) ?? null,
        removeAttribute: name => attributes.delete(name),
        hasAttribute: name => attributes.has(name),
        focus: () => {},
    };
    return node;
}

globalThis.document = {
    createElement: () => {
        const node = fakeNode();
        node.content = { firstElementChild: fakeNode() };
        return node;
    },
    body: fakeNode(),
};

const { potionFilters, potionKind, potionKindLabel } = await import('../../web/public/script/helpers/potion-kind.js');
const { formatRemaining } = await import('../../web/public/script/helpers/potion-time.js');
const { ResultPill } = await import('../../web/public/script/components/result-pill.js');
const { FormStreak } = await import('../../web/public/script/components/form-streak.js');
const { PotionCard } = await import('../../web/public/script/components/potion-card.js');
const { PotionSlot } = await import('../../web/public/script/components/potion-slot.js');

test('a potion kind comes from its engine identifier and the chips only list kinds on sale', () => {
    assert.equal(potionKind('pot-hp-1'), 'hp');
    assert.equal(potionKind('pot-ap-5'), 'ap');
    assert.equal(potionKind('pot-high-1'), 'attr');
    assert.equal(potionKind('pot-low-4'), 'attr');
    assert.equal(potionKind('pot-xp-3'), 'xp');
    assert.equal(potionKind('unknown'), 'hp');
    assert.equal(potionKindLabel('attr'), 'Atributos');
    assert.equal(potionKindLabel('nope'), 'Vida');
    assert.deepEqual(
        potionFilters([{ kind: 'hp' }, { kind: 'xp' }, { kind: 'hp' }]).map(entry => entry.value),
        ['all', 'hp', 'xp'],
    );
    assert.deepEqual(potionFilters([]), [{ value: 'all', label: 'Todas' }]);
});

test('remaining potion time reads as compact hours, minutes and seconds', () => {
    assert.equal(formatRemaining(3725), '1h 2m 5s');
    assert.equal(formatRemaining(65), '1m 5s');
    assert.equal(formatRemaining(9), '9s');
    assert.equal(formatRemaining(-3), '0s');
});

test('a result pill names the placing and takes the medal tone only for the first three', () => {
    const element = fakeNode();
    const pill = new ResultPill({ element, place: 2, total: 5 });
    assert.equal(element.textContent, '2º de 5');
    assert.equal(element.dataset.tone, 'silver');
    assert.equal(element.getAttribute('aria-label'), '2º de 5');

    pill.set(1, 3);
    assert.equal(element.dataset.tone, 'gold');
    pill.set(3, 3);
    assert.equal(element.dataset.tone, 'bronze');
    pill.set(4, 5);
    assert.equal(element.dataset.tone, 'neutral');
    pill.set(null, 0);
    assert.equal(element.textContent, '—');
    assert.equal(element.getAttribute('aria-label'), 'Resultado não registrado');
});

test('the form streak paints one tile per known result, with draws as E', () => {
    const element = fakeNode();
    const streak = new FormStreak({ element });
    const label = element.querySelector('.form-streak-label');
    const tiles = element.querySelector('.form-streak-tiles');

    streak.set(['win', 'loss', 'draw', { result: 'win' }, { won: false }]);

    assert.equal(label.textContent, 'Últimas 10 batalhas');
    assert.equal(tiles.inserted.length, 5);
    assert.match(tiles.inserted[0][1], /data-result='win'/);
    assert.match(tiles.inserted[0][1], /Venceu/);
    assert.match(tiles.inserted[2][1], /data-result='draw'/);
    assert.match(tiles.inserted[2][1], /Empate/);
    assert.match(tiles.inserted[4][1], /data-result='loss'/);
    assert.equal(element.getAttribute('aria-label'), 'Últimas 10 batalhas');
});

test('an empty form streak shows a dash instead of ten false losses', () => {
    const element = fakeNode();
    const streak = new FormStreak({ element });

    streak.set([]);

    const tiles = element.querySelector('.form-streak-tiles');
    assert.equal(tiles.inserted.length, 0);
    assert.equal(tiles.querySelector('.form-streak-empty').textContent, '—');
    assert.equal(tiles.querySelector('.form-streak-empty').getAttribute('aria-label'), 'Nenhuma batalha registrada');
});

test('a catalogue row without a description or level still renders', () => {
    const element = fakeNode();
    const card = new PotionCard({ element, potion: {
        identifier: 'pot-hp-2', name: 'Sem descrição', level: null, price: 80, kind: 'hp',
    } });
    const description = element.querySelector('.potion-card-description');

    assert.equal(element.querySelector('.potion-card-code').textContent, 'nível — · useItem("pot-hp-2")');
    assert.equal(description.textContent, '');
    assert.equal(description.hidden, true);
    assert.equal(card.potion.identifier, 'pot-hp-2');
});

test('a potion card shows the real identifier and disables the order with its reason', () => {
    const element = fakeNode();
    const card = new PotionCard({ element, potion: {
        identifier: 'pot-hp-2', name: 'Poção de Vida II', level: 2, price: 80, kind: 'hp', description: 'Recupera vida.',
    } });
    const button = element.querySelector('.potion-card-order');

    assert.equal(element.querySelector('.potion-card-name').textContent, 'Poção de Vida II');
    assert.equal(element.querySelector('.potion-card-code').textContent, 'nível 2 · useItem("pot-hp-2")');
    assert.equal(element.querySelector('.potion-card-description').textContent, 'Recupera vida.');
    assert.equal(element.querySelector('.potion-card-price span').textContent, '80');
    assert.equal(button.disabled, false);
    assert.equal(button.textContent, 'Encomendar');

    card.setUnlocked(false, 4);
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, 'Apotecário nível 4');

    card.setUnlocked(true);
    card.setUnavailable('Sem compartimento');
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, 'Sem compartimento');

    card.setUnavailable('');
    card.setBusy(true);
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, 'Encomendando…');
    assert.equal(element.getAttribute('aria-busy'), 'true');
});

test('a potion slot shows its compartment, empty and locked states', () => {
    const element = fakeNode();
    const slot = new PotionSlot({ element, index: 1 });
    const name = element.querySelector('.potion-slot-name');
    const sub = element.querySelector('.potion-slot-sub');
    const cancel = element.querySelector('.potion-slot-cancel');

    assert.equal(element.dataset.state, 'empty');
    assert.equal(name.textContent, 'Vazio');
    assert.equal(sub.textContent, 'Escolha uma poção abaixo');
    assert.equal(cancel.hidden, true);

    slot.setLocked(25);
    assert.equal(element.dataset.state, 'locked');
    assert.equal(name.textContent, 'Bloqueado');
    assert.equal(sub.textContent, 'Abre no nível de mestre 25');
    assert.equal(cancel.hidden, true);

    slot.setEmpty();
    assert.equal(element.dataset.state, 'empty');
    assert.equal(element.dataset.kind, undefined);
});

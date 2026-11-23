// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/primitives.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { badgeText } = await import('../../web/public/script/components/badge.js');
const { initials } = await import('../../web/public/script/components/avatar.js');
const { pageList, parsePosition, paginationFocusSelector } = await import('../../web/public/script/components/pagination.js');
const { nextTabIndex, tabPanelIds } = await import('../../web/public/script/components/tabs.js');
const { potionTime, xpToNextLevel } = await import('../../web/public/script/components/painel-menu.js');
const { nextOptionIndex } = await import('../../web/public/script/components/segmented-control.js');
const { toastOptions } = await import('../../web/public/script/components/toast.js');
const { searchQuery } = await import('../../web/public/script/components/search-field.js');
const { Switch } = await import('../../web/public/script/components/switch.js');
const { emptyStateTemplate } = await import('../../web/public/script/templates/empty-state.js');
const { renderTemplate } = await import('../../web/public/script/helpers/html.js');

test('badgeText hides zero, shows the count and caps at 99+', () => {
    assert.equal(badgeText(0), '');
    assert.equal(badgeText(4), '4');
    assert.equal(badgeText(99), '99');
    assert.equal(badgeText(120), '99+');
});

test('initials use the first letters of the first two words', () => {
    assert.equal(initials('Spartacus_C'), 'S');
    assert.equal(initials('Ana Lux'), 'AL');
    assert.equal(initials('  marco   dev '), 'MD');
    assert.equal(initials(''), '?');
});

test('pageList keeps small rankings whole and windows large ones with gaps', () => {
    assert.deepEqual(pageList(1, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(pageList(9, 164), [1, '…', 7, 8, 9, 10, 11, '…', 164]);
    assert.deepEqual(pageList(1, 20), [1, 2, 3, '…', 20]);
    assert.deepEqual(pageList(20, 20), [1, '…', 18, 19, 20]);
});

test('parsePosition accepts positive integers and clamps to the total', () => {
    assert.equal(parsePosition('128', 482), 128);
    assert.equal(parsePosition(' 999 ', 482), 482);
    assert.equal(parsePosition('0', 482), null);
    assert.equal(parsePosition('abc', 482), null);
    assert.equal(parsePosition('', 482), null);
});

test('tab and option focus wraps at both ends', () => {
    assert.equal(nextTabIndex(0, -1, 3), 2);
    assert.equal(nextTabIndex(2, 1, 3), 0);
    assert.equal(nextOptionIndex(1, 1, 2), 0);
    assert.equal(nextTabIndex(0, 1, 0), -1);
});

test('tab and panel ids pair every tab with exactly one panel', () => {
    const pairs = ['ranked', 'duels', 'favorites'].map(tabPanelIds);
    assert.deepEqual(pairs, [
        { tab: 'tab-ranked', panel: 'panel-ranked' },
        { tab: 'tab-duels', panel: 'panel-duels' },
        { tab: 'tab-favorites', panel: 'panel-favorites' },
    ]);
    assert.equal(new Set(pairs.flatMap(pair => [pair.tab, pair.panel])).size, 6);
});

test('toastOptions keeps the old string type and gives an action more time', () => {
    assert.deepEqual(toastOptions('success'), { type: 'success', duration: 2000, action: null });
    const action = { label: 'Desfazer', onClick: () => {} };
    assert.deepEqual(toastOptions({ action }), { type: 'info', duration: 6000, action });
    assert.deepEqual(toastOptions({ type: 'error', duration: 9000 }), { type: 'error', duration: 9000, action: null });
    assert.deepEqual(toastOptions({ type: 'nope' }).type, 'info');
});

test('searchQuery trims without changing the inner text', () => {
    assert.equal(searchQuery('  rel '), 'rel');
    assert.equal(searchQuery(null), '');
});

test('a switch starts unchecked and toggles aria-checked on click', () => {
    const attributes = new Map();
    const listeners = new Map();
    const element = {
        disabled: false,
        setAttribute: (name, value) => attributes.set(name, value),
        getAttribute: name => attributes.get(name) ?? null,
        hasAttribute: name => attributes.has(name),
        removeAttribute: name => attributes.delete(name),
        addEventListener: (name, listener) => listeners.set(name, listener),
        dispatchEvent(event) { listeners.get(event.type)?.(event); },
    };
    const switchControl = new Switch({ element, checked: false });
    const seen = [];
    element.addEventListener = (name, listener) => listeners.set(name, listener);
    element.addEventListener('change', event => seen.push(event.detail));

    assert.equal(switchControl.checked, false);
    element.dispatchEvent({ type: 'click' });
    assert.equal(switchControl.checked, true);
    assert.deepEqual(seen, [{ checked: true }]);
});

test('the empty state template escapes its text and inserts a caller-built action', () => {
    const html = renderTemplate(emptyStateTemplate, {
        variantClass: 'compact',
        icon: 'inbox',
        title: '<Nada>',
        summary: 'Nenhum & nenhuma',
        actionHtml: "<button class='button'>Criar</button>",
    });
    assert.match(html, /&lt;Nada&gt;/);
    assert.match(html, /Nenhum &amp; nenhuma/);
    assert.match(html, /<button class='button'>Criar<\/button>/);
});

test('the rail formats the master XP rule and the potion countdown', () => {
    assert.equal(Math.round(xpToNextLevel(12)), 3094);
    assert.equal(potionTime({ serverNow: '2026-01-01 10:00:00', nextExpiry: '2026-01-01 13:00:00' }), '3 h');
    assert.equal(potionTime({ serverNow: '2026-01-01 10:00:00', nextExpiry: '2026-01-01 10:12:00' }), '12 min');
    assert.equal(potionTime({ serverNow: '2026-01-01 10:00:00', nextExpiry: null }), '');
});

test('page changes focus the equivalent control or the new current page', () => {
    assert.equal(paginationFocusSelector('prev'), '[aria-label="Página anterior"]');
    assert.equal(paginationFocusSelector('next'), '[aria-label="Próxima página"]');
    assert.equal(paginationFocusSelector('page'), '.pagination-page[aria-current="page"]');
});

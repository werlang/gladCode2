// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/painel-route.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { resolveRoute, sectionUrl, sectionTitle } = await import('../../web/public/script/helpers/painel-route.js');

test('the Painel routes resolve to one shared state', () => {
    assert.deepEqual(resolveRoute('http://x/news'), { section: 'news', subtab: '', query: {} });
    assert.deepEqual(resolveRoute('/potion'), { section: 'potions', subtab: '', query: {} });
    assert.deepEqual(resolveRoute('/reports'), { section: 'report', subtab: '', query: {} });
    assert.deepEqual(resolveRoute('/battle.duel'), { section: 'battle', subtab: 'duel', query: {} });
    assert.deepEqual(resolveRoute('/profile?t=battle&s=train'), { section: 'battle', subtab: 'train', query: {} });
    assert.deepEqual(resolveRoute('/ranking?at=128&q=Magnus'), { section: 'ranking', subtab: '', query: { at: 128, q: 'Magnus' } });
    assert.deepEqual(resolveRoute('/messages/7'), { section: 'messages', subtab: '', query: { userId: 7 } });
});

test('unknown paths and tabs fall back safely', () => {
    assert.equal(resolveRoute('/editor'), null);
    assert.deepEqual(resolveRoute('/profile?t=unknown'), { section: 'profile', subtab: '', query: {} });
    assert.deepEqual(resolveRoute('/ranking?at=-4'), { section: 'ranking', subtab: '', query: {} });
    assert.equal(resolveRoute('/battle.nope'), null);
});

test('sectionUrl writes only URLs the resolver reads', () => {
    for (const state of [
        { section: 'news', subtab: '', query: {} },
        { section: 'battle', subtab: 'duel', query: {} },
        { section: 'ranking', subtab: '', query: { at: 128 } },
        { section: 'messages', subtab: '', query: { userId: 7 } },
    ]) {
        assert.deepEqual(resolveRoute(sectionUrl(state)), state);
    }
    assert.equal(sectionTitle('report'), 'Relatórios');
});

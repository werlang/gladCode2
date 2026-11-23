// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/command-search.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const { searchShell, PAINEL_COMMANDS } = await import('../../web/public/script/services/command-search.js');
const { SearchModel } = await import('../../web/public/script/models/search.js');
const { FunctionDocsModel } = await import('../../web/public/script/models/function-docs.js');

test('palette results keep the section shortcut hints', async () => {
    const originalSearch = SearchModel.query;
    const originalDocs = FunctionDocsModel.all;
    SearchModel.query = async () => ({ gladiators: [], masters: [] });
    FunctionDocsModel.all = async () => ({});
    try {
        const { groups } = await searchShell('rel');
        const report = groups[0].items.find(item => item.section === 'report');
        assert.equal(report.key, 'G R');
        assert.equal(PAINEL_COMMANDS.find(command => command.section === 'news').key, 'G N');
    }
    finally {
        SearchModel.query = originalSearch;
        FunctionDocsModel.all = originalDocs;
    }
});

test('a gladiator result shows renown and opens the filtered ranking', async () => {
    const originalSearch = SearchModel.query;
    const originalDocs = FunctionDocsModel.all;
    SearchModel.query = async () => ({
        gladiators: [{ id: 42, name: 'Magnus', master: 'bytewolf', mmr: 1482.4 }],
        masters: [],
    });
    FunctionDocsModel.all = async () => ({});
    try {
        const { groups } = await searchShell('Magnus');
        const remote = groups.find(group => group.title === 'Gladiadores e mestres');
        assert.equal(remote.items[0].href, '/ranking?q=Magnus');
        assert.equal(remote.items[0].sub, 'de bytewolf · 1.482 renome');
        assert.doesNotMatch(remote.items[0].sub, /#42|#\d/);
    }
    finally {
        SearchModel.query = originalSearch;
        FunctionDocsModel.all = originalDocs;
    }
});

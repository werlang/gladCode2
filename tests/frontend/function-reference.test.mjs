// Run: docker run --rm -v "$PWD":/w -w /w node:22-alpine node --test tests/frontend/*.test.mjs
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../web/public/script/', import.meta.url);
const functionsDir = new URL('functions/', root);
const samplesDir = new URL('functions/samples/', root);

/** @param {URL} url @returns {Promise<any>} */
const readJson = async url => JSON.parse(await readFile(url, 'utf8'));

test('the generated function reference includes every JavaScript contract and sample', async () => {
    const files = (await readdir(functionsDir)).filter(file => file.endsWith('.json')).sort();
    const functions = {};
    for (const file of files) {
        const definition = await readJson(new URL(file, functionsDir));
        const name = file.replace(/\.json$/, '');
        functions[name] = definition;
        assert.equal(typeof definition.syntax?.javascript, 'string', `${name}: JavaScript syntax`);
        assert.equal(typeof definition.snippet?.javascript, 'string', `${name}: JavaScript snippet`);
        assert.equal(typeof definition.sample?.javascript, 'string', `${name}: JavaScript sample`);
        for (const [language, sampleFile] of Object.entries(definition.sample ?? {})) {
            await readFile(new URL(sampleFile, samplesDir), 'utf8');
            const extensions = { c: 'c', python: 'py', javascript: 'js', blocks: 'xml', explain: 'txt' };
            assert.ok(sampleFile.endsWith(`.${extensions[language]}`), `${name}: ${language} sample suffix`);
        }
    }

    assert.deepEqual(await readJson(new URL('functions.json', root)), functions);
    const bundles = (await readdir(samplesDir)).filter(file => file.endsWith('.json')).sort();
    for (const file of bundles) {
        const bundle = await readJson(new URL(file, samplesDir));
        assert.equal(typeof bundle.javascript, 'string', `${file}: bundled JavaScript sample`);
        assert.equal(bundle.javascript, await readFile(new URL(`${file.replace(/\.json$/, '.js')}`, samplesDir), 'utf8'));
    }
});

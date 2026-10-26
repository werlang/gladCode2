/**
 * Builds the API reference bundles the docs and the editor load: `public/script/functions.json`
 * (every `public/script/functions/<name>.json`, keyed by name) and one
 * `public/script/functions/samples/<sample>.json` per sample (its code in each language and its
 * explanation). Run it after editing a function or a sample.
 *
 * Usage (repo root): docker run --rm -v "$PWD":/w -w /w node:22-alpine node web/scripts/compress-functions.js
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SCRIPT = path.join(import.meta.dirname, '../public/script');
const FUNCTIONS = path.join(SCRIPT, 'functions');
const SAMPLES = path.join(FUNCTIONS, 'samples');

/** @param {string} file @returns {string} The file name without its extension. */
const baseName = file => file.split('.')[0];

const entries = (await readdir(FUNCTIONS, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name)
    .sort();
const functions = {};
for (const file of entries) functions[baseName(file)] = JSON.parse(await readFile(path.join(FUNCTIONS, file), 'utf8'));
await writeFile(path.join(SCRIPT, 'functions.json'), JSON.stringify(functions));

// each sample's files ('36.c', '36.py', '36.txt', ...) gathered by the languages the functions use them in
const samples = new Map();
for (const definition of Object.values(functions)) {
    for (const [language, file] of Object.entries(definition.sample ?? {})) {
        const sample = samples.get(baseName(file)) ?? {};
        sample[language] ??= await readFile(path.join(SAMPLES, file), 'utf8');
        samples.set(baseName(file), sample);
    }
}
for (const [name, sample] of samples) await writeFile(path.join(SAMPLES, `${name}.json`), JSON.stringify(sample));

console.log(`${entries.length} functions, ${samples.size} samples`);

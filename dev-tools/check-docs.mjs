// Check the repository documents: every relative Markdown link resolves and the repository paths
// written in code spans exist (templates with placeholders and globs are skipped).
//
// Run: node dev-tools/check-docs.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'data', '.orchestration', 'web/public/assets', 'web/public/sprite/Universal-LPC-spritesheet']);
const ROOTS = ['web/', 'api/', 'runner/', 'Payload/', 'migrations/', 'dev-tools/', 'tests/', 'docs/', '.agents/', '.github/'];
const files = [];
const walk = directory => {
    for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        const rel = relative(ROOT, path);
        if ([...SKIP].some(prefix => rel === prefix || rel.startsWith(`${prefix}/`))) continue;
        if (statSync(path).isDirectory()) walk(path);
        else if (extname(path) === '.md') files.push(path);
    }
};
walk(ROOT);

const errors = [];
let links = 0;
let paths = 0;
const skipPath = value => !value || /[<>{}*$?|]|\s|\.\.\.|^https?:|^mailto:|^#|NNN/.test(value) || !ROOTS.some(prefix => value.startsWith(prefix));

for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    for (const result of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        const target = result[1];
        if (/^(?:https?:|mailto:|#)/.test(target) || target.includes('|')) continue;
        links += 1;
        const clean = decodeURIComponent(target.split('#')[0].split('?')[0]);
        if (!clean || clean.startsWith('/')) continue;
        const resolved = resolve(dirname(file), clean);
        if (!existsSync(resolved)) errors.push(`${rel}: link ${target}`);
    }
    for (const result of text.matchAll(/`([^`\n]+)`/g)) {
        const value = result[1].trim().replace(/:\d+(?:-\d+)?$/, '').replace(/[.,;:]+$/, '');
        if (skipPath(value)) continue;
        paths += 1;
        if (!existsSync(resolve(ROOT, value))) errors.push(`${rel}: path \`${value}\``);
    }
}

if (errors.length) {
    console.error(`check-docs: ${errors.length} unresolved reference(s) in ${files.length} Markdown files`);
    for (const error of errors) console.error(`  ${error}`);
    process.exitCode = 1;
}
else {
    console.log(`check-docs: ${files.length} Markdown files, ${links} relative links, ${paths} repository paths, all resolved`);
}

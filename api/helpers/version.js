import { readFileSync } from 'node:fs';
import path from 'node:path';

/** The released engine version (`api/version`), read once. Gladiators saved on another version are outdated. */
export const VERSION = readFileSync(path.join(import.meta.dirname, '../version'), 'utf8').trim();

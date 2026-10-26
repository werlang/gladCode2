import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CustomError } from '../helpers/error.js';
import { readDeclarations } from '../helpers/gladiator-code.js';
import { Mysql } from '../helpers/mysql.js';

const SAMPLES = path.join(import.meta.dirname, '../samples/gladbots');

/** The sample gladiators (`api/samples/gladbots/<file>.c`), by name, used as editor opponents. */
export const SAMPLE_FILES = {
    Arch: 'Arch', Archie: 'Archie', Blinker: 'Blinker', Mage: 'Mage', Magnus: 'Magnus', Patient: 'Patient',
    Rogue: 'Rogue', Rouge: 'Rouge', Runner: 'Runner', Wanderer: 'Wanderer', 'War Maker': 'WarMaker', Warrior: 'Warrior',
};

/** The strongest samples, fought by every gladiator before it can be saved. */
export const SAVE_TEST_SAMPLES = ['Archie', 'War Maker', 'Magnus', 'Rouge'];

/**
 * A sample gladiator read from its source file.
 */
export class SampleGladiator {
    /**
     * @param {string} name A key of {@link SAMPLE_FILES}.
     * @returns {Promise<{ name: string, vstr: number, vagi: number, vint: number, skin: string|null, code: string }>}
     *   `code` is the full source with its setup(); `skin` the skin JSON text.
     * @throws {CustomError} 404 `SAMPLE_NOT_FOUND`.
     */
    static async find(name) {
        const file = Object.hasOwn(SAMPLE_FILES, name) ? SAMPLE_FILES[name] : null;
        if (!file) throw new CustomError(404, 'Sample gladiator not found.', 'SAMPLE_NOT_FOUND');

        const code = await readFile(path.join(SAMPLES, `${file}.c`), 'utf8');
        const { spritesheet, ...declared } = readDeclarations(code);
        const skin = spritesheet ? (await Mysql.findOne('skins', { filter: { hash: spritesheet }, view: ['skin'] }))?.skin ?? null : null;
        return { ...declared, skin, code };
    }
}

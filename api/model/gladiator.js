import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CustomError } from '../helpers/error.js';
import { NAME_PATTERN, bannedFunctionsUsed, validAttributes } from '../helpers/gladiator-code.js';
import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';
import { Model } from './model.js';

/** Engine commands only the editor's sandbox accepts (`api/banned_functions.json`). */
export const BANNED_FUNCTIONS = JSON.parse(readFileSync(path.join(import.meta.dirname, '../banned_functions.json'), 'utf8')).functions;

/**
 * Longest name in UTF-8 bytes: the engine keeps 49 (`char name[50]`), and a longer name no longer
 * matches its gladiator in the battle log, which loses its results.
 */
const NAME_BYTES = 49;

/**
 * How many gladiators a master of a level may keep: one, plus one every ten levels, up to six.
 *
 * @param {number} level
 * @returns {number}
 */
export function gladiatorLimit(level) {
    return Math.min(6, 1 + Math.floor(Number(level) / 10));
}

/**
 * A gladiator (`gladiators`, key `cod`), owned by its master. Code and blocks are stored as the
 * player wrote them; `skin` is the skin JSON text.
 */
export class Gladiator extends Model {
    /** @param {Record<string, unknown>} [fields] A `gladiators` row. */
    constructor(fields = {}) {
        super('gladiators', {
            fields,
            primaryKey: 'cod',
            insertFields: ['master', 'skin', 'name', 'vstr', 'vagi', 'vint', 'lvl', 'xp', 'code', 'blocks', 'version'],
            allowUpdate: ['skin', 'name', 'vstr', 'vagi', 'vint', 'code', 'blocks', 'version', 'mmr'],
        });
    }

    /**
     * @param {number} masterId
     * @returns {Promise<Gladiator[]>} The master's gladiators, oldest first.
     */
    static async listByMaster(masterId) {
        const rows = await Mysql.select(
            `SELECT g.*,
                (SELECT COUNT(*) FROM reports r WHERE r.gladiator = g.cod AND r.result = 'win') AS wins,
                (SELECT COUNT(*) FROM reports r WHERE r.gladiator = g.cod AND r.result = 'loss') AS losses
            FROM gladiators g WHERE g.master = ? ORDER BY g.cod`,
            [masterId],
        );
        return rows.map(row => new Gladiator(row));
    }

    /**
     * @param {number} id
     * @param {number} masterId
     * @returns {Promise<Gladiator>}
     * @throws {CustomError} 404 `GLADIATOR_NOT_FOUND` when it does not exist or belongs to someone else.
     */
    static async findOwned(id, masterId) {
        const row = await Mysql.findOne('gladiators', { filter: { cod: id, master: masterId } });
        if (!row) throw new CustomError(404, 'Gladiator not found.', 'GLADIATOR_NOT_FOUND');
        return new Gladiator(row);
    }

    /**
     * Checks a gladiator a master wants to save; the code still has to pass a test battle.
     *
     * @param {{ id?: number, name: string, vstr: number, vagi: number, vint: number, code: string }} glad
     * @param {{ id: number, lvl: number }} master
     * @param {{ connection?: import('mysql2/promise').PoolConnection }} [context]
     * @throws {CustomError} 400 `INVALID_NAME`/`INVALID_ATTRIBUTES`/`BANNED_FUNCTIONS` (data:
     *   `{ functions }`), 409 `NAME_TAKEN`, 403 `GLADIATOR_LIMIT` (data: `{ limit }`) for a new one.
     */
    static async assertSavable({ id, name, vstr, vagi, vint, code }, master, context = {}) {
        if (!NAME_PATTERN.test(name) || Buffer.byteLength(name) > NAME_BYTES) throw new CustomError(400, 'Invalid gladiator name.', 'INVALID_NAME');
        if (!validAttributes(vstr, vagi, vint)) throw new CustomError(400, 'Attributes must spend exactly 50 points.', 'INVALID_ATTRIBUTES');

        const banned = bannedFunctionsUsed(code, BANNED_FUNCTIONS);
        if (banned.length) throw new CustomError(400, 'Test-only functions cannot be saved.', 'BANNED_FUNCTIONS', { functions: banned });

        const sameName = await Mysql.findOne('gladiators', { filter: { name, cod: { not: id ?? 0 } }, view: ['cod'] }, context);
        if (sameName) throw new CustomError(409, 'Another gladiator has this name.', 'NAME_TAKEN');

        if (!id) {
            const limit = gladiatorLimit(master.lvl);
            if (await Mysql.count('gladiators', { master: master.id }, context) >= limit) {
                throw new CustomError(403, 'Gladiator limit reached.', 'GLADIATOR_LIMIT', { limit });
            }
        }
    }

    /**
     * Saves the gladiator on the current engine version (a broken one becomes current again).
     *
     * @param {{ name: string, vstr: number, vagi: number, vint: number, skin: string, code: string, blocks: string }} fields
     * @param {{ connection?: import('mysql2/promise').PoolConnection }} [context]
     * @returns {Promise<Gladiator>}
     */
    async save(fields, context = {}) {
        const values = { ...fields, version: VERSION };
        if (this.key) return this.update(values, context);
        Object.assign(this, values, { lvl: 1, xp: 0 });
        return this.insert(context);
    }

    /**
     * Checks the gladiator again and saves it in one transaction, with the master's row locked: the
     * test battle before saving takes seconds, and two saves of one master at once must not both
     * pass the gladiator limit or take the same name in that time.
     *
     * @param {Parameters<Gladiator['save']>[0]} fields
     * @param {{ id: number, lvl: number }} master
     * @returns {Promise<Gladiator>}
     * @throws {CustomError} The errors of {@link Gladiator.assertSavable}.
     */
    async saveChecked(fields, master) {
        return Mysql.withTransaction(async context => {
            await Mysql.select('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [master.id], context);
            await Gladiator.assertSavable({ ...fields, id: this.key }, master, context);
            return this.save(fields, context);
        });
    }

    /**
     * The public view of a gladiator, including the win/loss record of its reports and the real
     * ready (`version === VERSION`), outdated or `broken` state.
     *
     * @param {string} [masterNick] Shown on the gladiator's card.
     * @returns {Record<string, unknown>}
     */
    toJSON(masterNick = this.masterNick) {
        return {
            id: this.cod,
            name: this.name,
            vstr: this.vstr,
            vagi: this.vagi,
            vint: this.vint,
            skin: this.skin,
            code: this.code,
            blocks: this.blocks,
            mmr: this.mmr,
            master: masterNick,
            outdated: this.version !== VERSION,
            broken: this.version === 'broken',
            wins: Number(this.wins || 0),
            losses: Number(this.losses || 0),
        };
    }
}

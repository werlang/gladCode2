import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';
import { Model } from './model.js';

/** @returns {string} Folder of the battle log files, one JSON file per `logs.id`. */
export function logsDir() {
    return process.env.LOGS_DIR || '/data/logs';
}

/**
 * A recorded battle (`logs`): the row holds the public hash, origin and engine version; the
 * simulation itself is a JSON file named by the row id.
 */
export class BattleLog extends Model {
    /** @param {Record<string, unknown>} [fields] A `logs` row. */
    constructor(fields = {}) {
        super('logs', { fields, insertFields: ['time', 'version', 'hash', 'origin'] });
    }

    /**
     * Stores a simulation.
     *
     * @param {unknown[]} simulation The engine log, with skins attached.
     * @param {string} origin What ran it: `editor`, `ranked`, `duel`, `tourn` or `train`.
     * @param {Parameters<typeof Mysql.insert>[2]} [context]
     * @returns {Promise<BattleLog>}
     */
    static async create(simulation, origin, context = {}) {
        const log = new BattleLog({
            time: Mysql.raw('NOW()'),
            version: VERSION,
            hash: randomBytes(8).toString('hex'),
            origin: String(origin || '').slice(0, 15),
        });
        await log.insert(context);
        await mkdir(logsDir(), { recursive: true });
        await writeFile(path.join(logsDir(), String(log.id)), JSON.stringify(simulation));
        return log;
    }

    /**
     * @param {string} hash
     * @returns {Promise<BattleLog>}
     * @throws {CustomError} 404 `LOG_NOT_FOUND`.
     */
    static async findByHash(hash) {
        const row = await Mysql.findOne('logs', { filter: { hash } });
        if (!row) throw new CustomError(404, 'Battle not found.', 'LOG_NOT_FOUND');
        return new BattleLog(row);
    }

    /**
     * The simulation file of this battle.
     *
     * @returns {Promise<{ file: string, size: number }>}
     * @throws {CustomError} 410 `LOG_EXPIRED` when old battles were cleaned up, 404 when the file is gone.
     */
    async file() {
        if (Number(this.expired)) throw new CustomError(410, 'This battle has expired.', 'LOG_EXPIRED');
        const file = path.join(logsDir(), String(this.id));
        try {
            const { size } = await stat(file);
            if (!size) throw new Error('empty log');
            return { file, size };
        }
        catch {
            throw new CustomError(404, 'Battle not found.', 'LOG_NOT_FOUND');
        }
    }

    /** @returns {Promise<unknown[]>} The parsed simulation. */
    async simulation() {
        const { file } = await this.file();
        return JSON.parse(await readFile(file, 'utf8'));
    }

    /**
     * Deletes the row and its file.
     *
     * @returns {Promise<number>}
     */
    async delete() {
        await rm(path.join(logsDir(), String(this.id)), { force: true });
        return super.delete();
    }
}

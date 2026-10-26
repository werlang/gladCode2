import mysql from 'mysql2/promise';
import { CustomError } from './error.js';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const COMPARISONS = new Set(['<', '<=', '>', '>=']);
const READ_STATEMENT = /^\s*(SELECT|WITH)\b/i;

/**
 * Shared MySQL helper. Models are its only callers: routes and other helpers never touch SQL.
 *
 * Every value goes through `?` placeholders; identifiers are validated and quoted. Simple reads and
 * all writes use the CRUD methods (`find`, `findOne`, `get`, `count`, `insert`, `update`, `delete`).
 * Reads that need joins, aggregates or window functions use `select(sql, values)`, which only runs
 * SELECT/WITH statements. DATETIME columns come back as the stored strings (`dateStrings`), in the
 * database time zone (America/Sao_Paulo), exactly as the PHP backend returned them.
 */
export class Mysql {
    /** @type {import('mysql2/promise').Pool|null} */
    static #pool = null;

    /** @returns {import('mysql2/promise').PoolOptions} Connection settings from the environment. */
    static get config() {
        return {
            host: process.env.MYSQL_HOST || 'mysql',
            port: Number(process.env.MYSQL_PORT || 3306),
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'gladcode',
            charset: 'utf8mb4',
            dateStrings: true,
            connectionLimit: 10,
        };
    }

    /**
     * Opens the shared pool once; every connection runs in TRADITIONAL sql_mode like the PHP backend.
     *
     * @returns {import('mysql2/promise').Pool}
     */
    static #connect() {
        if (!Mysql.#pool) {
            Mysql.#pool = mysql.createPool(Mysql.config);
            Mysql.#pool.pool.on('connection', connection => connection.query("SET sql_mode='TRADITIONAL'"));
        }
        return Mysql.#pool;
    }

    /** Closes the shared pool (shutdown and test teardown). */
    static async close() {
        if (!Mysql.#pool) return;
        await Mysql.#pool.end();
        Mysql.#pool = null;
    }

    /** @returns {Promise<boolean>} True when the database answers. */
    static async ping() {
        await Mysql.#query('SELECT 1');
        return true;
    }

    /**
     * Validates and quotes an identifier (`table`, `column` or `table.column`).
     *
     * @param {string} identifier
     * @returns {string}
     */
    static #quote(identifier) {
        return String(identifier).split('.').map(part => {
            if (part === '*') return '*';
            if (!IDENTIFIER.test(part)) throw new CustomError(500, `Invalid SQL identifier: ${identifier}`, 'SQL_IDENTIFIER');
            return `\`${part}\``;
        }).join('.');
    }

    /**
     * Expands raw fragments (`Mysql.raw`) in place of their `?` and drops them from the values.
     *
     * @param {string} sql
     * @param {unknown[]} values
     * @returns {{ sql: string, values: unknown[] }}
     */
    static #expandRaw(sql, values) {
        if (!values.some(value => typeof value?.toSqlString === 'function')) return { sql, values };

        const pieces = sql.split('?');
        let expanded = pieces.shift();
        const kept = [];
        values.forEach(value => {
            if (typeof value?.toSqlString === 'function') expanded += value.toSqlString();
            else {
                expanded += '?';
                kept.push(value);
            }
            expanded += pieces.shift() ?? '';
        });
        return { sql: expanded + pieces.join('?'), values: kept };
    }

    /**
     * Runs one parameterised statement on the pool or on a transaction connection.
     *
     * @param {string} sql
     * @param {unknown[]} [values]
     * @param {{ connection?: import('mysql2/promise').PoolConnection }} [context]
     * @returns {Promise<any>} Rows for reads, the result header for writes.
     */
    static async #query(sql, values = [], { connection } = {}) {
        const executor = connection || Mysql.#connect();
        const statement = Mysql.#expandRaw(sql.trim(), values);
        try {
            const [result] = await executor.query(statement.sql, statement.values);
            return result;
        }
        catch (error) {
            throw new CustomError(500, error.message, 'SQL_ERROR', { sql: statement.sql, code: error.code });
        }
    }

    /**
     * Builds a WHERE clause from a filter object. Values: plain (`=`), `null` (`IS NULL`), arrays
     * or `{ in }` (`IN`), `{ not }` (`!=`/`IS NOT NULL`), `{ like }`, `{ between: [a, b] }` and
     * `{ '<' | '<=' | '>' | '>=': value }`.
     *
     * @param {Record<string, unknown>} filter
     * @returns {{ statement: string, values: unknown[] }}
     */
    static where(filter) {
        const values = [];
        const statement = Object.entries(filter).map(([field, value]) => {
            const column = Mysql.#quote(field);
            if (value === null) return `${column} IS NULL`;

            const list = Array.isArray(value) ? value : (value && typeof value === 'object' && Object.hasOwn(value, 'in') ? value.in : null);
            if (list) {
                if (!list.length) return '1=0';
                values.push(...list);
                return `${column} IN (${list.map(() => '?').join(',')})`;
            }

            if (value && typeof value === 'object' && typeof value.toSqlString !== 'function') {
                if (Object.hasOwn(value, 'not')) {
                    if (value.not === null) return `${column} IS NOT NULL`;
                    values.push(value.not);
                    return `${column} != ?`;
                }
                if (Object.hasOwn(value, 'like')) {
                    values.push(Mysql.contains(value.like));
                    return `${column} LIKE ?`;
                }
                if (Object.hasOwn(value, 'between')) {
                    values.push(value.between[0], value.between[1]);
                    return `${column} BETWEEN ? AND ?`;
                }
                const operator = Object.keys(value)[0];
                if (!COMPARISONS.has(operator)) throw new CustomError(500, 'Invalid filter operation.', 'SQL_FILTER');
                values.push(value[operator]);
                return `${column} ${operator} ?`;
            }

            values.push(value);
            return `${column} = ?`;
        }).join(' AND ');

        return { statement: statement || '1=1', values };
    }

    /**
     * Finds rows.
     *
     * @param {string} table
     * @param {{ filter?: Record<string, unknown>, view?: string[], opt?: { order?: Record<string, 1|-1>, limit?: number, skip?: number, forUpdate?: boolean } }} [options]
     * @param {{ connection?: import('mysql2/promise').PoolConnection }} [context]
     * @returns {Promise<Record<string, any>[]>}
     */
    static async find(table, { filter = {}, view = [], opt = {} } = {}, context = {}) {
        const projection = view.length ? view.map(field => Mysql.#quote(field)).join(', ') : '*';
        const { statement, values } = Mysql.where(filter);
        const order = opt.order && Object.keys(opt.order).length
            ? ` ORDER BY ${Object.entries(opt.order).map(([field, direction]) => `${Mysql.#quote(field)} ${direction === -1 ? 'DESC' : 'ASC'}`).join(', ')}`
            : '';
        const limit = opt.limit ? ` LIMIT ${Number.parseInt(opt.limit, 10)}` : '';
        const offset = opt.skip ? ` OFFSET ${Number.parseInt(opt.skip, 10)}` : '';
        const lock = opt.forUpdate ? ' FOR UPDATE' : '';
        return Mysql.#query(`SELECT ${projection} FROM ${Mysql.#quote(table)} WHERE ${statement}${order}${limit}${offset}${lock}`, values, context);
    }

    /**
     * @param {string} table
     * @param {Parameters<typeof Mysql.find>[1]} [options]
     * @param {Parameters<typeof Mysql.find>[2]} [context]
     * @returns {Promise<Record<string, any>|null>} The first matching row or null.
     */
    static async findOne(table, options = {}, context = {}) {
        const rows = await Mysql.find(table, { ...options, opt: { ...options.opt, limit: 1 } }, context);
        return rows[0] || null;
    }

    /**
     * @param {string} table
     * @param {Record<string, unknown>} filter
     * @param {Parameters<typeof Mysql.find>[2]} [context]
     * @returns {Promise<Record<string, any>>} The matching row.
     * @throws {CustomError} 404 `RECORD_NOT_FOUND` when nothing matches.
     */
    static async get(table, filter, context = {}) {
        const row = await Mysql.findOne(table, { filter }, context);
        if (!row) throw new CustomError(404, 'Record not found.', 'RECORD_NOT_FOUND');
        return row;
    }

    /**
     * @param {string} table
     * @param {Record<string, unknown>} [filter]
     * @param {Parameters<typeof Mysql.find>[2]} [context]
     * @returns {Promise<number>} Number of matching rows.
     */
    static async count(table, filter = {}, context = {}) {
        const { statement, values } = Mysql.where(filter);
        const [row] = await Mysql.#query(`SELECT COUNT(*) AS total FROM ${Mysql.#quote(table)} WHERE ${statement}`, values, context);
        return Number(row.total);
    }

    /**
     * Inserts one row, or several rows sharing the first row's columns, in one statement.
     *
     * @param {string} table
     * @param {Record<string, unknown>|Record<string, unknown>[]} data Values may be `Mysql.raw` fragments.
     * @param {Parameters<typeof Mysql.find>[2]} [context]
     * @returns {Promise<{ insertId: number, affectedRows: number }>}
     */
    static async insert(table, data, context = {}) {
        const rows = (Array.isArray(data) ? data : [data])
            .map(row => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)));
        if (!rows.length || !Object.keys(rows[0]).length) throw new CustomError(500, 'No data to insert.', 'SQL_EMPTY_WRITE');

        const fields = Object.keys(rows[0]);
        const values = rows.flatMap(row => fields.map(field => row[field]));
        const tuple = `(${fields.map(() => '?').join(', ')})`;
        const sql = `INSERT INTO ${Mysql.#quote(table)} (${fields.map(field => Mysql.#quote(field)).join(', ')}) VALUES ${rows.map(() => tuple).join(', ')}`;
        const result = await Mysql.#query(sql, values, context);
        return { insertId: result.insertId, affectedRows: result.affectedRows };
    }

    /**
     * Updates the rows matching a filter. Values may be plain, `{ inc: n }`, `{ dec: n }` or `Mysql.raw`.
     *
     * @param {string} table
     * @param {Record<string, unknown>} data
     * @param {Record<string, unknown>} filter A non-empty filter (never updates a whole table).
     * @param {Parameters<typeof Mysql.find>[2]} [context]
     * @returns {Promise<number>} Affected rows.
     */
    static async update(table, data, filter, context = {}) {
        if (!filter || !Object.keys(filter).length) throw new CustomError(500, 'Update needs a filter.', 'SQL_NO_FILTER');
        const entries = Object.entries(data).filter(([, value]) => value !== undefined);
        if (!entries.length) throw new CustomError(500, 'No data to update.', 'SQL_EMPTY_WRITE');

        const values = [];
        const assignments = entries.map(([field, value]) => {
            const column = Mysql.#quote(field);
            if (value && typeof value === 'object' && typeof value.toSqlString !== 'function') {
                if (Object.hasOwn(value, 'inc')) {
                    values.push(value.inc);
                    return `${column} = ${column} + ?`;
                }
                if (Object.hasOwn(value, 'dec')) {
                    values.push(value.dec);
                    return `${column} = ${column} - ?`;
                }
                throw new CustomError(500, 'Invalid update operation.', 'SQL_UPDATE');
            }
            values.push(value);
            return `${column} = ?`;
        });
        const where = Mysql.where(filter);
        values.push(...where.values);
        const result = await Mysql.#query(`UPDATE ${Mysql.#quote(table)} SET ${assignments.join(', ')} WHERE ${where.statement}`, values, context);
        return result.affectedRows;
    }

    /**
     * Deletes the rows matching a filter.
     *
     * @param {string} table
     * @param {Record<string, unknown>} filter A non-empty filter (never empties a table).
     * @param {Parameters<typeof Mysql.find>[2]} [context]
     * @returns {Promise<number>} Deleted rows.
     */
    static async delete(table, filter, context = {}) {
        if (!filter || !Object.keys(filter).length) throw new CustomError(500, 'Delete needs a filter.', 'SQL_NO_FILTER');
        const { statement, values } = Mysql.where(filter);
        const result = await Mysql.#query(`DELETE FROM ${Mysql.#quote(table)} WHERE ${statement}`, values, context);
        return result.affectedRows;
    }

    /**
     * Runs a parameterised read (joins, aggregates, window functions). Writes are refused.
     *
     * @param {string} sql A SELECT or WITH statement with `?` placeholders.
     * @param {unknown[]} [values]
     * @param {Parameters<typeof Mysql.find>[2]} [context]
     * @returns {Promise<Record<string, any>[]>}
     */
    static async select(sql, values = [], context = {}) {
        if (!READ_STATEMENT.test(sql)) throw new CustomError(500, 'Only reads may use select().', 'SQL_NOT_READ');
        return Mysql.#query(sql, values, context);
    }

    /**
     * Runs an operation in a transaction on a dedicated connection, passed as `{ connection }`.
     *
     * @template T
     * @param {(context: { connection: import('mysql2/promise').PoolConnection }) => Promise<T>} operation
     * @returns {Promise<T>}
     */
    static async withTransaction(operation) {
        const connection = await Mysql.#connect().getConnection();
        try {
            await connection.beginTransaction();
            const result = await operation({ connection });
            await connection.commit();
            return result;
        }
        catch (error) {
            await connection.rollback().catch(() => {});
            throw error;
        }
        finally {
            connection.release();
        }
    }

    /**
     * A `LIKE` value matching text anywhere, with the text's own `%`, `_` and `\` taken literally.
     *
     * @param {string} text
     * @returns {string}
     */
    static contains(text) {
        return `%${String(text).replace(/[\\%_]/g, match => `\\${match}`)}%`;
    }

    /**
     * Marks trusted SQL (e.g. `NOW(3)`) to be embedded instead of bound as a value.
     *
     * @param {string} sql
     * @returns {{ toSqlString: () => string }}
     */
    static raw(sql) {
        return { toSqlString: () => sql };
    }
}

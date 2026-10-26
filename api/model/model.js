import { Mysql } from '../helpers/mysql.js';

/**
 * Base entity model over one table. Subclasses declare the table, its primary key and which
 * columns may be inserted or updated; persistence always goes through `helpers/mysql.js`.
 */
export class Model {
    #table;
    #primaryKey;
    #insertFields;
    #allowUpdate;

    /**
     * @param {string} table
     * @param {{ fields?: Record<string, unknown>, primaryKey?: string, insertFields?: string[], allowUpdate?: string[] }} config
     */
    constructor(table, { fields = {}, primaryKey = 'id', insertFields = [], allowUpdate = [] }) {
        this.#table = table;
        this.#primaryKey = primaryKey;
        this.#insertFields = insertFields;
        this.#allowUpdate = allowUpdate;
        Object.assign(this, fields);
    }

    /** @returns {unknown} This record's primary key value. */
    get key() {
        return this[this.#primaryKey];
    }

    /**
     * Loads this record by its primary key (or another loaded field) and merges the row in.
     *
     * @param {string} [field] Column to look up by; the primary key by default.
     * @param {Parameters<typeof Mysql.get>[2]} [context]
     * @returns {Promise<this>}
     * @throws {CustomError} 404 `RECORD_NOT_FOUND`.
     */
    async load(field = this.#primaryKey, context = {}) {
        Object.assign(this, await Mysql.get(this.#table, { [field]: this[field] }, context));
        return this;
    }

    /**
     * Inserts the declared insert fields and remembers the new primary key.
     *
     * @param {Parameters<typeof Mysql.insert>[2]} [context]
     * @returns {Promise<this>}
     */
    async insert(context = {}) {
        const row = Object.fromEntries(this.#insertFields.map(field => [field, this[field]]));
        const { insertId } = await Mysql.insert(this.#table, row, context);
        if (insertId && this.key === undefined) this[this.#primaryKey] = insertId;
        return this;
    }

    /**
     * Updates the allowed fields present in `changes` and applies them to this instance.
     *
     * @param {Record<string, unknown>} changes
     * @param {Parameters<typeof Mysql.update>[3]} [context]
     * @returns {Promise<this>}
     */
    async update(changes, context = {}) {
        const allowed = Object.fromEntries(Object.entries(changes)
            .filter(([field, value]) => this.#allowUpdate.includes(field) && value !== undefined));
        if (Object.keys(allowed).length) {
            await Mysql.update(this.#table, allowed, { [this.#primaryKey]: this.key }, context);
            for (const [field, value] of Object.entries(allowed)) {
                if (typeof value !== 'object' || value === null) this[field] = value;
            }
        }
        return this;
    }

    /**
     * Deletes this record.
     *
     * @param {Parameters<typeof Mysql.delete>[2]} [context]
     * @returns {Promise<number>} Deleted rows.
     */
    async delete(context = {}) {
        return Mysql.delete(this.#table, { [this.#primaryKey]: this.key }, context);
    }
}

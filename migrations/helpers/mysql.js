import mysql from 'mysql2/promise';

/**
 * Shared MySQL driver helper. Models are the only normal production callers.
 *
 * Mirrors the Postgres helper contract used by node-aec: query results are
 * normalized to `{ rows }` so callers never touch driver tuples directly.
 */
export class Mysql {
    static connected = false;
    static connection = null;

    static get config() {
        return {
            host: process.env.MYSQL_HOST || 'mysql',
            port: Number(process.env.MYSQL_PORT || 3306),
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE || 'gladcode',
        };
    }

    /**
     * Opens the shared MySQL pool when needed.
     *
     * @param {Record<string, unknown>} config
     * @returns {Promise<typeof Mysql>}
     */
    static async connect(config = {}) {
        if (Mysql.connected) return this;

        Mysql.connection = mysql.createPool({ ...Mysql.config, ...config });
        Mysql.connected = true;
        return this;
    }

    /**
     * Closes the shared MySQL pool.
     *
     * @returns {Promise<typeof Mysql>}
     */
    static async close() {
        if (!Mysql.connected) return this;
        await Mysql.connection.end();
        Mysql.connection = null;
        Mysql.connected = false;
        return this;
    }

    /**
     * Runs one query against the pool, normalizing the driver tuple.
     *
     * @param {string} sql
     * @param {Array<unknown>} [params]
     * @returns {Promise<{ rows: Array<Record<string, unknown>> }>}
     */
    static async query(sql, params = []) {
        const [rows] = await Mysql.connection.query(sql, params);
        return { rows };
    }

    /**
     * Runs an operation inside a transaction on a dedicated connection.
     *
     * @param {(scoped: { connection: { query: Function } }) => Promise<unknown>} operation
     * @returns {Promise<unknown>}
     */
    static async withTransaction(operation) {
        await Mysql.connect();
        const connection = await Mysql.connection.getConnection();

        const scoped = {
            query: async (sql, params = []) => {
                const [rows] = await connection.query(sql, params);
                return { rows };
            },
        };

        try {
            await connection.beginTransaction();
            const result = await operation({ connection: scoped });
            await connection.commit();
            return result;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
}

import { beforeEach, describe, expect, test, vi } from 'vitest';

const query = vi.fn();
const connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(async () => {}), release: vi.fn(), query: vi.fn(async () => [[]]) };
vi.mock('mysql2/promise', () => ({
    default: { createPool: () => ({ query, getConnection: async () => connection, pool: { on: vi.fn() }, end: vi.fn() }) },
}));

const { format } = await vi.importActual('mysql2');
const { Mysql } = await import('../../../helpers/mysql.js');

describe('Mysql helper', () => {
    beforeEach(() => {
        query.mockReset().mockResolvedValue([[]]);
    });

    test('builds parameterised filters with every operator', () => {
        const { statement, values } = Mysql.where({
            id: 3,
            master: [1, 2],
            deleted: null,
            name: { like: '50%_off' },
            mmr: { '>=': 1000 },
            version: { not: 'broken' },
        });
        expect(statement).toBe('`id` = ? AND `master` IN (?,?) AND `deleted` IS NULL AND `name` LIKE ? AND `mmr` >= ? AND `version` != ?');
        expect(values).toEqual([3, 1, 2, '%50\\%\\_off%', 1000, 'broken']);
    });

    test('null filters test for presence and absence', () => {
        expect(Mysql.where({ log: null, hash: { not: null } }).statement).toBe('`log` IS NULL AND `hash` IS NOT NULL');
    });

    test('an empty IN list matches nothing instead of failing', () => {
        expect(Mysql.where({ id: [] }).statement).toBe('1=0');
    });

    test('rejects identifiers that are not plain names', async () => {
        await expect(Mysql.find('usuarios; DROP TABLE x', {})).rejects.toMatchObject({ code: 'SQL_IDENTIFIER' });
        expect(query).not.toHaveBeenCalled();
    });

    test('find quotes columns, orders and pages', async () => {
        await Mysql.find('gladiators', { filter: { master: 7 }, view: ['cod', 'name'], opt: { order: { mmr: -1 }, limit: 10, skip: 20 } });
        expect(query).toHaveBeenCalledWith('SELECT `cod`, `name` FROM `gladiators` WHERE `master` = ? ORDER BY `mmr` DESC LIMIT 10 OFFSET 20', [7]);
    });

    test('raw fragments are embedded, values stay bound', async () => {
        query.mockResolvedValue([{ insertId: 5, affectedRows: 1 }]);
        const result = await Mysql.insert('news', { title: 'x?', time: Mysql.raw('NOW(3)') });
        // rendered by the real driver, as the pool does with the helper's settings
        const [sql, values] = query.mock.calls[0];
        expect(format(sql, values, Mysql.config.stringifyObjects)).toBe("INSERT INTO `news` (`title`, `time`) VALUES ('x?', NOW(3))");
        expect(result).toEqual({ insertId: 5, affectedRows: 1 });
    });

    test('an object value is compared as a string, never expanded into a condition', async () => {
        await Mysql.select('SELECT id FROM usuarios WHERE token = ?', [{ token: 1 }]);
        const [sql, values] = query.mock.calls[0];
        expect(format(sql, values, Mysql.config.stringifyObjects)).toBe("SELECT id FROM usuarios WHERE token = '[object Object]'");
    });

    test('update supports increments and refuses to run without a filter', async () => {
        query.mockResolvedValue([{ affectedRows: 1 }]);
        await Mysql.update('usuarios', { silver: { inc: 40 }, apelido: 'Zed' }, { id: 9 });
        expect(query).toHaveBeenCalledWith('UPDATE `usuarios` SET `silver` = `silver` + ?, `apelido` = ? WHERE `id` = ?', [40, 'Zed', 9]);
        await expect(Mysql.update('usuarios', { silver: 1 }, {})).rejects.toMatchObject({ code: 'SQL_NO_FILTER' });
        await expect(Mysql.delete('usuarios', {})).rejects.toMatchObject({ code: 'SQL_NO_FILTER' });
    });

    test('select runs reads only', async () => {
        await Mysql.select('SELECT g.cod FROM gladiators g WHERE g.master = ?', [3]);
        expect(query).toHaveBeenCalledWith('SELECT g.cod FROM gladiators g WHERE g.master = ?', [3]);
        await expect(Mysql.select('DELETE FROM gladiators')).rejects.toMatchObject({ code: 'SQL_NOT_READ' });
    });

    test('driver errors become SQL_ERROR without leaking values', async () => {
        query.mockRejectedValue(Object.assign(new Error('boom'), { code: 'ER_PARSE_ERROR' }));
        await expect(Mysql.get('news', { id: 1 })).rejects.toMatchObject({ status: 500, code: 'SQL_ERROR', data: { code: 'ER_PARSE_ERROR' } });
    });

    test('get throws 404 when nothing matches', async () => {
        await expect(Mysql.get('news', { id: 1 })).rejects.toMatchObject({ status: 404, code: 'RECORD_NOT_FOUND' });
    });

    describe('transactions', () => {
        beforeEach(() => Object.values(connection).forEach(fn => fn.mockClear()));

        test('commit, run on the transaction connection, and give the connection back', async () => {
            const result = await Mysql.withTransaction(async context => {
                await Mysql.update('usuarios', { silver: { dec: 5 } }, { id: 7 }, context);
                return 'done';
            });
            expect(result).toBe('done');
            expect(connection.query).toHaveBeenCalledWith('UPDATE `usuarios` SET `silver` = `silver` - ? WHERE `id` = ?', [5, 7]);
            expect(query).not.toHaveBeenCalled();
            expect(connection.commit).toHaveBeenCalledTimes(1);
            expect(connection.rollback).not.toHaveBeenCalled();
            expect(connection.release).toHaveBeenCalledTimes(1);
        });

        test('roll back on any error, rethrow it, and still give the connection back', async () => {
            const failure = new Error('mid-transaction');
            await expect(Mysql.withTransaction(async () => { throw failure; })).rejects.toBe(failure);
            expect(connection.rollback).toHaveBeenCalledTimes(1);
            expect(connection.commit).not.toHaveBeenCalled();
            expect(connection.release).toHaveBeenCalledTimes(1);
        });
    });
});

import { Mysql } from '../helpers/mysql.js';

/** Results per group in the global search. */
export const SEARCH_LIMIT = 5;

/**
 * The header's global search: matching gladiators and masters, limited to a handful each.
 */
export class Search {
    /**
     * @param {string} term Trimmed search text (the route validates its length).
     * @returns {Promise<{ gladiators: Array<{ id: number, name: string, master: string, picture: string, mmr: number }>,
     *   masters: Array<{ id: number, nick: string, picture: string, level: number }> }>}
     */
    static async query(term) {
        const like = Mysql.contains(term);
        const [gladiators, masters] = await Promise.all([
            Mysql.select(
                `SELECT g.cod AS id, g.name, g.mmr, u.apelido AS master, u.foto AS picture
                FROM gladiators g INNER JOIN usuarios u ON u.id = g.master
                WHERE g.name LIKE ? OR u.apelido LIKE ?
                ORDER BY g.mmr DESC, g.cod ASC LIMIT ?`,
                [like, like, SEARCH_LIMIT],
            ),
            Mysql.select(
                `SELECT id, apelido AS nick, foto AS picture, lvl AS level
                FROM usuarios WHERE apelido LIKE ?
                ORDER BY apelido ASC LIMIT ?`,
                [like, SEARCH_LIMIT],
            ),
        ]);
        return {
            gladiators: gladiators.map(row => ({
                id: Number(row.id),
                name: row.name,
                master: row.master,
                picture: row.picture ?? '',
                mmr: Number(row.mmr),
            })),
            masters: masters.map(row => ({
                id: Number(row.id),
                nick: row.nick,
                picture: row.picture ?? '',
                level: Number(row.level),
            })),
        };
    }
}

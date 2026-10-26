import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';

/** Rows per page of the general ranking. */
export const RANKING_PAGE_SIZE = 10;
/** Points a master earns for placing 1st to 5th in a tagged training (times its weight). */
const TRAINING_PRIZES = [10, 6, 4, 3, 2];
/** Gladiators that outlived everyone have 1000 added to their survival time. */
const WINNER_BONUS = 1000;

/**
 * Hashtags written in a text (`#turma_a` becomes `turma_a`), lowercased.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function hashtags(text) {
    return [...String(text).matchAll(/#(\w+)/g)].map(match => match[1].toLowerCase());
}

/**
 * The renown ranking of gladiators, and the hashtag rankings of masters built from tagged
 * trainings (tutors follow a class through `#tags` in training descriptions).
 */
export class Ranking {
    /**
     * A page of the gladiator ranking, strongest first.
     *
     * @param {{ offset: number, search?: string }} query `search` matches gladiator or master names.
     * @returns {Promise<{ total: number, ranking: Array<{ gladiator: string, mmr: number, master: string, change24h: number, position: number }> }>}
     */
    static async general({ offset, search = '' }) {
        const where = search ? 'WHERE g.name LIKE ? OR u.apelido LIKE ?' : '';
        const values = search ? [Mysql.contains(search), Mysql.contains(search)] : [];
        const [{ total }] = await Mysql.select(`SELECT COUNT(*) AS total FROM gladiators g INNER JOIN usuarios u ON g.master = u.id ${where}`, values);
        const rows = await Mysql.select(
            `SELECT g.name, g.mmr, u.apelido,
                (SELECT SUM(r.reward) FROM reports r INNER JOIN logs l ON l.id = r.log WHERE r.gladiator = g.cod AND l.time > NOW() - INTERVAL 1 DAY) AS change24h,
                (SELECT COUNT(*) FROM gladiators g2 WHERE g2.mmr >= g.mmr) AS position
            FROM gladiators g INNER JOIN usuarios u ON g.master = u.id ${where}
            ORDER BY g.mmr DESC LIMIT ? OFFSET ?`,
            [...values, RANKING_PAGE_SIZE, Math.max(0, offset)],
        );
        return {
            total: Number(total),
            ranking: rows.map(row => ({
                gladiator: row.name,
                mmr: Math.trunc(row.mmr),
                master: row.apelido,
                change24h: Number(row.change24h) || 0,
                position: Number(row.position),
            })),
        };
    }

    /**
     * @param {number} userId
     * @returns {Promise<number>} How many gladiators rank above the master's best one.
     */
    static async bestOffset(userId) {
        const [{ above }] = await Mysql.select('SELECT COUNT(*) AS above FROM gladiators WHERE mmr > (SELECT MAX(mmr) FROM gladiators WHERE master = ?)', [userId]);
        return Number(above);
    }

    /**
     * The hashtag tabs a master sees: tags of the trainings they run or take part in, minus the
     * ones they closed, plus the ones they follow.
     *
     * @param {number} userId
     * @returns {Promise<string[]>} Sorted tags.
     */
    static async tabs(userId) {
        const descriptions = await Mysql.select(
            `SELECT t.description FROM training t WHERE t.manager = ?
            UNION SELECT t.description FROM gladiator_training gt INNER JOIN gladiators g ON gt.gladiator = g.cod INNER JOIN training t ON t.id = gt.training WHERE g.master = ?`,
            [userId, userId],
        );
        const tags = new Set(descriptions.flatMap(row => hashtags(row.description)));
        for (const tab of await Mysql.find('user_tabs', { filter: { owner: userId }, view: ['name', 'watch'] })) {
            if (Number(tab.watch)) tags.add(tab.name);
            else tags.delete(tab.name);
        }
        return [...tags].sort();
    }

    /**
     * Follows or closes a hashtag tab. Tutor accounts (premium, with credits) only.
     *
     * @param {{ id: number, premium: unknown, credits: number }} user
     * @param {string} name Hashtag without `#`.
     * @param {boolean} watch
     * @throws {CustomError} 403 `TUTOR_ONLY`, 402 `NO_CREDITS`.
     */
    static async watchTab(user, name, watch) {
        if (!user.premium) throw new CustomError(403, 'Only tutor accounts can follow hashtags.', 'TUTOR_ONLY');
        if (user.credits < 0) throw new CustomError(402, 'No credits left.', 'NO_CREDITS');

        const changed = await Mysql.update('user_tabs', { watch: Number(watch) }, { name, owner: user.id });
        if (!changed) await Mysql.insert('user_tabs', { name, owner: user.id, watch: Number(watch) });
    }

    /**
     * The masters' ranking over the trainings tagged with a hashtag: each training gives its top
     * five masters points times its weight; ties go to the longer average survival.
     *
     * @param {string} tag Hashtag without `#`.
     * @param {string} [search] Filters masters by nickname (positions stay those of the full ranking).
     * @returns {Promise<Array<{ id: number, nick: string, score: number, time: number, position: number }>>}
     */
    static async hashtag(tag, search = '') {
        const trainings = await Mysql.select('SELECT id, weight FROM training WHERE description LIKE ?', [Mysql.contains(`#${tag}`)]);
        const masters = new Map();

        for (const training of trainings) {
            // the average survival ignores rounds not fought (0) and removes the winner bonus
            const rows = await Mysql.select(
                `SELECT SUM(gt.score) AS score, g.master, u.apelido,
                    (SELECT AVG(IF(gt2.lasttime > ?, gt2.lasttime - ?, gt2.lasttime)) FROM gladiator_training gt2 INNER JOIN gladiators g2 ON g2.cod = gt2.gladiator
                        WHERE gt2.training = gt.training AND g2.master = g.master AND gt2.lasttime > 0) AS time
                FROM gladiator_training gt INNER JOIN gladiators g ON g.cod = gt.gladiator INNER JOIN usuarios u ON u.id = g.master
                WHERE gt.training = ? GROUP BY g.master, u.apelido ORDER BY score DESC, time DESC`,
                [WINNER_BONUS, WINNER_BONUS, training.id],
            );
            rows.filter(row => row.time !== null).forEach((row, place) => {
                const entry = masters.get(row.master) ?? { id: row.master, nick: row.apelido, score: 0, time: 0, fights: 0 };
                entry.score += (TRAINING_PRIZES[place] ?? 0) * training.weight;
                entry.time += Number(row.time) > WINNER_BONUS ? Number(row.time) - WINNER_BONUS : Number(row.time);
                entry.fights++;
                masters.set(row.master, entry);
            });
        }

        const needle = search.toLowerCase();
        return [...masters.values()]
            .map(({ fights, ...entry }) => ({ ...entry, time: entry.time / fights }))
            .sort((a, b) => b.score - a.score || b.time - a.time)
            .map((entry, index) => ({ ...entry, position: index + 1 }))
            .filter(entry => !needle || entry.nick.toLowerCase().includes(needle));
    }
}

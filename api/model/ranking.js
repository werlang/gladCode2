import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';
import { VERSION } from '../helpers/version.js';

/** Rows per page of the general ranking. */
export const RANKING_PAGE_SIZE = 10;
/** Default rows in a window centred on one gladiator. */
export const RANKING_WINDOW_SIZE = 9;
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
 * The row count of a centred window: 9 by default, clamped to 3–21 and forced odd.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function windowSize(value) {
    const parsed = Number(value) || RANKING_WINDOW_SIZE;
    const clamped = Math.max(3, Math.min(21, Math.trunc(parsed)));
    return clamped % 2 === 0 ? clamped + 1 : clamped;
}

/**
 * Clamps a 1-based position and finds the first row of its centred window.
 *
 * @param {number} total Current ranked gladiators.
 * @param {number} position Requested 1-based position.
 * @param {number} size Window rows (already normalised by {@link windowSize}).
 * @returns {{ position: number, start: number, last: number }}
 */
export function windowBounds(total, position, size) {
    if (total <= 0) return { position: 0, start: 1, last: 0 };
    const clamped = Math.max(1, Math.min(total, Math.trunc(Number(position) || 1)));
    const start = Math.max(1, Math.min(clamped - Math.floor(size / 2), total - size + 1));
    return { position: clamped, start, last: Math.min(total, start + size - 1) };
}

/** The current-version ranking rows with their position and 1/7-day renown change. */
const RANKED_SQL = `(
    SELECT g.cod AS id, g.name AS gladiator, g.mmr, g.master AS masterId, u.apelido AS master,
        ROW_NUMBER() OVER (ORDER BY g.mmr DESC, g.cod ASC) AS position,
        COALESCE(d.change24h, 0) AS change24h,
        COALESCE(d.change7d, 0) AS change7d
    FROM gladiators g
    INNER JOIN usuarios u ON u.id = g.master
    LEFT JOIN (
        SELECT r.gladiator,
            SUM(CASE WHEN l.time > NOW() - INTERVAL 1 DAY THEN r.reward ELSE 0 END) AS change24h,
            SUM(r.reward) AS change7d
        FROM reports r INNER JOIN logs l ON l.id = r.log
        WHERE l.time > NOW() - INTERVAL 7 DAY
        GROUP BY r.gladiator
    ) d ON d.gladiator = g.cod
    WHERE g.version = ?
) ranked`;

/**
 * @param {Record<string, any>} row
 * @returns {{ id: number, gladiator: string, mmr: number, master: string, change24h: number,
 *   change7d: number, position: number }}
 */
function generalRow(row) {
    return {
        id: Number(row.id),
        gladiator: row.gladiator,
        mmr: Math.trunc(row.mmr),
        master: row.master,
        change24h: Number(row.change24h) || 0,
        change7d: Number(row.change7d) || 0,
        position: Number(row.position),
    };
}

/**
 * The renown ranking of gladiators, and the hashtag rankings of masters built from tagged
 * trainings (tutors follow a class through `#tags` in training descriptions).
 */
export class Ranking {
    /**
     * A page of the gladiator ranking, strongest first. Positions are computed over every current
     * gladiator, so a search or the friends scope keeps the global position.
     *
     * @param {{ offset: number, search?: string, scope?: 'all'|'friends', userId?: number|null }} query
     * @returns {Promise<{ total: number, ranking: Array<{ id: number, gladiator: string, mmr: number,
     *   master: string, change24h: number, change7d: number, position: number }> }>}
     */
    static async general({ offset, search = '', scope = 'all', userId = null }) {
        const conditions = ['g.version = ?'];
        const values = [VERSION];
        if (search) {
            conditions.push('(g.name LIKE ? OR u.apelido LIKE ?)');
            values.push(Mysql.contains(search), Mysql.contains(search));
        }
        if (scope === 'friends') {
            conditions.push(`g.master IN (
                SELECT usuario1 FROM amizade WHERE usuario2 = ? AND pendente = 0
                UNION SELECT usuario2 FROM amizade WHERE usuario1 = ? AND pendente = 0
            )`);
            values.push(userId, userId);
        }
        const where = conditions.join(' AND ');
        const [{ total }] = await Mysql.select(
            `SELECT COUNT(*) AS total FROM gladiators g INNER JOIN usuarios u ON u.id = g.master WHERE ${where}`,
            values,
        );

        const outer = [];
        const outerValues = [];
        if (search) {
            outer.push('(ranked.gladiator LIKE ? OR ranked.master LIKE ?)');
            outerValues.push(Mysql.contains(search), Mysql.contains(search));
        }
        if (scope === 'friends') {
            outer.push(`ranked.masterId IN (
                SELECT usuario1 FROM amizade WHERE usuario2 = ? AND pendente = 0
                UNION SELECT usuario2 FROM amizade WHERE usuario1 = ? AND pendente = 0
            )`);
            outerValues.push(userId, userId);
        }
        const rows = await Mysql.select(
            `SELECT ranked.id, ranked.gladiator, ranked.mmr, ranked.master, ranked.change24h,
                ranked.change7d, ranked.position
            FROM ${RANKED_SQL}
            ${outer.length ? `WHERE ${outer.join(' AND ')}` : ''}
            ORDER BY ranked.position
            LIMIT ? OFFSET ?`,
            [VERSION, ...outerValues, RANKING_PAGE_SIZE, Math.max(0, offset)],
        );
        return { total: Number(total), ranking: rows.map(generalRow) };
    }

    /**
     * A window of the current-version ranking centred on a gladiator or a position.
     *
     * @param {{ gladiatorId?: number, position?: number, size?: number }} query Exactly one of
     *   `gladiatorId` or `position`.
     * @returns {Promise<{ total: number, position: number, page: number, pageSize: number,
     *   around: string|null, rows: object[] }>}
     * @throws {CustomError} 404 `GLADIATOR_NOT_FOUND` when the gladiator is not in the current ranking.
     */
    static async window({ gladiatorId = undefined, position = undefined, size = RANKING_WINDOW_SIZE } = {}) {
        const [{ total }] = await Mysql.select('SELECT COUNT(*) AS total FROM gladiators WHERE version = ?', [VERSION]);
        const count = Number(total);
        const rows = windowSize(size);

        let target = null;
        let requested = position;
        if (gladiatorId !== undefined) {
            [target] = await Mysql.select(
                'SELECT cod AS id, name, mmr FROM gladiators WHERE cod = ? AND version = ?',
                [gladiatorId, VERSION],
            );
            if (!target) throw new CustomError(404, 'Gladiator not found in the current ranking.', 'GLADIATOR_NOT_FOUND');
            const [{ above }] = await Mysql.select(
                `SELECT COUNT(*) AS above FROM gladiators g
                WHERE g.version = ? AND (g.mmr > ? OR (g.mmr = ? AND g.cod < ?))`,
                [VERSION, target.mmr, target.mmr, target.id],
            );
            requested = Number(above) + 1;
        }

        const bounds = windowBounds(count, Number(requested), rows);
        if (count === 0) {
            return { total: 0, position: 0, page: 1, pageSize: RANKING_PAGE_SIZE, around: null, rows: [] };
        }
        const result = await Mysql.select(
            `SELECT ranked.id, ranked.gladiator, ranked.mmr, ranked.master, ranked.change24h,
                ranked.change7d, ranked.position
            FROM ${RANKED_SQL}
            WHERE ranked.position BETWEEN ? AND ?
            ORDER BY ranked.position`,
            [VERSION, bounds.start, bounds.last],
        );
        const mapped = result.map(generalRow);
        const around = target?.name ?? mapped.find(row => row.position === bounds.position)?.gladiator ?? null;
        return {
            total: count,
            position: bounds.position,
            page: Math.ceil(bounds.position / RANKING_PAGE_SIZE),
            pageSize: RANKING_PAGE_SIZE,
            around,
            rows: mapped,
        };
    }

    /**
     * The signed-in master's gladiators with their current-ranking position or the reason they are
     * outside it. `skin` travels so the own strip can paint the same card portrait.
     *
     * @param {number} userId
     * @returns {Promise<{ gladiators: Array<{ id: number, name: string, mmr: number, position: number|null,
     *   state: 'ranked'|'unranked'|'outdated'|'broken', skin: string }> }>}
     */
    static async mine(userId) {
        const rows = await Mysql.select(
            `SELECT g.cod AS id, g.name, g.mmr, g.version, g.skin, ranked.position
            FROM gladiators g
            LEFT JOIN (
                SELECT cod, ROW_NUMBER() OVER (ORDER BY mmr DESC, cod ASC) AS position
                FROM gladiators WHERE version = ?
            ) ranked ON ranked.cod = g.cod
            WHERE g.master = ?
            ORDER BY ranked.position IS NULL, ranked.position, g.name`,
            [VERSION, userId],
        );
        return {
            gladiators: rows.map(row => {
                const broken = row.version === 'broken';
                const outdated = !broken && row.version !== VERSION;
                const state = broken ? 'broken' : outdated ? 'outdated' : row.position == null ? 'unranked' : 'ranked';
                return {
                    id: Number(row.id),
                    name: row.name,
                    mmr: Math.trunc(row.mmr),
                    position: state === 'ranked' ? Number(row.position) : null,
                    state,
                    skin: row.skin ?? '',
                };
            }),
        };
    }

    /**
     * @param {number} userId
     * @returns {Promise<number>} How many current gladiators rank above the master's best one.
     */
    static async bestOffset(userId) {
        const [best] = await Mysql.select(
            'SELECT mmr, cod FROM gladiators WHERE master = ? AND version = ? ORDER BY mmr DESC, cod ASC LIMIT 1',
            [userId, VERSION],
        );
        if (!best) return 0;
        const [{ above }] = await Mysql.select(
            `SELECT COUNT(*) AS above FROM gladiators g
            WHERE g.version = ? AND (g.mmr > ? OR (g.mmr = ? AND g.cod < ?))`,
            [VERSION, best.mmr, best.mmr, best.cod],
        );
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

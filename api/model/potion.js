import { CustomError } from '../helpers/error.js';
import { Mysql } from '../helpers/mysql.js';

/** Master levels that unlock each of the four potion slots. */
export const SLOT_LEVELS = [5, 15, 25, 35];
/** Hours a potion lasts, by apothecary level (1 to 5). */
export const BREW_HOURS = [2, 6, 12, 24, 48];
/** Silver to upgrade the apothecary from each level (the last level cannot be upgraded). */
export const UPGRADE_PRICES = [1500, 5000, 15000, 35000, 0];
/** Highest apothecary level. */
export const MAX_APOTHECARY = BREW_HOURS.length;
/** Items kept in `items` that are not sold. */
const HIDDEN_ITEMS = [11, 12, 13, 14, 15, 16, 17, 18];

/**
 * @param {number} level Master level.
 * @returns {number} Potion slots the level has unlocked.
 */
export function unlockedSlots(level) {
    return SLOT_LEVELS.filter(required => level >= required).length;
}

/**
 * Potions (`items`), the masters' potion slots (`slots`) and the apothecary that brews them.
 */
export class Potion {
    /**
     * @returns {Promise<Record<string, { id: number, name: string, price: number, level: number, description: string, icon: string }>>}
     *   Potions on sale by identifier (the name used in `useItem`), cheapest first.
     */
    static async catalog() {
        const items = await Mysql.select(`SELECT * FROM items WHERE id NOT IN (${HIDDEN_ITEMS.map(() => '?').join(',')}) ORDER BY price`, HIDDEN_ITEMS);
        return Object.fromEntries(items.map(item => [item.identifier, {
            id: item.id, name: item.name, price: item.price, level: item.lvl, description: item.description, icon: item.icon,
        }]));
    }

    /**
     * The master's active potions, soonest to expire first.
     *
     * @param {number} userId
     * @returns {Promise<Array<{ id: number, identifier: string, potion: string, name: string, icon: string,
     *   expiresAt: string, seconds: number, secondsLeft: number }>>}
     */
    static async slots(userId) {
        const rows = await Mysql.select(
            `SELECT s.id, i.identifier, i.icon, i.name,
                DATE_FORMAT(s.expire, '%Y-%m-%d %H:%i:%s') AS expiresAt,
                TIME_TO_SEC(TIMEDIFF(s.expire, NOW())) AS seconds
            FROM slots s INNER JOIN items i ON i.id = s.item
            WHERE s.user = ? AND s.expire > NOW() ORDER BY s.expire LIMIT 4`,
            [userId],
        );
        return rows.map(row => ({
            id: row.id,
            identifier: row.identifier,
            potion: row.identifier,
            name: row.name,
            icon: row.icon,
            expiresAt: row.expiresAt,
            seconds: Number(row.seconds),
            secondsLeft: Number(row.seconds),
        }));
    }

    /**
     * The database clock used by the shells to format the slot expiry.
     *
     * @returns {Promise<string>} `YYYY-MM-DD HH:MM:SS`.
     */
    static async serverNow() {
        const [row] = await Mysql.select("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS serverNow");
        return row.serverNow;
    }

    /**
     * Buys a potion into a free slot. The master's row is locked, so two purchases cannot spend
     * the same silver or fill the same slot.
     *
     * @param {number} userId
     * @param {string} identifier Potion identifier.
     * @returns {Promise<{ slotId: number, silver: number }>}
     * @throws {CustomError} 404 `POTION_NOT_FOUND`, 409 `NO_FREE_SLOT`, 403 `APOTHECARY_LEVEL`, 409 `NOT_ENOUGH_SILVER`.
     */
    static async buy(userId, identifier) {
        return Mysql.withTransaction(async context => {
            const potion = await Mysql.findOne('items', { filter: { identifier } }, context);
            if (!potion || HIDDEN_ITEMS.includes(potion.id)) throw new CustomError(404, 'Potion not found.', 'POTION_NOT_FOUND');

            const user = await Mysql.findOne('usuarios', { filter: { id: userId }, view: ['silver', 'lvl', 'apothecary'], opt: { forUpdate: true } }, context);
            const [{ used }] = await Mysql.select('SELECT COUNT(*) AS used FROM slots WHERE user = ? AND expire > NOW()', [userId], context);
            if (Number(used) >= unlockedSlots(user.lvl)) throw new CustomError(409, 'No free potion slot.', 'NO_FREE_SLOT');
            if (user.apothecary < potion.lvl) throw new CustomError(403, 'The apothecary cannot brew this potion yet.', 'APOTHECARY_LEVEL');
            if (user.silver < potion.price) throw new CustomError(409, 'Not enough silver.', 'NOT_ENOUGH_SILVER');

            await Mysql.update('usuarios', { silver: { dec: potion.price } }, { id: userId }, context);
            const hours = BREW_HOURS[user.apothecary - 1];
            const { insertId } = await Mysql.insert('slots', { user: userId, item: potion.id, expire: Mysql.raw(`NOW() + INTERVAL ${Number(hours)} HOUR`) }, context);
            return { slotId: insertId, silver: user.silver - potion.price };
        });
    }

    /**
     * Cancels one of the master's potions.
     *
     * @param {number} userId
     * @param {number} slotId
     * @throws {CustomError} 404 `SLOT_NOT_FOUND`.
     */
    static async cancel(userId, slotId) {
        const changed = await Mysql.update('slots', { expire: Mysql.raw('NOW()') }, { id: slotId, user: userId });
        if (!changed) throw new CustomError(404, 'Potion slot not found.', 'SLOT_NOT_FOUND');
    }

    /**
     * Upgrades the master's apothecary one level.
     *
     * @param {number} userId
     * @returns {Promise<{ apothecary: number, silver: number }>}
     * @throws {CustomError} 409 `APOTHECARY_MAX_LEVEL`, 409 `NOT_ENOUGH_SILVER`.
     */
    static async upgradeApothecary(userId) {
        return Mysql.withTransaction(async context => {
            const user = await Mysql.findOne('usuarios', { filter: { id: userId }, view: ['silver', 'apothecary'], opt: { forUpdate: true } }, context);
            if (user.apothecary >= MAX_APOTHECARY) throw new CustomError(409, 'The apothecary is at its highest level.', 'APOTHECARY_MAX_LEVEL');
            const cost = UPGRADE_PRICES[user.apothecary - 1];
            if (user.silver < cost) throw new CustomError(409, 'Not enough silver.', 'NOT_ENOUGH_SILVER');

            await Mysql.update('usuarios', { apothecary: { inc: 1 }, silver: { dec: cost } }, { id: userId }, context);
            return { apothecary: user.apothecary + 1, silver: user.silver - cost };
        });
    }
}

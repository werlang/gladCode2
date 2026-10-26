import { api } from '../helpers/request.js';

const ENDPOINT = 'back_slots.php';

/**
 * Potions, the user's item slots and the apothecary (`back_slots.php`).
 */
export class SlotsModel {
    /**
     * The potion catalogue.
     *
     * @returns {Promise<{ potions: Record<string, { name: string, lvl: number, description: string, price: number, icon: string }> }>}
     */
    static items() {
        return api.post(ENDPOINT, { action: 'ITEMS' });
    }

    /**
     * The signed-in user's slots and the potions in them.
     *
     * @returns {Promise<Record<string, any>>}
     */
    static slots() {
        return api.post(ENDPOINT, { action: 'SLOTS' });
    }

    /**
     * Buys a potion into a free slot.
     *
     * @param {string|number} id Potion identifier.
     * @returns {Promise<Record<string, any>>}
     */
    static buy(id) {
        return api.post(ENDPOINT, { action: 'BUY', id });
    }

    /**
     * Discards the potion in a slot.
     *
     * @param {string|number} id Slot id.
     * @returns {Promise<{ status: 'SUCCESS'|'NOTFOUND' }>}
     */
    static expire(id) {
        return api.post(ENDPOINT, { action: 'EXPIRE', id });
    }

    /**
     * Apothecary upgrade prices and potion brewing times per level.
     *
     * @returns {Promise<{ prices: number[], times: number[] }>}
     */
    static upgradeCosts() {
        return api.post(ENDPOINT, { action: 'UPGRADE', command: 'COSTS' });
    }

    /**
     * Upgrades the apothecary one level.
     *
     * @returns {Promise<{ status: 'SUCCESS'|'NO MONEY'|'MAX LVL', silver?: number, apot?: number }>}
     */
    static upgradeApothecary() {
        return api.post(ENDPOINT, { action: 'UPGRADE', command: 'APOT' });
    }
}

import { api } from '../helpers/request.js';

/**
 * Potions (`/potions`): the catalogue, the signed-in master's potion slots and the apothecary.
 */
export class PotionModel {
    /**
     * @returns {Promise<Record<string, { id: number, name: string, price: number, level: number, description: string, icon: string }>>}
     *   Potions on sale by identifier (the name used in `useItem`).
     */
    static async catalog() {
        const { potions } = await api.get('potions');
        return potions;
    }

    /** @returns {Promise<{ prices: number[], hours: number[] }>} Upgrade price and brewing hours by apothecary level - 1. */
    static apothecary() {
        return api.get('potions/apothecary');
    }

    /**
     * @returns {Promise<{ slots: Array<{ id: number, potion: string, name: string, icon: string, secondsLeft: number }>, unlockLevels: number[], level: number }>}
     */
    static slots() {
        return api.get('potions/slots');
    }

    /**
     * Orders a potion into a free slot.
     *
     * @param {string} potion Potion identifier.
     * @returns {Promise<{ slotId: number, silver: number }>}
     * @throws {import('../helpers/request.js').RequestError} `NO_FREE_SLOT`, `APOTHECARY_LEVEL`, `NOT_ENOUGH_SILVER`.
     */
    static buy(potion) {
        return api.post('potions/slots', { potion });
    }

    /**
     * @param {number} slotId
     * @returns {Promise<{ cancelled: true }>}
     */
    static cancel(slotId) {
        return api.delete(`potions/slots/${slotId}`);
    }

    /**
     * @returns {Promise<{ apothecary: number, silver: number }>}
     * @throws {import('../helpers/request.js').RequestError} `APOTHECARY_MAX_LEVEL`, `NOT_ENOUGH_SILVER`.
     */
    static upgradeApothecary() {
        return api.post('potions/apothecary/upgrade');
    }
}

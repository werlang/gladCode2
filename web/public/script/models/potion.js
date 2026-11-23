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
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ slots: Array<{ id: number, identifier: string, name: string, icon: string, expiresAt: string, seconds: number }>, serverNow: string, unlockLevels: number[], level: number }>}
     */
    static slots({ signal } = {}) {
        return api.get('potions/slots', {}, { signal });
    }

    /**
     * Orders a potion into a free slot.
     *
     * @param {string} potion Potion identifier.
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ slotId: number, silver: number, slots?: Array<object>, serverNow?: string }>}
     * @throws {import('../helpers/request.js').RequestError} `NO_FREE_SLOT`, `APOTHECARY_LEVEL`, `NOT_ENOUGH_SILVER`.
     */
    static buy(potion, { signal } = {}) {
        return api.post('potions/slots', { potion }, { signal });
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

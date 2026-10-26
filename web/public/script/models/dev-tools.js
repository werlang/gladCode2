import { api } from '../helpers/request.js';

/**
 * Tournament dev tools (`/admin/tournaments`, administrators only): test tournaments, the real
 * ones, resetting a round, exporting and importing. Refusals come as `RequestError` codes such as
 * `ADMIN_ONLY`, `NOT_A_TEST_TOURNAMENT`, `ROUND_NOT_FOUND`.
 */
export class DevToolsModel {
    /**
     * @returns {Promise<object[]>} Test tournaments, newest first.
     * @throws {import('../helpers/request.js').RequestError} `ADMIN_ONLY`, `NOT_SIGNED_IN`.
     */
    static async testTournaments() {
        const { tournaments } = await api.get('admin/tournaments/test');
        return tournaments;
    }

    /**
     * Creates a test tournament of random full teams.
     *
     * @param {{ name: string, teams: number, maxTime: string, managerEmail?: string }} options
     * @returns {Promise<{ id: number, name: string, manager: string, teams: object[] }>}
     * @throws {import('../helpers/request.js').RequestError} `TOURNAMENT_EXISTS`, `FEW_GLADIATORS`, `MANAGER_NOT_FOUND`.
     */
    static createTest(options) {
        return api.post('admin/tournaments/test', options);
    }

    /**
     * Deletes a test tournament with its teams, rounds and battle logs.
     *
     * @param {number} id
     * @returns {Promise<{ name: string, stats: Record<string, number> }>}
     */
    static removeTest(id) {
        return api.delete(`admin/tournaments/test/${id}`);
    }

    /**
     * A page of the real tournaments.
     *
     * @param {{ page: number, limit: number }} page
     * @returns {Promise<{ tournaments: object[], pagination: { page: number, limit: number, total: number, totalPages: number } }>}
     */
    static tournaments({ page, limit }) {
        return api.get('admin/tournaments', { page, limit });
    }

    /**
     * Takes a started tournament back to the start of a round.
     *
     * @param {number|string} ref Tournament id or hash.
     * @param {number} round
     * @returns {Promise<{ id: number, name: string, hash: string, round: number, stats: Record<string, number> }>}
     */
    static reset(ref, round) {
        return api.post(`admin/tournaments/${encodeURIComponent(ref)}/reset`, { round });
    }

    /**
     * @param {number|string} ref Tournament id or hash.
     * @returns {Promise<Record<string, any>>} The export, to save as a file.
     */
    static export(ref) {
        return api.get(`admin/tournaments/${encodeURIComponent(ref)}/export`);
    }

    /**
     * @param {{ data: Record<string, any>, mode: 'create'|'update', tournamentId?: number }} options
     * @returns {Promise<{ id: number, name: string, mode: string, summary: string[] }>}
     */
    static import(options) {
        return api.post('admin/tournaments/import', options);
    }
}

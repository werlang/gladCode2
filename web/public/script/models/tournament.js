import { BATTLE_TIMEOUT_MS, api } from '../helpers/request.js';

/**
 * Tournaments: their setup and teams (`/tournaments`, `/teams`) and their rounds of battles
 * (`/tournament-rounds/:hash`). Before it starts, a tournament is reached by id and password (empty
 * for public ones); once started, by its public hash. Refusals come as `RequestError` codes such as
 * `TOURNAMENT_STARTED`, `TEAM_EXISTS`, `WRONG_WORD`.
 */
export class TournamentModel {
    /**
     * @param {{ name: string, password: string, description: string, maxTeams: number, maxMinutes: number, flex: boolean }} tournament
     * @returns {Promise<{ id: number }>}
     * @throws {import('../helpers/request.js').RequestError} `TOURNAMENT_EXISTS`.
     */
    static create(tournament) {
        return api.post('tournaments', tournament);
    }

    /**
     * Pages of the open public tournaments and of the master's own.
     *
     * @param {{ mine: number, open: number }} offsets First row of each list.
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ open: object[], mine: object[], pages: Record<'mine'|'open', { offset: number, total: number }> }>}
     */
    static list({ mine, open }, { signal } = {}) {
        return api.get('tournaments', { mineOffset: mine, openOffset: open }, { signal });
    }

    /**
     * Finds a tournament by name and password (the master's own and public ones need none).
     *
     * @param {string} name
     * @param {string} [password]
     * @returns {Promise<{ id: number, name: string, description: string, password: string, hash: string }>}
     * @throws {import('../helpers/request.js').RequestError} `TOURNAMENT_NOT_FOUND`.
     */
    static async find(name, password) {
        const { tournament } = await api.post('tournaments/lookup', { name, ...(password === undefined ? {} : { password }) });
        return tournament;
    }

    /**
     * @param {{ id: number, password: string }} tournament
     * @returns {Promise<Record<string, any>>} `{ started: true, hash }`, or the teams with `maxTeams`, `manager`, `joined`, `filled`.
     */
    static teams({ id, password }) {
        return api.get(`tournaments/${id}/teams`, { password });
    }

    /**
     * @param {{ id: number, password: string }} tournament
     * @param {{ name: string, gladiator: number, showCode: boolean }} team
     * @returns {Promise<{ id: number, word: string }>}
     */
    static createTeam({ id, password }, team) {
        return api.post(`tournaments/${id}/teams`, { password, ...team });
    }

    /**
     * @param {number} id Team id.
     * @returns {Promise<Record<string, any>>} `{ id, name, word, flex, member, joined, gladiators }`.
     */
    static async team(id) {
        const { team } = await api.get(`teams/${id}`);
        return team;
    }

    /**
     * @param {number} id Team id.
     * @returns {Promise<{ teamRemoved: boolean }>}
     */
    static leaveTeam(id) {
        return api.delete(`teams/${id}/members/me`);
    }

    /**
     * @param {number} id Team id.
     * @param {{ word: string, gladiator: number, showCode: boolean }} entry
     * @returns {Promise<unknown>}
     */
    static joinTeam(id, entry) {
        return api.post(`teams/${id}/members`, entry);
    }

    /**
     * @param {number} id Team id.
     * @param {{ word: string, gladiator: number, showCode: boolean }} entry
     * @returns {Promise<unknown>}
     */
    static addGladiator(id, entry) {
        return api.post(`teams/${id}/gladiators`, entry);
    }

    /**
     * @param {number} team Team id.
     * @param {number} glad Gladiator id.
     * @returns {Promise<{ teamRemoved: boolean }>}
     */
    static removeGladiator(team, glad) {
        return api.delete(`teams/${team}/gladiators/${glad}`);
    }

    /**
     * Removes a team (manager only).
     *
     * @param {{ id: number }} tournament
     * @param {number} team Team id.
     * @returns {Promise<unknown>}
     */
    static kick({ id }, team) {
        return api.delete(`tournaments/${id}/teams/${team}`);
    }

    /**
     * @param {{ id: number }} tournament
     * @returns {Promise<unknown>}
     * @throws {import('../helpers/request.js').RequestError} `TOURNAMENT_NOT_EMPTY`, `TOURNAMENT_STARTED`.
     */
    static remove({ id }) {
        return api.delete(`tournaments/${id}`);
    }

    /**
     * Starts the tournament; the API emails its masters.
     *
     * @param {{ id: number }} tournament
     * @returns {Promise<{ hash: string }>}
     */
    static start({ id }) {
        return api.post(`tournaments/${id}/start`);
    }

    /**
     * A round's page, the final ranking (round 0) or where to go.
     *
     * @param {string} hash
     * @param {number|string} round
     * @returns {Promise<Record<string, any>>} `status`: `round`, `end` or `redirect`.
     */
    static round(hash, round) {
        return api.get(`tournament-rounds/${hash}/${round}`);
    }

    /**
     * Teams and groups of a round now.
     *
     * @param {string} hash
     * @param {number|string} round
     * @returns {Promise<{ status: 'open'|'next'|'end', teams: Record<number, object>, groups: Record<number, { status: 'wait'|'ready'|'locked'|'done', remaining: number, hash?: string }> }>}
     */
    static refresh(hash, round) {
        return api.get(`tournament-rounds/${hash}/${round}/status`);
    }

    /**
     * The master's team's gladiators in a round.
     *
     * @param {string} hash
     * @param {number|string} round
     * @returns {Promise<object[]>}
     * @throws {import('../helpers/request.js').RequestError} `GROUP_LOCKED`, `TEAM_NOT_FOUND`.
     */
    static async teamGladiators(hash, round) {
        const { gladiators } = await api.get(`tournament-rounds/${hash}/${round}/gladiators`);
        return gladiators;
    }

    /**
     * The master's team picks its gladiator for the latest round.
     *
     * @param {string} hash
     * @param {number} gladiator
     * @returns {Promise<unknown>}
     * @throws {import('../helpers/request.js').RequestError} `GLADIATOR_DEAD`, `GLADIATOR_OUTDATED`, `GROUP_DONE`.
     */
    static choose(hash, gladiator) {
        return api.put(`tournament-rounds/${hash}/choice`, { gladiator });
    }

    /**
     * Runs a group's battle (manager only).
     *
     * @param {string} hash
     * @param {number} group
     * @param {{ force?: boolean, signal?: AbortSignal }} [options] `force` runs a fought group again.
     * @returns {Promise<{ hash: string|null, error: string }>}
     */
    static runGroup(hash, group, { force = false, signal } = {}) {
        return api.post(`tournament-rounds/${hash}/groups/${group}/battle`, { force }, { signal, timeout: BATTLE_TIMEOUT_MS });
    }

    /**
     * Records the latest round and creates the next one when every group fought (manager only).
     *
     * @param {string} hash
     * @returns {Promise<{ status: 'waiting'|'next'|'end'|'rerun' }>}
     */
    static nextRound(hash) {
        return api.post(`tournament-rounds/${hash}/advance`);
    }

    /**
     * Ends the latest round's choosing time now (manager only).
     *
     * @param {string} hash
     * @returns {Promise<unknown>}
     */
    static endTurn(hash) {
        return api.post(`tournament-rounds/${hash}/end-turn`);
    }
}

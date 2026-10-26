import { api } from '../helpers/request.js';

const RUN = 'back_tournament_run.php';
const SETUP = 'back_tournament.php';

/**
 * Tournaments: their setup and teams (`back_tournament.php`) and their rounds
 * of battles (`back_tournament_run.php`).
 *
 * A tournament is addressed by its name and password while it gathers teams.
 */
export class TournamentModel {
    /**
     * Creates a tournament.
     *
     * @param {{ name: string, pass: string, desc: string, maxteams: string|number, maxtime: string, flex: boolean }} tournament
     * @returns {Promise<'EXISTS'|unknown>}
     */
    static create(tournament) {
        return api.post(SETUP, { action: 'CREATE', ...tournament });
    }

    /**
     * Pages of the open public tournaments and of the user's tournaments.
     *
     * @param {{ mine: number, open: number }} offsets First row of each list.
     * @returns {Promise<{ open: object[], mytourn: object[], pages: Record<'mine'|'open', { offset: number, total: number }> }>}
     */
    static list({ mine, open }) {
        return api.post(SETUP, { action: 'LIST', moffset: mine, ooffset: open });
    }

    /**
     * Finds a tournament to join; a public one needs no password.
     *
     * @param {string} name Tournament name.
     * @param {string} [pass] Password.
     * @returns {Promise<{ status: string, id?: number, name?: string, description?: string, pass?: string, hash?: string }>}
     *   `hash` is set once the tournament started.
     */
    static find(name, pass) {
        return api.post(SETUP, { action: 'JOIN', name, ...(pass === undefined ? {} : { pass }) });
    }

    /**
     * The tournament's teams.
     *
     * @param {{ name: string, pass: string }} tournament
     * @returns {Promise<Record<string, any>>}
     */
    static teams({ name, pass }) {
        return api.post(SETUP, { action: 'LIST_TEAMS', name, pass });
    }

    /**
     * Creates a team with the user's gladiator.
     *
     * @param {{ name: string, tname: string, tpass: string, glad: number, showcode: boolean }} team
     * @returns {Promise<{ word: string, id: number }|'NOTFOUND'|'STARTED'|'ALREADYIN'|'EXISTS'|'FULL'>}
     */
    static createTeam(team) {
        return api.post(SETUP, { action: 'TEAM_CREATE', ...team });
    }

    /**
     * A team's gladiators (the team's own are shown in full).
     *
     * @param {number} id Team id.
     * @returns {Promise<Record<string, any>>}
     */
    static team(id) {
        return api.post(SETUP, { action: 'TEAM', id, sync: 0 });
    }

    /** @param {number} id Team id. */
    static leaveTeam(id) {
        return api.post(SETUP, { action: 'LEAVE_TEAM', id });
    }

    /**
     * Joins a team with a gladiator.
     *
     * @param {{ team: number, pass: string, glad: number, showcode: boolean }} entry
     * @returns {Promise<{ status: string }>}
     */
    static joinTeam(entry) {
        return api.post(SETUP, { action: 'JOIN_TEAM', ...entry });
    }

    /**
     * Adds another of the user's gladiators to a flex team.
     *
     * @param {{ team: number, pass: string, glad: number, showcode: boolean }} entry
     * @returns {Promise<{ status: string }>}
     */
    static addGladiator(entry) {
        return api.post(SETUP, { action: 'ADD_GLAD', ...entry });
    }

    /**
     * @param {number} team Team id.
     * @param {number} glad Gladiator id.
     * @returns {Promise<{ status: string }>}
     */
    static removeGladiator(team, glad) {
        return api.post(SETUP, { action: 'REMOVE_GLAD', team, glad });
    }

    /**
     * Removes a team (manager only).
     *
     * @param {{ name: string, pass: string }} tournament
     * @param {string} team Team name.
     * @returns {Promise<{ status: string }>}
     */
    static kick({ name, pass }, team) {
        return api.post(SETUP, { action: 'KICK', name, pass, teamname: team });
    }

    /**
     * Deletes a tournament without teams (manager only).
     *
     * @param {{ name: string, pass: string }} tournament
     * @returns {Promise<{ status: string }>}
     */
    static remove({ name, pass }) {
        return api.post(SETUP, { action: 'DELETE', name, pass });
    }

    /**
     * Starts a tournament (manager only).
     *
     * @param {{ name: string, pass: string }} tournament
     * @returns {Promise<{ status: string, hash?: string }>}
     */
    static start({ name, pass }) {
        return api.post(SETUP, { action: 'START', name, pass });
    }

    /**
     * A round of a tournament: its teams and groups, or the final ranking.
     *
     * @param {string} hash Tournament hash.
     * @param {number|string} round Round number (0 for the final ranking).
     * @returns {Promise<Record<string, any>>} `status` is `REDIRECT`, `NOTFOUND`, `END` or the round.
     */
    static round(hash, round) {
        return api.post(RUN, { action: 'GET', hash, round });
    }

    /**
     * The round's progress: teams ready, survivors, survival times and group states.
     *
     * @param {string} hash Tournament hash.
     * @param {number|string} round Round number.
     * @returns {Promise<Record<string, any>>}
     */
    static refresh(hash, round) {
        return api.post(RUN, { action: 'REFRESH', hash, round });
    }

    /**
     * The team's gladiators that can fight this round.
     *
     * @param {string} hash Tournament hash.
     * @param {number|string} round Round number.
     * @returns {Promise<{ status: string, glads?: object[] }>} `LOCK` when the group closed.
     */
    static teamGladiators(hash, round) {
        return api.post(RUN, { action: 'GLADS', hash, round });
    }

    /**
     * Chooses the team's gladiator for the round.
     *
     * @param {string} hash Tournament hash.
     * @param {number} id Gladiator id.
     * @returns {Promise<{ status: 'SUCCESS'|'DEAD'|'OLD'|string }>}
     */
    static choose(hash, id) {
        return api.post(RUN, { action: 'CHOOSE', hash, id });
    }

    /**
     * Prepares the next round once every group fought (manager only).
     *
     * @param {string} hash Tournament hash.
     * @returns {Promise<Record<string, any>>}
     */
    static nextRound(hash) {
        return api.post(RUN, { action: 'UPDATE', hash });
    }

    /**
     * Closes the round's choices now (manager only).
     *
     * @param {string} hash Tournament hash.
     * @returns {Promise<Record<string, any>>}
     */
    static endTurn(hash) {
        return api.post(RUN, { action: 'END TURN', hash });
    }
}

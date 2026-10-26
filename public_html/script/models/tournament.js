import { api } from '../helpers/request.js';

const RUN = 'back_tournament_run.php';

/**
 * Tournaments: their rounds of battles (`back_tournament_run.php`).
 */
export class TournamentModel {
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

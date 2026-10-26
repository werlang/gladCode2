import { api } from '../helpers/request.js';

const TRAIN = 'back_train.php';
const RUN = 'back_training_run.php';

/**
 * Team trainings: their setup (`back_train.php`) and their rounds of battles
 * (`back_training_run.php`).
 */
export class TrainingModel {
    /**
     * Joins a training by its invitation hash. Without `glad` it only checks
     * the invitation (`ALLOWED` asks for a gladiator).
     *
     * @param {string} hash Invitation hash.
     * @param {{ glad?: number, redirect?: boolean }} [options] Gladiator to enter,
     *   and whether the profile should open the training next.
     * @returns {Promise<{ status: 'JOINED'|'NOTFOUND'|'COLLISION'|'EXPIRED'|'ALLOWED'|'STARTED'|'NOGLAD'|'SUCCESS', id?: number, name?: string }>}
     */
    static join(hash, { glad, redirect } = {}) {
        return api.post(TRAIN, {
            action: 'JOIN',
            hash,
            ...(glad === undefined ? {} : { glad, redirect: Boolean(redirect) }),
        });
    }

    /**
     * A round of a training: its groups and teams, or the final ranking.
     *
     * @param {string} hash Training hash.
     * @param {number|string} round Round number (0 for the final ranking).
     * @returns {Promise<Record<string, any>>}
     */
    static round(hash, round) {
        return api.post(RUN, { action: 'GET', hash, round });
    }

    /**
     * The round's progress: deadlines, finished groups and what to do next.
     *
     * @param {string} hash Training hash.
     * @param {number|string} round Round number.
     * @returns {Promise<Record<string, any>>}
     */
    static refresh(hash, round) {
        return api.post(RUN, { action: 'REFRESH', hash, round });
    }

    /**
     * Sets when the round's battles start (manager only).
     *
     * @param {string} hash Training hash.
     * @param {number|string} round Round number.
     * @param {number} minutes Minutes from now; 0 ends the round now.
     * @returns {Promise<{ status: string, deadline?: string }>}
     */
    static setRoundDeadline(hash, round, minutes) {
        return api.post(RUN, { action: 'DEADLINE', hash, round, time: minutes });
    }

    /**
     * Ends the whole training now (manager only).
     *
     * @param {string} hash Training hash.
     * @returns {Promise<{ status: string }>}
     */
    static end(hash) {
        return api.post(RUN, { action: 'DEADLINE', hash });
    }

    /**
     * Opens the next round once every group fought.
     *
     * @param {string} hash Training hash.
     * @param {number|string} round Finished round.
     * @returns {Promise<Record<string, any>>}
     */
    static newRound(hash, round) {
        return api.post(RUN, { action: 'NEW ROUND', hash, round });
    }

    /**
     * Runs a group's battle again (manager only).
     *
     * @param {string} hash Training hash.
     * @param {number|string} group Group id.
     * @returns {Promise<{ status: string }>}
     */
    static rerun(hash, group) {
        return api.post(RUN, { action: 'RERUN', hash, group });
    }
}

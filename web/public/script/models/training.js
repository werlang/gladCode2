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
     * Creates a training (tutor accounts).
     *
     * @param {{ name: string, desc: string, maxtime: number, players: number, weight: number }} training
     * @returns {Promise<{ status: 'SUCCESS'|'NOPREMIUM'|'NOCREDITS'|string, hash?: string }>}
     */
    static create(training) {
        return api.post(TRAIN, { action: 'CREATE', ...training });
    }

    /**
     * Pages of the trainings the user manages and takes part in.
     *
     * @param {{ manage: number, part: number }} offsets First row of each list.
     * @returns {Promise<Record<string, any>>} `redirect` names a training to open (just joined from a link).
     */
    static list({ manage, part }) {
        return api.post(TRAIN, { action: 'LIST', moffset: manage, poffset: part });
    }

    /**
     * A training waiting to start, as its manager or a participant sees it.
     *
     * @param {number} id Training id.
     * @returns {Promise<Record<string, any>>} `status` is `MANAGE`, `PARTICIPATE`, `STARTED`, `NOTALLOWED` or `NOTFOUND`.
     */
    static room(id) {
        return api.post(TRAIN, { action: 'ROOM', id });
    }

    /**
     * Renames a training or changes its description (manager only).
     *
     * @param {number} id Training id.
     * @param {'name'|'description'} field Field.
     * @param {string} value New text.
     * @returns {Promise<{ status: string, message?: string }>}
     */
    static edit(id, field, value) {
        return api.post(TRAIN, { action: 'EDIT', id, field, value });
    }

    /**
     * Issues a new invitation hash (manager only).
     *
     * @param {number} id Training id.
     * @returns {Promise<{ status: string, hash?: string }>}
     */
    static renew(id) {
        return api.post(TRAIN, { action: 'RENEW', id });
    }

    /**
     * Removes a participant (manager only).
     *
     * @param {number} id Training id.
     * @param {number} glad Participant's gladiator.
     * @returns {Promise<{ status: string }>}
     */
    static kick(id, glad) {
        return api.post(TRAIN, { action: 'KICK', id, glad });
    }

    /**
     * Leaves a training.
     *
     * @param {number} id Training id.
     * @returns {Promise<{ status: string }>}
     */
    static leave(id) {
        return api.post(TRAIN, { action: 'KICK', id, myself: true });
    }

    /**
     * Deletes a training without participants (manager only).
     *
     * @param {number} id Training id.
     * @returns {Promise<{ status: string }>}
     */
    static remove(id) {
        return api.post(TRAIN, { action: 'DELETE', id });
    }

    /**
     * Deletes a training that already ran, with its results (manager only).
     *
     * @param {number} id Training id.
     * @returns {Promise<{ status: string }>}
     */
    static purge(id) {
        return api.post(TRAIN, { action: 'REMOVE', id });
    }

    /**
     * Swaps the user's gladiator in a training.
     *
     * @param {number} id Training id.
     * @param {number} glad New gladiator.
     * @returns {Promise<{ status: string }>}
     */
    static changeGladiator(id, glad) {
        return api.post(TRAIN, { action: 'CHANGE', id, glad });
    }

    /**
     * Starts a training (manager only).
     *
     * @param {number} id Training id.
     * @returns {Promise<{ status: string, hash?: string }>}
     */
    static start(id) {
        return api.post(TRAIN, { action: 'START', id });
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

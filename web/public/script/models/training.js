import { BATTLE_TIMEOUT_MS, api } from '../helpers/request.js';

/**
 * Team trainings: their setup (`/trainings`) and their rounds of battles
 * (`/training-rounds/:hash`). A training is joined by its invitation code, which
 * names its round pages once it starts. Refusals come as `RequestError` codes such
 * as `TRAINING_NOT_FOUND`, `INVITATION_EXPIRED`, `TRAINING_STARTED`.
 */
export class TrainingModel {
    /**
     * The training an invitation code opens.
     *
     * @param {string} hash Invitation code.
     * @returns {Promise<{ id: number, name: string, status: 'open'|'joined'|'started' }>}
     * @throws {import('../helpers/request.js').RequestError} `TRAINING_NOT_FOUND`, `INVITATION_EXPIRED`.
     */
    static async invitation(hash) {
        const { training } = await api.get(`trainings/invitations/${encodeURIComponent(hash)}`);
        return training;
    }

    /**
     * Enters one of the master's gladiators in a training.
     *
     * @param {string} hash Invitation code.
     * @param {number} gladiator
     * @returns {Promise<{ id: number, name: string }>}
     * @throws {import('../helpers/request.js').RequestError} `TRAINING_STARTED`, `ALREADY_JOINED`, `INVITATION_EXPIRED`.
     */
    static join(hash, gladiator) {
        return api.post(`trainings/invitations/${encodeURIComponent(hash)}`, { gladiator });
    }

    /**
     * Creates a training (tutor accounts).
     *
     * @param {{ name: string, description: string, maxMinutes: number, players: number, weight: number }} training
     * @returns {Promise<{ id: number, hash: string }>}
     * @throws {import('../helpers/request.js').RequestError} `TUTOR_ONLY`, `NO_CREDITS`.
     */
    static create(training) {
        return api.post('trainings', training);
    }

    /**
     * Pages of the trainings the user manages and takes part in.
     *
     * @param {{ manage: number, part: number }} offsets First row of each list.
     * @returns {Promise<{ manage: object[], part: object[], pages: Record<'manage'|'part', { offset: number, total: number }> }>}
     */
    static list({ manage, part }) {
        return api.get('trainings', { manageOffset: manage, partOffset: part });
    }

    /**
     * A training waiting to start, as its manager or a participant sees it.
     *
     * @param {number} id Training id.
     * @returns {Promise<Record<string, any>>} `status` is `manage`, `participate` or `started` (with `hash`).
     * @throws {import('../helpers/request.js').RequestError} `TRAINING_NOT_FOUND`, `NOT_A_MEMBER`.
     */
    static room(id) {
        return api.get(`trainings/${id}`);
    }

    /**
     * Renames a training or changes its description (manager only).
     *
     * @param {number} id Training id.
     * @param {'name'|'description'} field Field.
     * @param {string} value New text.
     * @returns {Promise<unknown>}
     * @throws {import('../helpers/request.js').RequestError} `INVALID_NAME`.
     */
    static edit(id, field, value) {
        return api.put(`trainings/${id}`, { [field]: value });
    }

    /**
     * Issues a new invitation code (manager only).
     *
     * @param {number} id Training id.
     * @returns {Promise<{ hash: string }>}
     */
    static renew(id) {
        return api.post(`trainings/${id}/invitation`);
    }

    /**
     * Removes a participant (manager only).
     *
     * @param {number} id Training id.
     * @param {number} glad Participant's gladiator.
     * @returns {Promise<unknown>}
     */
    static kick(id, glad) {
        return api.delete(`trainings/${id}/gladiators/${glad}`);
    }

    /**
     * Leaves a training.
     *
     * @param {number} id Training id.
     * @returns {Promise<unknown>}
     */
    static leave(id) {
        return api.delete(`trainings/${id}/members/me`);
    }

    /**
     * Deletes a training with its rounds and scores (manager only).
     *
     * @param {number} id Training id.
     * @returns {Promise<unknown>}
     */
    static remove(id) {
        return api.delete(`trainings/${id}`);
    }

    /**
     * Swaps the user's gladiator in a training.
     *
     * @param {number} id Training id.
     * @param {number} glad New gladiator.
     * @returns {Promise<unknown>}
     */
    static changeGladiator(id, glad) {
        return api.put(`trainings/${id}/members/me`, { gladiator: glad });
    }

    /**
     * Starts a training (manager only).
     *
     * @param {number} id Training id.
     * @returns {Promise<{ hash: string }>}
     * @throws {import('../helpers/request.js').RequestError} `FEW_PLAYERS`.
     */
    static start(id) {
        return api.post(`trainings/${id}/start`);
    }

    /**
     * A round of a training, the final ranking (round 0) or where to go.
     *
     * @param {string} hash Training code.
     * @param {number|string} round Round number.
     * @returns {Promise<Record<string, any>>} `status`: `round`, `end` or `redirect`.
     */
    static round(hash, round) {
        return api.get(`training-rounds/${encodeURIComponent(hash)}/${round}`);
    }

    /**
     * The round's progress: deadlines, fought groups and what happens next.
     *
     * @param {string} hash Training code.
     * @param {number|string} round Round number.
     * @returns {Promise<{ status: 'wait'|'open'|'run'|'busy'|'done'|'end', end: boolean, maxRound: number, now: string, deadline: string|null, trainDeadline: string|null, groups: object[] }>}
     */
    static refresh(hash, round) {
        return api.get(`training-rounds/${encodeURIComponent(hash)}/${round}/status`);
    }

    /**
     * Moves the training on: fights the next due group or opens the next round.
     *
     * @param {string} hash Training code.
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<{ status: string, group?: number, hash?: string|null, error?: string }>}
     */
    static advance(hash, { signal } = {}) {
        return api.post(`training-rounds/${encodeURIComponent(hash)}/advance`, undefined, { signal, timeout: BATTLE_TIMEOUT_MS });
    }

    /**
     * Sets when the round's battles start (manager only).
     *
     * @param {string} hash Training code.
     * @param {number|string} round Round number.
     * @param {number} minutes Minutes from now; 0 starts them now.
     * @returns {Promise<{ deadline: string }>}
     */
    static setRoundDeadline(hash, round, minutes) {
        return api.put(`training-rounds/${encodeURIComponent(hash)}/${round}/deadline`, { minutes: Number(minutes) });
    }

    /**
     * Ends the whole training now (manager only).
     *
     * @param {string} hash Training code.
     * @returns {Promise<unknown>}
     */
    static end(hash) {
        return api.post(`training-rounds/${encodeURIComponent(hash)}/end`);
    }

    /**
     * Makes a group fight again (manager only).
     *
     * @param {string} hash Training code.
     * @param {number|string} group Group id.
     * @returns {Promise<unknown>}
     */
    static rerun(hash, group) {
        return api.post(`training-rounds/${encodeURIComponent(hash)}/groups/${group}/rerun`);
    }
}

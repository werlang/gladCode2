import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { FriendModel } from '../models/social.js';

/** The Amigos state: the pending invites, the friends and the search. DOM-free. */
export class FriendsService {
    #model;
    #bus;

    /**
     * @param {{ model?: typeof FriendModel, bus?: typeof events }} [options] Test seams.
     */
    constructor({ model = FriendModel, bus = events } = {}) {
        this.#model = model;
        this.#bus = bus;
    }

    /** @param {{ signal?: AbortSignal }} [options] @returns {Promise<object>} */
    load({ signal } = {}) {
        return this.#model.list({ signal });
    }

    /**
     * Accepts or declines a pending request.
     *
     * @param {number} id Pending friendship id.
     * @param {boolean} accepted
     * @returns {Promise<unknown>}
     */
    async answer(id, accepted) {
        await this.#model.answer(id, accepted);
        this.#bus.emit(APP_EVENTS.friendsAnswered, { id, accepted });
    }

    /**
     * Sends a friend request.
     *
     * @param {number} userId
     * @returns {Promise<unknown>}
     */
    request(userId) {
        return this.#model.add(userId);
    }

    /**
     * @param {string} text
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<object[]>}
     */
    search(text, { signal } = {}) {
        return this.#model.search(text, { signal });
    }
}

/** The page's friends state. */
export const friends = new FriendsService();

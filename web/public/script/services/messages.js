import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { ConversationModel } from '../models/social.js';

/**
 * The Mensagens state: the conversation list, one thread and its reads. DOM-free; the section owns
 * the components and publishes facts through the app bus.
 */
export class MessagesService {
    #model;
    #bus;

    /**
     * @param {{ model?: typeof ConversationModel, bus?: typeof events }} [options] Test seams.
     */
    constructor({ model = ConversationModel, bus = events } = {}) {
        this.#model = model;
        this.#bus = bus;
    }

    /**
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<object[]>}
     */
    async list({ signal } = {}) {
        const { conversations } = await this.#model.list({ signal });
        return conversations;
    }

    /**
     * @param {number} userId The other master.
     * @param {{ offset?: number, signal?: AbortSignal }} [options]
     * @returns {Promise<object>}
     */
    open(userId, { offset = 0, signal } = {}) {
        return this.#model.thread(userId, { offset, signal });
    }

    /**
     * Marks a conversation read and publishes the authoritative unread total.
     *
     * @param {number} userId The other master.
     * @returns {Promise<{ userId: number, read: number, unreadTotal: number }>}
     */
    async markRead(userId) {
        const result = await this.#model.markRead(userId);
        this.#bus.emit(APP_EVENTS.messagesRead, result);
        return result;
    }

    /**
     * Sends a message in a conversation.
     *
     * @param {number} userId The other master.
     * @param {string} text
     * @returns {Promise<object>}
     */
    send(userId, text) {
        return this.#model.send(userId, text);
    }
}

/** The page's conversation state. */
export const messages = new MessagesService();

/**
 * Serialises the favourite intents of each report row. A row has one confirmed state and one latest
 * intent; while a write runs, later toggles replace the intent, and the newest intent wins. A refusal
 * paints the last confirmed state and reports the error; a newer intent that arrived meanwhile is
 * still attempted.
 */
export class FavoriteQueue {
    #write;
    #paint;
    #report;
    #confirmed;
    #states = new Map();

    /**
     * @param {{ write: (id: number, favorite: boolean) => Promise<unknown>,
     *   paint: (id: number, favorite: boolean) => void,
     *   report: (error: Error) => void,
     *   confirmed?: (id: number, favorite: boolean) => void }} options
     */
    constructor({ write, paint, report, confirmed = () => {} }) {
        this.#write = write;
        this.#paint = paint;
        this.#report = report;
        this.#confirmed = confirmed;
    }

    /**
     * Records the server state of a row without painting it.
     *
     * @param {number} id
     * @param {boolean} favorite
     * @returns {this}
     */
    seed(id, favorite) {
        const key = Number(id);
        const state = this.#states.get(key);
        if (!state) this.#states.set(key, { confirmed: Boolean(favorite), intent: Boolean(favorite), running: false });
        else if (!state.running) {
            state.confirmed = Boolean(favorite);
            state.intent = Boolean(favorite);
        }
        return this;
    }

    /**
     * Requests a new star state; the latest intent is the one that ends up written.
     *
     * @param {number} id
     * @param {boolean} favorite
     * @returns {this}
     */
    toggle(id, favorite) {
        const key = Number(id);
        if (!this.#states.has(key)) this.seed(key, !favorite);
        const state = this.#states.get(key);
        state.intent = Boolean(favorite);
        this.#paint(key, state.intent);
        if (!state.running) void this.#drain(key);
        return this;
    }

    /** @param {number} id @returns {boolean} */
    confirmed(id) {
        return Boolean(this.#states.get(Number(id))?.confirmed);
    }

    /** @param {number} id @returns {boolean} */
    intent(id) {
        return Boolean(this.#states.get(Number(id))?.intent);
    }

    /** @param {number} id @returns {Promise<void>} */
    async #drain(id) {
        const state = this.#states.get(id);
        state.running = true;
        while (state.intent !== state.confirmed) {
            const target = state.intent;
            try {
                await this.#write(id, target);
                state.confirmed = target;
                this.#confirmed(id, target);
            }
            catch (error) {
                this.#paint(id, state.confirmed);
                this.#report(error);
                if (state.intent === target) {
                    state.intent = state.confirmed;
                    break;
                }
            }
        }
        state.running = false;
    }
}

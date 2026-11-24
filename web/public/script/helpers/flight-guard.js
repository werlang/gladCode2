/**
 * Runs at most one task at a time. A second call while the first is pending resolves to `undefined`
 * without starting its task, so a double click or Enter cannot start two matchmaking requests.
 */
export class FlightGuard {
    #running = false;

    /** @returns {boolean} Whether a task is running now. */
    get running() {
        return this.#running;
    }

    /**
     * @template T
     * @param {() => Promise<T>} task
     * @returns {Promise<T|undefined>} The task result, or `undefined` when one is already running.
     */
    async run(task) {
        if (this.#running) return undefined;
        this.#running = true;
        try {
            return await task();
        }
        finally {
            this.#running = false;
        }
    }
}

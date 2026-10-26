/**
 * Tracks DOM event listeners so renderer components can be replaced safely.
 */
export class BaseComponent {
    #subscriptions = [];

    /**
     * Registers an event listener and retains the exact removal contract.
     *
     * @param {EventTarget|null|undefined} target Event source.
     * @param {string} eventName DOM event name.
     * @param {EventListenerOrEventListenerObject} listener Event listener.
     * @param {AddEventListenerOptions|boolean} [options] Listener options.
     * @returns {BaseComponent} This component.
     */
    on(target, eventName, listener, options) {
        if (!target || typeof target.addEventListener !== 'function') {
            return this;
        }

        target.addEventListener(eventName, listener, options);
        this.#subscriptions.push({ target, eventName, listener, options });
        return this;
    }

    /** Removes every listener registered through this component. */
    clearListeners() {
        this.#subscriptions.forEach(({ target, eventName, listener, options }) => {
            target.removeEventListener(eventName, listener, options);
        });
        this.#subscriptions = [];
    }

    /** Destroys this component's lifecycle hooks. */
    destroy() {
        this.clearListeners();
    }
}

/**
 * Base for DOM components: wraps an element and tracks listeners so they can
 * be removed together.
 */
export class BaseComponent {
    #element;
    #subscriptions = [];

    /**
     * @param {HTMLElement|null} [element] Wrapped element.
     */
    constructor(element = null) {
        this.#element = element;
    }

    /** @returns {HTMLElement|null} The wrapped element. */
    get element() {
        return this.#element;
    }

    /**
     * @param {HTMLElement|null} element New wrapped element.
     */
    set element(element) {
        this.#element = element;
    }

    /**
     * Adds a listener that {@link BaseComponent#clearListeners} will remove.
     *
     * @param {EventTarget|null|undefined} target Event source.
     * @param {string} eventName Event name.
     * @param {EventListener} listener Handler.
     * @param {AddEventListenerOptions|boolean} [options] Listener options.
     * @returns {this}
     */
    on(target, eventName, listener, options) {
        if (!target?.addEventListener) return this;
        target.addEventListener(eventName, listener, options);
        this.#subscriptions.push({ target, eventName, listener, options });
        return this;
    }

    /**
     * Removes every listener added through {@link BaseComponent#on}.
     *
     * @returns {this}
     */
    clearListeners() {
        this.#subscriptions.forEach(({ target, eventName, listener, options }) => {
            target.removeEventListener(eventName, listener, options);
        });
        this.#subscriptions = [];
        return this;
    }

    /** Removes the listeners and the element. */
    destroy() {
        this.clearListeners();
        this.#element?.remove();
        this.#element = null;
    }
}

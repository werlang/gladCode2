/**
 * Base for DOM components: wraps an element, tracks listeners and owns an `AbortController` for the
 * requests a component starts. Component events are `CustomEvent`s on the element root
 * (docs/frontend/events.md); app events never go through a component.
 */
export class BaseComponent {
    #element;
    #subscriptions = [];
    #controller = new AbortController();

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
     * Signal for the requests the component starts; {@link BaseComponent#abort} and
     * {@link BaseComponent#destroy} abort it.
     *
     * @returns {AbortSignal}
     */
    get signal() {
        return this.#controller.signal;
    }

    /**
     * Adds a listener that {@link BaseComponent#clearListeners} will remove. The listener also
     * stops when the component aborts or when `options.signal` aborts.
     *
     * @param {EventTarget|null|undefined} target Event source.
     * @param {string} eventName Event name.
     * @param {EventListener} listener Handler.
     * @param {AddEventListenerOptions|boolean} [options] Listener options.
     * @returns {this}
     */
    on(target, eventName, listener, options) {
        if (!target?.addEventListener) return this;

        const settings = typeof options === 'boolean' ? { capture: options } : { ...options };
        const signal = this.#combinedSignal(settings.signal);
        target.addEventListener(eventName, listener, { ...settings, signal });
        this.#subscriptions.push({ target, eventName, listener, capture: Boolean(settings.capture) });
        return this;
    }

    /**
     * Listens to one of this component's own events (the `CustomEvent`s it emits).
     *
     * @param {string} eventName Event name.
     * @param {(detail: any, event: CustomEvent) => void} handler Receives the detail.
     * @returns {this}
     */
    listen(eventName, handler) {
        return this.on(this.#element, eventName, event => {
            if (event.target !== this.#element || !(event instanceof CustomEvent)) return;
            handler(event.detail, event);
        });
    }

    /**
     * Emits a component event on the root element. Parents listen with `on()`/`addEventListener`.
     *
     * @param {string} eventName Event name.
     * @param {unknown} [detail] View data the parent needs.
     * @returns {this}
     */
    emit(eventName, detail) {
        this.#element?.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
        return this;
    }

    /**
     * Aborts the requests and listeners the component started with {@link BaseComponent#signal}.
     * The element and its tracked listeners stay in place; use {@link BaseComponent#clearListeners}
     * to remove them too.
     *
     * @returns {this}
     */
    abort() {
        this.#controller.abort();
        this.#controller = new AbortController();
        return this;
    }

    /**
     * Removes every listener added through {@link BaseComponent#on} and aborts the component's signal.
     *
     * @returns {this}
     */
    clearListeners() {
        this.#controller.abort();
        this.#subscriptions.forEach(({ target, eventName, listener, capture }) => {
            target.removeEventListener(eventName, listener, capture);
        });
        this.#subscriptions = [];
        this.#controller = new AbortController();
        return this;
    }

    /** Aborts everything and removes the element. */
    destroy() {
        this.clearListeners();
        this.#controller.abort();
        this.#element?.remove();
        this.#element = null;
    }

    /**
     * A signal that aborts with the component or with the caller's signal.
     *
     * @param {AbortSignal|null|undefined} caller
     * @returns {AbortSignal}
     */
    #combinedSignal(caller) {
        if (!caller) return this.#controller.signal;
        if (typeof AbortSignal.any === 'function') return AbortSignal.any([this.#controller.signal, caller]);

        const controller = new AbortController();
        const abort = () => controller.abort();
        if (this.#controller.signal.aborted || caller.aborted) controller.abort();
        else {
            this.#controller.signal.addEventListener('abort', abort, { once: true });
            caller.addEventListener('abort', abort, { once: true });
        }
        return controller.signal;
    }
}

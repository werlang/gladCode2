/** Load promises keyed by script URL, so each script is injected once. */
const loads = new Map();

/**
 * Loads an external script once, however many times it is requested.
 *
 * @example
 * await new DynamicScript('https://example.com/script.js').load();
 * new DynamicScript('https://example.com/script.js', () => console.log('ready'));
 */
export class DynamicScript {
    #promise;

    /**
     * @param {string} url Script URL.
     * @param {() => unknown} [callback] Called once the script has loaded.
     */
    constructor(url, callback) {
        this.url = url;
        this.#promise = loads.get(url) ?? DynamicScript.#inject(url);
        loads.set(url, this.#promise);

        if (callback) {
            this.load(callback);
        }
    }

    /**
     * Appends the script element and resolves when it has run.
     *
     * @param {string} url Script URL.
     * @returns {Promise<void>}
     */
    static #inject(url) {
        return new Promise((resolve, reject) => {
            const existing = document.head.querySelector(`script[src="${url}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.addEventListener('load', () => resolve(), { once: true });
            script.addEventListener('error', () => reject(new Error(`Could not load ${url}`)), { once: true });
            document.head.appendChild(script);
        });
    }

    /**
     * Waits for the script, then runs the callback if one is given.
     *
     * @param {() => unknown} [callback] Called once the script has loaded.
     * @returns {Promise<unknown>} The callback result, or `true`.
     */
    async load(callback) {
        await this.#promise;
        return callback ? callback() : true;
    }
}

/**
 * Values the web service renders into the page (`#template-vars`): the API origin, the Google
 * client id and the page's route values (log hash, tournament round, profile tab, ...).
 *
 * @example
 * const hash = TemplateVar.get('logHash');
 */
export class TemplateVar {
    /** @type {Record<string, unknown>|null} */
    static #vars = null;

    /** Parses the JSON script once and removes it from the page. */
    static #build() {
        TemplateVar.#vars = {};
        const script = document.querySelector('#template-vars');
        if (!script) return;
        try {
            TemplateVar.#vars = JSON.parse(script.textContent || '{}');
        }
        catch (error) {
            console.error('Invalid template variables:', error);
        }
        script.remove();
    }

    /**
     * @param {string} key
     * @returns {any} The value, or undefined when the page did not receive it.
     */
    static get(key) {
        if (!TemplateVar.#vars) TemplateVar.#build();
        return TemplateVar.#vars[key];
    }
}

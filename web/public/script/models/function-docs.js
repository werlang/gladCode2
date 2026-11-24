import { site } from '../helpers/request.js';

/** The function reference request, shared by every caller on the page. */
let reference = null;

/**
 * The gladCode API reference (`script/functions.json` and its samples).
 */
export class FunctionDocsModel {
    /**
     * Every function's documentation, by lowercase name.
     *
     * @returns {Promise<Record<string, any>>}
     */
    static all() {
        reference ??= site.get('script/functions.json');
        return reference;
    }

    /**
     * The worked example of a function.
     *
     * @param {string} file Sample file name, e.g. `moveto.json`.
     * @returns {Promise<{ c?: string, python?: string, javascript?: string, blocks?: string, explain: string }>}
     */
    static sample(file) {
        return site.get(`script/functions/samples/${file}`);
    }

    /**
     * One function's documentation file.
     *
     * @param {string} name Function name, any case.
     * @returns {Promise<Record<string, any>>}
     */
    static get(name) {
        return site.get(`script/functions/${name.toLowerCase()}.json`);
    }
}

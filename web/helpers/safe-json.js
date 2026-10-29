/**
 * Serialises values for a `<script type="application/json">` tag without letting them close it.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function safeJson(value) {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

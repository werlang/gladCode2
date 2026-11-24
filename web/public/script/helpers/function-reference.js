/**
 * Translates gladCode API names in prose without touching identifiers inside words. Code blocks
 * call this only on their text nodes outside `<code>`, where Portuguese aliases do not exist for
 * Python or JavaScript.
 *
 * @param {string} text Prose from the function reference.
 * @param {Record<string, string|undefined>} names English name by Portuguese translation.
 * @returns {string}
 */
export function translateFunctionText(text, names) {
    let translated = text;
    for (const [english, portuguese] of Object.entries(names)) {
        if (!portuguese) continue;
        translated = translated.replace(new RegExp(`(^|[^\\w])${english}(?=$|[^\\w])`, 'g'), `$1${portuguese}`);
    }
    return translated;
}

/**
 * The languages a gladiator's code can be written in, and how to tell them apart. Same rule as
 * the API's `detectLanguage` (`api/helpers/gladiator-code.js`): Python defines `def loop():`, C a
 * `loop(){` line, JavaScript a `function loop()` line (or assigns it: `const loop = () => ...`),
 * anything else is C. Blocks generate Python.
 */

/** A C `loop()` definition line. */
const C_LOOP = /^[ \t]*(?:void[ \t]+|int[ \t]+)?loop[ \t]*\([ \t]*(?:void[ \t]*)?\)[ \t]*(?:\{|\r?$)/m;
/** A line that declares JavaScript's `function loop()` or assigns it (comments and strings do not count). */
const JAVASCRIPT_LOOP = /^[ \t]*(?:function[ \t]+loop[ \t]*\(|(?:(?:const|let|var)[ \t]+)?loop[ \t]*=)/m;

/** Ace editor mode of each language. */
export const ACE_MODES = {
    c: 'ace/mode/c_cpp',
    python: 'ace/mode/python',
    javascript: 'ace/mode/javascript',
};

/**
 * The language of some gladiator code, as Prism and the API name it.
 *
 * @param {string} code
 * @returns {'c'|'python'|'javascript'}
 */
export function codeLanguage(code) {
    const text = String(code ?? '');
    if (text.includes('def loop():')) return 'python';
    if (C_LOOP.test(text)) return 'c';
    return JAVASCRIPT_LOOP.test(text) ? 'javascript' : 'c';
}

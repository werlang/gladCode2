/**
 * Pure helpers for gladiator source code: language, attributes, the generated `setup()` and the
 * text the engine compiles. Ported from back_simulation.php and back_glad.php.
 */

/** Attribute points a gladiator spends (see {@link attributeCost}). */
export const ATTRIBUTE_BUDGET = 50;
/** Highest value of one attribute. */
export const MAX_ATTRIBUTE = 30;
/** Gladiator names: letters, digits, `_`, spaces and accented letters. */
export const NAME_PATTERN = /^[\w À-ú]+$/u;

/**
 * @param {string} code
 * @returns {'c'|'python'}
 */
export function detectLanguage(code) {
    return code.includes('def loop():') ? 'python' : 'c';
}

/**
 * Points an attribute value costs: every point costs ceil(value / 6), so 0 costs 0, 6 costs 6,
 * 12 costs 18 and 30 costs 90.
 *
 * @param {number} value
 * @returns {number}
 */
export function attributeCost(value) {
    let cost = 0;
    for (let point = 1; point <= value; point++) cost += Math.ceil(point / 6);
    return cost;
}

/**
 * @param {number} vstr
 * @param {number} vagi
 * @param {number} vint
 * @returns {boolean} True when the three attributes are whole numbers that spend exactly the budget.
 */
export function validAttributes(vstr, vagi, vint) {
    const values = [vstr, vagi, vint];
    if (!values.every(value => Number.isInteger(value) && value >= 0 && value <= MAX_ATTRIBUTE)) return false;
    return values.reduce((sum, value) => sum + attributeCost(value), 0) === ATTRIBUTE_BUDGET;
}

/**
 * First capture of a pattern, or null.
 *
 * @param {string} code
 * @param {RegExp} pattern
 * @returns {string|null}
 */
function capture(code, pattern) {
    const value = pattern.exec(code)?.[1];
    return value === undefined || value === 'undefined' ? null : value;
}

/**
 * Attributes declared in a full source (`setSTR(10);` ...), as the engine will read them.
 *
 * @param {string} code
 * @returns {{ vstr: number|null, vagi: number|null, vint: number|null }}
 */
export function declaredAttributes(code) {
    const read = name => {
        const value = capture(code, new RegExp(`set${name}\\((\\d{1,2})\\);?`));
        return value === null ? null : Number(value);
    };
    return { vstr: read('STR'), vagi: read('AGI'), vint: read('INT') };
}

/**
 * Whether a full source declares attributes that spend the budget.
 *
 * @param {string} code
 * @returns {boolean}
 */
export function hasValidSetup(code) {
    const { vstr, vagi, vint } = declaredAttributes(code);
    return validAttributes(vstr ?? 0, vagi ?? 0, vint ?? 0);
}

/**
 * Test-only engine commands the code calls (refused outside the editor's sandbox).
 *
 * @param {string} code
 * @param {string[]} banned Names from `banned_functions.json`.
 * @returns {string[]}
 */
export function bannedFunctionsUsed(code, banned) {
    return banned.filter(name => code.includes(name));
}

/**
 * Escapes text for a C or Python double-quoted string literal.
 *
 * @param {string} text
 * @returns {string}
 */
export function quoteLiteral(text) {
    return String(text).replace(/[\\"]/g, match => `\\${match}`).replace(/\r?\n/g, ' ');
}

/**
 * The `setup()` the server writes in front of a saved gladiator's code.
 *
 * @param {'c'|'python'} language
 * @param {{ name: string, nick: string, vstr: number, vagi: number, vint: number, slots: string }} glad
 *   `slots` is the potion list, e.g. `"0,0,0,0"`.
 * @returns {string}
 */
export function setupBlock(language, { name, nick, vstr, vagi, vint, slots }) {
    const fullName = quoteLiteral(`${name}@${nick}`);
    if (language === 'python') {
        return `def setup():\n    setName("${fullName}")\n    setSTR(${vstr})\n    setAGI(${vagi})\n    setINT(${vint})\n    setSlots("${slots}")\n# start of user code\n`;
    }
    return `setup(){\n    setName("${fullName}");\n    setSTR(${vstr});\n    setAGI(${vagi});\n    setINT(${vint});\n    setSlots("${slots}");\n}\n\n`;
}

/**
 * Prepares a gladiator the editor sent as full source (with its own `setup()`): reads its skin and
 * owner nick, removes the `setSpritesheet`/`setSkin`/`setUser` calls the engine does not know and
 * tags the name with the nick (`setName("Name@nick")`) so the log names its master.
 *
 * @param {string} code Full source.
 * @param {string} fallbackNick Nick when the code sets none.
 * @returns {{ code: string, name: string, nick: string, skin: string|null }} `skin` is a skin JSON
 *   or a 32-character `skins.hash` to look up.
 */
export function prepareEditorSource(code, fallbackNick) {
    const nick = capture(code, /setUser\("([\W\w]*?)"\);?/) ?? fallbackNick;
    const skin = capture(code, /setSpritesheet\("([\d\w]*?)"\);?/) ?? capture(code, /setSkin\("([\W\w]*?)"\);?/);

    let source = code
        .replace(/setSpritesheet\("[\d\w]*?"\);?/g, '')
        .replace(/setSkin\("[\W\w]*?"\);?/g, '')
        .replace(/setUser\("[\W\w]*?"\);?/g, '');
    const name = capture(source, /setName\("([\W\w]*?)"\)/) ?? 'Gladiador';
    source = source.replace(/setName\("([\w À-ú]+?)"\)/u, (match, plain) => `setName("${plain}@${quoteLiteral(nick)}")`);
    return { code: source, name, nick, skin };
}

/**
 * Inserts `breakpoint("<line>")` calls before the editor's breakpoint lines, so the replay pauses
 * there. Line numbers count from the first line after `setup()`.
 *
 * @param {string} code Full source with its `setup()`.
 * @param {number[]} lines 1-based lines of the user's code.
 * @returns {string}
 */
export function insertBreakpoints(code, lines) {
    if (detectLanguage(code) === 'python') {
        const rows = code.split('\n');
        const start = rows.indexOf('# start of user code') + 2;
        for (const line of lines) {
            const index = line - 2 + start;
            if (rows[index] === undefined) continue;
            const [, indent, statement] = /^(\s*)(.*)$/.exec(rows[index]);
            rows[index] = `${indent}breakpoint("${quoteLiteral(statement)}")\n${rows[index]}`;
        }
        return rows.join('\n');
    }

    // one-line if/for/while/else bodies get braces, so a breakpoint between them keeps the structure
    const braced = code.replace(/((?:if|for|while) ?\([^\n]*?\))\n(.*)|(else)\n(.*)/g,
        (match, head = '', body = '', other = '', otherBody = '') => `${head}${other}{\n${body}${otherBody}}`);
    const rows = braced.split('\n');
    const start = rows.indexOf('}') + 2;
    for (const line of lines) {
        const index = line - 1 + start;
        if (rows[index] === undefined) continue;
        rows[index] = `breakpoint("${quoteLiteral(rows[index].trim())}");\n${rows[index]}`;
    }
    return rows.join('\n');
}

/**
 * The file the engine compiles for a gladiator: C includes the core, Python gets its main loop.
 *
 * @param {string} code Full source.
 * @returns {{ file: string, text: string }} File name suffix (`c`/`py`) and contents.
 */
export function engineSource(code) {
    if (detectLanguage(code) === 'python') {
        return { file: 'py', text: `from gladCodeAPI import *\n\n${code}\n\ninitClient()\nsetup()\nif startSim():\n    while running():\n        loop()\n` };
    }
    return { file: 'c', text: `#include "gladCodeCore.c"\n${code}` };
}

/**
 * Reads a sample gladiator's declarations (`setName`, attributes, `setSpritesheet`).
 *
 * @param {string} code
 * @returns {{ name: string|null, vstr: number|null, vagi: number|null, vint: number|null, spritesheet: string|null }}
 */
export function readDeclarations(code) {
    return {
        name: capture(code, /setName\("([\d\w ]*)"\);/),
        ...declaredAttributes(code),
        spritesheet: capture(code, /setSpritesheet\("([\d\w]*)"\);/),
    };
}

/**
 * The user code of a full source: everything after the `setup()` block.
 *
 * @param {string} code
 * @returns {string}
 */
export function stripSetup(code) {
    if (detectLanguage(code) === 'python') return code.replace(/def setup\(\)[\w\W]*?:[\w\W]*?\n# start of user code\n/, '');
    return code.replace(/setup\(\)[\w\W]*?{[\w\W]*?}\n\n/, '');
}

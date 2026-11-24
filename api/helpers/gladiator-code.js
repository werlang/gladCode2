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

/** A C `loop()` definition line (`loop(){`, `void loop() {`, `loop()` with the brace below). */
const C_LOOP = /^[ \t]*(?:void[ \t]+|int[ \t]+)?loop[ \t]*\([ \t]*(?:void[ \t]*)?\)[ \t]*(?:\{|\r?$)/m;
/**
 * A line that declares JavaScript's `function loop()` or assigns it (`const loop = () => ...`),
 * at its start so comments and strings do not count.
 */
const JAVASCRIPT_LOOP = /^[ \t]*(?:function[ \t]+loop[ \t]*\(|(?:(?:const|let|var)[ \t]+)?loop[ \t]*=)/m;
/** Line the server writes between a Python or JavaScript `setup()` and the user code. */
const USER_CODE_MARKER = { python: '# start of user code', javascript: '// start of user code' };

/**
 * The language of a gladiator's code: Python defines `def loop():`, C a `loop(){` line, JavaScript
 * a `function loop()` (or `const loop = ...`) line, anything else is C. C is checked before
 * JavaScript so a saved C gladiator never changes language over a comment. Same rule as the
 * editor's `web/public/script/helpers/code-language.js`.
 *
 * @param {string} code
 * @returns {'c'|'python'|'javascript'}
 */
export function detectLanguage(code) {
    if (code.includes('def loop():')) return 'python';
    if (C_LOOP.test(code)) return 'c';
    return JAVASCRIPT_LOOP.test(code) ? 'javascript' : 'c';
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
 * Escapes text for a C, Python or JavaScript double-quoted string literal.
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
 * @param {'c'|'python'|'javascript'} language
 * @param {{ name: string, nick: string, vstr: number, vagi: number, vint: number, slots: string }} glad
 *   `slots` is the potion list, e.g. `"0,0,0,0"`.
 * @returns {string} Python and JavaScript setups end with the user code marker line, which
 *   `Payload/gladCodeCore.js` splits on to run the JavaScript setup apart from the user code.
 */
export function setupBlock(language, { name, nick, vstr, vagi, vint, slots }) {
    const fullName = quoteLiteral(`${name}@${nick}`);
    if (language === 'python') {
        return `def setup():\n    setName("${fullName}")\n    setSTR(${vstr})\n    setAGI(${vagi})\n    setINT(${vint})\n    setSlots("${slots}")\n${USER_CODE_MARKER.python}\n`;
    }
    if (language === 'javascript') {
        return `function setup() {\n    setName("${fullName}");\n    setSTR(${vstr});\n    setAGI(${vagi});\n    setINT(${vint});\n    setSlots("${slots}");\n}\n${USER_CODE_MARKER.javascript}\n`;
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

/** A C/JavaScript control statement whose body may be the next statement. */
const CONTROL_LINE = /^[ \t]*(?:if|for|while|else|do)\b/;

/**
 * Replaces comments and quoted text with spaces while preserving line breaks. Breakpoint
 * instrumentation uses this to find the previous executable line without treating a comment as
 * code; C and JavaScript share these comment and string delimiters.
 *
 * @param {string} code
 * @returns {string}
 */
function maskCommentsAndStrings(code) {
    let masked = '';
    let blockComment = false;
    let quote = '';
    let escaped = false;
    for (let index = 0; index < code.length; index++) {
        const char = code[index];
        const next = code[index + 1];
        if (char === '\n' || char === '\r') {
            masked += char;
            escaped = false;
            continue;
        }
        if (blockComment) {
            masked += ' ';
            if (char === '*' && next === '/') {
                masked += ' ';
                index++;
                blockComment = false;
            }
            continue;
        }
        if (quote) {
            masked += ' ';
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
            continue;
        }
        if (char === '/' && next === '*') {
            masked += '  ';
            index++;
            blockComment = true;
            continue;
        }
        if (char === '/' && next === '/') {
            while (index < code.length && code[index] !== '\n') {
                masked += ' ';
                index++;
            }
            index--;
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char;
            masked += ' ';
            continue;
        }
        masked += char;
    }
    return masked;
}

/**
 * Nearest preceding line with executable code, ignoring blank and comment-only lines.
 *
 * @param {string[]} rows Masked source lines.
 * @param {number} index Target line index.
 * @returns {string|null}
 */
function previousCodeLine(rows, index) {
    for (let row = index - 1; row >= 0; row--) {
        if (rows[row].trim()) return rows[row];
    }
    return null;
}

/**
 * Inserts `breakpoint("<line>")` calls before the editor's breakpoint lines, so the replay pauses
 * there. Line numbers count from the first line after `setup()` (after the marker line in Python
 * and JavaScript).
 *
 * @param {string} code Full source with its `setup()`.
 * @param {number[]} lines 1-based lines of the user's code.
 * @returns {string}
 */
export function insertBreakpoints(code, lines) {
    const language = detectLanguage(code);
    if (language === 'python') {
        const rows = code.split('\n');
        const start = rows.indexOf(USER_CODE_MARKER.python) + 2;
        for (const line of lines) {
            const index = line - 2 + start;
            if (rows[index] === undefined) continue;
            const [, indent, statement] = /^(\s*)(.*)$/.exec(rows[index]);
            rows[index] = `${indent}breakpoint("${quoteLiteral(statement)}")\n${rows[index]}`;
        }
        return rows.join('\n');
    }

    const rows = code.split('\n');
    const masked = maskCommentsAndStrings(code).split('\n');
    const start = language === 'javascript' ? rows.indexOf(USER_CODE_MARKER.javascript) + 1 : rows.indexOf('}') + 2;
    // Work backwards so wrapping one body cannot move the line numbers of earlier breakpoints.
    for (const line of [...new Set(lines)].sort((left, right) => right - left)) {
        const index = line - 1 + start;
        if (rows[index] === undefined) continue;
        const statement = rows[index].trim();
        const executable = masked[index].trim();
        // A statement cannot be inserted before a closing brace, else/case label or comment.
        if (!executable || /^[}]/.test(executable) || /^(?:else|case|default)\b/.test(executable) || executable.endsWith(':')) continue;

        const previous = previousCodeLine(masked, index);
        const isControlBody = previous !== null && CONTROL_LINE.test(previous) && !/[{};]\s*$/.test(previous);
        // A nested control header is itself a suite, not a single statement that can be wrapped.
        if (isControlBody && CONTROL_LINE.test(executable)) continue;

        const call = `breakpoint("${quoteLiteral(statement)}");`;
        if (!isControlBody) {
            rows.splice(index, 0, call);
            continue;
        }

        // A block is the unbraced control statement's body, so both the pause and the original
        // statement stay conditional instead of turning the pause into the body by itself.
        const indent = /^[ \t]*/.exec(rows[index])[0];
        rows.splice(index, 1, `${indent}{`, `${indent}    ${call}`, rows[index], `${indent}}`);
    }
    return rows.join('\n');
}

/**
 * The file the engine compiles for a gladiator: C includes the core, Python gets its main loop,
 * JavaScript is written as is (`socket_compile.sh` runs it through `gladCodeCore.js`).
 *
 * @param {string} code Full source.
 * @returns {{ file: string, text: string }} File name suffix (`c`/`py`/`js`) and contents.
 */
export function engineSource(code) {
    if (detectLanguage(code) === 'python') {
        return { file: 'py', text: `from gladCodeAPI import *\n\n${code}\n\ninitClient()\nsetup()\nif startSim():\n    while running():\n        loop()\n` };
    }
    if (detectLanguage(code) === 'javascript') return { file: 'js', text: code };
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
    const language = detectLanguage(code);
    if (language === 'python') return code.replace(/def setup\(\)[\w\W]*?:[\w\W]*?\n# start of user code\n/, '');
    if (language === 'javascript') {
        const marker = `\n${USER_CODE_MARKER.javascript}\n`;
        const at = code.indexOf(marker);
        return at === -1 ? code : code.slice(at + marker.length);
    }
    return code.replace(/setup\(\)[\w\W]*?{[\w\W]*?}\n\n/, '');
}

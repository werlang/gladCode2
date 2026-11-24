import { codeLanguage } from '../helpers/code-language.js';

/** Points a gladiator spends on its three attributes. */
export const ATTRIBUTE_POINTS = 50;

/**
 * What raising an attribute to a value costs: each level costs one more point
 * every six levels (levels 1-6 cost 1 each, 7-12 cost 2, ...).
 *
 * @param {number|string} value Attribute value, 0 to 20.
 * @returns {number} Total cost.
 */
export function attributeCost(value) {
    let cost = 0;
    for (let level = 1; level <= parseInt(value, 10); level++) {
        cost += Math.ceil(level / 6);
    }
    return cost;
}

/**
 * Whether a gladiator name is valid: three or more letters, digits or spaces.
 *
 * @param {string} name Name.
 * @returns {boolean}
 */
export function validGladName(name) {
    return name.length > 2 && /^[\w À-ú]+?$/.test(name);
}

/**
 * The code a gladiator runs: a setup function that declares its name,
 * attributes, skin and master, followed by the user's code.
 *
 * @param {{ name: string, vstr: number, vagi: number, vint: number, skin: string, user: string }} glad
 * @param {string} code The user's code.
 * @param {'c'|'python'|'javascript'|'blocks'} language Language of the code.
 * @returns {string} Python (and blocks) and JavaScript setups end with the line the server splits
 *   the user code on (`# start of user code`, `// start of user code`).
 */
export function gladiatorSource({ name, vstr, vagi, vint, skin, user }, code, language) {
    if (language === 'c') {
        return `setup(){\n    setName("${name}");\n    setSTR(${vstr});\n    setAGI(${vagi});\n    setINT(${vint});\n    setSkin("${skin}");\n    setUser("${user}");\n    setSlots("-1,-1,-1,-1");\n}\n\n${code}`;
    }
    if (language === 'javascript') {
        return `function setup() {\n    setName("${name}");\n    setSTR(${vstr});\n    setAGI(${vagi});\n    setINT(${vint});\n    setSkin("${skin}");\n    setUser("${user}");\n    setSlots("-1,-1,-1,-1");\n}\n// start of user code\n${code}`;
    }
    return `def setup():\n    setName("${name}")\n    setSTR(${vstr})\n    setAGI(${vagi})\n    setINT(${vint})\n    setSkin("${skin}")\n    setUser("${user}")\n    setSlots("-1,-1,-1,-1")\n# start of user code\n${code}`;
}

/**
 * The language of some gladiator code.
 *
 * @param {string} code Code.
 * @param {boolean} [blocks] Whether the blocks editor is active.
 * @returns {'c'|'python'|'javascript'|'blocks'}
 */
export function detectLanguage(code, blocks = false) {
    if (blocks) return 'blocks';
    return codeLanguage(code);
}

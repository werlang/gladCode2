import { showMessage } from '../components/dialog.js';
import { ACE_MODES } from '../helpers/code-language.js';
import { site } from '../helpers/request.js';
import { FunctionDocsModel } from '../models/function-docs.js';
import { detectLanguage } from './attributes.js';

/**
 * The API functions the completer offers: the ones the docs page lists (the
 * sandbox-only functions are left out), described by functions.json.
 *
 * @returns {Promise<Array<{ name: string, syntax: Record<string, string>, description: string, snippet: Record<string, string> }>>}
 */
async function completions() {
    const [page, reference] = await Promise.all([site.get('docs'), FunctionDocsModel.all()]);
    const listed = typeof page === 'string' ? [...page.matchAll(/<td><a href=['"]([\w]+?)['"]><\/a><\/td>/g)].map(match => match[1]) : [];
    return listed.map(name => reference[name]).filter(Boolean).map(doc => ({
        name: doc.name.default,
        syntax: doc.syntax,
        description: doc.description.brief,
        snippet: doc.snippet,
    }));
}

/**
 * Whether a line is inside a function, where breakpoints are allowed (Python by its indentation,
 * C and JavaScript by their braces).
 *
 * @param {string[]} lines Code lines.
 * @param {number} row Line index.
 * @param {'c'|'python'|'javascript'} language Language.
 * @returns {boolean}
 */
export function insideFunction(lines, row, language) {
    if (language === 'python') return lines[row].includes('  ');
    let depth = 0;
    for (let index = 0; index < row; index++) {
        if (lines[index].includes('{')) depth++;
        if (lines[index].includes('}')) depth--;
    }
    return depth > 0;
}

/**
 * The Ace code editor: gladCode autocompletion, the language mode following
 * the code, and breakpoints toggled on the line numbers.
 */
export class CodeEditor {
    /** @type {any} The Ace editor. */
    ace;
    language = 'c';

    /**
     * @param {string} elementId The editor's element id.
     * @param {{ blocksActive: () => boolean }} options Tells whether the blocks editor is in use.
     */
    constructor(elementId, { blocksActive }) {
        this.blocksActive = blocksActive;
        const langTools = ace.require('ace/ext/language_tools');
        this.ace = ace.edit(elementId);
        this.ace.session.setUseSoftTabs(true);
        this.ace.session.setOption('tabSize', 4);
        this.ace.setTheme('ace/theme/dreamweaver');
        this.ace.setFontSize(18);
        this.ace.getSession().setUseWrapMode(true);
        this.ace.$blockScrolling = Infinity;
        this.ace.setOptions({
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true,
        });

        completions().then(table => langTools.addCompleter(this.#completer(table)));
        this.ace.on('change', () => this.#followLanguage());
        this.ace.on('guttermousedown', event => this.#toggleBreakpoint(event));
    }

    /** @returns {string} The code. */
    get value() {
        return this.ace.getValue();
    }

    /** @param {string} code New code. */
    set value(code) {
        this.ace.setValue(code);
    }

    /** @returns {'c'|'python'|'javascript'|'blocks'} The code's language. */
    detectLanguage() {
        return detectLanguage(this.value, this.blocksActive());
    }

    /**
     * Applies a theme and font size.
     *
     * @param {string} theme Ace theme name.
     * @param {number|string} font Font size in px.
     */
    setAppearance(theme, font) {
        this.ace.setTheme(`ace/theme/${theme}`);
        this.ace.setFontSize(`${font}px`);
    }

    /** @returns {string[]|false} The lines with a breakpoint (as shown in the gutter), or `false`. */
    breakpoints() {
        const lines = [...document.querySelectorAll('.ace_breakpoint')].map(cell => cell.textContent);
        return lines.length ? lines : false;
    }

    /**
     * @param {object[]} table Function descriptions.
     * @returns {object} Ace completer.
     */
    #completer(table) {
        return {
            getCompletions: (editor, session, position, prefix, callback) => {
                if (!prefix.length) {
                    callback(null, []);
                    return;
                }
                callback(null, table.map(entry => ({
                    value: entry.syntax[this.language],
                    caption: entry.name,
                    snippet: entry.snippet[this.language],
                    description: entry.description,
                    syntax: entry.syntax[this.language],
                    score: 1000,
                    meta: `gladCode-${this.language}`,
                })));
            },
            getDocTooltip: item => {
                if (item.meta?.startsWith('gladCode') && item.syntax) {
                    // C signatures show the types plain and the name in bold
                    const signature = this.language === 'c'
                        ? item.syntax.replace(/(int[ *]? |float[ *]? |double[ *]? |char[ *]? |void[ *]? )/g, '</b>$1<b>')
                        : item.syntax;
                    item.docHTML = `<b>${signature}</b><hr></hr>${item.description}`;
                }
                else if (item.snippet) {
                    item.docHTML = `<b>${item.caption}</b><hr></hr>${item.snippet}`;
                }
            },
        };
    }

    /** Switches the highlighting between C, Python and JavaScript as the code changes. */
    #followLanguage() {
        const language = detectLanguage(this.value);
        if (language === this.language) return;
        this.language = language;
        this.ace.session.setMode(ACE_MODES[language]);
    }

    /**
     * Toggles a breakpoint on a clicked line number (inside functions only;
     * on an `else` line it goes to the next line).
     *
     * @param {object} event Ace gutter event.
     */
    #toggleBreakpoint(event) {
        const target = event.domEvent.target;
        if (event.domEvent.button !== 0 || !target.className.includes('ace_gutter-cell') || !this.ace.isFocused()) return;

        const { session } = this.ace;
        const row = event.getDocumentPosition().row;
        const { Range } = ace.require('ace/range');

        if (session.getBreakpoints()[row] === undefined) {
            const lines = session.getDocument().getAllLines();
            const breakRow = lines[row].includes('else') ? row + 1 : row;
            if (!insideFunction(lines, row, detectLanguage(this.value))) {
                showMessage('Breakpoints só podem ser inseridos dentro de funções');
            }
            else {
                session.setBreakpoint(breakRow);
                const marked = Object.values(session.getMarkers()).some(marker => marker.clazz === 'line-breakpoint' && marker.range.start.row === breakRow);
                if (!marked) session.addMarker(new Range(breakRow, 0, breakRow, 1), 'line-breakpoint', 'fullLine');
            }
        }
        else {
            session.clearBreakpoint(row);
            Object.values(session.getMarkers()).forEach(marker => {
                if (marker.clazz === 'line-breakpoint' && marker.range.start.row === row) session.removeMarker(marker.id);
            });
        }
        event.stop();
    }
}

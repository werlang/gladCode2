import { showDialog } from '../components/dialog.js';
import { api } from '../helpers/request.js';

/** A new program: just the loop block. */
const EMPTY_PROGRAM = '<xml><block type="loop" x="60" y="50"></block></xml>';
/** Python that Blockly generates for an empty loop. */
const EMPTY_LOOP = 'def loop():\n  pass\n';

/**
 * The Blockly editor, shown instead of the code editor. Its Python output is
 * written into the code editor as the blocks change.
 */
export class BlocksEditor {
    active = false;
    #workspace = null;
    #ready = null;

    /**
     * @param {import('./code-editor.js').CodeEditor} code The code editor that receives the generated Python.
     */
    constructor(code) {
        this.code = code;
    }

    /**
     * Creates the workspace the first time it is needed.
     *
     * @param {string} [xml] Program to load; the empty program by default.
     * @returns {Promise<void>}
     */
    #create(xml) {
        this.#ready ??= (async () => {
            const container = document.querySelector('#blocks');
            const toolbox = await api.get('blockly_toolbox.xml');
            container.innerHTML = typeof toolbox === 'string' ? toolbox : '';
            this.#workspace = Blockly.inject('blocks', {
                toolbox: container.querySelector('#toolbox'),
                zoom: { controls: true },
                grid: { spacing: 20, length: 0, snap: true },
                scrollbars: true,
                trashcan: true,
            });
            this.#workspace.addChangeListener(() => {
                const python = Blockly.Python.workspaceToCode(this.#workspace);
                if (python !== EMPTY_LOOP) this.code.value = python;
            });
            this.load(xml ?? EMPTY_PROGRAM);
            new ResizeObserver(() => Blockly.svgResize(this.#workspace)).observe(container);
        })();
        return this.#ready;
    }

    /**
     * Shows the blocks editor or the code editor.
     *
     * @param {{ active?: boolean, ask?: boolean, xml?: string }} [options]
     *   `active` forces a side (toggles otherwise); `ask: false` switches to
     *   blocks without warning that the code is lost; `xml` loads a program.
     * @returns {Promise<void>}
     */
    async toggle({ active, ask = true, xml } = {}) {
        await this.#create(xml);
        const toBlocks = active ?? !this.active;
        const button = document.querySelector('#switch');
        const icon = button.querySelector('i');

        if (!toBlocks) {
            document.querySelector('#blocks').style.display = 'none';
            document.querySelector('#code').style.display = '';
            this.active = false;
            icon.classList.replace('fa-code', 'fa-puzzle-piece');
            button.title = 'Alternar para editor de blocos';
            return;
        }

        if (ask && await showDialog('Se você alternar para o editor de blocos perderá seu código. Deseja continuar?', ['SIM', 'NÃO']) !== 'SIM') return;
        document.querySelector('#code').style.display = 'none';
        document.querySelector('#blocks').style.display = '';
        this.active = true;
        icon.classList.replace('fa-puzzle-piece', 'fa-code');
        button.title = 'Alternar para editor de código';
    }

    /** @returns {string} The program as Blockly XML. */
    save() {
        return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace));
    }

    /**
     * Replaces the program.
     *
     * @param {string} xml Blockly XML.
     */
    load(xml) {
        Blockly.mainWorkspace.clear();
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xml), Blockly.mainWorkspace);
    }
}

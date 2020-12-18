import { loader } from "./loader.js"
import { login } from "./header.js"
import { Message, tooltip } from "./dialog.js"

export const blocks = {
    ready: false,
    active: false
}

blocks.toolbox = async function(){
    const tabs = [
        {pt: "Lógica", en: "Logic"},
        {pt: "Repetições", en: "Loops"},
        {pt: "Matemática", en: "Math"},
        {pt: "Valores", en: "Values"},
        {pt: "Variáveis", en: "Variables"},
        {pt: "Funções", en: "Functions"},
        {pt: "Melhorias", en: "Upgrade"},
        {pt: "Movimentação", en: "Movement"},
        {pt: "Ataque", en: "Attack"},
        {pt: "Informações", en: "Information"},
        {pt: "Percepção", en: "Perception"},
        {pt: "Habilidades", en: "Abilities"},
        {pt: "Itens", en: "Items"},
    ]

    let xml_text = await (await fetch("blockly_toolbox.xml")).text()

    const user = await login.wait()
    if (user.speak != 'pt'){
        tabs.forEach(e => {
            const pattern = new RegExp(`category name="${e.pt}"`, 'g')
            xml_text = xml_text.replace(pattern, `category name="${e[user.speak]}"`)
        })
    }
    return xml_text
}

blocks.init = async function(code){
    if (this.ready){
        return this.Blockly
    }

    const {Blockly} = await loader.load("Blockly")
    this.Blockly = Blockly

    this.editor = {};

    document.querySelector('#blocks').innerHTML = await this.toolbox()
    
    this.editor.workspace = Blockly.inject('blocks', {
        toolbox: document.querySelector('#blocks #toolbox'),
        zoom: { controls: true },
        grid: { spacing: 20, length: 0, snap: true },
        scrollbars: true,
        trashcan: true
    })

    this.editor.workspace.addChangeListener( () => {
        const code = Blockly.Python.workspaceToCode(this.editor.workspace)

        if (code != "def loop():\n  pass\n"){
            this.code.editor.setValue(code)
            // console.log(code)
        }
    })

    const loop = `<xml><block type="loop" x="60" y="50"></block></xml>`;
    const xmlDom = Blockly.Xml.textToDom(loop);
    Blockly.Xml.domToWorkspace(xmlDom, this.editor.workspace)

    this.ready = true

    code.saved = true
    code.tested = true
    this.code = code

    return Blockly
}

blocks.toggle = async function({active = null, ask = false, load = false, create = false} = {}){
    const Blockly = await this.init()

    if (create){
        const loop = `<xml><block type="loop" x="60" y="50"></block></xml>`;
        const xmlDom = Blockly.Xml.textToDom(loop);
        Blockly.Xml.domToWorkspace(xmlDom, this.editor.workspace)
    }
    else if (load){
        this.load({xml: loadGlad.blocks})
    }

    new ResizeObserver(() => {
        Blockly.svgResize(this.editor.workspace);
    }).observe(document.querySelector('#blocks'))

    if (active === true || active === false){
        this.active = active
    }
    else{
        this.active = !this.active
    }

    if (!this.active){
        document.querySelector('#blocks').classList.remove('active')
        document.querySelector('#code').classList.add('active')

        this.active = false

        document.querySelector('#switch i').classList.remove('fa-code')
        document.querySelector('#switch i').classList.add('fa-puzzle-piece')
        document.querySelector('#switch').title = 'Alternar para editor de blocos'
        tooltip()

        const code = Blockly.Python.workspaceToCode(this.editor.workspace)
        this.code.editor.setValue(code)
        this.code.editor.gotoLine(1,0,true)
        this.code.editor.focus()
    }
    else if (!ask){
        change()
    }
    else{
        this.active = false
        new Message({
            message: `Se você alternar para o editor de blocos perderá seu código. Deseja continuar?`,
            buttons: {yes: "SIM", no: "NÃO"}
        }).show().click('yes', () => {
            change()
        });
    }

    function change(){
        document.querySelector('#blocks').classList.add('active')
        document.querySelector('#code').classList.remove('active')

        blocks.active = true

        document.querySelector('#switch i').classList.remove('fa-puzzle-piece')
        document.querySelector('#switch i').classList.add('fa-code')
        
        document.querySelector('#switch').title = 'Alternar para editor de código'
        tooltip()
    }
}

blocks.save = function(){
    const xmlDom = this.Blockly.Xml.workspaceToDom(this.Blockly.mainWorkspace)
    return this.Blockly.Xml.domToText(xmlDom)
}

window.saveBlocks = () => {
    return blocks.save()
}

blocks.load = async function({path, xml}){
    const Blockly = await this.init()

    if (path){
        xml = await (await fetch(path)).text()
    }

    Blockly.mainWorkspace.clear()
    const dom = Blockly.Xml.textToDom(xml)
    Blockly.Xml.domToWorkspace(dom, Blockly.mainWorkspace)
}
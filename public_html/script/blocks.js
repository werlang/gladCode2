import {Blockly} from "./blockly-python.js"
import {translator} from "./translate.js"
import {login} from "./header.js"
import {customBlocks} from "./blocks-text.js"

export {Blockly}

const funcList = {};
let user = {}

Blockly.initCustomBlocks = async function(){
    user = await login.wait()
    if (user.speak == 'pt'){
        const module = await import(`./blockly-pt-br.js`)
        Blockly.Msg = module.Blockly.Msg
        // Blockly.svgResize(Blockly.mainWorkspace);
    }
    else if (user.speak == 'en'){
    }

    Blockly.customBlocks = customBlocks

    Blockly.Blocks['loop'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("loop");
            this.appendStatementInput("CONTENT");
            this.setColour("#00638d");
    
            translator.translate("Função que o gladiador irá executar a cada 0.1s").then( text => {
                this.setTooltip(text[0]);
            })
    
            this.setHelpUrl("manual");
            this.setDeletable(false);
        }
    };
    
    Blockly.Python['loop'] = function(block) {
        var code = Blockly.Python.statementToCode(block, 'CONTENT');
        var globals = [];
    
        if (code == ""){
            code = Blockly.Python.INDENT + "pass\n";
            globals = '';
        }
        else{
            var varName;
            var workspace = block.workspace;
            var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
            for (let variable of variables){
                varName = variable.name;
                globals.push(Blockly.Python.variableDB_.getName(varName, Blockly.VARIABLE_CATEGORY_NAME));
            }
        
            if (globals.length)
                globals = Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n';
            else
                globals = '';
        }
    
        return `def loop():\n${globals}${code}\n`;
    };
    
    Blockly.Blocks['move'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"TO"], [text.dropdown[1],"TARGET"]], this.selection.bind(this)), "COMPLEMENT");
            this.appendValueInput("X")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Y");
            this.setInputsInline(true);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#bcbf33');
            this.func = "moveTo";
            this.useReturn = false;
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
    
            var hasposition = "false";
            if (this.getFieldValue('COMPLEMENT') == "TO")
                hasposition = "true";
            container.setAttribute('position', hasposition);
    
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({
                useReturn: xmlElement.getAttribute('use-return') == 'true',
                hasposition: xmlElement.getAttribute('position') == "true"
            });
        },
        reshape({useReturn, hasposition}){
            if (hasposition === true || hasposition === false){
                if (this.getInput('X') && !hasposition){
                    this.removeInput('X');
                    this.removeInput('Y');
                }
                else if (!this.getInput('X') && hasposition){
                    this.appendValueInput("X")
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("X");
                    this.appendValueInput("Y")
                        .setCheck("Number")
                        .setAlign(Blockly.ALIGN_RIGHT)
                        .appendField("Y");
    
                    connectShadow(this, 'X');
                    connectShadow(this, 'Y');
                }
            }
            if (useReturn === true || useReturn === false)
                reshape_toggleUseReturn(this, useReturn);
        },
        selection: function (option) {
            if (option == "TO"){
                this.func = 'moveTo';
                this.reshape({hasposition: true});
            }
            else{
                this.func = 'moveToTarget';
                this.reshape({hasposition: false});
            }
        },
    };
    
    Blockly.Python['move'] = function(block) {
        var dropdown_complement = block.getFieldValue('COMPLEMENT');
        var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
        var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
    
        var code = `moveToTarget()`;
        if (dropdown_complement == "TO")
            code = `moveTo(${value_x}, ${value_y})`;
    
        setBlockInfo(this);
    
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['step'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"FORWARD"], [text.dropdown[1],"BACK"], [text.dropdown[2],"LEFT"], [text.dropdown[3],"RIGHT"]]), "COMPLEMENT");
            this.setInputsInline(true);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#bcbf33');
            this.func = "stepForward";
            this.useReturn = false;
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn, 'Number');
        } 
    };
    
    Blockly.Python['step'] = function(block) {
        var dropdown_complement = block.getFieldValue('COMPLEMENT');
        var values = {
            FORWARD: "Forward",
            BACK: "Back",
            LEFT: "Left",
            RIGHT: "Right"
        };
    
        code = `step${values[dropdown_complement]}()`;
        this.func = `step${values[dropdown_complement]}`;
        setBlockInfo(this);
        
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['moveforward'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field[0])
            this.appendValueInput("STEPS")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
            this.appendDummyInput()
                .appendField(text.field[1]);
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#bcbf33');
            this.func = `moveForward`;
            setBlockInfo(this);
        },
    };
    
    Blockly.Python['moveforward'] = function(block) {
        var steps = (Blockly.Python.valueToCode(block, 'STEPS', Blockly.Python.ORDER_ATOMIC) || 0);
        code = `moveForward(${steps})\n`;
    
        return code;
    };
    
    Blockly.Blocks['turn'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field[0])
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"TO"], [text.dropdown[1],"TARGET"], [text.dropdown[2],"HIT"], [text.dropdown[3],"LEFT"], [text.dropdown[4],"RIGHT"]], this.selection.bind(this)), "COMPLEMENT");
            this.appendValueInput("X")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Y");
            this.setInputsInline(true);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#bcbf33');
            this.useReturn = false;
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            var option = this.getFieldValue('COMPLEMENT');
            container.setAttribute('where', option);
    
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
    
        },
        domToMutation: function(xmlElement) {
            this.reshape({
                useReturn: xmlElement.getAttribute('use-return') == 'true',
                option: xmlElement.getAttribute('where')
            });
        },
        reshape({useReturn, option}){
            const text = Blockly.customBlocks[user.speak][this.type]
            if (["TO", "TARGET", "HIT", "LEFT", "RIGHT"].indexOf(option) != -1){
                var input_now = [];
                for (let i in this.inputList){
                    let name = this.inputList[i].name;
                    if (name != "")
                        input_now.push(name);
                }
    
                var input_next = [];
                if (option == "TO"){
                    input_next.push("X", "Y");
                }
                else if (["LEFT", "RIGHT"].indexOf(option) != -1){
                    input_next.push("ANGLE", "TEXT");
                }
                else if (option == "TARGET"){
                }
    
                // remove uneeded input
                for (let i in input_now){
                    if (input_next.indexOf(input_now[i]) == -1){
                        this.removeInput(input_now[i]);
                    }
                }
    
                // include needed inputs
                for (let i in input_next){
                    if (input_next[i] == "X" && !this.getInput("X")){
                        this.appendValueInput("X")
                            .setCheck("Number")
                            .setAlign(Blockly.ALIGN_RIGHT)
                            .appendField("X");
    
                        connectShadow(this, 'X');
                    }
                    else if (input_next[i] == "Y" && !this.getInput("Y")){
                        this.appendValueInput("Y")
                            .setCheck("Number")
                            .setAlign(Blockly.ALIGN_RIGHT)
                            .appendField("Y");
    
                        connectShadow(this, 'Y');
                    }
                    else if (input_next[i] == "ANGLE" && !this.getInput("ANGLE")){
                        this.appendValueInput("ANGLE")
                            .setCheck("Number")
                        this.appendDummyInput("TEXT")
                            .appendField(text.field[1])
                            .setAlign(Blockly.ALIGN_RIGHT);
    
                        connectShadow(this, 'ANGLE');
                    }
                }
                this.selectedOption = option
            }
            if (useReturn === true || useReturn === false){
                if (this.selectedOption == "LEFT" || this.selectedOption == "RIGHT")
                    reshape_toggleUseReturn(this, useReturn, "Number");
                else
                    reshape_toggleUseReturn(this, useReturn);
            }
        },
        selection: function (option) {
            if (["TO", "TARGET", "HIT", "LEFT", "RIGHT"].indexOf(option) != -1)
                this.reshape({useReturn: this.useReturn, option: option});
        },
    };
    
    Blockly.Python['turn'] = function(block) {
        var dropdown_where = block.getFieldValue('COMPLEMENT');
        var values = {
            TO: "To",
            LEFT: "Left",
            RIGHT: "Right",
            TARGET: "ToTarget",
            HIT: "ToLastHit"
        };
    
        var code = `turn${values[dropdown_where]}`;
        this.func = code;
        setBlockInfo(this);
    
        if (dropdown_where == "TO"){
            var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
            var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
            code += `(${value_x}, ${value_y})`;
        }
        else if (dropdown_where == "LEFT" || dropdown_where == "RIGHT"){
            var value_angle = (Blockly.Python.valueToCode(block, 'ANGLE', Blockly.Python.ORDER_ATOMIC) || 0);
            code += `(${value_angle})`;
        }
        else{
            code += "()";
        }
    
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['turnangle'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendValueInput("ANGLE")
                .setCheck("Number")
                .appendField(text.field[0]);
            this.appendDummyInput()
                .appendField(text.field[1])
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"TURN"], [text.dropdown[1],"ANGLE"]], this.selection.bind(this)), "COMPLEMENT")
                .setAlign(Blockly.ALIGN_RIGHT);
            this.setOutput(false);
            this.setNextStatement(true);
            this.setPreviousStatement(true);
            this.setColour('#bcbf33');
            this.func = 'ambush';
            this.useReturn = false;
        },
        customContextMenu: function(options) {
            var option = this.getFieldValue('COMPLEMENT');
            if (option == "ANGLE")
                toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            var option = this.getFieldValue('COMPLEMENT');
            container.setAttribute('operation', option);
    
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
    
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({
                useReturn: xmlElement.getAttribute('use-return') == 'true',
                option: xmlElement.getAttribute('operation')
            });
        },
        reshape({option, useReturn}){
            this.unplug();
            if (option === "TURN")
                reshape_toggleUseReturn(this, false);
            else
                reshape_toggleUseReturn(this, useReturn);
        },
        selection: function (option) {
            this.reshape(option);
        },
    };
    
    Blockly.Python['turnangle'] = function(block) {
        var value_angle = (Blockly.Python.valueToCode(block, 'ANGLE', Blockly.Python.ORDER_ATOMIC) || 0);
        var dropdown_op = block.getFieldValue('COMPLEMENT');
    
        var code = "turn";
    
        if (dropdown_op == "ANGLE")
            code += "ToAngle";
    
        this.func = code;
        setBlockInfo(this);
    
        code += `(${value_angle})`;
    
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['fireball'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
            this.appendValueInput("X")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Y");
            this.setInputsInline(true);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour("#7d52a8");
            this.func = 'fireball';
            this.useReturn = false;
            setBlockInfo(this);
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['fireball'] = function(block) {
        var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
        var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
    
        var code = `fireball(${value_x}, ${value_y})`;
    
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['teleport'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
            this.appendValueInput("X")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Y");
            this.setInputsInline(true);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour("#7d52a8");
            this.func = 'teleport';
            this.useReturn = false;
            setBlockInfo(this);
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['teleport'] = function(block) {
        var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
        var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
    
        var code = `teleport(${value_x}, ${value_y})`;
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['charge'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour("#7d52a8");
            this.func = 'charge';
            this.useReturn = false;
            setBlockInfo(this);
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['charge'] = function(block) {
        var code = `charge()`;
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['block'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#7d52a8');
            this.func = 'block';
            this.useReturn = false;
            setBlockInfo(this);
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['block'] = function(block) {
        var code = `block()`;
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['assassinate'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
            this.appendValueInput("X")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Y");
            this.setInputsInline(true);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour("#7d52a8");
            this.func = 'assassinate';
            this.useReturn = false;
            setBlockInfo(this);
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['assassinate'] = function(block) {
        var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
        var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
    
        var code = `assassinate(${value_x}, ${value_y})`;
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['ambush'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour("#7d52a8");
            this.func = 'ambush';
            this.useReturn = false;
            setBlockInfo(this);
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['ambush'] = function(block) {
        var code = `ambush()`;
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['melee'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
            this.setOutput(false);
            this.setNextStatement(true);
            this.setPreviousStatement(true);
            this.setColour("#aa5353");
            this.func = 'attackMelee';
            setBlockInfo(this);
        }
    };
    
    Blockly.Python['melee'] = function(block) {
        var code = `attackMelee()\n`;
        return code;
    };
    
    Blockly.Blocks['ranged'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
            this.appendValueInput("X")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Y");
            this.setInputsInline(true);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour("#aa5353");
            this.func = 'attackRanged';
            this.useReturn = false;
            setBlockInfo(this);
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['ranged'] = function(block) {
        var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
        var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
    
        var code = `attackRanged(${value_x}, ${value_y})`;
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['get_info'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"X"], [text.dropdown[1],"Y"], [text.dropdown[2],"STR"], [text.dropdown[3],"AGI"], [text.dropdown[4],"INT"], [text.dropdown[5],"Lvl"], [text.dropdown[6],"Hp"], [text.dropdown[7],"Ap"], [text.dropdown[8],"Speed"], [text.dropdown[9],"Head"]]), "COMPLEMENT");
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#b79337');
        }
    };
    
    Blockly.Python['get_info'] = function(block) {
        var info = this.getFieldValue('COMPLEMENT');
        var code = `get${info}()`;
    
        this.func = `get${info}`;
        setBlockInfo(this);
    
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['gethit'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field);
            this.setOutput(true, "Boolean");
            this.setColour('#b79337');
            this.func = 'getHit';
            setBlockInfo(this);
        }
    };
    
    Blockly.Python['gethit'] = function(block) {
        var code = `getHit()`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['get_time'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field[0])
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"Block"], [text.dropdown[1],"Ambush"], [text.dropdown[2],"Burn"]]), "COMPLEMENT")
                .appendField(text.field[1])
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#b79337');
        }
    };
    
    Blockly.Python['get_time'] = function(block) {
        var info = this.getFieldValue('COMPLEMENT');
        var code = `get${info}TimeLeft()`;
    
        this.func = `get${info}TimeLeft`;
        setBlockInfo(this);
    
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['get_lasthit'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field[0])
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"Time"], [text.dropdown[0],"Angle"]]), "COMPLEMENT")
                .appendField(text.field[1])
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#b79337');
        }
    };
    
    Blockly.Python['get_lasthit'] = function(block) {
        var info = this.getFieldValue('COMPLEMENT');
        var code = `getLastHit${info}()`;
    
        this.func = `getLastHit${info}`;
        setBlockInfo(this);
    
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['upgrade'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field[0])
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"STR"], [text.dropdown[1],"AGI"], [text.dropdown[2],"INT"]]), "COMPLEMENT");
            this.appendValueInput("VALUE")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField(text.field[1]);
            this.appendDummyInput()
                .appendField(text.field[2])
            this.setInputsInline(true);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#3c9b64');
            this.useReturn = false;
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['upgrade'] = function(block) {
        var attr = this.getFieldValue('COMPLEMENT');
        var value = (Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_ATOMIC) || 0);
    
        var code = `upgrade${attr}(${value})`;
        this.func = `upgrade${attr}`;
        setBlockInfo(this);
    
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['speak'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendValueInput("TEXT")
                .setCheck("String")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField(text.field);
            this.setOutput(false);
            this.setNextStatement(true);
            this.setPreviousStatement(true);
            this.setColour('#b79337');
            this.func = 'speak';
            setBlockInfo(this);
        }
    };
    
    Blockly.Python['speak'] = function(block) {
        var text = (Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_ATOMIC) || "");
        var code = `speak(${text})\n`;
        return code;
    };
    
    Blockly.Blocks['getdist'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"POSITION"], [text.dropdown[0],"TARGET"]], this.selection.bind(this)), "COMPLEMENT");
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#5B67A5');
            this.reshape(true);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            var hasposition = "false";
            if (this.getFieldValue('COMPLEMENT') == "POSITION")
                hasposition = "true";
            container.setAttribute('position', hasposition);
            return container;
        },
        domToMutation: function(xmlElement) {
            var hasposition = (xmlElement.getAttribute('position') == "true");
            this.reshape(hasposition);
        },
        reshape(hasposition){
            if (this.getInput('X') && !hasposition){
                this.removeInput('X');
                this.removeInput('Y');
            }
            else if (!this.getInput('X') && hasposition){
                this.appendValueInput("X")
                    .setCheck("Number")
                    .setAlign(Blockly.ALIGN_RIGHT)
                    .appendField("X");
                this.appendValueInput("Y")
                    .setCheck("Number")
                    .setAlign(Blockly.ALIGN_RIGHT)
                    .appendField("Y");
    
                connectShadow(this, 'X');
                connectShadow(this, 'Y');
            }
        },
        selection: function (option) {
            if (option == "POSITION")
                this.reshape(true);
            else
                this.reshape(false);
        },
    };
    
    Blockly.Python['getdist'] = function(block) {
        var dropdown_complement = block.getFieldValue('COMPLEMENT');
    
        var code;
        if (dropdown_complement == "POSITION"){
            var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
            var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
            code = `getDist(${value_x}, ${value_y})`;
            this.func = 'getDist';
        }
        else{
            code = `getDistToTarget()`;
            this.func = `getDistToTarget`;
        }
    
        setBlockInfo(this);
    
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['getangle'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
            this.appendValueInput("X")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Y");
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#5B67A5');
            this.func = `getAngle`;
            setBlockInfo(this);
        }
    };
    
    Blockly.Python['getangle'] = function(block) {
        var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
        var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
    
        var code = `getAngle(${value_x}, ${value_y})`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['is_status'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"TargetVisible"], [text.dropdown[1],"Stunned"], [text.dropdown[2],"Burning"], [text.dropdown[3], "Protected"], [text.dropdown[4], "Running"], [text.dropdown[5], "Slowed"]]), "COMPLEMENT")
                .appendField("?");
            this.setInputsInline(true);
            this.setOutput(true, "Boolean");
            this.setColour('#52b2b2');
        }
    };
    
    Blockly.Python['is_status'] = function(block) {
        var info = this.getFieldValue('COMPLEMENT');
        var code = `is${info}()`;
        this.func = `is${info}`;
        setBlockInfo(this);
    
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['get_enemy'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field[0])
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"CloseEnemy"], [text.dropdown[1],"FarEnemy"], [text.dropdown[2],"LowHp"], [text.dropdown[3], "HighHp"]]), "COMPLEMENT")
                .appendField(text.field[1])
            this.setInputsInline(true);
            this.setOutput(true, "Boolean");
            this.setColour('#52b2b2');
            this.useReturn = true;
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['get_enemy'] = function(block) {
        var info = this.getFieldValue('COMPLEMENT');
        var code = `get${info}()`;
        this.func = `get${info}`;
        setBlockInfo(this);
    
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['get_target'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field[0])
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"X"], [text.dropdown[1],"Y"], [text.dropdown[2],"Health"], [text.dropdown[3],"Speed"], [text.dropdown[4],"Head"]]), "COMPLEMENT")
                .appendField(text.field[1]);
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#52b2b2');
        }
    };
    
    Blockly.Python['get_target'] = function(block) {
        var info = this.getFieldValue('COMPLEMENT');
        var code = `getTarget${info}()`;
        this.func = `getTarget${info}`;
        setBlockInfo(this);
    
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['issafe'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([[text.dropdown[0],"Here"], [text.dropdown[1],"There"]], this.selection.bind(this)), "COMPLEMENT")
                .appendField("?");
            this.setInputsInline(true);
            this.setOutput(true, "Boolean");
            this.setColour('#52b2b2');
            this.reshape(false);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            var hasposition = "false";
            if (this.getFieldValue('COMPLEMENT') == "There")
                hasposition = "true";
            container.setAttribute('position', hasposition);
    
            return container;
        },
        domToMutation: function(xmlElement) {
            var hasposition = (xmlElement.getAttribute('position') == "true");
            this.reshape(hasposition);
    
        },
        reshape(hasposition){
            if (this.getInput('X') && !hasposition){
                this.removeInput('X');
                this.removeInput('Y');
            }
            else if (!this.getInput('X') && hasposition){
                this.appendValueInput("X")
                    .setCheck("Number")
                    .setAlign(Blockly.ALIGN_RIGHT)
                    .appendField("X");
                this.appendValueInput("Y")
                    .setCheck("Number")
                    .setAlign(Blockly.ALIGN_RIGHT)
                    .appendField("Y");
    
                connectShadow(this, 'X');
                connectShadow(this, 'Y');
            }
        },
        selection: function (option) {
            if (option == "There")
                this.reshape(true);
            else
                this.reshape(false);
        },
    };
    
    Blockly.Python['issafe'] = function(block) {
        var dropdown_complement = block.getFieldValue('COMPLEMENT');
    
        var code;
        if (dropdown_complement == "There"){
            var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
            var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);
            code = `isSafe${dropdown_complement}(${value_x}, ${value_y})`;
        }
        else
            code = `isSafe${dropdown_complement}()`;
    
        this.func = `isSafe${dropdown_complement}`;
        setBlockInfo(this);
    
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['getsaferadius'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field);
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#52b2b2');
            this.func = `getSafeRadius`;
            setBlockInfo(this);
        }
    };
    
    Blockly.Python['getsaferadius'] = function(block) {
        var code = `getSafeRadius()`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['howmanyenemies'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field);
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#52b2b2');
            this.func = `howManyEnemies`;
            setBlockInfo(this);
        }
    };
    
    Blockly.Python['howmanyenemies'] = function(block) {
        var code = `howManyEnemies()`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['doyouseeme'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field);
            this.setInputsInline(true);
            this.setOutput(true, "Boolean");
            this.setColour('#52b2b2');
            this.func = `doYouSeeMe`;
            setBlockInfo(this);
        }
    };
    
    Blockly.Python['doyouseeme'] = function(block) {
        var code = `doYouSeeMe()`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['getsimtime'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field);
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour('#52b2b2');
            this.func = `getSimTime`;
            setBlockInfo(this);
        }
    };
    
    Blockly.Python['getsimtime'] = function(block) {
        var code = `getSimTime()`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['pot_hp'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([["I","1"], ["II","2"], ["III","3"], ["IV", "4"], ["V", "5"]]), "COMPLEMENT")
            this.setInputsInline(true);
            this.setOutput(true, "String");
            this.setColour('#9eb553');
    
            translator.translate("Recupera pontos de vida do gladiador").then( text => {
                this.setTooltip(text[0]);
            })
        },
    };
    
    Blockly.Python['pot_hp'] = function(block) {
        let lvl = this.getFieldValue('COMPLEMENT');
        let code = `pot-hp-${lvl}`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['pot_ap'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([["I","1"], ["II","2"], ["III","3"], ["IV", "4"], ["V", "5"]]), "COMPLEMENT")
            this.setInputsInline(true);
            this.setOutput(true, "String");
            this.setColour('#9eb553');
    
            translator.translate("Recupera pontos de habilidade do gladiador").then( text => {
                this.setTooltip(text[0]);
            })
        },
    };
    
    Blockly.Python['pot_ap'] = function(block) {
        let lvl = this.getFieldValue('COMPLEMENT');
        let code = `pot-ap-${lvl}`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['pot_atr'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([["I","1"], ["II","2"], ["III","3"], ["IV", "4"]]), "COMPLEMENT")
            this.setInputsInline(true);
            this.setOutput(true, "String");
            this.setColour('#9eb553');
    
            translator.translate("Concede pontos de atributo para o gladiador").then( text => {
                this.setTooltip(text[0]);
            })
        },
    };
    
    Blockly.Python['pot_atr'] = function(block) {
        let lvl = this.getFieldValue('COMPLEMENT');
        let code = `pot-atr-${lvl}`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['pot_xp'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendDummyInput()
                .appendField(text.field)
                .appendField(new Blockly.FieldDropdown([["I","1"], ["II","2"], ["III","3"]]), "COMPLEMENT")
            this.setInputsInline(true);
            this.setOutput(true, "String");
            this.setColour('#9eb553');
    
            translator.translate("Aumenta a experiência do gladiador").then( text => {
                this.setTooltip(text[0]);
            })
        },
    };
    
    Blockly.Python['pot_xp'] = function(block) {
        let lvl = this.getFieldValue('COMPLEMENT');
        let code = `pot-xp-${lvl}`;
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    Blockly.Blocks['useitem'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendValueInput("POTION")
                .setCheck("String")
                .appendField(text.field)
                .setAlign(Blockly.ALIGN_RIGHT);
            this.setInputsInline(false);
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#9eb553');
            this.useReturn = false;
        },
        customContextMenu: function(options) {
            toggleUseReturn(this, options);
        },
        mutationToDom: function() {
            var container = document.createElement('mutation');
            if (this.useReturn)
                container.setAttribute('use-return', 'true');
            else
                container.setAttribute('use-return', 'false');
            return container;
        },
        domToMutation: function(xmlElement) {
            this.reshape({useReturn: xmlElement.getAttribute('use-return') == 'true'});
        },
        reshape: function(option) {
            reshape_toggleUseReturn(this, option.useReturn);
        } 
    };
    
    Blockly.Python['useitem'] = function(block) {
        let info = (Blockly.Python.valueToCode(block, 'POTION', Blockly.Python.ORDER_NONE) || "")
        let code = `useItem("${info}")`;
        this.func = `useItem`;
        setBlockInfo(this);
    
        if (this.useReturn)
            return [code, Blockly.Python.ORDER_NONE];
        else
            return code + '\n';
    };
    
    Blockly.Blocks['itemready'] = {
        init: function() {
            const text = Blockly.customBlocks[user.speak][this.type]
            this.appendValueInput("POTION")
                .setCheck("String")
                .appendField(text.field)
                .setAlign(Blockly.ALIGN_RIGHT);
            this.setInputsInline(false);
            this.setOutput(true, "Boolean");
            this.setColour('#9eb553');
        },
    };
    
    Blockly.Python['itemready'] = function(block) {
        let pot = (Blockly.Python.valueToCode(block, 'POTION', Blockly.Python.ORDER_NONE) || "")
        var code = `isItemReady("${pot}")`;
        this.func = `isItemReady`;
        setBlockInfo(this);
    
        return [code, Blockly.Python.ORDER_NONE];
    };
    
    return true
}

async function getTooltip(name){
    if (funcList[name]){
        return funcList[name]
    }

    const json = await (await fetch(`script/functions/${name.toLowerCase()}.json`)).json()
    const tooltip = await translator.translate(json.description.brief)
    // console.log(json)
    funcList[name] = tooltip
    return tooltip
}

function setBlockInfo(block){
    getTooltip(block.func).then( data => {
        // console.log(data[0])
        block.setTooltip(data[0]);
    });
    block.setHelpUrl(`function/${block.func.toLowerCase()}.blk`);
}

function toggleUseReturn(block, options){
    var option = {};
    option.enabled = true;
    if (!block.useReturn){
        option.text = 'Usar retorno';
        option.callback = () => {
            block.reshape({useReturn: true});
        };
    }
    else{
        option.text = 'Ignorar retorno';
        option.callback = () => {
            block.reshape({useReturn: false});
        };
    }
    options.push(option);
}

function reshape_toggleUseReturn(block, useReturn, type){
    if (block.useReturn != useReturn)
        block.unplug(true);
    if (useReturn){
        block.setPreviousStatement(false);
        block.setNextStatement(false);
        if (!type)
            type = "Boolean"
        block.setOutput(true, type);
        block.useReturn = true;
    }
    else{
        block.setOutput(false);
        block.setPreviousStatement(true);
        block.setNextStatement(true);
        block.useReturn = false;
    }
}

function connectShadow(block, input){
    let shadow = block.workspace.newBlock('math_number');
    shadow.setShadow(true);
    shadow.initSvg();
    shadow.render();
    block.getInput(input).connection.connect(shadow.outputConnection);
}

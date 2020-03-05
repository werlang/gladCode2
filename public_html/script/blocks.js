var funcList = {};

Blockly.Blocks['loop'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("loop");
		this.appendStatementInput("CONTENT");
		this.setColour("#00638d");
        this.setTooltip("Função que o gladiador irá executar a cada 0.1s");
        this.setHelpUrl("manual");
        this.setDeletable(false);
	}
};

Blockly.Python['loop'] = function(block) {
    var code = Blockly.Python.statementToCode(block, 'CONTENT');
    if (code == "")
        code = "  pass";
	return `def loop():\n${code}`;
};

Blockly.Blocks['ignore_return'] = {
	init: function() {
		this.appendValueInput("function")
		this.setInputsInline(false);
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(230);
        this.setTooltip("Ignora o retorno de uma função");
        this.setHelpUrl("");
	}
};

Blockly.Python['ignore_return'] = function(block) {
	var value_function = Blockly.Python.valueToCode(block, 'function', Blockly.Python.ORDER_ATOMIC || '0');
	var code = `${value_function}\n`;
	return code;
};

Blockly.Blocks['move'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Mover para")
			.appendField(new Blockly.FieldDropdown([["Posição","TO"], ["Alvo","TARGET"]], this.selection.bind(this)), "COMPLEMENT");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
		this.func = "moveTo";
		this.params = "0, 0";
		this.reshape(true);
	},
	mutationToDom: function() {
		var container = document.createElement('mutation');
		var hasposition = "false";
		if (this.getFieldValue('COMPLEMENT') == "TO")
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
		}

		// getTooltip(this.func).then( desc => {
		// 	this.setTooltip(desc);
		// });
		// this.setHelpUrl(`function/${this.func.toLowerCase()}.py`);
	
	},
	selection: function (option) {
		if (option == "TO")
			this.reshape(true);
		else
			this.reshape(false);
	},
};

Blockly.Python['move'] = function(block) {
	var dropdown_complement = block.getFieldValue('COMPLEMENT');
	var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
	var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);

	var code = `${this.func}(${this.params})`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['step'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Passo para")
			.appendField(new Blockly.FieldDropdown([["Frente","FORWARD"], ["Trás","BACK"], ["Esquerda","LEFT"], ["Direita","RIGHT"]]), "COMPLEMENT");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	},
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

	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['moveforward'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Mover para frente")
		this.appendValueInput("STEPS")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
		this.appendDummyInput()
			.appendField("passos");
		this.setInputsInline(true);
		this.setPreviousStatement(true);
		this.setNextStatement(true);
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	},
};

Blockly.Python['moveforward'] = function(block) {
	var steps = (Blockly.Python.valueToCode(block, 'STEPS', Blockly.Python.ORDER_ATOMIC) || 0);
	code = `moveForward(${steps})\n`;

	return code;
};

Blockly.Blocks['turn'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Virar para")
			.appendField(new Blockly.FieldDropdown([["Posição","TO"], ["Alvo","TARGET"], ["Ataque recebido","HIT"], ["Esquerda","LEFT"], ["Direita","RIGHT"]], this.selection.bind(this)), "COMPLEMENT");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
		// this.option = null;
		this.reshape(true);
	},
	mutationToDom: function() {
		var container = document.createElement('mutation');
		var option = this.getFieldValue('COMPLEMENT');
		container.setAttribute('where', option);
		return container;
	},
	domToMutation: function(xmlElement) {
		var option = xmlElement.getAttribute('where');
		this.reshape(option);
	},
	reshape(option){
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
			}
			else if (input_next[i] == "Y" && !this.getInput("Y")){
				this.appendValueInput("Y")
					.setCheck("Number")
					.setAlign(Blockly.ALIGN_RIGHT)
					.appendField("Y");
			}
			else if (input_next[i] == "ANGLE" && !this.getInput("ANGLE")){
				this.appendValueInput("ANGLE")
					.setCheck("Number")
				this.appendDummyInput("TEXT")
					.appendField("Graus")
					.setAlign(Blockly.ALIGN_RIGHT);
			}
		}
	},
	selection: function (option) {
		this.reshape(option);
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

	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['turnangle'] = {
	init: function() {
		this.appendValueInput("ANGLE")
			.setCheck("Number")
			.appendField("Virar");
		this.appendDummyInput()
			.appendField("Graus relativo")
			.appendField(new Blockly.FieldDropdown([["ao gladiador","TURN"], ["à arena","ANGLE"]], this.selection.bind(this)), "COMPLEMENT")
			.setAlign(Blockly.ALIGN_RIGHT);
		this.setOutput(false);
		this.setNextStatement(true);
		this.setPreviousStatement(true);
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
		// this.reshape(true);
	},
	mutationToDom: function() {
		var container = document.createElement('mutation');
		var option = this.getFieldValue('COMPLEMENT');
		container.setAttribute('operation', option);
		return container;
	},
	domToMutation: function(xmlElement) {
		var option = xmlElement.getAttribute('operation');
		this.reshape(option);
	},
	reshape(option){
		this.unplug();
		if (option == "TURN"){
			this.setOutput(false);
			this.setNextStatement(true);
			this.setPreviousStatement(true);
		}
		else{
			this.setNextStatement(false);
			this.setPreviousStatement(false);
			this.setOutput(true, "Boolean");
		}
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

	code += `(${value_angle})`;

	if (dropdown_op == "ANGLE")
		return [code, Blockly.Python.ORDER_NONE];
	else
		return code;
};

Blockly.Blocks['fireball'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Bola de fogo em")
		this.appendValueInput("X")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("X");
		this.appendValueInput("Y")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("Y");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['fireball'] = function(block) {
	var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
	var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);

	var code = `fireball(${value_x}, ${value_y})`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['teleport'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Teletransporte para")
		this.appendValueInput("X")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("X");
		this.appendValueInput("Y")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("Y");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['teleport'] = function(block) {
	var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
	var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);

	var code = `teleport(${value_x}, ${value_y})`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['charge'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Investida")
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['charge'] = function(block) {
	var code = `charge()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['block'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Bloquear")
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['block'] = function(block) {
	var code = `block()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['assassinate'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Assassinar em")
		this.appendValueInput("X")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("X");
		this.appendValueInput("Y")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("Y");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['assassinate'] = function(block) {
	var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
	var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);

	var code = `assassinate(${value_x}, ${value_y})`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['ambush'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Emboscada")
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['ambush'] = function(block) {
	var code = `ambush()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['melee'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Ataque Corpo-a-corpo")
		this.setOutput(false);
		this.setNextStatement(true);
		this.setPreviousStatement(true);
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['melee'] = function(block) {
	var code = `attackMelee()`;
	return code;
};

Blockly.Blocks['ranged'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Ataque à distância em")
		this.appendValueInput("X")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("X");
		this.appendValueInput("Y")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("Y");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['ranged'] = function(block) {
	var value_x = (Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || 0);
	var value_y = (Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || 0);

	var code = `attackRanged(${value_x}, ${value_y})`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['get_info'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Pegar informação")
			.appendField(new Blockly.FieldDropdown([["Coordenada X","X"], ["Coordenada Y","Y"], ["Atributo Força","STR"], ["Atributo Agilidade","AGI"], ["Atributo Inteligência","INT"], ["Nível","Lvl"], ["Pontos de vida","Hp"], ["Pontos de habilidade","Ap"], ["Velocidade","Speed"], ["Direção","Head"]]), "COMPLEMENT");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['get_info'] = function(block) {
	var info = this.getFieldValue('COMPLEMENT');
	var code = `get${info}()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['gethit'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Fui acertado?");
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['gethit'] = function(block) {
	var code = `getHit()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['get_time'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Tempo restante")
			.appendField(new Blockly.FieldDropdown([["Resistência","Block"], ["Invisibilidade","Ambush"], ["Queimadura","Burn"]]), "COMPLEMENT");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['get_time'] = function(block) {
	var info = this.getFieldValue('COMPLEMENT');
	var code = `get${info}TimeLeft()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['get_lasthit'] = {
	init: function() {
		this.appendDummyInput()
			.appendField(new Blockly.FieldDropdown([["Tempo","Time"], ["Ângulo","Angle"]]), "COMPLEMENT")
			.appendField("do ataque recebido");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['get_lasthit'] = function(block) {
	var info = this.getFieldValue('COMPLEMENT');
	var code = `getLastHit${info}()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['upgrade'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Melhorar")
			.appendField(new Blockly.FieldDropdown([["Força","STR"], ["Agilidade","AGI"], ["Inteligência","INT"]]), "COMPLEMENT");
		this.appendValueInput("VALUE")
			.setCheck("Number")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("em");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['upgrade'] = function(block) {
	var attr = this.getFieldValue('COMPLEMENT');
	var value = (Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_ATOMIC) || 0);

	var code = `upgrade${attr}(${value})`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['speak'] = {
	init: function() {
		this.appendValueInput("TEXT")
			.setCheck("String")
			.setAlign(Blockly.ALIGN_RIGHT)
			.appendField("Falar");
		this.setOutput(false);
		this.setNextStatement(true);
		this.setPreviousStatement(true);
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['speak'] = function(block) {
	var text = (Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_ATOMIC) || "");
	var code = `speak(${text})`;
	return code;
};

Blockly.Blocks['getdist'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Distância para")
			.appendField(new Blockly.FieldDropdown([["Posição","POSITION"], ["Alvo","TARGET"]], this.selection.bind(this)), "COMPLEMENT");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
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
	}
	else
		code = `getDistToTarget()`;

	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['getangle'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Ângulo para")
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
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
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
		this.appendDummyInput()
			.appendField("Alvo está")
			.appendField(new Blockly.FieldDropdown([["Visível","TargetVisible"], ["Atordoado","Stunned"], ["Queimando","Burning"], ["Protegido", "Protected"], ["Correndo", "Running"], ["Lerdo", "Slowed"]]), "COMPLEMENT")
			.appendField("?");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['is_status'] = function(block) {
	var info = this.getFieldValue('COMPLEMENT');
	var code = `is${info}()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['get_enemy'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Selecionar alvo")
			.appendField(new Blockly.FieldDropdown([["Mais Próximo","CloseEnemy"], ["Mais Distante","FarEnemy"], ["Com menos Vida","LowHp"], ["Com mais vida", "HighHp"]]), "COMPLEMENT");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['get_enemy'] = function(block) {
	var info = this.getFieldValue('COMPLEMENT');
	var code = `get${info}()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['get_target'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Pegar")
			.appendField(new Blockly.FieldDropdown([["Coordenada X","X"], ["Coordenada Y","Y"], ["Saúde","Health"], ["Velocidade","Speed"], ["Direção","Head"]]), "COMPLEMENT")
			.appendField("do alvo");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['get_target'] = function(block) {
	var info = this.getFieldValue('COMPLEMENT');
	var code = `getTarget${info}()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['issafe'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("É seguro")
			.appendField(new Blockly.FieldDropdown([["Aqui","Here"], ["Na posição","There"]], this.selection.bind(this)), "COMPLEMENT")
			.appendField("?");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
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

	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['getsaferadius'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Raio seguro");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['getsaferadius'] = function(block) {
	var code = `getSafeRadius()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['howmanyenemies'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Quantos inimigos vejo?");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['howmanyenemies'] = function(block) {
	var code = `howManyEnemies()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['doyouseeme'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Alvo me enxerga?");
		this.setInputsInline(true);
		this.setOutput(true, "Boolean");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['doyouseeme'] = function(block) {
	var code = `doYouSeeMe()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['getsimtime'] = {
	init: function() {
		this.appendDummyInput()
			.appendField("Tempo da simulação");
		this.setInputsInline(true);
		this.setOutput(true, "Number");
		this.setColour(210);
		this.setTooltip("tooltip");
		this.setHelpUrl("url");
	}
};

Blockly.Python['getsimtime'] = function(block) {
	var code = `getSimTime()`;
	return [code, Blockly.Python.ORDER_NONE];
};

async function getTooltip(name){
	if (funcList[name])
		return funcList[name];

	return await $.getJSON(`script/functions/${name.toLowerCase()}.json`, async data => {
		funcList[name] = data.description.brief;
		return data.description.brief;
	});
}
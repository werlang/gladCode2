var content = [
	{
		"name": "setName",
		"ptname": "mudaNome",
		"syntax": "void setName ( char * nome );",
		"description": {
			"long": "Atribui um nome para o gladiador. O nome atribuído será utilizado durante toda a simulação para referir-se ao gladiador. Esta função somente pode ser chamada dentro da função setup.",
			"brief": "Atribui um nome para o gladiador."
		},
		"param": [
			{"name": "nome", "description": "String contendo o nome desejado do gladiador."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "setup(){\n    setName(\"Tutorius\");\n    setSTR(5);\n    setAGI(6);\n    setINT(5);\n    setSpritesheet(\"ddaf07e65372640df036f75be28a543e\");\n}",
		"explain": "Este exemplo demonstra a função setup de um gladiador, onde se atribui a ele o nome Tutorius, bem como os valores iniciais dos atributos básicos.",
		"seealso": [
			"setSTR",
			"setAGI",
			"setINT",
			"setSpritesheet",
		]
	},
	{
		"name": "setSTR",
		"ptname": "mudaFOR",
		"syntax": "void setSTR ( int valor );",
		"description": {
			"long": "Atribui um valor para o atributo Força (STR) do gladiador. Esta função somente pode ser chamada dentro da função setup.",
			"brief": "Atribui um valor para o atributo Força (STR) do gladiador."
		},
		"param": [
			{"name": "valor", "description": "Inteiro contendo o valor que será atribuído ao atributo Força."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "setup(){\n    setName(\"Tutorius\");\n    setSTR(5);\n    setAGI(6);\n    setINT(5);\n    setSpritesheet(\"ddaf07e65372640df036f75be28a543e\");\n}",
		"explain": "Este exemplo demonstra a função setup de um gladiador, onde se atribui a ele o valor do atributo Força, bem como os valores iniciais dos outros atributos básicos e o nome do gladiador.",
		"seealso": [
			"getSTR",
			"setName",
			"setAGI",
			"setINT",
			"setSpritesheet",
		]
	},
	{
		"name": "setAGI",
		"ptname": "mudaAGI",
		"syntax": "void setAGI ( int valor );",
		"description": {
			"long": "Atribui um valor para o atributo Agilidade (AGI) do gladiador. Esta função somente pode ser chamada dentro da função setup.",
			"brief": "Atribui um valor para o atributo Agilidade (AGI) do gladiador."
		},
		"param": [
			{"name": "valor", "description": "Inteiro contendo o valor que será atribuído ao atributo Agilidade."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "setup(){\n    setName(\"Tutorius\");\n    setSTR(5);\n    setAGI(6);\n    setINT(5);\n    setSpritesheet(\"ddaf07e65372640df036f75be28a543e\");\n}",
		"explain": "Este exemplo demonstra a função setup de um gladiador, onde se atribui a ele o valor do atributo Agilidade, bem como os valores iniciais dos outros atributos básicos e o nome do gladiador.",
		"seealso": [
			"getAGI",
			"setName",
			"setSTR",
			"setINT",
			"setSpritesheet",
		]
	},
	{
		"name": "setINT",
		"ptname": "mudaINT",
		"syntax": "void setINT ( int valor );",
		"description": {
			"long": "Atribui um valor para o atributo Inteligência (INT) do gladiador. Esta função somente pode ser chamada dentro da função setup.",
			"brief": "Atribui um valor para o atributo Inteligência (INT) do gladiador."
		},
		"param": [
			{"name": "valor", "description": "Inteiro contendo o valor que será atribuído ao atributo Inteligência."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "setup(){\n    setName(\"Tutorius\");\n    setSTR(5);\n    setAGI(6);\n    setINT(5);\n    setSpritesheet(\"ddaf07e65372640df036f75be28a543e\");\n}",
		"explain": "Este exemplo demonstra a função setup de um gladiador, onde se atribui a ele o valor do atributo Inteligência, bem como os valores iniciais dos outros atributos básicos e o nome do gladiador.",
		"seealso": [
			"getINT",
			"setName",
			"setAGI",
			"setSTR",
			"setSpritesheet",
		]
	},
	{
		"name": "setSpritesheet",
		"ptname": "mudaAparencia",
		"syntax": "void setSpritesheet ( char * hash );",
		"description": {
			"long": "Atribui uma aparência para o gladiador. A string recebida como parâmetro deverá ser uma string previamente fornecida pelo <a href='editor.php'>criador de gladiadores da gladcode</a>. Esta função somente pode ser chamada dentro da função setup. O criador de gladiadores é uma ferramenta que permite a personalização da aparência do gladiador. Após a etapa de criação da aparência, a ferramenta cadastra a folha de sprites do gladiador e fornece a <i>hash</i>, uma string que indica a folha de sprites cadastrada. Uma folha de sprites é um arquivo de imagem contendo todas as etapas de animação de um personagem, que quando executadas em sequência dão a impressão de movimento.",
			"brief": "Atribui ao gladiador uma aparência."
		},
		"param": [
			{"name": "hash", "description": "String contendo a hash cadastrada referente à folha de sprites do gladiador."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "setup(){\n    setName(\"Tutorius\");\n    setSTR(5);\n    setAGI(6);\n    setINT(5);\n    setSpritesheet(\"ddaf07e65372640df036f75be28a543e\");\n}",
		"explain": "Este exemplo demonstra a função setup de um gladiador, onde se atribui a ele a folha de sprites que determinará sua aparência, bem como os valores iniciais dos outros atributos básicos e o nome do gladiador.",
		"seealso": [
			"setName",
			"setINT",
			"setAGI",
			"setSTR",
		]
	},
	{
		"name": "getSTR",
		"ptname": "pegaFOR",
		"syntax": "int getSTR ( void );",
		"description": {
			"long": "Retorna o valor do atributo Força (STR) do gladiador.",
			"brief": "Retorna o valor do atributo Força (STR) do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Inteiro contendo o valor do atributo Força do gladiador.",
		"sample": "loop(){\n    if (getSTR() >= 15)\n        upgradeAGI();\n    else\n        upgradeSTR();\n    while(!moveTo(5,20));\n    while(!moveTo(20,5));\n}",
		"explain": "Este exemplo analisa o valor do atributo Força do gladiador, e caso ele seja pelo menos 15, chama a função upgradeAGI(), indicando que ele deseja aumentar sua Agilidade. Até isso acontecer, a prioridade de melhoria de atributo é para a Força. Enquanto isso, o gladiador move-se pela arena em diagonal.",
		"seealso": [
			"setSTR",
			"getAGI",
			"getINT",
			"upgradeSTR",
			"upgradeAGI",
			"moveTo",
		]
	},
	{
		"name": "getAGI",
		"ptname": "pegaAGI",
		"syntax": "int getAGI ( void );",
		"description": {
			"long": "Retorna o valor do atributo Agilidade (AGI) do gladiador.",
			"brief": "Retorna o valor do atributo Agilidade (AGI) do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Inteiro contendo o valor do atributo Agilidade do gladiador.",
		"sample": "loop(){\n    if (getAGI() >= 15)\n        upgradeINT();\n    else\n        upgradeAGI();\n    while(!moveTo(5,20));\n    while(!moveTo(20,5));\n}",
		"explain": "Este exemplo analisa o valor do atributo Agilidade do gladiador, e caso ele seja pelo menos 15, chama a função upgradeINT(), indicando que ele deseja aumentar sua Inteligência. Até isso acontecer, a prioridade de melhoria de atributo é para a Agilidade. Enquanto isso, o gladiador move-se pela arena em diagonal.",
		"seealso": [
			"setAGI",
			"getSTR",
			"getINT",
			"upgradeINT",
			"upgradeAGI",
			"moveTo",
		]
	},
	{
		"name": "getINT",
		"ptname": "pegaINT",
		"syntax": "int getINT ( void );",
		"description": {
			"long": "Retorna o valor do atributo Inteligência (INT) do gladiador.",
			"brief": "Retorna o valor do atributo Inteligência (INT) do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Inteiro contendo o valor do atributo Inteligência do gladiador.",
		"sample": "loop(){\n    if (getINT() >= 15)\n        upgradeSTR();\n    else\n        upgradeINT();\n    while(!moveTo(5,20));\n    while(!moveTo(20,5));\n}",
		"explain": "Este exemplo analisa o valor do atributo Inteligência do gladiador, e caso ele seja pelo menos 15, chama a função upgradeSTR(), indicando que ele deseja aumentar sua Força. Até isso acontecer, a prioridade de melhoria de atributo é para a Inteligência. Enquanto isso, o gladiador move-se pela arena em diagonal.",
		"seealso": [
			"setINT",
			"getSTR",
			"getAGI",
			"upgradeSTR",
			"upgradeINT",
			"moveTo",
		]
	},
	{
		"name": "upgradeSTR",
		"ptname": "melhoraFOR",
		"syntax": "void upgradeSTR ( void );",
		"description": {
			"long": "Altera a prioridade de melhoria de atributo do gladiador para Força. Esta melhoria acontece toda vez que o gladiador <a href='manual.php#xp-table'>sobe de nível</a>. Caso as funções upgradeAGI ou upgradeINT forem chamadas, o atributo melhorado não será mais a Força, até que upgradeSTR seja chamado novamente.",
			"brief": "Indica que o gladiador deve aprimorar o atributo Força."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "loop(){\n    if (getSTR() >= 15)\n        upgradeAGI();\n    else\n        upgradeSTR();\n    while(!moveTo(5,20));\n    while(!moveTo(20,5));\n}",
		"explain": "Este exemplo analisa o valor do atributo Força do gladiador, e caso ele seja pelo menos 15, chama a função upgradeAGI(), indicando que ele deseja aumentar sua Agilidade. Até isso acontecer, a prioridade de melhoria de atributo é para a Força. Enquanto isso, o gladiador move-se pela arena em diagonal.",
		"seealso": [
			"upgradeAGI",
			"upgradeINT",
			"getSTR",
			"moveTo",
		]
	},
	{
		"name": "upgradeAGI",
		"ptname": "melhoraAGI",
		"syntax": "void upgradeAGI ( void );",
		"description": {
			"long": "Altera a prioridade de melhoria de atributo do gladiador para Agilidade. Esta melhoria acontece toda vez que o gladiador <a href='manual.php#xp-table'>sobe de nível</a>. Caso as funções upgradeSTR ou upgradeINT forem chamadas, o atributo melhorado não será mais a Agilidade, até que upgradeAGI seja chamado novamente.",
			"brief": "Indica que o gladiador deve aprimorar o atributo Agilidade."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "loop(){\n    if (getAGI() >= 15)\n        upgradeINT();\n    else\n        upgradeAGI();\n    while(!moveTo(5,20));\n    while(!moveTo(20,5));\n}",
		"explain": "Este exemplo analisa o valor do atributo Agilidade do gladiador, e caso ele seja pelo menos 15, chama a função upgradeINT(), indicando que ele deseja aumentar sua Inteligência. Até isso acontecer, a prioridade de melhoria de atributo é para a Agilidade. Enquanto isso, o gladiador move-se pela arena em diagonal.",
		"seealso": [
			"upgradeSTR",
			"upgradeINT",
			"getAGI",
			"moveTo",
		]
	},
	{
		"name": "upgradeINT",
		"ptname": "melhoraINT",
		"syntax": "void upgradeINT ( void );",
		"description": {
			"long": "Altera a prioridade de melhoria de atributo do gladiador para Inteligência. Esta melhoria acontece toda vez que o gladiador <a href='manual.php#xp-table'>sobe de nível</a>. Caso as funções upgradeAGI ou upgradeSTR forem chamadas, o atributo melhorado não será mais a Inteligência, até que upgradeINT seja chamado novamente.",
			"brief": "Indica que o gladiador deve aprimorar o atributo Inteligência."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "loop(){\n    if (getINT() >= 15)\n        upgradeSTR();\n    else\n        upgradeINT();\n    while(!moveTo(5,20));\n    while(!moveTo(20,5));\n}",
		"explain": "Este exemplo analisa o valor do atributo Inteligência do gladiador, e caso ele seja pelo menos 15, chama a função upgradeSTR(), indicando que ele deseja aumentar sua Força. Até isso acontecer, a prioridade de melhoria de atributo é para a Inteligência. Enquanto isso, o gladiador move-se pela arena em diagonal.",
		"seealso": [
			"upgradeSTR",
			"upgradeAGI",
			"getINT",
			"moveTo",
		]
	},
	{
		"name": "moveForward",
		"ptname": "moveFrente",
		"syntax": "void moveForward ( float passos );",
		"description": {
			"long": "Faz com que o gladiador se mova para frente na arena uma distância específica. A distância será o número de passos determinado pelo parâmetro recebido. Esta função trava o gladiador na ação de movimento até que ele tenha completado todo o percurso.",
			"brief": "Move o gladiador para frente uma quantidade de passos."
		},
		"param": [
			{"name": "passos", "description": "Float contendo a quantidade de passos que o gladiador irá se deslocar."},
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "int start = 1;\r\n\r\nloop(){\r\n\tif (start){\r\n\t    while(!moveTo(7.5,12.5));\r\n\t    turnTo(12.5,12.5);\r\n\t    start = 0;\r\n\t}\r\n    moveForward(10);\r\n    turn(180);\r\n}",
		"explain": "No exemplo o gladiador se desloca até um ponto da arena, e a partir dali ele fica andando de um lado para o outro.",
		"seealso": [
			"moveTo",
			"turnTo",
			"turn",
			"stepForward",
		]
	},
	{
		"name": "moveTo",
		"ptname": "movePara",
		"syntax": "int moveTo ( float x, float y );",
		"description": {
			"long": "Faz com que o gladiador se mova para um ponto específico na arena definido pelos parâmetros x e y. Primeiramente o gladiador vira-se na direção do ponto e após isso começa a se locomover em sua direção. Caso o gladiador já esteja em cima do ponto informado, a função retorna 1.",
			"brief": "Move o gladiador em direção a um ponto."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto de destino."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto de destino."}
		],
		"treturn": "Retorna 0 caso o gladiador não esteja no ponto de destino, ou 1 caso contrário.",
		"sample": "int volta = 0;\nloop(){\n    if (!volta){\n        if (moveTo(23,12))\n            volta = 1;\n    }\n    else{\n        while(!moveTo(2,12));\n        volta = 0;\n    }\n}",
		"explain": "No exemplo o gladiador realiza um percurso de ida e volta na arena. A flag volta controla se o gladiador está no trajeto de ida ou volta. Note que no trajeto de volta, como a chamada para moveTo está dentro de um while, o gladiador fica preso nesse laço até que alcance seu destino.",
		"seealso": [
			"moveToTarget",
			"stepForward",
			"stepBack",
			"stepLeft",
			"stepRight",
			"turnTo",
		]
	},
	{
		"name": "moveToTarget",
		"ptname": "moveParaAlvo",
		"syntax": "int moveToTarget ( void );",
		"description": {
			"long": "Faz com que o gladiador se mova para o ponto da arena onde está o alvo fixado. Primeiramente o gladiador vira-se na direção do alvo e após isso começa a se locomover em sua direção. Caso o gladiador já esteja em cima do ponto do alvo, a função retorna 1.",
			"brief": "Move o gladiador em direção ao alvo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 0 caso o gladiador não esteja no ponto de destino, ou 1 caso contrário.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getSpeed",
			"getDistToTarget",
			"getLowHp",
			"attackRanged",
			"attackMelee",
			"getTargetX",
			"getTargetY",
			"getTargetSpeed",
			"turnLeft",
			"moveTo",
			"stepForward",
			"stepBack",
			"stepLeft",
			"stepRight",
		]
		
	},
	{
		"name": "stepForward",
		"ptname": "passoFrente",
		"syntax": "float stepForward ( void );",
		"description": {
			"long": "Faz com que o gladiador se mova para frente. Ele irá mover-se a maior distância que conseguir dentro de um intervalo de tempo da simulação (determinado pela sua <a href='manual.php#nav-glad'>velocidade de movimento</a>). A função irá retornar a distância percorrida neste processo.",
			"brief": "Move o gladiador para frente."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a distância percorrida como resultado da execução da função.",
		"sample": "int centro = 0;\nloop(){\n    if (!centro){\n        while(!moveTo(12.5,12.5));\n        centro = 1;\n    }\n    turnLeft(5);\n    stepForward();\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena, e uma vez que chegue lá começa a executar um percurso circular indefinidamente.",
		"seealso": [
			"moveTo",
			"moveToTarget",
			"turnLeft",
			"stepBack",
			"stepLeft",
			"stepRight",
		]
	},
	{
		"name": "stepBack",
		"ptname": "passoTras",
		"syntax": "float stepBack ( void );",
		"description": {
			"long": "Faz com que o gladiador se mova para trás. Ele executa o movimento de costas, sem rotacionar. O gladiador move-se a maior distância que conseguir dentro de um intervalo de tempo da simulação (determinado pela sua <a href='manual.php#nav-glad'>velocidade de movimento</a>). A função irá retornar a distância percorrida neste processo.",
			"brief": "Move o gladiador para trás."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a distância percorrida como resultado da execução da função.",
		"sample": "int centro = 0;\nloop(){\n    if (!centro){\n        while(!moveTo(12.5,12.5));\n        centro = 1;\n    }\n    turnRight(5);\n    stepBack();\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena, e uma vez que chegue lá começa a executar indefinidamente um percurso circular de costas.",
		"seealso": [
			"moveTo",
			"moveToTarget",
			"turnRight",
			"stepForward",
			"stepLeft",
			"stepRight",
		]
	},
	{
		"name": "stepLeft",
		"ptname": "passoEsquerda",
		"syntax": "float stepLeft ( void );",
		"description": {
			"long": "Faz com que o gladiador se mova para a esquerda. Ele executa o movimento de lado, sem rotacionar. O gladiador move-se a maior distância que conseguir dentro de um intervalo de tempo da simulação (determinado pela sua <a href='manual.php#nav-glad'>velocidade de movimento</a>). A função irá retornar a distância percorrida neste processo.",
			"brief": "Move o gladiador para esquerda."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a distância percorrida como resultado da execução da função.",
		"sample": "loop(){\n    if (getLastHitTime() <= 2)\n        stepLeft();\n    else if (getCloseEnemy())\n        attackRanged(getTargetX(), getTargetY());\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador tenta se esquivar locomovendo-se para a esquerda caso tenha recebido um ataque nos últimos 2 segundos. Caso contrário ele procura por um inimigo próximo e o ataca. Caso não encontre inimigos ele fica rotacionando no sentido anti-horário.",
		"seealso": [
			"getLastHitTime",
			"getCloseEnemy",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"turnLeft",
			"stepForward",
			"stepBack",
			"stepRight",
			"moveTo",
			"moveToTarget",
		]
	},
	{
		"name": "stepRight",
		"ptname": "passoDireita",
		"syntax": "float stepRight ( void );",
		"description": {
			"long": "Faz com que o gladiador se mova para a direita. Ele executa o movimento de lado, sem rotacionar. O gladiador move-se a maior distância que conseguir dentro de um intervalo de tempo da simulação (determinado pela sua <a href='manual.php#nav-glad'>velocidade de movimento</a>). A função irá retornar a distância percorrida neste processo.",
			"brief": "Move o gladiador para direita."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a distância percorrida como resultado da execução da função.",
		"sample": "loop(){\n    if (getLastHitTime() <= 2)\n        stepRight();\n    else if (getCloseEnemy())\n        attackRanged(getTargetX(), getTargetY());\n    else\n        turnRight(5);\n}",
		"explain": "No exemplo o gladiador tenta se esquivar locomovendo-se para a direita caso tenha recebido um ataque nos últimos 2 segundos. Caso contrário ele procura por um inimigo próximo e o ataca. Caso não encontre inimigos ele fica rotacionando no sentido horário.",
		"seealso": [
			"getLastHitTime",
			"getCloseEnemy",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"turnRight",
			"stepForward",
			"stepBack",
			"stepLeft",
			"moveTo",
			"moveToTarget",
		]
	},
	{
		"name": "turnLeft",
		"ptname": "viraEsquerda",
		"syntax": "float turnLeft ( float angulo );",
		"description": {
			"long": "Rotaciona o gladiador no sentido anti-horário uma quantidade de graus determinada pelo parâmetro. Caso o gladiador não consiga rotacionar a quantidade desejada em um único intervalo de tempo, ele irá rotacionar somente a quantidade que conseguir (determinado pelo atributo <a href='manual.php#nav-glad'>velocidade de rotação</a>). A função retorna a quantidade de graus que foi rotacionada de fato.",
			"brief": "Rotaciona o gladiador no sentido anti-horário."
		},
		"param": [
			{"name": "angulo", "description": "Float contendo o ângulo que deseja-se rotacionar."}
		],
		"treturn": "Float contendo o ângulo rotacionado como resultado da execução da função.",
		"sample": "setup(){\n    setName(\"Shooter\");\n    setSTR(4);\n    setAGI(8);\n    setINT(3);\n    upgradeAGI();\n}\nloop(){\n    while(!moveTo(12.5,12.5));\n    if(turnLeft(45) >= 45)\n        upgradeSTR();\n    if (getLowHp())\n        attackRanged(getTargetX(), getTargetY());\n}",
		"explain": "No exemplo o gladiador se move para o centro da arena. Caso já esteja lá, ele tenta rotacionar 45 graus enquanto procura por um inimigo com menos vida para atacar. Caso ele consiga rotacionar 45 a cada intervalo de tempo (por causa da velocidade de rotação alta, consequência de uma Agilidade alta), ele troca o atributo de melhoria para Força.",
		"seealso": [
			"setSTR",
			"setAGI",
			"setINT",
			"upgradeSTR",
			"upgradeAGI",
			"moveTo",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"getLowHp",
			"turnRight",
			"turn",
			"turnTo",
			"turnToTarget",
			"turnToAngle",
		]
	},
	{
		"name": "turnRight",
		"ptname": "viraDireita",
		"syntax": "float turnRight ( float angulo );",
		"description": {
			"long": "Rotaciona o gladiador no sentido horário uma quantidade de graus determinada pelo parâmetro. Caso o gladiador não consiga rotacionar a quantidade desejada em um único intervalo de tempo, ele irá rotacionar somente a quantidade que conseguir (determinado pelo atributo <a href='manual.php#nav-glad'>velocidade de rotação</a>). A função retorna a quantidade de graus que foi rotacionada de fato.",
			"brief": "Rotaciona o gladiador no sentido horário."
		},
		"param": [
			{"name": "angulo", "description": "Float contendo o ângulo que deseja-se rotacionar."}
		],
		"treturn": "Float contendo o ângulo rotacionado como resultado da execução da função.",
		"sample": "setup(){\n    setName(\"Shooter\");\n    setSTR(4);\n    setAGI(8);\n    setINT(3);\n    upgradeAGI();\n}\nloop(){\n    while(!moveTo(12.5,12.5));\n    if(turnRight(45) >= 45)\n        upgradeSTR();\n    if (getLowHp())\n        attackRanged(getTargetX(), getTargetY());\n}",
		"explain": "No exemplo o gladiador se move para o centro da arena. Caso já esteja lá, ele tenta rotacionar 45 graus enquanto procura por um inimigo com menos vida para atacar. Caso ele consiga rotacionar 45 a cada intervalo de tempo (por causa da velocidade de rotação alta, consequência de uma Agilidade alta), ele troca o atributo de melhoria para Força.",
		"seealso": [
			"setSTR",
			"setAGI",
			"setINT",
			"upgradeSTR",
			"upgradeAGI",
			"moveTo",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"getLowHp",
			"turnLeft",
			"turn",
			"turnTo",
			"turnToTarget",
			"turnToAngle",
		]
	},
	{
		"name": "turn",
		"ptname": "vira",
		"syntax": "void turn ( float angulo );",
		"description": {
			"long": "Rotaciona o gladiador uma quantidade de graus determinada pelo parâmetro. Caso o ângulo seja negativo o gladiador irá rotacionar no sentido anti-horário, ou no sentido horário caso seja positivo. O gladiador ficará travado na ação até que complete toda a rotação. Isto pode levar mais que um intervalo de tempo, dependendo do atributo <a href='manual.php#nav-glad'>velocidade de rotação</a>).",
			"brief": "Rotaciona o gladiador."
		},
		"param": [
			{"name": "angulo", "description": "Float contendo o ângulo que deseja-se rotacionar."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "loop(){\n    while(stepForward());\n    turn(180);\n}",
		"explain": "No exemplo o gladiador se move para frente até que encontre algum obstáculo, então rotaciona 180 graus no sentido horário. Este comportamento repetitivo fará com que o gladiador execute uma trajetória de vai-e-vem pela arena.",
		"seealso": [
			"moveForward",
			"stepForward",
			"turnLeft",
			"turnRight",
			"turnTo",
			"turnToTarget",
			"turnToAngle",
		]
	},
	{
		"name": "turnTo",
		"ptname": "viraPara",
		"syntax": "int turnTo ( float x, float y );",
		"description": {
			"long": "Rotaciona o gladiador fazendo com que ele fique virado na direção do ponto informado no parâmetro. Caso a rotação necessária resulte em uma quantidade de graus maior que o gladiador consiga rotacionar em um intervalo de tempo (determinado pelo atributo <a href='manual.php#nav-glad'>velocidade de rotação</a>), ele irá rotacionar somente a quantidade que conseguir e a função retornará 0. Caso esta função seja chamada em uma repetição, o gladiador irá continuar até que tenha concluido a rotação. Neste caso, a função retornará 1.",
			"brief": "Rotaciona o gladiador para um ponto."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto de destino."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto de destino."}
		],
		"treturn": "Retorna 0 caso não tenha concluído a rotação, ou 1 caso contrário.",
		"sample": "loop(){\n    while(!turnTo(25,25));\n    while(stepForward());\n    while(!turnTo(0,0));\n    while(stepForward());\n}",
		"explain": "No exemplo o gladiador se vira em direção ao canto da arena e se move na direção dele. Ao encontrar um obstáculo (ou alcançar o ponto), e se vira para o outro canto e se move até ele.",
		"seealso": [
			"turnToTarget",
			"stepForward",
			"turnLeft",
			"turnRight",
			"turn",
			"turnToAngle",
			"turnToLastHit",
			"turnToTarget",
		]
	},
	{
		"name": "turnToTarget",
		"ptname": "viraParaAlvo",
		"syntax": "int turnToTarget ( void );",
		"description": {
			"long": "Rotaciona o gladiador fazendo com que ele fique virado na direção do alvo fixado. Caso a rotação necessária resulte em uma quantidade de graus maior que o gladiador consiga rotacionar em um intervalo de tempo (determinado pelo atributo <a href='manual.php#nav-glad'>velocidade de rotação</a>), ele irá rotacionar somente a quantidade que conseguir e a função retornará 0. Caso esta função seja chamada em uma repetição, o gladiador irá continuar até que tenha concluido a rotação. Neste caso, a função retornará 1.",
			"brief": "Rotaciona o gladiador para o alvo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 0 caso não tenha concluído a rotação, ou 1 caso contrário.",
		"sample": "int start = 1;\nloop(){\n	if (start){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	if (getLowHp()){\n		if(doYouSeeMe()){\n			turnToTarget();\n			stepLeft();\n		}\n		else{\n			if (getAmbushTimeLeft() > 0)\n				assassinate(getTargetX(), getTargetY());\n			else\n				ambush();\n		}\n	}\n	else if (!start)\n		turn(50);\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena e então ficar buscando outros gladiadores. Quando encontra, caso o alvo esteja lhe observando ele desvia do caminho do mesmo, e após sair do campo de visão o gladiador lança as habilidade ambush e assassinate.",
		"seealso": [
			"getLowHp",
			"moveTo",
			"doYouSeeMe",
			"stepLeft",
			"getAmbushTimeLeft",
			"assassinate",
			"ambush",
			"turnLeft",
			"turnRight",
			"turn",
			"turnTo",
			"turnToAngle",
			"turnToLastHit",
		]
	},
	{
		"name": "turnToLastHit",
		"ptname": "viraFuiAcertado",
		"syntax": "void turnToLastHit ( void );",
		"description": {
			"long": "Rotaciona o gladiador fazendo com que ele fique virado na direção do ponto de onde originou o último ataque recebido. Caso a rotação necessária resulte em uma quantidade de graus maior que o gladiador consiga rotacionar em um intervalo de tempo (determinado pelo atributo <a href='manual.php#nav-glad'>velocidade de rotação</a>), ele irá travar na ação até que complete a rotação.",
			"brief": "Rotaciona o gladiador para a origem do último ataque recebido."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "loop(){\n    if (getHit()){\n        turnToLastHit();\n\t\tgetCloseEnemy();\n\r\n\t\tif(isTargetVisible())\n            attackRanged(getTargetX(), getTargetY());\n    }\n}",
		"explain": "No exemplo o gladiador espera até sofrer um ataque, e quando isso acontecer, ele se vira para a direção onde recebeu o ataque, fixa no alvo e começa a atacá-lo.",
		"seealso": [
			"getLowHp",
			"moveTo",
			"doYouSeeMe",
			"stepLeft",
			"getAmbushTimeLeft",
			"assassinate",
			"ambush",
			"getHit",
			"turnLeft",
			"turnRight",
			"turn",
			"turnTo",
			"turnToAngle",
		]
	},
	{
		"name": "turnToAngle",
		"ptname": "viraParaAngulo",
		"syntax": "void turnToAngle ( float angulo );",
		"description": {
			"long": "Rotaciona o gladiador de maneira que ele fique virado para o angulo informado no parâmetro. O ângulo informado deve seguir a <a href='manual.php#nav-sim'>convenção adotada pela simulação</a>. Caso a rotação necessária resulte em uma quantidade de graus maior que o gladiador consiga rotacionar em um intervalo de tempo (determinado pelo atributo <a href='manual.php#nav-glad'>velocidade de rotação</a>), ele irá travar na ação até que complete a rotação.",
			"brief": "Rotaciona o gladiador para um ângulo."
		},
		"param": [
			{"name": "angulo", "description": "Float contendo o ângulo de destino do gladiador."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "loop(){\n\tturnToAngle(0);\n\tmoveForward(10);\n\tturnToAngle(135);\n\tmoveForward(10);\n}",
		"explain": "No exemplo o gladiador se movimenta pela arena em um padrão do qual se move para cima e então para a diagonal baixo-direita.",
		"seealso": [
			"moveForward",
			"stepForward",
			"turnLeft",
			"turnRight",
			"turn",
			"turnTo",
			"turnToTarget",
			"turnToLastHit",
		]
	},
	{
		"name": "getX",
		"ptname": "pegaX",
		"syntax": "float getX ( void );",
		"description": {
			"long": "Retorna o valor da coordenada x do gladiador. O conjunto de coordenadas x e y formam o ponto de localização do gladiador na <a href='manual.php#nav-sim'>arena</a>.",
			"brief": "Retorna a coordenada x do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o valor da coordenada x do gladiador.",
		"sample": "float dx = 20, dy = 5;\nloop(){\n    if (getX() == 20 && getY() == 20)\n        dx = 5;\n    if (getX() == 5 && getY() == 5)\n        dx = 20;\n    if (getX() == 20 && getY() == 5)\n        dy = 20;\n    if (getX() == 5 && getY() == 20)\n        dy = 5;\n    moveTo(dx, dy);\n}",
		"explain": "No exemplo o gladiador utiliza as funções getX e getY para verificar sua posição na arena, e com isso ajustar para onde deseja se mover, resultando em um movimento em torno das bordas da arena.",
		"seealso": [
			"getY",
			"moveTo",
			"getTargetX",
			"getTargetY",
		]
	},
	{
		"name": "getY",
		"ptname": "pegaY",
		"syntax": "float getY ( void );",
		"description": {
			"long": "Retorna o valor da coordenada y do gladiador. O conjunto de coordenadas x e y formam o ponto de localização do gladiador na <a href='manual.php#nav-sim'>arena</a>.",
			"brief": "Retorna a coordenada y do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o valor da coordenada y do gladiador.",
		"sample": "float dx = 20, dy = 5;\nloop(){\n    if (getX() == 20 && getY() == 20)\n        dx = 5;\n    if (getX() == 5 && getY() == 5)\n        dx = 20;\n    if (getX() == 20 && getY() == 5)\n        dy = 20;\n    if (getX() == 5 && getY() == 20)\n        dy = 5;\n    moveTo(dx, dy);\n}",
		"explain": "No exemplo o gladiador utiliza as funções getX e getY para verificar sua posição na arena, e com isso ajustar para onde deseja se mover, resultando em um movimento em torno das bordas da arena.",
		"seealso": [
			"getX",
			"moveTo",
			"getTargetX",
			"getTargetY",
		]
	},
	{
		"name": "getHp",
		"ptname": "pegaPv",
		"syntax": "float getHp ( void );",
		"description": {
			"long": "Retorna a quantidade de pontos de vida restantes do gladiador.",
			"brief": "Retorna os pontos de vida do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a quantidade de pontos de vida restantes do gladiador.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getHp() > 20)\n            attackRanged(getTargetX(), getTargetY());\n        else\n            stepBack();\n    }\n    else\n        turnRight(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele foge de costas caso esteja com pouca vida, ou atira nele caso contrário.",
		"seealso": [
			"getLowHp",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"stepBack",
			"turnRight",
		]
	},
	{
		"name": "getAp",
		"ptname": "pegaPa",
		"syntax": "float getAp ( void );",
		"description": {
			"long": "Retorna a quantidade de pontos de habilidade restantes do gladiador.",
			"brief": "Retorna os pontos de habilidade do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a quantidade de pontos de habilidade restantes do gladiador.",
		"sample": "loop(){\n	if(getLowHp()){\n		if (getAp() >= 40)\n			fireball(getTargetX(), getTargetY());\n		else\n			attackRanged(getTargetX(), getTargetY());\n	}\n	else{\n		while(getX() != 12.5 || getY() != 12.5)\n			teleport(12.5,12.5);\n		turn(50);\n	}\n}",
		"explain": "No exemplo o gladiador se teleporta até o centro da arena, e então fica procurando por um inimigo. Quando o encontra lança fireball, ou um ataque à distância caso não tenha ap suficiente.",
		"seealso": [
			"getLowHp",
			"getTargetX",
			"getTargetY",
			"attackRanged",
			"turn",
			"teleport",
		]
	},
	{
		"name": "getSpeed",
		"ptname": "pegaVelocidade",
		"syntax": "float getSpeed ( void );",
		"description": {
			"long": "Retorna o valor do <a href='manual.php#nav-glad'>atributo velocidade</a> do gladiador, em passos por segundo (p/s).",
			"brief": "Retorna a velocidade do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a velocidade do gladiador em p/s.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getDistToTarget",
			"getLowHp",
			"attackRanged",
			"attackMelee",
			"getTargetX",
			"getTargetY",
			"getTargetSpeed",
			"turnLeft",
			"moveToTarget",
		]
	},
	{
		"name": "attackMelee",
		"ptname": "ataqueCorpo",
		"syntax": "void attackMelee ( void );",
		"description": {
			"long": "Realiza um ataque corpo-a-corpo. Todos gladiadores inimigos que estiverem à uma distância de até 1 passo e num arco de 180 graus da frente do gladiador atacante são acertados. Todos gladiadores acertados pelo ataque recebem dano igual ao valor do <a href='manual.php#nav-glad'>atributo dano corpo-a-copo</a> do gladiador atacante.",
			"brief": "Realiza um ataque corpo-a-corpo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getDistToTarget",
			"getLowHp",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"getSpeed",
			"getTargetSpeed",
			"turnLeft",
			"moveToTarget",
		]
	},
	{
		"name": "attackRanged",
		"ptname": "ataqueDistancia",
		"syntax": "int attackRanged ( float x, float y );",
		"description": {
			"long": "Vira o gladiador para o ponto definido pelas coordenadas x e y recebidas como parâmetro e então realiza um ataque de longa distância em direção ao ponto. Caso o gladiador não consiga terminar sua rotação até o ponto (de acordo com sua <a href='manual.php#nav-glad'>velocidade de rotação</a>, a função retorna 0 e o ataque não é realizado. Caso o ataque seja executado a função retorna 1. Quando o ataque é realizado, um projétil é arremessado a partir do ponto do gladiador atacante e percorre a arena com velocidade 15 passos por segundo (p/s) em direção ao ponto do alvo. Caso o projétil entre em contato com qualquer gladiador durante seu percurso, ele interrompe seu percurso e causa dano igual ao valor do <a href='manual.php#nav-glad'>atributo dano à distância</a> do gladiador que disparou o projétil no gladiador acertado.",
			"brief": "Realiza um ataque de longa distância."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto alvo."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto alvo."}
		],
		"treturn": "Retorna 1 caso o ataque foi realizado com sucesso, caso contrário retorna 0.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getHp() > 20)\n            while(!attackRanged(getTargetX(), getTargetY()));\n        else\n            stepBack();\n    }\n    else\n        turnRight(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele foge de costas caso esteja com pouca vida, ou atira nele caso contrário.",
		"seealso": [
			"getHp",
			"getLowHp",
			"getTargetX",
			"getTargetY",
			"stepBack",
			"turnRight",
			"attackMelee",
		]
	},
	{
		"name": "getLastHitTime",
		"ptname": "tempoFuiAcertado",
		"syntax": "float getLastHitTime ( void );",
		"description": {
			"long": "Retorna o tempo, em segundos, desde a última vez que o gladiador recebeu um ataque.",
			"brief": "Retorna o tempo desde o último ataque recebido."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o tempo desde a última vez que o gladiador recebeu um ataque.",
		"sample": "loop(){\n    if (getLastHitTime() <= 2.0)\n        stepLeft();\n    else if (getCloseEnemy())\n        attackRanged(getTargetX(), getTargetY());\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador tenta se esquivar locomovendo-se para a esquerda caso tenha recebido um ataque nos últimos 2 segundos. Caso contrário ele procura por um inimigo próximo e o ataca. Caso não encontre inimigos ele fica rotacionando no sentido anti-horário.",
		"seealso": [
			"getCloseEnemy",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"turnLeft",
			"stepLeft",
			"getLastHitAngle",
			"getHit",
		]
	},
	{
		"name": "getCloseEnemy",
		"ptname": "pegaInimigoProximo",
		"syntax": "int getCloseEnemy ( void );",
		"description": {
			"long": "Analisa o campo de visão do gladiador e caso haja pelo menos um inimigo seleciona o que estiver mais próximo do gladiador e retorna 1. Um inimigo selecionado desta maneira vira o alvo do gladiador, e todas funções que acessam informações sobre o alvo irão interagir com o gladiador selecionado. Caso não haja nenhum inimigo no campo de visão a função retorna 0.",
			"brief": "Procura um inimigo próximo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 0 caso não haja nenhum inimigo no campo de visão, caso contrário retorna 1.",
		"sample": "loop(){\n    if (getLastHitTime() <= 2.0)\n        stepLeft();\n    else if (getCloseEnemy())\n        attackRanged(getTargetX(), getTargetY());\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador tenta se esquivar locomovendo-se para a esquerda caso tenha recebido um ataque nos últimos 2 segundos. Caso contrário ele procura por um inimigo próximo e o ataca. Caso não encontre inimigos ele fica rotacionando no sentido anti-horário.",
		"seealso": [
			"getLastHitTime",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"turnLeft",
			"stepLeft",
			"getFarEnemy",
			"getLowHp",
			"getHighHp",
		]
	},
	{
		"name": "getFarEnemy",
		"ptname": "pegaInimigoDistante",
		"syntax": "int getFarEnemy ( void );",
		"description": {
			"long": "Analisa o campo de visão do gladiador e caso haja pelo menos um inimigo seleciona o que estiver mais distante do gladiador e retorna 1. Um inimigo selecionado desta maneira vira o alvo do gladiador, e todas funções que acessam informações sobre o alvo irão interagir com o gladiador selecionado. Caso não haja nenhum inimigo no campo de visão a função retorna 0.",
			"brief": "Procura um inimigo distante."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 0 caso não haja nenhum inimigo no campo de visão, caso contrário retorna 1.",
		"sample": "loop(){\n    if (getLastHitTime() <= 2.0)\n        stepLeft();\n    else if (getFarEnemy())\n        attackRanged(getTargetX(), getTargetY());\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador tenta se esquivar locomovendo-se para a esquerda caso tenha recebido um ataque nos últimos 2 segundos. Caso contrário ele procura por um inimigo distante e o ataca. Caso não encontre inimigos ele fica rotacionando no sentido anti-horário.",
		"seealso": [
			"getLastHitTime",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"turnLeft",
			"stepLeft",
			"getCloseEnemy",
			"getLowHp",
			"getHighHp",
		]
	},
	{
		"name": "getLowHp",
		"ptname": "pegaVidaBaixa",
		"syntax": "int getLowHp ( void );",
		"description": {
			"long": "Analisa o campo de visão do gladiador e caso haja pelo menos um inimigo seleciona o que possuir menor quantidade de pontos de vida e retorna 1. Um inimigo selecionado desta maneira vira o alvo do gladiador, e todas funções que acessam informações sobre o alvo irão interagir com o gladiador selecionado. Caso não haja nenhum inimigo no campo de visão a função retorna 0.",
			"brief": "Procura um inimigo com menos vida."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 0 caso não haja nenhum inimigo no campo de visão, caso contrário retorna 1.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getDistToTarget",
			"attackRanged",
			"attackMelee",
			"getTargetX",
			"getTargetY",
			"getSpeed",
			"getTargetSpeed",
			"turnLeft",
			"moveToTarget",
			"getCloseEnemy",
			"getFarEnemy",
			"getHighHp",
		]
	},
	{
		"name": "getHighHp",
		"ptname": "pegaVidaAlta",
		"syntax": "int getHighHp ( void );",
		"description": {
			"long": "Analisa o campo de visão do gladiador e caso haja pelo menos um inimigo seleciona o que possuir maior quantidade de pontos de vida e retorna 1. Um inimigo selecionado desta maneira vira o alvo do gladiador, e todas funções que acessam informações sobre o alvo irão interagir com o gladiador selecionado. Caso não haja nenhum inimigo no campo de visão a função retorna 0.",
			"brief": "Procura um inimigo com mais vida."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 0 caso não haja nenhum inimigo no campo de visão, caso contrário retorna 1.",
		"sample": "loop(){\n    if (getHighHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getDistToTarget",
			"attackRanged",
			"attackMelee",
			"getTargetX",
			"getTargetY",
			"getSpeed",
			"getTargetSpeed",
			"turnLeft",
			"moveToTarget",
			"getCloseEnemy",
			"getFarEnemy",
			"getLowHp",
		]
	},
	{
		"name": "getTargetX",
		"ptname": "pegaXAlvo",
		"syntax": "float getTargetX ( void );",
		"description": {
			"long": "Retorna o valor da coordenada x do gladiador selecionado como alvo. O conjunto de coordenadas x e y formam o ponto de localização do gladiador na <a href='manual.php#nav-sim'>arena</a>. Caso o gladiador não tenha selecionado um alvo antes de chamar esta função, ou o alvo não esteja dentro do campo de visão do gladiador esta função retorna -1.",
			"brief": "Retorna o valor da coordenada x do alvo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o valor da coordenada x do alvo, ou -1 caso o alvo não esteja dentro do campo de visão do gladiador.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getDistToTarget",
			"attackRanged",
			"attackMelee",
			"getTargetY",
			"getSpeed",
			"getTargetSpeed",
			"turnLeft",
			"moveToTarget",
		]
	},
	{
		"name": "getTargetY",
		"ptname": "pegaYAlvo",
		"syntax": "float getTargetY ( void );",
		"description": {
			"long": "Retorna o valor da coordenada y do gladiador selecionado como alvo. O conjunto de coordenadas x e y formam o ponto de localização do gladiador na <a href='manual.php#nav-sim'>arena</a>. Caso o gladiador não tenha selecionado um alvo antes de chamar esta função, ou o alvo não esteja dentro do campo de visão do gladiador esta função retorna -1.",
			"brief": "Retorna o valor da coordenada y do alvo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o valor da coordenada y do alvo, ou -1 caso o alvo não esteja dentro do campo de visão do gladiador.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getDistToTarget",
			"attackRanged",
			"attackMelee",
			"getTargetX",
			"getSpeed",
			"getTargetSpeed",
			"turnLeft",
			"moveToTarget",
		]
	},
	{
		"name": "isSafeHere",
		"ptname": "seguroAqui",
		"syntax": "int isSafeHere ( void );",
		"description": {
			"long": "A função analisa a posição ocupada pelo gladiador na arena. Caso na posição possua <a href='manual.php#nav-sim'>gás tóxico</a> a função retorna 0. Caso não haja retorna 1.",
			"brief": "Descobre se o gladiador está dentro da nuvem tóxica."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso a posição do gladiador esteja segura do gás tóxico, ou 0 caso contrário.",
		"sample": "float r = 1;\nloop(){\n	while(isSafeHere() && !moveTo(r,r));\n	while(isSafeHere() && !moveTo(25-r,r));\n	while(isSafeHere() && !moveTo(25-r,25-r));\n	while(isSafeHere() && !moveTo(r,25-r));\n	while (getDist(12.5,12.5) >= getSafeRadius() - 2)\n		moveTo(12.5,12.5);\n	r = 12.5 - getSafeRadius()/2;\n}",
		"explain": "No exemplo o gladiador se move contornando as bordas da arena. Ao detectar o gás tóxico ele começa a reduzir o tamanho de seu percuro até que eventualmente ele fica imóvel no centro da arena.",
		"seealso": [
			"moveTo",
			"getDist",
			"getSafeRadius",
			"getHp",
		]
	},
	{
		"name": "isSafeThere",
		"ptname": "seguroLa",
		"syntax": "int isSafeThere ( float x, float y );",
		"description": {
			"long": "A função analisa a posição determinada pelas coordenadas x e y recebidas como parâmetro. Caso na posição possua <a href='manual.php#nav-sim'>gás tóxico</a> a função retorna 0. Caso não haja retorna 1.",
			"brief": "Descobre se o ponto está dentro da nuvem tóxica."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto."}
		],
		"treturn": "Retorna 1 caso a posição do ponto esteja segura do gás tóxico, ou 0 caso contrário.",
		"sample": "#include&lt;stdlib.h&gt;\r\nfloat x,y;\r\nloop(){\r\n\t\r\n\tif ((getX() == x && getY() == y) || !isSafeThere(x,y)){\r\n\t\tx = (rand()%250)/10;\r\n\t\ty = (rand()%250)/10;\r\n\t}\r\n\t\r\n\tif(isSafeThere(x,y)){\r\n\t\tif (getAp() > 70 && getDist(x,y) > 2)\r\n\t\t\tteleport(x,y);\r\n\t\telse\r\n\t\t\tmoveTo(x,y);\r\n\t}\r\n}",
		"explain": "No exemplo o gladiador se teleporta e move pela arena para posições aleatórias, evitando as zonas cobertas por gás tóxico.",
		"seealso": [
			"getX",
			"getY",
			"getDist",
			"getAp",
			"teleport",
			"moveTo",
		]
	},
	{
		"name": "getSafeRadius",
		"ptname": "pegaRaioSeguro",
		"syntax": "float getSafeRadius ( void );",
		"description": {
			"long": "Retorna a distância do centro da arena até a borda da <a href='manual.php#nav-sim'>nuvem tóxica</a>. Como o gás se espalha de forma circular, comparar a distância do gladiador até o centro com o retorno desta função é uma maneira fácil de determinar o quão próximo o gladiador está de entrar na nuvem tóxica.",
			"brief": "Retorna o raio da área livre de nuvem tóxica."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a distância do centro da arena até a borda da nuvem tóxica.",
		"sample": "float r = 1;\nloop(){\n	while(isSafeHere() && !moveTo(r,r));\n	while(isSafeHere() && !moveTo(25-r,r));\n	while(isSafeHere() && !moveTo(25-r,25-r));\n	while(isSafeHere() && !moveTo(r,25-r));\n	while (getDist(12.5,12.5) >= getSafeRadius() - 2)\n		moveTo(12.5,12.5);\n	r = 12.5 - getSafeRadius()/2;\n}",
		"explain": "No exemplo o gladiador se move contornando as bordas da arena. Ao detectar o gás tóxico ele começa a reduzir o tamanho de seu percuro até que eventualmente ele fica imóvel no centro da arena.",
		"seealso": [
			"moveTo",
			"getDist",
			"isSafeHere",
			"getHp",
		]
	},
	{
		"name": "getTargetSpeed",
		"ptname": "pegaVelocidadeAlvo",
		"syntax": "float getTargetSpeed ( void );",
		"description": {
			"long": "Retorna o valor do <a href='manual.php#nav-glad'>atributo velocidade</a> do gladiador selecionado como alvo, em passos por segundo (p/s). Caso o gladiador não tenha selecionado um alvo antes de chamar esta função, ou o alvo não esteja dentro do campo de visão do gladiador esta função retorna 0.",
			"brief": "Retorna a velocidade do alvo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a velocidade do alvo, em p/s, ou 0 caso o alvo não esteja dentro do campo de visão do gladiador.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getDistToTarget",
			"getLowHp",
			"attackRanged",
			"attackMelee",
			"getTargetX",
			"getTargetY",
			"getSpeed",
			"turnLeft",
			"moveToTarget",
		]
	},
	{
		"name": "isTargetVisible",
		"ptname": "alvoVisivel",
		"syntax": "int isTargetVisible ( void );",
		"description": {
			"long": "Determina se o alvo selecionado pelo gladiador está no campo de visão, retornando 1 em caso afirmativo, ou 0 caso contrário. Esta função é útil pois ela verifica a visibilidade do alvo atual, sem precisar recorrer às funções que procuram um novo alvo.",
			"brief": "Descobre se alvo está no campo de visão e pode ser visto."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso o alvo esteja no campo de visão do gladiador, ou 0 caso contrário.",
		"sample": "loop(){\n    if (!isTargetVisible())\n        getLowHp();\n    else{\n        if (abs(getHead() - getTargetHead()) >= 90){\n            stepLeft();\n            turnToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n}",
		"explain": "No exemplo o gladiador verifica se o alvo está visível e caso não esteja procura um novo alvo com menos pontos de vida em seu campo de visão. Caso ainda esteja visível determina a direção relativa do alvo e se move de maneira a ficar olhando para as costas do alvo. Quando isso acontecer, o gladiador ataca o alvo.",
		"seealso": [
			"getLowHp",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"getHead",
			"getTargetHead",
			"stepLeft",
			"turnToTarget",
		]
	},
	{
		"name": "getHead",
		"ptname": "pegaDirecao",
		"syntax": "float getHead ( void );",
		"description": {
			"long": "Retorna o ângulo da direção que o gladiador está posicionado, de acordo com a <a href='manual.php#nav-sim'>convenção da simulação</a>.",
			"brief": "Retorna a direção do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o ângulo que o gladiador está direcionado.",
		"sample": "loop(){\n    if (!isTargetVisible())\n        getLowHp();\n    else{\n        if (abs(getHead() - getTargetHead()) >= 90){\n            stepLeft();\n            turnToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n}",
		"explain": "No exemplo o gladiador verifica se o alvo está visível e caso não esteja procura um novo alvo com menos pontos de vida em seu campo de visão. Caso ainda esteja visível determina a direção relativa do alvo e se move de maneira a ficar olhando para as costas do alvo. Quando isso acontecer, o gladiador ataca o alvo.",
		"seealso": [
			"getLowHp",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"isTargetVisible",
			"getTargetHead",
			"stepLeft",
			"turnToTarget",
		]
	},
	{
		"name": "getTargetHead",
		"ptname": "pegaDirecaoAlvo",
		"syntax": "float getTargetHead ( void );",
		"description": {
			"long": "Retorna o ângulo da direção que o alvo selecionado está posicionado, de acordo com a <a href='manual.php#nav-sim'>convenção da simulação</a>. O ângulo retornado é relativo à arena, e não ao gladiador. Caso o gladiador não tenha selecionado um alvo antes de chamar esta função, ou o alvo não esteja dentro do campo de visão do gladiador esta função retorna -1.",
			"brief": "Retorna a direção do alvo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o ângulo que o alvo está direcionado, ou -1 caso o alvo não esteja dentro do campo de visão do gladiador.",
		"sample": "loop(){\n    if (!isTargetVisible())\n        getLowHp();\n    else{\n        if (abs(getHead() - getTargetHead()) >= 90){\n            stepLeft();\n            turnToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n}",
		"explain": "No exemplo o gladiador verifica se o alvo está visível e caso não esteja procura um novo alvo com menos pontos de vida em seu campo de visão. Caso ainda esteja visível determina a direção relativa do alvo e se move de maneira a ficar olhando para as costas do alvo. Quando isso acontecer, o gladiador ataca o alvo.",
		"seealso": [
			"getLowHp",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"isTargetVisible",
			"getHead",
			"doYouSeeMe",
			"stepLeft",
			"turnToTarget",
		]
	},
	{
		"name": "doYouSeeMe",
		"ptname": "voceMeVe",
		"syntax": "int doYouSeeMe ( void );",
		"description": {
			"long": "Verifica se o alvo selecionado está enxergando o gladiador. Em caso afirmativo retorna 1, ou 0 caso contrário. O alvo enxerga o gladiador caso o gladiador esteja dentro do campo de visão dele. Caso o alvo selecionado não esteja no campo de visão do gladiador a função também retorna 0.",
			"brief": "Descobre se o alvo enxerga o gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso o gladiador esteja no campo de visão do alvo selecionado. Caso não esteja, ou o alvo selecionado não esteja no campo de visão do gladiador, retorna 0.",
		"sample": "loop(){\n    if (!isTargetVisible())\n        getLowHp();\n    else{\n        if (doYouSeeMe()){\n            stepLeft();\n            turnToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n}",
		"explain": "No exemplo o gladiador verifica se o alvo está visível e caso não esteja procura um novo alvo com menos pontos de vida em seu campo de visão. Caso ainda esteja visível verifica se o alvo enxerga o gladiador e se move de maneira a ficar olhando para as costas do alvo. Quando isso acontecer, o gladiador ataca o alvo.",
		"seealso": [
			"getLowHp",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"isTargetVisible",
			"stepLeft",
			"turnToTarget",
		]
	},
	{
		"name": "getHit",
		"ptname": "fuiAcertado",
		"syntax": "int getHit ( void );",
		"description": {
			"long": "Verifica se o gladiador recebeu um ataque desde a última vez que a função foi chamada, retornando 1 em caso afirmativo ou 0 caso contrário.",
			"brief": "Descobre se o gladiador foi atacado."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso o gladiador tenha recebido ataque no último intervalo de tempo, ou 0 caso contrário.",
		"sample": "loop(){\n    if (getHit()){\n        turnToLastHit();\n\t\tgetCloseEnemy();\n\r\n\t\tif(isTargetVisible())\n            attackRanged(getTargetX(), getTargetY());\n    }\n}",
		"explain": "No exemplo o gladiador fica aguardando até receber um ataque. Quando isso acontece ele se vira em direção ao atacante, e ao enxergar um alvo próximo ele desfere um ataque à distância contra ele.",
		"seealso": [
			"turnToAngle",
			"getLastHitAngle",
			"getCloseEnemy",
			"isTargetVisible",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"getLastHitTime",
		]
	},
	{
		"name": "getLastHitAngle",
		"ptname": "anguloFuiAcertado",
		"syntax": "float getLastHitAngle ( void );",
		"description": {
			"long": "Retorna o ângulo de onde partiu o último ataque que o gladiador recebeu. O ângulo retornado é <a href='manual.php#nav-sim'>relativo à arena</a>, e não ao gladiador. Caso o gladiador tenha sido acertado por um projétil o ângulo retornado será de onde veio o projétil.",
			"brief": "Retorna o ângulo de onde veio o último ataque."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o ângulo de onde partiu o último ataque recebido pelo gladiador.",
		"sample": "loop(){\n    if (getHit()){\n        turnToAngle(getLastHitAngle());\n\t\tgetCloseEnemy();\n\r\n\t\tif(isTargetVisible())\n            attackRanged(getTargetX(), getTargetY());\n    }\n}",
		"explain": "No exemplo o gladiador fica aguardando até receber um ataque. Quando isso acontece ele se vira em direção ao atacante, e ao enxergar um alvo próximo ele desfere um ataque à distância contra ele.",
		"seealso": [
			"turnToAngle",
			"getCloseEnemy",
			"isTargetVisible",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"getLastHitTime",
			"getHit",
		]
	},
	{
		"name": "howManyEnemies",
		"ptname": "quantosInimigos",
		"syntax": "int howManyEnemies ( void );",
		"description": {
			"long": "Retorna a quantidade de inimigos dentro do campo de visão do gladiador. Esta função não seleciona nenhum inimigo como alvo.",
			"brief": "Retorna a quantidade de inimigos no campo de visão."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Inteiro contendo a quantidade de inimigos presentes no campo de visão do gladiador.",
		"sample": "loop(){\n    if (getHit()){\n        turnToLastHit();\n        if (howManyEnemies() == 1 && getLowHp() && getTargetHealth() <= 0.3)\n            attackRanged(getTargetX(), getTargetY());\n        else{\n            while (howManyEnemies() > 1)\n                stepBack();\n        }\n    }\n    else{\n        while (!getHit() && !moveTo(20,5));\n        while (!getHit() && !moveTo(5,20));\n    }\n}",
		"explain": "No exemplo o gladiador se move em sentido diagonal pela arena, até receber um ataque. quando isso acontecer ele se vira na direção do ataque, recuando caso hajam mais de um inimigo no campo de visão. Caso haja somente um inimigo com até 30% de vida, o gladiador ataca ele. ",
		"seealso": [
			"turnToAngle",
			"getLastHitAngle",
			"getLowHp",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"getTargetHealth",
			"stepBack",
			"getHit",
			"moveTo",
		]
	},
	{
		"name": "getTargetHealth",
		"ptname": "pegaSaudeAlvo",
		"syntax": "float getTargetHealth ( void );",
		"description": {
			"long": "Retorna a vida que o alvo selecionado possui. O valor retornado não é a quantidade de pontos de vida do alvo, mas a razão entre a quantidade atual de pontos de vida e o total. Por consequência sempre será um valor entre 0 e 1. Embora não se saiba a quantidade exata de pontos de vida do alvo, pode-se ter uma noção de sua condição de saúde utilizando esta função.",
			"brief": "Retorna a vida do alvo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a razão entre a vida atual e a total do alvo (entre 0 e 1).",
		"sample": "loop(){\n    if (getHit()){\n        turnToAngle(getLastHitAngle());\n        if (howManyEnemies() == 1 && getLowHp() && getTargetHealth() <= 0.3)\n            attackRanged(getTargetX(), getTargetY());\n        else{\n            while (howManyEnemies() > 1)\n                stepBack();\n        }\n    }\n    else{\n        while (!getHit() && !moveTo(20,5));\n        while (!getHit() && !moveTo(5,20));\n    }\n}",
		"explain": "No exemplo o gladiador se move em sentido diagonal pela arena, até receber um ataque. quando isso acontecer ele se vira na direção do ataque, recuando caso hajam mais de um inimigo no campo de visão. Caso haja somente um inimigo com até 30% de vida, o gladiador ataca ele. ",
		"seealso": [
			"turnToAngle",
			"getLastHitAngle",
			"getLowHp",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"howManyEnemies",
			"stepBack",
			"getHit",
			"moveTo",
		]
	},
	{
		"name": "getDist",
		"ptname": "pegaDistancia",
		"syntax": "float getDist ( float x, float y );",
		"description": {
			"long": "Retorna a distância entre o ponto definido pelas coordenadas x e y informadas por parãmetro e a localização do gladiador.",
			"brief": "Retorna a distância até o ponto."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto."}
		],
		"treturn": "Float contendo a distância entre o gladiador e o ponto informado.",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDist(getTargetX(), getTargetY()) <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getLowHp",
			"attackRanged",
			"attackMelee",
			"getTargetX",
			"getTargetY",
			"getSpeed",
			"getTargetSpeed",
			"turnLeft",
			"moveToTarget",
		]
	},
	{
		"name": "getDistToTarget",
		"ptname": "pegaDistanciaAlvo",
		"syntax": "float getDist ( void );",
		"description": {
			"long": "Retorna a distância entre o ponto definido pelas coordenadas x e y do alvo fixado e a localização do gladiador.",
			"brief": "Retorna a distância até o alvo fixado."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo a distância entre o gladiador e o ponto definido pelas coordenadas x e y do alvo fixado. Caso o alvo não esteja visível, a função retorna um valor muito alto (9999).",
		"sample": "loop(){\n    if (getLowHp()){\n        if (getSpeed() > getTargetSpeed()){\n            if(getDistToTarget() <= 1)\n                attackMelee();\n            else\n                moveToTarget();\n        }\n        else\n            attackRanged(getTargetX(), getTargetY());\n    }\n    else\n        turnLeft(5);\n}",
		"explain": "No exemplo o gladiador fica girando até encontrar um inimigo, quando encontrar ele compara a sua velocidade com a do inimigo. Caso a do inimigo seja menor, o gladiador o persegue e desfere um ataque corpo-a-corpo quando alcançá-lo. Caso contrário realiza um ataque à distância.",
		"seealso": [
			"getLowHp",
			"attackRanged",
			"attackMelee",
			"getTargetX",
			"getTargetY",
			"getSpeed",
			"getTargetSpeed",
			"turnLeft",
			"moveToTarget",
		]
	},
	{
		"name": "getAngle",
		"ptname": "pegaAngulo",
		"syntax": "float getAngle ( float x, float y );",
		"description": {
			"long": "Retorna o ângulo entre o ponto definido pelas coordenadas x e y informadas por parãmetro e a localização do gladiador.",
			"brief": "Retorna o ângulo até o ponto."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto."}
		],
		"treturn": "Float contendo o ângulo entre o gladiador e o ponto informado.",
		"sample": "float v = 1;\nloop(){\n    while(getX() != v || getY() != v){\n        turnToAngle(getAngle(v,v));\n        stepForward();\n    }\n    if (v == 1)\n        v = 24;\n    else\n        v = 1;\n}",
		"explain": "No exemplo o gladiador se movimenta pela arena em diagonal.",
		"seealso": [
			"getX",
			"getY",
			"turnToAngle",
			"stepForward",
			"getDist",
		]
	},
	{
		"name": "fireball",
		"ptname": "bolaFogo",
		"syntax": "int fireball ( float x, float y );",
		"description": {
			"long": "Vira o gladiador para o ponto definido pelas coordenadas x e y recebidas como parâmetro e então lança a habilidade fireball em direção ao ponto. Caso o gladiador não consiga terminar sua rotação até o ponto (de acordo com sua <a href='manual.php#nav-glad'>velocidade de rotação</a>, a função retorna 0 e a habilidade não é lançada. Caso a habilidade seja lançada com sucesso a função retorna 1. Quando a habilidade é lançada, um projétil é arremessado a partir do ponto do gladiador atacante e percorre a arena com velocidade 10 passos por segundo (p/s) em direção ao ponto do alvo. Caso o projétil entre em contato com qualquer gladiador durante seu percurso, ele interrompe seu percurso e causa dano igual a 0.5 para cada ponto de <a href='manual.php#nav-glad'>inteligência</a> do gladiador que disparou o projétil no gladiador acertado. Além disso, todos os gladiadores num raio de 2 passos do ponto de impacto do projétil pegam fogo, recebendo o efeito <a href='manual.php#nav-efeito'>queimadura</a> durante 3 segundos. O dano total causado pela queimadura será de 1.5 para cada ponto de inteligência do gladiador que disparou o projétil. Gladiadores mais afastados do ponto central do impacto recebem proporcionalmente menos dano.",
			"brief": "Arremessa um projétil flamejante."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto alvo."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto alvo."}
		],
		"treturn": "Retorna 1 caso a habilidade tenha sido lançada com sucesso, caso contrário retorna 0.",
		"sample": "loop(){\n	if(getLowHp()){\n		if (getAp() >= 40)\n			fireball(getTargetX(), getTargetY());\n		else\n			attackRanged(getTargetX(), getTargetY());\n	}\n	else{\n		while(getX() != 12.5 || getY() != 12.5)\n			teleport(12.5,12.5);\n		turn(50);\n	}\n}",
		"explain": "No exemplo o gladiador se teleporta até o centro da arena, e então fica procurando por um inimigo. Quando o encontra lança fireball, ou um ataque à distância caso não tenha ap suficiente.",
		"seealso": [
			"getLowHp",
			"getAp",
			"getTargetX",
			"getTargetY",
			"attackRanged",
			"turn",
			"teleport",
		]
	},
	{
		"name": "teleport",
		"ptname": "teletransporte",
		"syntax": "int teleport ( float x, float y );",
		"description": {
			"long": "Transporta instantaneamente o gladiador para o ponto definido pelas coordenadas x e y recebidas como parâmetro. A direção do gladiador ao chegar ao ponto de destino dependerá do ponto onde ele estava antes de lançar a habilidade, como se ele estivesse olhando para o destino ao lançar a habilidade. A distância máxima que o gladiador poderá transpor ao lançar esta habilidade será de 5 passos + 1 passo para cada ponto de <a href='manual.php#nav-glad'>Inteligência</a> que ele possuir. Caso o ponto de destino seja mais distante que a distância máxima alcançada pela habilidade, a habilidade deslocará o gladiador a maior distância possível, levando em consideração uma trajetória em linha reta até o ponto de destino.",
			"brief": "Transporta instantaneamente o gladiador."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto alvo."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto alvo."}
		],
		"treturn": "Retorna 1 caso a habilidade tenha sido lançada com sucesso, caso contrário retorna 0.",
		"sample": "loop(){\n	if(getLowHp()){\n		if (getAp() >= 40)\n			fireball(getTargetX(), getTargetY());\n		else\n			attackRanged(getTargetX(), getTargetY());\n	}\n	else{\n		while(getX() != 12.5 || getY() != 12.5)\n			teleport(12.5,12.5);\n		turn(50);\n	}\n}",
		"explain": "No exemplo o gladiador se teleporta até o centro da arena, e então fica procurando por um inimigo. Quando o encontra lança fireball, ou um ataque à distância caso não tenha ap suficiente.",
		"seealso": [
			"getLowHp",
			"getAp",
			"getTargetX",
			"getTargetY",
			"attackRanged",
			"turn",
			"fireball",
		]
	},
	{
		"name": "charge",
		"ptname": "investida",
		"syntax": "int charge ( void );",
		"description": {
			"long": "Faz com que o gladiador corra em direção ao alvo selecionado. Caso o alvo não esteja visível, a função retorna 0. Caso contrário, o gladiador recebe o efeito <a href='manual.php#nav-efeito'>movimentação</a>, aumentando sua velocidade em 3x (ficando 4x a velocidade original). O gladiador então começará seu movimento em direção ao alvo selecionado. Caso o gladiador fique em distância corpo-a-corpo (1 passo) ou deixe de enxergar o alvo, seu movimento encerrará e ele perderá o efeito movimentação (fazendo sua velocidade voltar ao normal). Ao fim do movimento, caso estejá em distância de até 1 passo com o alvo, o gladiador imediatamente desfere um ataque corpo-a-copo. O alvo acertado por este ataque, além do dano normal do ataque, receberá o efeito movimentação, fazendo sua velocidade reduzir por 5s. A velocidade do alvo sob este efeito será de <a href='https://www.wolframalpha.com/input/?i=Plot%5BE%5E(-0.067+X),+%7BX,+0,+30%7D%5D' target='_blank'>Vel=e<sup>-0.067 STR</sup></a>, onde STR é a <a href='manual.php#nav-glad'>força</a> do gladiador.",
			"brief": "Corre em direção ao alvo e o ataca."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso a habilidade tenha sido lançada com sucesso, caso contrário retorna 0.",
		"sample": "int start = 1;\nloop(){\n	if (start){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	if(getLowHp())\n		charge();\n	else if (!start)\n		turn(50);\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena e então ficar buscando outros gladiadores. Quando encontra utiliza charge contra o inimigo.",
		"seealso": [
			"getLowHp",
			"getAp",
			"moveTo",
			"turn",
			"block",
		]
	},
	{
		"name": "block",
		"ptname": "bloqueio",
		"syntax": "int block ( void );",
		"description": {
			"long": "Causa o efeito <a href='manual.php#nav-efeito'>proteção</a> no gladiador, fazendo com que todo dano direto sofrido por ele seja reduzido. O dano será reduzido em uma porcentagem igual a (10 + STR/(STR+8)), onde STR é a <a href='manual.php#nav-glad'>força</a> do gladiador. Caso o gladiador não esteja enxergando a fonte do dano recebido, o efeito da proteção é reduzido pela metade.",
			"brief": "Aumenta a defesa do gladiador."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso a habilidade tenha sido lançada com sucesso, caso contrário retorna 0.",
		"sample": "int start = 1;\nloop(){\n	if (start){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	if(getLowHp()){\n		if (doYouSeeMe() && getBlockTimeLeft() <= 0)\n			block();\n		else\n			charge();\n	}\n	else if (!start)\n		turn(50);\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena e então ficar buscando outros gladiadores. Quando encontra, caso já esteja com block ativo ou o inimigo não o enxerga, usa a habilidade charge, caso contrário usa block.",
		"seealso": [
			"getLowHp",
			"getAp",
			"moveTo",
			"turn",
			"charge",
			"getBlockTimeLeft",
			"doYouSeeMe",
		]
	},
	{
		"name": "getBlockTimeLeft",
		"ptname": "tempoBloqueio",
		"syntax": "float getBlockTimeLeft ( void );",
		"description": {
			"long": "Retorna o tempo restante até que o efeito <a href='manual.php#nav-efeito'>proteção</a> expire.",
			"brief": "Retorna o tempo restante para expirar o efeito Proteção."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o tempo restante até o efeito proteção expirar.",
		"sample": "int start = 1;\nloop(){\n	if (start){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	if(getLowHp()){\n		if (doYouSeeMe() && getBlockTimeLeft() <= 0)\n			block();\n		else\n			charge();\n	}\n	else if (!start)\n		turn(50);\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena e então ficar buscando outros gladiadores. Quando encontra, caso já esteja com block ativo ou o inimigo não o enxerga, usa a habilidade charge, caso contrário usa block.",
		"seealso": [
			"getLowHp",
			"getAp",
			"moveTo",
			"turn",
			"charge",
			"block",
			"doYouSeeMe",
		]
	},
	{
		"name": "assassinate",
		"ptname": "assassinar",
		"syntax": "int assassinate ( float x, float y );",
		"description": {
			"long": "Dispara um ataque à distância no ponto definido pelas coordenadas x e y recebidas como parâmetro. O projétil arremessado viaja com velocidade 20 p/s. Caso o gladiador não possua um alvo fixado, ou o alvo não esteja visível a função retorna 0. Além do dano normal este ataque possui potencial de causar dano adicional. Caso o alvo não esteja enxergando o gladiador a habilidade causa dano adicional de (AGI), e caso o alvo esteja <a href='manual.php#nav-efeito'>atordoado</a> a habilidade também causa outro dano adicional de (AGI).",
			"brief": "Dispara um ataque que pode causar dano e efeito adicional no alvo."
		},
		"param": [
			{"name": "x", "description": "Float contendo o valor da coordenada x do ponto alvo."},
			{"name": "y", "description": "Float contendo o valor da coordenada y do ponto alvo."}
		],
		"treturn": "Retorna 1 caso a habilidade tenha sido lançada com sucesso, caso contrário retorna 0.",
		"sample": "int start = 1;\nloop(){\n	if (start){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	if (getLowHp()){\n		if(doYouSeeMe()){\n			turnToTarget();\n			stepLeft();\n		}\n		else{\n			if (getAmbushTimeLeft() > 0)\n				assassinate(getTargetX(), getTargetY());\n			else\n				ambush();\n		}\n	}\n	else if (!start)\n		turn(50);\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena e então ficar buscando outros gladiadores. Quando encontra, caso o alvo esteja lhe observando ele desvia do caminho do mesmo, e após sair do campo de visão o gladiador lança as habilidade ambush e assassinate.",
		"seealso": [
			"getLowHp",
			"moveTo",
			"doYouSeeMe",
			"turnToTarget",
			"stepLeft",
			"getAmbushTimeLeft",
			"turn",
			"ambush",
		]
	},
	{
		"name": "getAmbushTimeLeft",
		"ptname": "tempoEmboscada",
		"syntax": "float getAmbushTimeLeft ( void );",
		"description": {
			"long": "Retorna o tempo restante até que o efeito <a href='manual.php#nav-efeito'>invisibilidade</a> expire.",
			"brief": "Retorna o tempo restante para expirar o efeito Invisibilidade."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Float contendo o tempo restante até o efeito proteção expirar.",
		"sample": "int start = 1;\nloop(){\n	if (start){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	if (getLowHp()){\n		if(doYouSeeMe()){\n			turnToTarget();\n			stepLeft();\n		}\n		else{\n			if (getAmbushTimeLeft() > 0)\n				assassinate(getTargetX(), getTargetY());\n			else\n				ambush();\n		}\n	}\n	else if (!start)\n		turn(50);\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena e então ficar buscando outros gladiadores. Quando encontra, caso o alvo esteja lhe observando ele desvia do caminho do mesmo, e após sair do campo de visão o gladiador lança as habilidade ambush e assassinate.",
		"seealso": [
			"getLowHp",
			"getAp",
			"moveTo",
			"doYouSeeMe",
			"turnToTarget",
			"stepLeft",
			"turn",
			"ambush",
			"assassinate",
		]
	},
	{
		"name": "ambush",
		"ptname": "emboscada",
		"syntax": "int ambush ( void );",
		"description": {
			"long": "Faz com que o gladiador receba o efeito <a href='manual.php#nav-efeito'>invisibilidade</a> por 2 segundos, mais 0.4 segundos por cada ponto em <a href='manual.php#nav-glad'>agilidade</a> que o gladiador possuir. Caso o gladiador realize um ataque contra algum outro gladiador enquanto sob o efeito da invisibilidade, o gladiador acertado recebe o efeito <a href='manual.php#nav-efeito'>atordoado</a> durante 1 segundo. Todo ataque realizado contra um gladiador faz com que o gladiador que desferiu o ataque perca o efeito invisibilidade. Um gladiador atordoado não poderá agir até que o efeito termine, e ele é considerado como não estando enxergando nenhum outro gladiador presente na arena.",
			"brief": "Torna-se invisível e pode atordoar o alvo."
			},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso a habilidade tenha sido lançada com sucesso, caso contrário retorna 0.",
		"sample": "int start = 1;\nloop(){\n	if (start){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	if (getLowHp()){\n		if(doYouSeeMe()){\n			turnToTarget();\n			stepLeft();\n		}\n		else{\n			if (getAmbushTimeLeft() > 0)\n				assassinate(getTargetX(), getTargetY());\n			else\n				ambush();\n		}\n	}\n	else if (!start)\n		turn(50);\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena e então ficar buscando outros gladiadores. Quando encontra, caso o alvo esteja lhe observando ele desvia do caminho do mesmo, e após sair do campo de visão o gladiador lança as habilidade ambush e assassinate.",
		"seealso": [
			"getLowHp",
			"moveTo",
			"doYouSeeMe",
			"turnToTarget",
			"stepLeft",
			"getAmbushTimeLeft",
			"turn",
			"assassinate",
		]
	},
	{
		"name": "isStunned",
		"ptname": "estaAtordoado",
		"syntax": "int isStunned ( void );",
		"description": {
			"long": "A função verifica se o alvo selecionado pelo gladiador possui o efeito <a href='https://gladcode.tk/manual.php#nav-efeito'>atordoado</a>, retornando 1 em caso afirmativo ou 0 caso negativo ou o alvo não possa ser enxergado.",
			"brief": "Verifica se o alvo está atordoado."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso o alvo esteja no campo de visão do gladiador e possua o efeito atordoado, caso contrário retorna 0.",
		"sample": "int start = 1;\nloop(){\n	if (start){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	if (getLowHp()){\n		if(doYouSeeMe()){\n			turnToTarget();\n			stepLeft();\n		}\n		else{\n			if (getAmbushTimeLeft() > 0){\n				if (isStunned() && !doYouSeeMe())\n					assassinate(getTargetX(), getTargetY());\n				else if (getAmbushTimeLeft() <= 1)\n					attackRanged(getTargetX(), getTargetY());\n			}\n			else\n				ambush();\n		}\n	}\n	else if (!start)\n		turn(50);\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena e então ficar buscando outros gladiadores. Quando encontra, caso o alvo esteja lhe observando ele desvia do caminho do mesmo, e após sair do campo de visão o gladiador lança as habilidades ambush e assassinate.",
		"seealso": [
			"getLowHp",
			"getAp",
			"moveTo",
			"turnToTarget",
			"doYouSeeMe",
			"getTargetX",
			"getTargetY",
			"stepLeft",
			"getAmbushTimeLeft",
			"attackRanged",
			"turn",
			"ambush",
			"assassinate",
			"isProtected",
			"isBurning",
			"isRunning",
			"isSlowed",
		]
	},
	{
		"name": "isBurning",
		"ptname": "estaQueimando",
		"syntax": "int isBurning ( void );",
		"description": {
			"long": "A função verifica se o alvo selecionado pelo gladiador possui o efeito <a href='https://gladcode.tk/manual.php#nav-efeito'>queimadura</a>, retornando 1 em caso afirmativo ou 0 caso negativo ou o alvo não possa ser enxergado.",
			"brief": "Verifica se o alvo está queimando."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso o alvo esteja no campo de visão do gladiador e possua o efeito queimadura, caso contrário retorna 0.",
		"sample": "loop(){\n	if (getLowHp()){\n		if (isBurning()){\n			if (getAmbushTimeLeft() == 0)\n				ambush();\n			\n		}\n		else\n			attackRanged(getTargetX(), getTargetY());\n	}\n	else\n		turn(50);\n	while (!isSafeHere())\n		moveTo(12.5,12.5);\n	\n}",
		"explain": "No exemplo o gladiador procura um inimigo e o ataca. Caso ele esteja qeimando o gladiador usa ambush para se esconder (para evitar ser alvo da fireball). Caso não encontre ele fica girando para procurar. Caso o lugar que ele esteja tenha gás tóxico, ele se dirige ao centro até estar em um lugar seguro.",
		"seealso": [
			"getLowHp",
			"getAmbushTimeLeft",
			"ambush",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"turn",
			"isSafeHere",
			"moveTo",
			"isStunned",
			"isProtected",
			"isRunning",
			"isSlowed",
		]
	},
	{
		"name": "isProtected",
		"ptname": "estaProtegido",
		"syntax": "int isProtected ( void );",
		"description": {
			"long": "A função verifica se o alvo selecionado pelo gladiador possui o efeito <a href='https://gladcode.tk/manual.php#nav-efeito'>proteção</a>, retornando 1 em caso afirmativo ou 0 caso negativo ou o alvo não possa ser enxergado.",
			"brief": "Verifica se o alvo está protegido."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso o alvo esteja no campo de visão do gladiador e possua o efeito proteção, caso contrário retorna 0.",
		"sample": "loop(){\n	if (getCloseEnemy()){\n		if (isProtected() || getDistToTarget() < 2)\n			stepBack();\n		else\n			attackRanged(getTargetX(), getTargetY());\n	}\n	else\n		turn(50);\n}",
		"explain": "No exemplo o gladiador procura um por inimigo, e caso o encontre verifica se eles está muito próximo ou possui proteção. Em caso afirmativo o gladiador recua, caso contrário dispara um ataque. Caso não encontre inimigos o gladiador rotaciona.",
		"seealso": [
			"getCloseEnemy",
			"getDistToTarget",
			"getTargetX",
			"getTargetY",
			"stepBack",
			"attackRanged",
			"turn",
			"isStunned",
			"isBurning",
			"isRunning",
			"isSlowed",
		]
	},
	{
		"name": "isRunning",
		"ptname": "estaCorrendo",
		"syntax": "int isRunning ( void );",
		"description": {
			"long": "A função verifica se o alvo selecionado pelo gladiador possui o efeito <a href='https://gladcode.tk/manual.php#nav-efeito'>movimentação</a>, e este efeito é positivo, indicando que o alvo está correndo. Retorna 1 em caso afirmativo ou 0 caso negativo ou o alvo não possa ser enxergado.",
			"brief": "Verifica se o alvo está correndo."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso o alvo esteja no campo de visão do gladiador, possua o efeito movimentação e este efeito seja positivo, caso contrário retorna 0.",
		"sample": "loop(){\n	if (getCloseEnemy()){\n		if (isRunning() || getDistToTarget() < 2)\n			teleport(0,0);\n		else\n			fireball(getTargetX(), getTargetY());\n	}\n	else if (!getHit()){\n		turn(5);\n		stepForward();\n	}\n	else\n		turnToLastHit();\n}",
		"explain": "No exemplo o gladiador procura um inimigo, e caso encontre verifica se ele nao está muito próximo ou o inimigo esteja correndo (possivelmente em sua direção). Em caso afirmativo, lança a habilidade teleport para fugir, caso contrário lança fireball nele. Caso não encontre nenhum inimigo, o gladiador fica andando em círculos até enxergar um inimigo ou ser atingido.",
		"seealso": [
			"getCloseEnemy",
			"getDistToTarget",
			"getTargetX",
			"getTargetY",
			"teleport",
			"fireball",
			"getHit",
			"turn",
			"stepForward",
			"turnToAngle",
			"getLastHitAngle",
			"isStunned",
			"isBurning",
			"isProtected",
			"isSlowed",
		]
	},
	{
		"name": "isSlowed",
		"ptname": "estaLento",
		"syntax": "int isSlowed ( void );",
		"description": {
			"long": "A função verifica se o alvo selecionado pelo gladiador possui o efeito <a href='https://gladcode.tk/manual.php#nav-efeito'>movimentação</a>, e este efeito é negativo, indicando que o alvo está mais lento que o normal. Retorna 1 em caso afirmativo ou 0 caso negativo ou o alvo não possa ser enxergado.",
			"brief": "Verifica se o alvo está lento."
		},
		"param": [
			{"name": "void", "description": "A função não recebe parâmetros."}
		],
		"treturn": "Retorna 1 caso o alvo esteja no campo de visão do gladiador, possua o efeito movimentação e este efeito seja negativo, caso contrário retorna 0.",
		"sample": "int start = 1;\nloop(){\n	if (getLowHp()){\n		float d = getDistToTarget();\n		if (!isSlowed() && d > 2)\n			charge();\n		else if (d <= 1)\n			attackMelee();\n		else\n			moveToTarget();\n	}\n	else if (start || !isSafeHere()){\n		if(moveTo(12.5,12.5))\n			start = 0;\n	}\n	else\n		turn(5);\n}",
		"explain": "No exemplo o gladiador procura um inimigo. Caso o inimigo esteja distante e não esteja lento, o gladiador usa a habilidade charge para alcançá-lo. Caso contrário ele se move até o inimigo e quando estiver próximo a ele desfere um ataque corpo-a-copo. Caso não encontre o inimigo, o gladiador fica olhando em volta procurando. Quando o gás encostar no gladiador e no início da batalha, o gladiador se move para o centro da arena.",
		"seealso": [
			"getLowHp",
			"getDistToTarget",
			"charge",
			"attackMelee",
			"moveTo",
			"moveToTarget",
			"isSafeHere",
			"isStunned",
			"isBurning",
			"isProtected",
			"isRunning",
		]
	},
	{
		"name": "speak",
		"ptname": "fala",
		"syntax": "void speak ( char * mensagem );",
		"description": {
			"long": "Faz com que apareça próximo ao gladiador uma caixa com a mensagem enviada por parâmetro, representando a fala do gladiador. A mensagem fica visível por 3 segundos e então desaparece. Esta função não possui propósito para efeitos da simulação, e é útil somente para fins de debug no código ou efeito costmético durante a batalha",
			"brief": "Mostra um balão de fala com uma mensagem."
		},
		"param": [
			{"name": "nome", "description": "String contendo a mensagem a ser mostrada."}
		],
		"treturn": "A função não possui retorno (void).",
		"sample": "loop(){\r\n\tif (getHit()){\r\n\t\tspeak(\"Aieeee\");\r\n\t\tambush();\r\n\t\tturnToLastHit();\r\n\t}\r\n\telse if (getCloseEnemy()){\r\n\t\tattackRanged(getTargetX(), getTargetY());\r\n\t}\r\n\telse{\r\n\t\tif(getX() == 12.5 && getY() == 12.5){\r\n\t\t\tturn(30);\r\n\t\t\tspeak(\"Roda roda roda...\");\r\n\t\t}\r\n\t\telse\r\n\t\t\tmoveTo(12.5,12.5);\r\n\t}\r\n}",
		"explain": "No exemplo o gladiador se move até o centro da arena, e quando chega fica girando enquanto diz uma mensagem. Caso veja um inimigo, atira contra ele. Caso seja acertado, se vira em direção ao inimigo usa a habilidade ambush e fala outra mensagem.",
		"seealso": [
			"getHit",
			"ambush",
			"turnToLastHit",
			"getCloseEnemy",
			"attackRanged",
			"getTargetX",
			"getTargetY",
			"getX",
			"getY",
			"turn",
			"moveTo",
		]
	},

];

$(document).ready( function() {
	
	var found = false;
	var func = $('#vget').val();
	$.each(content, function(key,item) {
		if (item.name.toLowerCase() == func){
			found = true;
			load_content(item);
		}
	});
	
	if (!found){
		load_content(null);
	}
	
	if ($('#dict').length){
		loadDict($('#dict').html());
		$('#dict').remove()
	}
});

function load_content(item){
	if (!item){
		var func = $('#vget').val();
		$('#content-box').html("<h1>Função <i>"+ func +"</i> não encontrada.</h1><p><a href='docs.php'>Voltar para documentação</a></p>")
		return;
	}	
	
	$('title').html("gladCode - "+ item.name);
	$('#temp-name').html(item.name);
	$('#temp-syntax').html(item.syntax);
	$('#temp-description').html(item.description.long);
	
	$.each(item.param, function(k,i) {
		if (i.name == "void")
			$('#temp-param').append("<p>"+ i.description +"</p>");
		else
			$('#temp-param').append("<p class='syntax'>"+ i.name +"</p><p>"+ i.description +"</p>");
	});
	
	$('#temp-return').html(item.treturn);
	$('#temp-sample').html(item.sample);
	$('#temp-explain').html(item.explain);

	$.each(item.seealso, function(k,i) {
		$('#temp-seealso').append("<tr><td><a href='function.php?f="+ i.toLowerCase() +"'>"+ i +"</a></td><td>"+ findFunc(i).description.brief +"</td></tr>");
	});
}

function findFunc(name){
	for (var i in content){
		if (content[i].name == name)
			return content[i];
	}
	return false;
}

function loadDict(lang){
	if (lang == 'pt'){
		for (var i in content){
			var pattern = new RegExp("([^f=\\w])"+ content[i].name +"([\\W])", 'g');
			var replace = '$1'+ content[i].ptname +'$2';
			$('#content-box').html($('#content-box').html().replace(pattern, replace));
		}
		var pattern = new RegExp("<a href=\"function\\.php\\?f=([\\w]*?)\"", 'g');
		var replace = "<a href='function.php?f=$1&l=pt'";
		$('#content-box').html($('#content-box').html().replace(pattern, replace));
	}
}
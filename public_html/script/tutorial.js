tutoState = 23;
function showTutorial(){
	if (tutoState == 0){
		showDialog("Olá. Como você é novo aqui, eu gostaria de lhe ensinar alguns conceitos básicos sobre programação de gladiadores. Você aceita?",["Nunca","Agora não","SIM"]).then( function(data){
			if (data == "Nunca"){
				$.post("back_login.php", {
					action: "TUTORIAL",
				}).done( function(data){
					//console.log(data);
				});
			}
			else if (data == "SIM"){
				tutoState = 1;
				
				showDialog("Certo. Você já conhece um pouco da linguagem de programação C?",["Não","Sim"]).then( function(data){
					if (data == "Não"){
						showDialog("Então vou te recomendar uns vídeos para você aprender o básico da linguagem.",["Certo"]).then( function(data){
							if (data == "Certo")
								window.open("https://www.youtube.com/playlist?list=PLa75BYTPDNKaW9KYaTh5hE6O5OnMdBB51");

							showDialog("Para você exercitar os conceitos da linguagem C, você não precisa instalar nenhum programa, pode usar o <b>compilador C da gladCode</b>. Lá você vai encontrar também no <b>botão de ajuda (F12)</b> tutoriais sobre a linguagem.",["Adoraria","Não, obrigado"]).then( function(data){
								if (data == "Adoraria")
									window.location.href = "https://gladcode.tk/code.php";
								else{
									showMessage("Tudo bem. Então quando puder aprenda um pouco mais sobre a linguagem, pois será muito útil. Agora configure a aparência do seu gladiador").then( function(){
										$('#skin').click();
									});
								}
							});
						});
					}
					if (data == "Sim"){
						showMessage("Ok. Primeiramente configure a aparência do seu gladiador").then( function(){
							$('#skin').click();
						});
					}
				});
			}
		});
	}
	else if (tutoState == 1){
		showMessage("Configure a aparência do seu gladiador").then( function(){
			tutoState = 0;
			editor.setValue("");
			tutoState = 1;
			$('#skin').click();
		});
	}
	else if (tutoState == 2){
		showMessage("Cada gladiador pode executar uma ação a cada 0.1s, que é o intervalo da simulação. Na <b>função loop</b> é onde você diz o que seu gladiador deve fazer em cada intervalo de tempo da simulação").then( function(){
			showDialog("Experimente colocar a função <b>stepForward()</b> dentro das chaves da função loop. Quando terminar, clique no botão para testar seu gladiador. É o sexto botão no menu à esquerda, com o ícone de um controle de videogame",["Onde?","OK"]).then( function(data){
				if (data == "Onde?"){
					$('#test img').animate({'height':'90px'});
					setTimeout(function(){
						$('#test img').removeAttr('style');
					},2500);
				}
			});
		});
	}
	else if (tutoState == 3){
		var text = editor.getValue();
		if (text.search(/[\s(=]stepForward[\s]{0,1}\(\)[);\s]/g) == -1){
			showDialog("Você ainda não inseriu <b>stepForward()</b> dentro da função loop. Experimente digitar dentro das chaves da função",["Como?","OK"]).then( function(data){
				if (data == "Como?"){
					editor.setValue("loop(){\n    stepForward();\n}");
					showDialog("Vou lhe mostrar. Observe o editor de texto. Cada comando fica em uma linha, e no fim da linha precisa conter o <b>;</b>. Agora clique no botão para testar o gladiador.",["Ok. Entendi"]);
				}
			});
			tutoState = 2;
		}
		else{
			tutoState = 4;
			showMessage("Perfeito. Escolha um oponente para seu gladiador, e clique no botão para começar a batalha").then( function(){
				$('#test').click();
			});
		}
	}
	else if (tutoState == 4){
		showDialog("Maravilha! Você viu como seu gladiador ficou andando sem parar? A função <b>stepForward()</b> faz ele dar somente um passo para frente, mas como <b>loop</b> estava sendo executado a todo momento, ele ficou andando",["Hmmm"]).then( function(){
			editor.setValue("//controla quando o gladiador chegou no meio da arena \r\nint start=1;\r\n\r\nloop(){\r\n\tif (start){ //se ele ainda não chegou no meio\r\n\t\tmoveTo(12,12); //move em direção à posição 12,12\r\n\t\t//getX e getY capturam o X e Y do gladiador\r\n\t\tif (getX() == 12 && getY() == 12) //se X e Y é 12, chegou no destino\r\n\t\t\tstart = 0; //coloca 0 em start para dizer que não quer mais caminhar\r\n\t}\r\n\telse //caso start já esteja em 0\r\n\t\tturn(60); //fica rotacionando 60 graus\r\n}");
			tutoState = 5;
			showDialog("Agora analise esse código, tente entendê-lo e quando quiser teste o gladiador",["OK"]).then( function(){
			
			});
		});
	}
	else if (tutoState == 5){
		showDialog("Como pudemos ver, o gladiador se desloca até o centro da arena e fica girando. A função <b>moveTo</b> especifica para onde ele quer ir e da um passo em direção so destino. O gladiador sabe quando chegou por causa do <b>getX</b> e <b>getY</b>. E a função <b>turn</b> faz ele girar",["Entendi"]).then( function(){
			showDialog("Como a variável <b>start começa em 1</b>, o <b>else</b> da <b>linha 11</b> será ignorado nos primeiros momentos. Em todas etapas da simulação que start for 1, o gladiador irá se mover em direção ao centro. Quando ele chegar, <b>start fica 0</b>, garantindo que nas próximas execuções da função <b>loop</b>, o código entre no <b>else</b> e o gladiador fique girando",["Acho que saquei"]).then( function(){
				showDialog("Vamos fazer uma pequena modificação neste código. Você seria capaz de fazer com que o gladiador após chegar ao centro, fique indo e voltando do ponto 5,15 para o ponto 20,10?",["Não quero","Vou tentar"]).then( function(data){
					if (data == "Vou tentar")
						tutoState = 6;
					if (data == "Não quero"){
						tutoState = 7;
						showTutorial();
					}
				});
			});
		});
	}
	else if (tutoState == 6){
		showDialog("Interessante! Gostaria de ir para a próxima lição?",["Ainda não","Vamos lá"]).then( function(data){
			if (data == "Vamos lá"){
				tutoState = 7;
				showTutorial();
			}
		});
	}	
	else if (tutoState == 7){
		editor.setValue("//controla quando o gladiador chegou no meio da arena \r\nint start=1, vai=0;\r\n\r\nloop(){\r\n\tif (start){ //se ele ainda não chegou no meio\r\n\t\tmoveTo(12,12); //se move em direção à posição 12,12\r\n\t\t//getX e getY server para capturar o X e Y do gladiador\r\n\t\tif (getX() == 12 && getY() == 12) //se X e Y é 12, chegou no destino\r\n\t\t\tstart = 0; //coloca 0 em start para dizer que não quer mais caminhar\r\n\t}\r\n\telse{ //caso start já esteja em 0\r\n\t\tif (vai){ //verifica se vai ou vem\r\n\t\tif(moveTo(5,15)) //move e testa se chegou no ponto\r\n\t\t\t\tvai = 0; //diz que é hora do vem\r\n\t\t}\r\n\t\telse{ //se está na etapa do vem\r\n\t\t\tif(moveTo(20,10)) \r\n\t\t\t\tvai = 1; //diz que é hora do vai\r\n\t\t}\r\n\t}\r\n}");
		showDialog("Ok. Modifiquei seu código. Pode conferir se sua solução era mais ou menos assim. Teste o gladiador para prosseguir",["OK"]).then( function(data){
			tutoState = 8;
		});
	}	
	else if (tutoState == 8){
		showDialog("Agora vamos detectar seus oponentes. Todo gladiador consegue enxergar 60 graus ao seu redor e à uma distância de 9 passos. As funções <b>getLowHp</b>, <b>getHighHp</b>, <b>getCloseEnemy</b> e <b>getFarEnemy</b> além de detectarem inimigos no campo de visão do gladiador, ainda fixam a atenção do gladiador no oponente detectado, permitindo o uso de outras funções que requerem um alvo",["Conhecer funções","Certo"]).then( function(data){
			if (data == "Conhecer funções")
				window.open("https://gladcode.tk/docs.php#nav-sense");
			
			showDialog("Gostaria que você usasse uma destas funções para detectar um oponente. que tal colocar uma delas dentro de uma condição (if)? Assim você pode controlar o que fazer caso o gladiador encontre um oponente. Quando tiver concluido clique no botão para testar o gladiador",["Mostrar como","Vou tentar"]).then( function(data){
				if (data == "Mostrar como"){
					editor.setValue("int start=1;\r\n\r\nloop(){\r\n\tif (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\t//detecta se tem inimigo próximo, e fixa a atenção nele\r\n\tif (getCloseEnemy()){\r\n\t\t//aqui vamos colocar o que fazer quando detectar inimigo\r\n\t}\r\n}");
				}
			});
			tutoState = 9;
			
		});
	}
	else if (tutoState == 9){
		var text = editor.getValue();
		if (text.search(/[(\s=](getCloseEnemy|getFarEnemy|getLowHp|getHighHp)[\s]{0,1}\(\)[=!<>;)\s]/g) == -1){
			showDialog("Você ainda não inseriu nenhuma das funções apresentadas. Quer uma ajuda?",["Esqueci", "Sim, ajuda","Deixa comigo"]).then( function(data){
				if (data == "Sim, ajuda")
					window.open("https://gladcode.tk/docs.php#nav-sense");
				else if (data == "Esqueci"){
					tutoState = 8;
					showTutorial();
				}
			});
		}
		else{
			showDialog("Agora vamos aprender a atacar. Com um alvo fixado, seu gladiador pode usar <b>getTargetX</b> e <b>getTargetY</b> para saber a posição do alvo",["Como assim?","Fácil"]).then( function(data){
				if (data == "Como assim?")
					window.open("https://gladcode.tk/docs.php#nav-sense");

				showDialog("Sabendo a posição, usamos <b>attackRanged</b> para atirar com o arco. Dentro dos parênteses da função precisa colocar as coordenadas X e Y de onde você quer atirar. Tente atirar na posição do alvo e teste seu gladiador",["Me mostre como","OK"]).then( function(data){
					if (data == "Me mostre como"){
						editor.setValue("int start=1;\r\n\r\nloop(){\r\n\tif (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\t//detecta se tem inimigo próximo, e fixa a atenção nele\r\n\tif (getCloseEnemy()){\r\n\t\tattackRanged(getTargetX(), getTargetY());\r\n\t}\r\n}");
					}
					tutoState = 10;
				});
				
			});
		}
	}	
	else if (tutoState == 10){
		var text = editor.getValue();
		if (text.search(/[\s]attackRanged[\s]{0,1}\([\s]*getTargetX[\s]{0,1}\(\)[\s]*,[\s]*getTargetY[\s]{0,1}\(\)[\s]*\)[;\s]/g) == -1 && text.search(/([\w]+)[\s]{0,1}=[\s]{0,1}getTarget[XY][\s]{0,1}\(\);[\w\W]*([\w]+)[\s]{0,1}=[\s]{0,1}getTarget[XY][\s]{0,1}\(\);[\w\W]*\n[\s]*attackRanged[\s]{0,1}\([\s]*\1[\s]*,[\s]*\2[\s]*\);/g) == -1){
			showDialog("Antes de testar você deve adicionar o código que permite que o gladiador ataque. É só colocar a função <b>attackRanged</b> dentro do da condição que detectou o alvo, e como parâmetro do attackRanged colocar as funções <b>getTargetX</b> e <b>getTargetY</b>",["Me mostre","Vou tentar"]).then( function(data){
				if (data == "Me mostre")
					editor.setValue("int start=1;\r\n\r\nloop(){\r\n\tif (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\t//detecta se tem inimigo próximo, e fixa a atenção nele\r\n\tif (getCloseEnemy()){\r\n\t\tattackRanged(getTargetX(), getTargetY()); //Ataca o alvo no ponto informado\r\n\t}\r\n}");
			});
		}
		else{
			tutoState = 11;
			$('#test').click();
		}
	}	
	else if (tutoState == 11){
		showDialog("Perfeito. Agora você tem um gladiador que sabe se defender. Caso queira atacar corpo-a-corpo, pode usar <b>attackMelee</b>",["Referência","Certo"]).then( function(data){
			if (data == "Referência")
				window.open("https://gladcode.tk/function.php?f=attackmelee");
			
			showDialog("Seu gladiador precisa também dar valor à vida dele. Vamos aprender algumas funções para esse fim. A primeira é <b>getHit</b>, que detecta se o gladiador foi ferido. Atualize seu código de maneira que o gladiador tome uma atitude quando for ferido. Após, teste o gladiador",["getHit","Vou tentar"]).then( function(data){
				if (data == "getHit")
					window.open("https://gladcode.tk/function.php?f=gethit");
				tutoState = 12;
			});
			
		});
	}	
	else if (tutoState == 12){
		var text = editor.getValue();
		if (text.search(/[(=][\s]*getHit[\s]{0,1}\(\)[\s]*[><!=;)]/g) == -1){
			showDialog("Antes de testar você deve adicionar uma condição que permita que o gladiador verifique se foi ferido. Você deve usar <b>getHit</b> para este fim. Coloque-o dentro de uma condição (if) para fazer o teste. Se ele for ferido, faça algo, por exemplo, <b>virar 180 graus</b>",["getHit","Me ajuda","Beleza!"]).then( function(data){
				if (data == "getHit")
					window.open("https://gladcode.tk/function.php?f=gethit");
				if (data == "Me ajuda"){
					showDialog("Ok. Vou te ajudar nessa. Dê uma olhada no código e tente entender o que ele faz",["OK. Valeu!"]).then( function(data){});
				
					editor.setValue("int start=1;\r\nloop(){\r\n\tif (getHit()) //Verifica se o gladiador foi ferido\r\n\t\tturn(180); //vira 180g caso tenha sido ferido\r\n\telse if (getCloseEnemy()) //se nao foi ferido, verifica se tem inimigo próximo\r\n\t\tattackRanged(getTargetX(), getTargetY()); //ataca alvo se encontrou inimigo\r\n\telse if (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\telse\r\n\t\tturn(60);\r\n}");
				}
			});
		}
		else{
			tutoState = 13;
			$('#test').click();
		}
	}	
	else if (tutoState == 13){
		showDialog("Ok, agora o gladiador sabe quando foi ferido. Vamos fazer ele reagir a isso. Quando ele se ferir, você pode fazer com que ele se vire na direção de onde veio a agressão, dessa maneira fica mais fácil revidar. a função <b>turnToLastHit</b> serve para fazer o gladiador se virar para onde recebeu o ataque. Modifique esse trecho do código e teste o gladiador",["Referência","OK"]).then( function(data){
			if (data == "Referência")
				window.open("https://gladcode.tk/function.php?f=turntolasthit");
			tutoState = 14;			
		});
	}	
	else if (tutoState == 14){
		var text = editor.getValue();
		if (text.search(/[(=][\s]*getHit[\s]{0,1}\(\)[\s]*[><!=;)][\w\W]*turnToLastHit[\s]{0,1}\(\)/g) == -1){
			showDialog("Para avançar você precisa alterar seu código para usar a função <b>turnToLastHit</b> dentro de uma condição que testa o resultado da função <b>getHit</b>. Desta maneira, o gladiador verifica se foi ferido, e em caso afirmativo, se vira para o agressor",["Han??","Não sei como","Entendi"]).then( function(data){
				if (data == "Han??")
					window.open("https://gladcode.tk/function.php?f=turntolasthit");
				if (data == "Não sei como"){
					showDialog("Tudo bem. Estamos aqui para aprender. Analise bem o código e tente entender o que ele faz",["Obrigado"]).then( function(data){});
				
					editor.setValue("int start=1;\r\nloop(){\r\n\tif (getHit()) //Verifica se o gladiador foi ferido\r\n\t\tturnToLastHit(); //vira em direção ao agressor\r\n\telse if (getCloseEnemy()) //se nao foi ferido, verifica se tem inimigo próximo\r\n\t\tattackRanged(getTargetX(), getTargetY()); //ataca alvo se encontrou inimigo\r\n\telse if (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\telse\r\n\t\tturn(60);\r\n}");
				}
			});
		}
		else{
			tutoState = 15;
			$('#test').click();
		}
	}	
	else if (tutoState == 15){
		showDialog("Ótimo. Seu gladiador está ficando cada vez mais inteligente. Para concluir o assunto sobrevivência é importante falar sobre o <b>gás tóxico</b>. Após certo tempo, começa a emanar das bordas da arena uma nuvem mortal que causa dano em todos que estiverem em contato. O único refúgio é se dirigir para o centro na medida que a nuvem toma conta da periferia da arena.",["Hmm, perigoso"]).then( function(data){
			showDialog("Um gladiador consegue saber se sua vida está ameaçada pela nuvem utilizando a função <b>isSafeHere</b>. Gostaria que você adicionasse mais uma condição no código para fazer o gladiador evitar estas zonas perigosas. Teste o gladiador para prosseguir",["Referência","Vou tentar"]).then( function(data){
				if (data == "Referência")
					window.open("https://gladcode.tk/function.php?f=issafehere");
				tutoState = 16;
			});
		});
		
	}	
	else if (tutoState == 16){
		var text = editor.getValue();
		if (text.search(/[!(\s]isSafeHere[\s]{0,1}\(\)[\s)=<>]/g) == -1){
			showDialog("Ei! Voçê está esquecendo de colocar a função <b>isSafeHere</b>. Sem ela seu gladiador poderá morrer envenenado.",["Estou perdido","Verdade"]).then( function(data){
				if (data == "Estou perdido"){
					showDialog("Está certo. Vou lhe mostrar o código. Mas talvez você queira dar uma estudada no que já foi visto.",["É melhor","Estou bem"]).then( function(data){
						if (data == "É melhor")
							window.open("https://gladcode.tk/function.php?f=issafehere");
					});
				
					editor.setValue("int start=1;\r\nloop(){\r\n\tif (!isSafeHere()) //testa se o gladiador está em cima da nuvem\r\n\t\tmoveTo(12.5,12.5); //foge da nuvem, em direção ao centro\r\n\telse if (getHit())\r\n\t\tturnToLastHit();\r\n\telse if (getCloseEnemy())\r\n\t\tattackRanged(getTargetX(), getTargetY());\r\n\telse if (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\telse\r\n\t\tturn(60);\r\n}");
				}
			});
		}
		else{
			tutoState = 17;
			$('#test').click();
		}
	}	
	else if (tutoState == 17){
		showDialog("Agora por fim iremos aprender sobre as habilidades dos gladiadores. As habilidades são ações especiais que gastam o recurso <b>pontos de habilidade</b> (ap) para serem usados. As habilidades possibilitam efeitos incríveis e poderosos aos gladiadores",["Quero aprender mais","Entendi"]).then( function(data){
			if (data == "Quero aprender mais")
				window.open("https://gladcode.tk/manual.php#nav-hab");
			
			showDialog("Vamos usar a função <b>fireball</b> para fazer com que o gladiador lance uma bola de fogo no inimigo. A função funciona parecido com <b>attackRanged</b>. Você precisa somente fornecer as coordenadas <b>X</b> e <b>Y</b> do ponto onde deseja lançar a habilidade. Modifique seu cõdigo trocando attackRanged por fireball, e teste o gladiador",["Referência","OK"]).then( function(data){
				if (data == "Referência")
					window.open("https://gladcode.tk/function.php?f=fireball");
				tutoState = 18;
			});
			
		});
	}	
	else if (tutoState == 18){
		var text = editor.getValue();
		if (text.search(/[\s]fireball[\s]{0,1}\([\s]*getTargetX[\s]{0,1}\(\)[\s]*,[\s]*getTargetY[\s]{0,1}\(\)[\s]*\)[;\s]/g) == -1 && text.search(/([\w]+)[\s]{0,1}=[\s]{0,1}getTarget[XY][\s]{0,1}\(\);[\w\W]*([\w]+)[\s]{0,1}=[\s]{0,1}getTarget[XY][\s]{0,1}\(\);[\w\W]*\n[\s]*fireball[\s]{0,1}\([\s]*\1[\s]*,[\s]*\2[\s]*\);/g) == -1){
			showDialog("Você deveria inserir a função <b>fireball</b> em seu código. Ela fará seu gladiador obliterar os oponentes. Precisa de ajuda?",["fireball?","Sim, preciso","Não, valeu"]).then( function(data){
				if (data == "fireball?")
					window.open("https://gladcode.tk/function.php?f=fireball");
				if (data == "Sim, preciso"){
					editor.setValue("int start=1;\r\nloop(){\r\n\tif (!isSafeHere())\r\n\t\tmoveTo(12.5,12.5);\r\n\telse if (getHit())\r\n\t\tturnToLastHit();\r\n\telse if (getCloseEnemy())\r\n\t\tfireball(getTargetX(), getTargetY()); //arremessa bola de fogo\r\n\telse if (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\telse\r\n\t\tturn(60);\r\n}");
				}
			});
		}
		else{
			tutoState = 19;
			$('#test').click();
		}
	}	
	else if (tutoState == 19){
		showDialog("Muito bem! O uso das habilidades é essencial para o sucesso do gladiador. Aprenda sobre todas elas para descobrir suas forças e fraquezas.",["Quero aprender","Pensarei a respeito"]).then( function(data){
			if (data == "Quero aprender")
				window.open("https://gladcode.tk/manual.php#nav-hab");
			showDialog("Agora vamos aprender sobre a habilidade <b>teleport</b>. Ela é muito útil quando seu gladiador se vê em uma posição indesejada. Usando o teleport seu gladiador instantaneamente se transporta para um ponto qualquer. Vamos mudar o código para que o gladiador se transporte para a posição 5,5 quando for ferido (dentro da condição do <b>getHit</b>). Teste o gladiador após a mudança",["Referência","OK"]).then( function(data){
				if (data == "Referência")
					window.open("https://gladcode.tk/function.php?f=teleport");
				tutoState = 20;
			});
		});
	}	
	else if (tutoState == 20){
		var text = editor.getValue();
		if (text.search(/[\s]teleport[\s]{0,1}\([\w\d\s]+,[\w\d\s]+\)[;\s]/g) == -1){
			showDialog("Você deveria inserir a função <b>teleport</b> em seu código. Ela faz com que seu gladiador instantaneamente fuja quando for ferido. Precisa de ajuda?",["teleport?","Sim, preciso","Não, valeu"]).then( function(data){
				if (data == "teleport?")
					window.open("https://gladcode.tk/function.php?f=teleport");
				if (data == "Sim, preciso"){
					editor.setValue("int start=1;\r\nloop(){\r\n\tif (!isSafeHere())\r\n\t\tmoveTo(12.5,12.5);\r\n\telse if (getHit())\r\n\t\tteleport(5,5); //foge para posição 5,5 quando for ferido\r\n\telse if (getCloseEnemy())\r\n\t\tfireball(getTargetX(), getTargetY());\r\n\telse if (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\telse\r\n\t\tturn(60);\r\n}");
				}
			});
		}
		else{
			tutoState = 21;
			$('#test').click();
		}
	}	
	else if (tutoState == 21){
		showDialog("Ótimo! Você aprendeu como se usa o teleport, mas se você quer ser um proficiente mestre de gladiadores precisa aprender sobre todas habilidades.",["Me mostre","Talvez mais tarde"]).then( function(data){
			if (data == "Me mostre")
				window.open("https://gladcode.tk/manual.php#nav-hab");

			showDialog("Na medida que os gladiadores participam das batalhas eles ganham <b>experiência</b> e eventualmente aumentam de <b>nível</b>. Subir de nível faz com que o gladiador ganhe <b>cinco pontos</b> para distribuir em quaisquer de seus atributos: Força, Agilidade ou Inteligência",["Onde diz isso?","Entendi"]).then( function(data){
				if (data == "Onde diz isso?")
					window.open("https://gladcode.tk/manual.php#nav-sim");

				showDialog("Através das funções <b>upgradeSTR</b>, <b>upgradeAGI</b> e <b>upgradeINT</b> o gladiador pode decidir qual de seus atributos deseja melhorar ao subir de nível. A função pode ser chamada em qualquer trecho da função loop. Experimente uma das três e teste o gladiador",["Referência","Deixa comigo"]).then( function(data){
					if (data == "Referência")
						window.open("https://gladcode.tk/docs.php#nav-up");
					tutoState = 22;
				});
			});
		});
	}
	else if (tutoState == 22){
		var text = editor.getValue();
		if (text.search(/[\s]upgrade(INT|STR|AGI)[\s]{0,1}\([\d]{1,3}\)[;\s]/g) == -1){
			showDialog("Você deve inserir <b>upgradeSTR</b>, <b>upgradeAGI</b> ou <b>upgradeINT</b> no comportamento do gladiador. Só assim ele poderá melhorar um de seus atributos quando subir de nível",["upgrade?","Não sei como","OK"]).then( function(data){
				if (data == "upgrade?")
					window.open("https://gladcode.tk/docs.php#nav-up");
				if (data == "Não sei como"){
					editor.setValue("int start=1;\r\nloop(){\r\n\tupgradeINT(5); //melhora inteligência quando subir de nível\r\n\tif (!isSafeHere())\r\n\t\tmoveTo(12.5,12.5);\r\n\telse if (getHit())\r\n\t\tteleport(5,5);\r\n\telse if (getCloseEnemy())\r\n\t\tfireball(getTargetX(), getTargetY());\r\n\telse if (start){\r\n\t\tmoveTo(12,12);\r\n\t\tif (getX() == 12 && getY() == 12)\r\n\t\t\tstart = 0;\r\n\t}\r\n\telse\r\n\t\tturn(60);\r\n}");
				}
			});
		}
		else{
			tutoState = 23;
			$('#test').click();
		}
	}
	else if (tutoState == 23){
		showDialog("Uma última coisa. Vou te ensinar uma poderosa ferramenta para testar seu código: os <b>breakpoints</b>. Com eles você pode pausar a simulação quando seu gladiador estiver prestes a executar uma linha de comando específica.", ["Interessante"]).then( function(data){
			showDialog("Para adicionar um breakpoint, basta clicar lá no lado esquerdo, no número da linha desejada do seu código. Experimente!",["Onde?", "Certo"]).then( function(data){
				if (data == "Onde?"){
					$('.ace_gutter-cell').addClass('red transition');
					setTimeout( function(){
						$('.ace_gutter-cell').removeClass('red');
						setTimeout( function(){
							$('.ace_gutter-cell').removeClass('transiton');
						}, 500);
					}, 1500);
				}

				editor.focus();

				$('.ace_gutter-cell').click( function(){
					tutoState = 24;
					setTimeout( function() {
						if ($('.ace_gutter-cell.ace_breakpoint').length){
							showMessage("Muito bem. Agora teste seu gladiador.");
							$('.ace_gutter-cell').off();
						}
					}, 500);
					
				});
			});
		});
	}
	else if (tutoState == 24){
		if ($('.ace_gutter-cell.ace_breakpoint').length){
			tutoState = 25;
			showTutorial();
		}
		else{
			showDialog("Experimente testar seu gladiador com pelo menos um <b>breakpoint</b>.", ["Como?", "OK"]).then( function(data){
				if (data == "Como?"){
					tutoState = 23;
					showTutorial();
				}
			});
		}
	}
	else if (tutoState == 25){
		showDialog("Muito bem. Creio que você já tenha aprendido o básico sobre a programação dos gladiadores. Existem muitas outras funções disponíveis para você aprender. Sempre que quiser a página de referências da gladCode estará disponível. Obrigado por chegar até aqui e espero ter sido útil",["Outras funções","Obrigado"]).then( function(data){
			if (data == "Outras funções")
				window.open("https://gladcode.tk/docs.php");

			$.post("back_login.php", {
				action: "TUTORIAL",
			}).done( function(data){
				//console.log(data);
			});

			tutoState = 999;
		});
	}
}